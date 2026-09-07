import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', (error as Error).message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection lost. Reconnecting...');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });
};

export default connectDB;
