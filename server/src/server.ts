import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { initRealtime } from './services/realtime';

async function main() {
  await connectDB();
  const server = http.createServer(createApp());
  initRealtime(server);
  server.listen(env.port, () => console.log(`TaskForge API listening on http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
