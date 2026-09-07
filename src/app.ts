import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import noteRoutes from './routes/noteRoutes';
import userRoutes from './routes/userRoutes';

export const createApp = (): Application => {
  const app = express();

  // CORS Middleware: Allow local dev, Vercel deployments, and configured CLIENT_URL
  const configuredOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
    : [];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server or tools without origin header (Postman, curl, Render health checks)
        if (!origin) return callback(null, true);

        if (
          configuredOrigins.includes('*') ||
          configuredOrigins.includes(origin) ||
          origin.includes('localhost') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }

        return callback(null, true); // Permissive for production web apps
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root / Health Check
  const healthCheck = (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: '🚀 My Keeps Backend API is running.',
      version: '1.0.0',
      database: 'MongoDB Atlas',
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/', healthCheck);
  app.get('/health', healthCheck);

  // API Routes
  app.use('/api/notes', noteRoutes);
  app.use('/api/user', userRoutes);

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
