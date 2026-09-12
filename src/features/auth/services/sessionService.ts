import { apiClient } from 'shared/services/apiClient';

type SessionResponse = {
  id: string;
  email: string;
  name: string | null;
};


export async function provisionSession(idToken: string): Promise<SessionResponse> {
  return apiClient.post<SessionResponse>('/auth/session', {}, { token: idToken });
}
