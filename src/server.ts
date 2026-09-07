import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import { createApp } from './app';
import { connectDB } from './config/db';

const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  // 1. Connect to MongoDB
  await connectDB();

  // 2. Initialize Express application
  const app = createApp();

  // 3. Start listening
  const server = app.listen(PORT, () => {
    console.log(`🚀 My Keeps Server is listening on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down server gracefully...');
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
