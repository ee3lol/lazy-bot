import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

// MongoDB connection URI from environment variable
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/discord-bot';

// Connection options
const options = {
  autoIndex: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  family: 4, // Use IPv4, skip trying IPv6
};

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase() {
  try {
    // Set strictQuery to prepare for Mongoose 7
    mongoose.set('strictQuery', false);
    
    // Connect to MongoDB
    const connection = await mongoose.connect(MONGODB_URI, options);
    
    console.log(`MongoDB connected: ${connection.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected, trying to reconnect...');
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return connection;
  } catch (error) {
    if(error instanceof Error)
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Get the current database connection
 */
export function getDbConnection() {
  return mongoose.connection;
}

/**
 * Close the database connection
 */
export async function closeDbConnection() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    if(error instanceof Error)
    console.error(`Error closing MongoDB connection: ${error.message}`);
  }
}