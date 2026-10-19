import {
  resolveCancellationReason,
  type CancellationReasonLabels,
} from './cancellationReasonPresets';

const LABELS: CancellationReasonLabels = {
  noShow: 'Paciente não compareceu',
  clientCanceled: 'Cancelamento do cliente',
  emergency: 'Emergência',
};

describe('resolveCancellationReason', () => {
  // O campo de texto fica sempre à vista: sozinho ele é o motivo, e junto de
  // um chip vira o detalhe dele. "Outro" e nenhum chip dependem só do texto.
  it.each([
    ['nenhum chip, sem texto', null, '', ''],
    ['nenhum chip, com texto', null, ' chuva forte ', 'chuva forte'],
    ['outro vazio', 'other', '', ''],
    ['outro preenchido', 'other', 'Falta de equipe', 'Falta de equipe'],
    ['falta sem detalhe', 'noShow', '  ', 'Paciente não compareceu'],
    [
      'falta com detalhe',
      'noShow',
      'avisou tarde',
      'Paciente não compareceu: avisou tarde',
    ],
    ['cliente', 'clientCanceled', '', 'Cancelamento do cliente'],
    ['emergência', 'emergency', '', 'Emergência'],
  ] as const)('%s', (_label, preset, text, expected) => {
    expect(resolveCancellationReason(preset, text, LABELS)).toBe(expected);
  });
});
