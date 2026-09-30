import type { DraftSummary } from 'features/stockEntry/domain/draft';
import { entryCardView } from 'features/stockEntry/screens/entriesPresenter';
import { locales } from 'shared/i18n/locales';
import { translate } from 'shared/i18n/translate';

const t = (
  key: Parameters<typeof translate>[1],
  params?: Record<string, string | number>,
) => translate(locales['pt-BR'], key, params);
const money = (value: number) => `R$ ${value.toFixed(2)}`;

const DRAFT: DraftSummary = {
  id: 'invoice-1',
  fileName: 'nota.pdf',
  fileMimeType: 'application/pdf',
  extractionStatus: 'SUCCESS',
  uploadedAt: '2026-09-28T12:00:00.000Z',
  updatedAt: '2026-09-28T12:00:00.000Z',
};

describe('entryCardView', () => {
  it('names a read entry by its supplier, with number, date and total', () => {
    expect(
      entryCardView(
        {
          ...DRAFT,
          supplierName: 'Vet Distribuidora',
          invoiceNumber: '8842',
          orderDate: '2026-08-18',
          totalAmount: 490,
        },
        t,
        money,
      ),
    ).toEqual({
      status: 'ready',
      title: 'Vet Distribuidora',
      meta: 'PDF · NF 8842 · 18/08/2026',
      value: 'R$ 490.00',
      statusLabel: 'Pronta para conferir',
      statusTone: 'attention',
    });
  });

  it('says why a reading failed', () => {
    const view = entryCardView(
      { ...DRAFT, extractionStatus: 'FAILED', failureReason: 'NO_TEXT_LAYER' },
      t,
      money,
    );

    expect(view).toMatchObject({
      title: 'nota.pdf',
      statusLabel: 'Falhou',
      statusTone: 'alert',
      reason: 'Este PDF não tem texto',
    });
  });

  it('shows a photo as a manual draft kept as a receipt', () => {
    const view = entryCardView(
      { ...DRAFT, fileMimeType: 'image/jpeg', extractionStatus: 'MANUAL' },
      t,
      money,
    );

    expect(view).toMatchObject({
      meta: 'Foto',
      statusLabel: 'Rascunho manual',
      statusTone: 'muted',
    });
    expect(view.reason).toContain('comprovante');
  });
});
