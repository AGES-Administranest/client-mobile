// Stand-in for the authenticated session.
// When the auth flow wires up (auth screen → POST /auth/session response),
// call sessionStore.set() with the user id and Cognito idToken so that every
// subsequent API call carries the correct identity.
// Kept in a plain module (not React context) so services can read it without
// importing React.

type Session = {
  userId: string;
  idToken: string;
};

let current: Session | null = null;

export const sessionStore = {
  get(): Session | null {
    return current;
  },

  set(session: Session): void {
    current = session;
  },

  clear(): void {
    current = null;
  },
};
