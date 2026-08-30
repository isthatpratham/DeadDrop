import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import fileRoutes from './routes/fileRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app: Application = express();

// Trust Proxy Configuration
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  if (trustProxyEnv.toLowerCase() === 'true') {
    app.set('trust proxy', true);
  } else if (trustProxyEnv.toLowerCase() === 'false') {
    app.set('trust proxy', false);
  } else if (!isNaN(Number(trustProxyEnv))) {
    app.set('trust proxy', Number(trustProxyEnv));
  } else {
    app.set('trust proxy', trustProxyEnv);
  }
} else {
  app.set('trust proxy', 1);
}

// Middlewares
app.use(express.json());
app.use(cors({
  exposedHeaders: ['Content-Disposition'],
}));

// Routes
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
