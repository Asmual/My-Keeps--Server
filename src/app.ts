import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import noteRoutes from './routes/noteRoutes';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root / Health Check
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: '🚀 My Keeps Backend API is running.',
      version: '1.0.0',
      database: 'MongoDB Atlas',
    });
  });

  // API Routes
  app.use('/api/notes', noteRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
    });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
};

export default createApp;
