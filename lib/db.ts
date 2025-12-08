import mongoose from 'mongoose';

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

let cached: CachedConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB Connection Error:', error.message);
        cached.promise = null;

        // Provide more helpful error messages based on connection type
        const isAtlas = MONGODB_URI.includes('mongodb+srv://');
        const errorMsg = isAtlas
          ? `Failed to connect to MongoDB Atlas. Please check:\n` +
            `- Your internet connection\n` +
            `- Database credentials are correct\n` +
            `- Your IP address is whitelisted in MongoDB Atlas\n` +
            `- The cluster is running (not paused)\n` +
            `Error: ${error.message}`
          : `Failed to connect to MongoDB on localhost:27017. Make sure MongoDB is running.\nError: ${error.message}`;

        throw new Error(errorMsg);
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
