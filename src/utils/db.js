import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      console.log("✅ Using existing MongoDB connection");
      return;
    }

    const mongoURI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_PRODUCTION_URL
        : process.env.MONGO_DEVELOPMENT_URL;

    if (!mongoURI) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    console.log("🔄 Connecting to MongoDB...");

    console.log(`✅ MongoDB Connected`);
    
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    throw error;
  }
};

export default connectDB;
