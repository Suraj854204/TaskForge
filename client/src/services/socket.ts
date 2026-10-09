import { io, Socket } from 'socket.io-client';
import { TOKEN_KEY } from './api';

let socket: Socket | null = null;

/** One shared connection, created lazily once a token exists. */
export function getSocket(): Socket | null {
  if (!localStorage.getItem(TOKEN_KEY)) return null;
  if (!socket) {
    const base = import.meta.env.VITE_API_URL as string | undefined;
    const origin = base && /^https?:/.test(base) ? new URL(base).origin : undefined;
    const opts = { auth: (cb: (d: object) => void) => cb({ token: localStorage.getItem(TOKEN_KEY) }) };
    socket = origin ? io(origin, opts) : io(opts);
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
