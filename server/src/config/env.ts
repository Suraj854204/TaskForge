import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskforge',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-3.5-flash',
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const originPatterns = env.clientUrl
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean)
  .map((p) => new RegExp(`^${p.split('*').map(escapeRe).join('[a-z0-9-]+')}$`, 'i'));

/** CLIENT_URL may hold several comma-separated origins; `*` matches one subdomain label. */
export const isAllowedOrigin = (origin?: string) => !origin || originPatterns.some((r) => r.test(origin));
