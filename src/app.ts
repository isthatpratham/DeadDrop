import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fileRoutes from './routes/fileRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { parseTrustProxy } from './config/trustProxy.js';
import { createApiRateLimiter } from './middleware/rateLimits.js';
import { isOriginAllowed, resolveCorsOrigin } from './config/cors.js';
import { securityHeaders } from './config/helmet.js';

dotenv.config();

const app: Application = express();

app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// Middlewares
app.use(securityHeaders());
app.use(express.json());
const corsOrigin = resolveCorsOrigin(process.env.CORS_ORIGIN);
app.use(cors({
  origin: (requestOrigin, callback) => {
    callback(null, isOriginAllowed(requestOrigin, corsOrigin));
  },
  exposedHeaders: ['Content-Disposition'],
}));

// Routes
app.use('/api', createApiRateLimiter());
app.use('/api', healthRoutes);
app.use('/api', fileRoutes);

// Production Static SPA Serving
const frontendDistPath = path.resolve(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.use((req: Request, res: Response, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.resolve(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
} else {
  // Basic health route fallback if SPA build is not present
  app.get('/', (req: Request, res: Response) => {
    res.send('API running');
  });
}

app.use(errorHandler);

export default app;
