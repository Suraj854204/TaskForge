import axios from 'axios';

export const TOKEN_KEY = 'tf_token';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isAuthCall = /\/auth\/(login|register)/.test(err.config?.url ?? '');
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_KEY);
      if (!location.pathname.startsWith('/login')) location.href = '/login?expired=1';
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e: unknown): string =>
  axios.isAxiosError(e)
    ? e.response?.data?.errors?.[0]?.message ?? e.response?.data?.message ?? (e.request ? 'Cannot reach the server' : e.message)
    : 'Something went wrong';

export const get = async <T,>(url: string, params?: object) => (await api.get(url, { params })).data.data as T;
export const post = async <T,>(url: string, body?: object) => (await api.post(url, body)).data.data as T;
export const patch = async <T,>(url: string, body?: object) => (await api.patch(url, body)).data.data as T;
export const del = async <T,>(url: string) => (await api.delete(url)).data.data as T;
