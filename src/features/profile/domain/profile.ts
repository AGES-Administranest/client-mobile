export type Sex = 'FEMALE' | 'MALE' | 'OTHER' | 'NOT_INFORMED';

// GET /users/me. Every field is always present: one never filled in is null.
export type Profile = {
  id: string;
  name: string;
  email: string;
  crmv: string | null;
  birthDate: string | null;
  sex: Sex | null;
  city: string | null;
  state: string | null;
};

// `birthDate` comes as UTC midnight and only its date part means anything:
// reading it through `Date` would move it a day back in Brazil. A birthday on
// 29/02 counts from 01/03 in a common year.
export function calculateAge(
  birthDate: string | null,
  today: string,
): number | null {
  if (!birthDate) {
    return null;
  }

  const [birthYear, birthMonth, birthDay] = datePartsOf(birthDate);
  const [year, month, day] = datePartsOf(today);
  const hadBirthday =
    month > birthMonth || (month === birthMonth && day >= birthDay);
  const age = year - birthYear - (hadBirthday ? 0 : 1);

  return age >= 0 ? age : null;
}

function datePartsOf(date: string): number[] {
  return date.slice(0, 10).split('-').map(Number);
}

export function displayValue(value: string | null, fallback: string): string {
  return value?.trim() || fallback;
}

// Also the rule the PDF export needs (US28).
export function isMissingCrmv(profile: Pick<Profile, 'crmv'>): boolean {
  return !profile.crmv?.trim();
}
