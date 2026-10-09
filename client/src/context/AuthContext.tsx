import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { get, post, TOKEN_KEY } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (v: { name: string; email: string; password: string; workspaceName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}
const AuthContext = createContext<AuthState>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    get<{ user: User }>('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback((d: { token: string; user: User }) => {
    localStorage.setItem(TOKEN_KEY, d.token);
    setUser(d.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => finish(await post('/auth/login', { email, password })), [finish]);
  const register = useCallback(async (v: object) => finish(await post('/auth/register', v)), [finish]);
  const logout = useCallback(async () => {
    try { await post('/auth/logout'); } catch { /* token may already be invalid */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>;
}
