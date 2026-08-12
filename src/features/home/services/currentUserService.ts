// Stand-in for a real API call — swap this for an HTTP client call once
// there's a backend endpoint for the current user.
export async function fetchCurrentUserName(): Promise<string> {
  return Promise.resolve('Ana');
}
