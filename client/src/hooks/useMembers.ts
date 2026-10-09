import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import type { UserLite } from '../types';
import { useAsync } from './useAsync';

export function useMembers() {
  const { user } = useAuth();
  const wsId = user?.workspace?._id;
  return useAsync(async () => (wsId ? (await get<{ members: UserLite[] }>(`/workspaces/${wsId}/members`)).members : []), [wsId]);
}
