import {
  canResend,
  formatCountdown,
  requirementStatus,
  secondsUntilResend,
  validateNewPassword,
} from './passwordReset';

const VALID = 'Abcdef1!';

describe('validateNewPassword requirements', () => {
  it.each([
    ['7 characters', 'Abcde1!', 'minLength', false],
    ['8 characters', 'Abcdef1!', 'minLength', true],
    ['no uppercase', 'abcdef1!', 'uppercase', false],
    ['an uppercase', 'Abcdef1!', 'uppercase', true],
    ['no lowercase', 'ABCDEF1!', 'lowercase', false],
    ['no number', 'Abcdefg!', 'number', false],
    ['a number', 'Abcdefg1', 'number', true],
    ['no special character', 'Abcdefg1', 'special', false],
    ['a special character', 'Abcdef1@', 'special', true],
    ['only a space', 'Abcdef1 ', 'special', false],
    ['empty', '', 'minLength', false],
  ] as const)('%s', (_label, password, requirement, expected) => {
    expect(validateNewPassword(password, '').requirements[requirement]).toBe(
      expected,
    );
  });

  it('accepts a password that meets every requirement', () => {
    expect(validateNewPassword(VALID, VALID)).toMatchObject({
      meetsRequirements: true,
      matches: true,
      isValid: true,
    });
  });

  it('is invalid when a requirement is missing even if both fields match', () => {
    const result = validateNewPassword('abcdef1!', 'abcdef1!');
    expect(result.matches).toBe(true);
    expect(result.isValid).toBe(false);
  });
});

describe('validateNewPassword confirmation', () => {
  it('reports different passwords', () => {
    const result = validateNewPassword(VALID, 'Abcdef1?');
    expect(result.confirmationFilled).toBe(true);
    expect(result.matches).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('does not count an empty confirmation as matching', () => {
    const result = validateNewPassword('', '');
    expect(result.confirmationFilled).toBe(false);
    expect(result.matches).toBe(false);
    expect(result.isValid).toBe(false);
  });
});

describe('requirementStatus', () => {
  it.each([
    [true, false, 'met'],
    [true, true, 'met'],
    [false, false, 'neutral'],
    [false, true, 'unmet'],
  ] as const)('met=%s showErrors=%s -> %s', (isMet, showErrors, expected) => {
    expect(requirementStatus(isMet, showErrors)).toBe(expected);
  });
});

describe('formatCountdown', () => {
  it.each([
    [45, '00:45'],
    [60, '01:00'],
    [9, '00:09'],
    [0, '00:00'],
    [-3, '00:00'],
    [754, '12:34'],
  ])('%s seconds -> %s', (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected);
  });
});

describe('secondsUntilResend / canResend', () => {
  const sentAt = 1_000_000;

  it.each([
    [0, 45],
    [1, 45],
    [1_001, 44],
    [44_000, 1],
    [44_999, 1],
    [45_000, 0],
    [90_000, 0],
    [-5_000, 45],
  ])('%sms after sending -> %s s left', (elapsed, expected) => {
    expect(secondsUntilResend(sentAt, sentAt + elapsed)).toBe(expected);
  });

  it('only allows resending when the countdown reached zero', () => {
    expect(canResend(1)).toBe(false);
    expect(canResend(0)).toBe(true);
  });
});
