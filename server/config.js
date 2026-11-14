import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = !!process.env.VERCEL;

export const config = {
  port: process.env.PORT || 5050,
  jwtSecret: process.env.JWT_SECRET || 'rugas-queue-manager-super-secure-secret-key-2024',
  jwtExpiresIn: '7d',
  dbPath: process.env.DB_PATH || (isVercel ? '/tmp/queue_system.sqlite' : path.join(__dirname, 'db', 'queue_system.sqlite')),
  isDev: process.env.NODE_ENV !== 'production'
};
