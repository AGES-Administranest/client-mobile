export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

// Pure, framework-free business rule — easy to unit test, no React/RN in sight.
export function getGreetingPeriod(date: Date): GreetingPeriod {
  const hour = date.getHours();

  if (hour < 5) {
    return 'night';
  }

  if (hour < 12) {
    return 'morning';
  }

  if (hour < 18) {
    return 'afternoon';
  }

  return 'evening';
}
