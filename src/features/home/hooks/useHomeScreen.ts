import { useEffect, useState } from 'react';

import { GreetingPeriod, getGreetingPeriod } from '../domain/getGreetingPeriod';
import { fetchCurrentUserName } from '../services/currentUserService';

type HomeScreenState = {
  greetingPeriod: GreetingPeriod;
  userName: string | null;
  isLoading: boolean;
};

// Wires the screen to the domain rule and the service call — screens stay
// declarative, this is where the orchestration happens.
export function useHomeScreen(): HomeScreenState {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const greetingPeriod = getGreetingPeriod(new Date());

  useEffect(() => {
    let isMounted = true;

    fetchCurrentUserName().then(name => {
      if (isMounted) {
        setUserName(name);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { greetingPeriod, userName, isLoading };
}
