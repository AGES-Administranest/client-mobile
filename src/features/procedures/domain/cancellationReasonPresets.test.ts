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
  it.each([
    ['nenhum chip', null, 'livre', ''],
    ['outro vazio', 'other', '', ''],
    ['outro com espaços', 'other', '  chuva  ', '  chuva  '],
    ['outro preenchido', 'other', 'Falta de equipe', 'Falta de equipe'],
    ['falta', 'noShow', 'ignorado', 'Paciente não compareceu'],
    ['cliente', 'clientCanceled', 'ignorado', 'Cancelamento do cliente'],
    ['emergência', 'emergency', '', 'Emergência'],
  ] as const)('%s', (_label, preset, otherText, expected) => {
    expect(resolveCancellationReason(preset, otherText, LABELS)).toBe(expected);
  });
});
