export const PASSWORD_MIN_LENGTH = 8;
export const RESEND_COOLDOWN_SECONDS = 45;

export type PasswordRequirement =
  | 'minLength'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'special';

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  'minLength',
  'uppercase',
  'lowercase',
  'number',
  'special',
];

export type RequirementStatus = 'neutral' | 'met' | 'unmet';

export type NewPasswordValidation = {
  requirements: Record<PasswordRequirement, boolean>;
  meetsRequirements: boolean;
  confirmationFilled: boolean;
  matches: boolean;
  isValid: boolean;
};

export function validateNewPassword(
  password: string,
  confirmation: string,
): NewPasswordValidation {
  const requirements: Record<PasswordRequirement, boolean> = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /\p{Lu}/u.test(password),
    lowercase: /\p{Ll}/u.test(password),
    number: /\d/.test(password),
    special: /[^\p{L}\p{N}\s]/u.test(password),
  };
  const meetsRequirements = PASSWORD_REQUIREMENTS.every(
    requirement => requirements[requirement],
  );
  const confirmationFilled = confirmation.length > 0;
  const matches = confirmationFilled && password === confirmation;

  return {
    requirements,
    meetsRequirements,
    confirmationFilled,
    matches,
    isValid: meetsRequirements && matches,
  };
}

// A met requirement is always confirmed; an unmet one only turns into an
// error once the user has tried to submit, so typing never shouts early.
export function requirementStatus(
  isMet: boolean,
  showErrors: boolean,
): RequirementStatus {
  if (isMet) {
    return 'met';
  }
  return showErrors ? 'unmet' : 'neutral';
}

export function secondsUntilResend(
  sentAt: number,
  now: number,
  cooldownSeconds: number = RESEND_COOLDOWN_SECONDS,
): number {
  const remaining = Math.ceil(cooldownSeconds - (now - sentAt) / 1000);
  return Math.min(cooldownSeconds, Math.max(0, remaining));
}

export function canResend(secondsRemaining: number): boolean {
  return secondsRemaining <= 0;
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
