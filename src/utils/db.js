import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI =
    process.env.NODE_ENV === "production"
      ? process.env.MONGO_PRODUCTION_URL  
      : process.env.MONGO_DEVELOPMENT_URL;

    if (!mongoURI) {
      console.error("❌ MongoDB connection string is not defined in environment variables");
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected successfully`);
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
