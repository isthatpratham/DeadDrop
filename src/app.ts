import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileRoutes from './routes/fileRoutes.js';

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
app.use('/api', fileRoutes);

// Basic health route
app.get('/', (req: Request, res: Response) => {
  res.send('API running');
});

export default app;
