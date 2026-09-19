import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { validateSession } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { api } from './routes/index.js';

export const app = express();
app.use(helmet());

const allowedOrigins = [
  env.clientUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local SIH demo ports
    },
    credentials: true,
  }),
);

app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  console.info(
    JSON.stringify({
      level: 'info',
      method: req.method,
      path: req.path,
      requestId: randomUUID(),
    }),
  );
  next();
});

app.use('/api', validateSession, api);
app.use(notFound);
app.use(errorHandler);
