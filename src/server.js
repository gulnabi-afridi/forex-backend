import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./utils/db.js";

dotenv.config();

// Database connection state
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    await connectDB();
    isConnected = true;
    console.log("✅ Database connected for serverless function");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
};

// Export handler for Vercel
export default async (req, res) => {
  try {
    // Ensure database is connected
    await connectToDatabase();
    
    // Pass request to Express app
    return app(req, res);
  } catch (error) {
    console.error("Serverless function error:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// For local development only
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  
  connectToDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  }).catch(console.error);
}