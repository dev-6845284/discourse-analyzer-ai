import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    let dbName = 'discourse-analyzer';
    try {
      const url = new URL(MONGODB_URI!);
      if (url.pathname && url.pathname.length > 1) {
        dbName = url.pathname.substring(1);
      }
    } catch (e) {
      console.warn('Could not parse database name from URI, using default:', dbName);
    }

    if (process.env.DB_SCHEMA_SUFFIX) {
      dbName += process.env.DB_SCHEMA_SUFFIX;
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
      dbName,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('Connected to MongoDB');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Error connecting to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
