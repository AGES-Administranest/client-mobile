import { useAuth } from 'features/auth';

import { GreetingPeriod, getGreetingPeriod } from '../domain/getGreetingPeriod';

type HomeScreenState = {
  greetingPeriod: GreetingPeriod;
  userName: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

// Wires the screen to the domain rule and to the signed-in account — screens
// stay declarative, this is where the orchestration happens.
export function useHomeScreen(): HomeScreenState {
  const { account, signOut } = useAuth();
  const greetingPeriod = getGreetingPeriod(new Date());

  // The account is loaded before the tabs render (see App.tsx), so there is
  // nothing to wait for here.
  return {
    greetingPeriod,
    userName: firstName(account?.name),
    isLoading: false,
    signOut,
  };
}

// "Bom dia, Bruna!" reads as a greeting; the full registered name does not.
function firstName(name: string | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}
