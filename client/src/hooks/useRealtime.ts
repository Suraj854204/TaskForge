import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

/** Subscribe to a server event for the lifetime of the component. Silent no-op if the socket is unavailable. */
export function useRealtime(event: string, handler: (payload: any) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const fn = (p: unknown) => ref.current(p ?? {});
    socket.on(event, fn);
    return () => { socket.off(event, fn); };
  }, [event]);
}
