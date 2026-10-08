import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

async function main() {
  await connectDB();
  createApp().listen(env.port, () => console.log(`TaskForge API listening on http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
