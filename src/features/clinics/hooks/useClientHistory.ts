import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { isLocalClientId } from 'features/clients';
import type { TranslationKey } from 'shared/i18n';
import { onConnectionRestored } from 'shared/services/network';

import { requireToken, toHistoryFailureKey } from './clinicFailure';
import {
  appendAppointments,
  EMPTY_CLIENT_SUMMARY,
  monthPeriodOf,
  remainingAppointments,
  type ClientAppointment,
  type ClientSummary,
  type HistoryPeriod,
} from '../domain/clientHistory';
import {
  fetchClientAppointments,
  fetchClientSummary,
} from '../services/clientService';

export type ClientHistoryStatus = 'loading' | 'ready' | 'failed';

export type ClientHistoryState = {
  period: HistoryPeriod;
  status: ClientHistoryStatus;
  failure: TranslationKey | null;
  summary: ClientSummary;
  appointments: ClientAppointment[];
  hasMore: boolean;
  remaining: number;
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
  setPeriod: (period: HistoryPeriod) => void;
  loadMore: () => void;
  reload: () => void;
  reset: () => void;
};

type ChosenPeriod = { clientId: string; period: HistoryPeriod };

type Paging = { total: number; loadedPages: number };

const NO_PAGES: Paging = { total: 0, loadedPages: 0 };

export function useClientHistory(clientId: string | null): ClientHistoryState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  // O token renova sem mudar de quem é o histórico: lido na hora de cada
  // pedido, ele não recarrega a ficha nem perde as páginas do "Ver mais". A
  // ficha recarrega quando muda a conta.
  const tokenRef = useRef(idToken);
  const [chosen, setChosen] = useState<ChosenPeriod | null>(null);
  // O mês padrão é o do dia em que a ficha abriu: na virada do mês com ela
  // aberta, o período não troca sozinho no meio da lista.
  const [defaultPeriod, setDefaultPeriod] = useState(() =>
    monthPeriodOf(new Date()),
  );
  // Enquanto a ficha fecha (clientId null), o período escolhido continua na
  // tela junto com os dados dele.
  const period =
    chosen !== null && (clientId === null || chosen.clientId === clientId)
      ? chosen.period
      : defaultPeriod;
  const { from, to } = period;
  const [status, setStatus] = useState<ClientHistoryStatus>('loading');
  const [failure, setFailure] = useState<TranslationKey | null>(null);
  const [summary, setSummary] = useState<ClientSummary>(EMPTY_CLIENT_SUMMARY);
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [paging, setPaging] = useState<Paging>(NO_PAGES);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [version, setVersion] = useState(0);
  // Cada troca de tomador ou de período começa uma nova geração: a resposta de
  // um pedido da geração anterior não pode entrar na ficha atual.
  const generation = useRef(0);
  const isFetchingMore = useRef(false);

  const clearHistory = useCallback(() => {
    isFetchingMore.current = false;
    setIsLoadingMore(false);
    setLoadMoreFailed(false);
    setFailure(null);
    setSummary(EMPTY_CLIENT_SUMMARY);
    setAppointments([]);
    setPaging(NO_PAGES);
  }, []);

  useEffect(() => {
    tokenRef.current = idToken;
  }, [idToken]);

  useEffect(() => {
    // Com a ficha fechando, o histórico fica como está até o sheet sair da
    // tela; quem abre a próxima ficha chama o reset.
    if (clientId === null) {
      return;
    }
    const current = generation.current;
    clearHistory();

    // Clínica cadastrada sem internet ainda não existe no backend, então não
    // tem atendimento concluído para buscar.
    if (isLocalClientId(clientId)) {
      setStatus('ready');
      return;
    }

    setStatus('loading');
    Promise.resolve()
      .then(() => {
        const token = requireToken(tokenRef.current);
        return Promise.all([
          fetchClientSummary(token, clientId, { from, to }),
          fetchClientAppointments(token, clientId, { from, to }, 1),
        ]);
      })
      .then(([periodSummary, firstPage]) => {
        if (current !== generation.current) return;
        setSummary(periodSummary);
        setAppointments(firstPage.appointments);
        setPaging({ total: firstPage.total, loadedPages: 1 });
        setStatus('ready');
      })
      .catch(error => {
        if (current !== generation.current) return;
        setStatus('failed');
        setFailure(toHistoryFailureKey(error));
      });

    return () => {
      generation.current += 1;
    };
  }, [userId, clientId, from, to, version, clearHistory]);

  const isFailed = status === 'failed';

  useEffect(() => {
    if (!isFailed) {
      return undefined;
    }
    return onConnectionRestored(() => setVersion(value => value + 1));
  }, [isFailed]);

  const remaining = remainingAppointments(paging.total, paging.loadedPages);
  const hasMore = remaining > 0;

  const loadMore = useCallback(() => {
    if (
      clientId === null ||
      status !== 'ready' ||
      !hasMore ||
      isFetchingMore.current
    ) {
      return;
    }
    const current = generation.current;
    const nextPage = paging.loadedPages + 1;
    isFetchingMore.current = true;
    setIsLoadingMore(true);
    setLoadMoreFailed(false);

    Promise.resolve()
      .then(() =>
        fetchClientAppointments(
          requireToken(tokenRef.current),
          clientId,
          { from, to },
          nextPage,
        ),
      )
      .then(page => {
        if (current !== generation.current) return;
        setAppointments(known => appendAppointments(known, page.appointments));
        // O total da página nova é o mais recente: conta o que foi concluído
        // depois da primeira.
        setPaging({ total: page.total, loadedPages: nextPage });
      })
      .catch(() => {
        if (current !== generation.current) return;
        setLoadMoreFailed(true);
      })
      .finally(() => {
        if (current !== generation.current) return;
        isFetchingMore.current = false;
        setIsLoadingMore(false);
      });
  }, [clientId, status, hasMore, paging.loadedPages, from, to]);

  const setPeriod = useCallback(
    (next: HistoryPeriod) => {
      if (clientId === null) return;
      setChosen({ clientId, period: next });
      // Com o mesmo período o efeito não roda de novo; depois de uma falha,
      // aplicar também é tentar outra vez.
      if (isFailed) setVersion(value => value + 1);
    },
    [clientId, isFailed],
  );

  const reload = useCallback(() => setVersion(value => value + 1), []);

  const reset = useCallback(() => {
    setChosen(null);
    setDefaultPeriod(monthPeriodOf(new Date()));
    clearHistory();
    setStatus('loading');
  }, [clearHistory]);

  return {
    period,
    status,
    failure,
    summary,
    appointments,
    hasMore,
    remaining,
    isLoadingMore,
    loadMoreFailed,
    setPeriod,
    loadMore,
    reload,
    reset,
  };
}
