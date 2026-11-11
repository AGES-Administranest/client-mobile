import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  ProcedureFormSheet,
  type ProcedureClientField,
  type ProcedureFormTexts,
} from './ProcedureFormSheet';
import { EMPTY_PROCEDURE_FORM } from '../domain/procedure.types';

const LABELS = Object.fromEntries(
  Object.keys(EMPTY_PROCEDURE_FORM).map(key => [key, key]),
) as ProcedureFormTexts['labels'];

const TEXTS: ProcedureFormTexts = {
  title: 'Novo atendimento',
  confirm: 'Confirmar',
  close: 'Fechar',
  locationHint: 'Sugerido pelo endereço do tomador.',
  registerClient: 'Adicionar clínica',
  next: 'Próximo',
  back: 'Voltar',
  stepLabels: ['Passo 1 de 2', 'Passo 2 de 2'],
  labels: LABELS,
  placeholders: {},
  speciesOptions: [],
  asaOptions: [],
  errors: {},
  clientSearchMessages: { loading: '', error: '', empty: 'Nenhuma clínica' },
  nameMaxLength: 100,
  notesMaxLength: 500,
};

async function renderSheet(
  client: ProcedureClientField,
  onRegisterClient: (() => void) | null = jest.fn(),
  step: 0 | 1 = 0,
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ProcedureFormSheet
        visible
        values={EMPTY_PROCEDURE_FORM}
        submitting={false}
        submitFailed={false}
        submitErrorText=""
        texts={TEXTS}
        client={client}
        showLocationHint={false}
        step={step}
        onNext={jest.fn()}
        onBack={jest.fn()}
        onChangeText={jest.fn()}
        onChangeClientTerm={jest.fn()}
        onSelectClient={jest.fn()}
        onChangeSpecies={jest.fn()}
        onChangeAsa={jest.fn()}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
        onRegisterClient={onRegisterClient ?? undefined}
      />,
    );
  });
  if (step === 0) {
    const input = renderer.root.find(
      node =>
        node.props.accessibilityLabel === 'clientId *' && 'value' in node.props,
    );
    await act(async () => input.props.onFocus());
  }
  return renderer;
}

const hasAddRow = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAll(node => node.props.children === 'Adicionar clínica')
    .length > 0;

describe('ProcedureFormSheet add clinic row', () => {
  it('appears once something was typed and nothing was found', async () => {
    const renderer = await renderSheet({
      term: 'Vet Nova',
      status: 'empty',
      options: [],
    });

    expect(hasAddRow(renderer)).toBe(true);
  });

  it.each([
    ['nothing typed yet', { term: '', status: 'empty' as const, options: [] }],
    [
      'results were found',
      {
        term: 'Vet',
        status: 'results' as const,
        options: [{ id: 'c-1', name: 'Vet Sul' }],
      },
    ],
  ])('stays hidden when %s', async (_case, client) => {
    expect(hasAddRow(await renderSheet(client))).toBe(false);
  });

  it('stays hidden when the screen does not offer to register', async () => {
    const renderer = await renderSheet(
      { term: 'Vet Nova', status: 'empty', options: [] },
      null,
    );

    expect(hasAddRow(renderer)).toBe(false);
  });
});

describe('ProcedureFormSheet steps', () => {
  const EMPTY_CLIENT: ProcedureClientField = {
    term: '',
    status: 'idle',
    options: [],
  };
  const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children)
      .filter(child => typeof child === 'string');

  it('shows the first fields and "Próximo" on the first step', async () => {
    const texts = textsOf(await renderSheet(EMPTY_CLIENT, null, 0));

    expect(texts).toEqual(
      expect.arrayContaining([
        'Passo 1 de 2',
        'patientName *',
        'date *',
        'Próximo',
      ]),
    );
    expect(texts).not.toContain('amount');
    expect(texts).not.toContain('Confirmar');
  });

  it('shows the rest, "Confirmar" and "Voltar" on the second step', async () => {
    const texts = textsOf(await renderSheet(EMPTY_CLIENT, null, 1));

    expect(texts).toEqual(
      expect.arrayContaining([
        'Passo 2 de 2',
        'amount',
        'weightKg',
        'Confirmar',
        'Voltar',
      ]),
    );
    expect(texts).not.toContain('patientName *');
    expect(texts).not.toContain('Próximo');
  });
});
