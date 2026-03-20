import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileRoutes from './routes/fileRoutes.js';

dotenv.config();

const app: Application = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', fileRoutes);

// Basic health route
app.get('/', (req: Request, res: Response) => {
  res.send('API running');
});

export default app;
