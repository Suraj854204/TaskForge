import http from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { User } from '../models';

let io: Server | null = null;

/** Optional live updates. Every emit is a no-op until initRealtime() runs, so tests and scripts are unaffected. */
export function initRealtime(server: http.Server) {
  io = new Server(server, { cors: { origin: env.clientUrl.split(',').map((s) => s.trim()), credentials: true } });

  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(String(socket.handshake.auth?.token ?? ''), env.jwtSecret) as jwt.JwtPayload;
      const user = await User.findById(payload.sub).select('workspace');
      if (!user) return next(new Error('unauthorized'));
      socket.data.userId = String(user._id);
      socket.data.workspaceId = user.workspace ? String(user.workspace) : null;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    if (socket.data.workspaceId) socket.join(`ws:${socket.data.workspaceId}`);
  });
  return io;
}

export const emitToUser = (userId: unknown, event: string, payload: object = {}) => {
  io?.to(`user:${String(userId)}`).emit(event, payload);
};
export const emitToWorkspace = (workspaceId: unknown, event: string, payload: object = {}) => {
  if (workspaceId) io?.to(`ws:${String(workspaceId)}`).emit(event, payload);
};
