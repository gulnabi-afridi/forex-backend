import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./utils/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// For local development
if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  });
}

// For Vercel deployment - export the app
export default async (req, res) => {
  await connectDB();
  return app(req, res);
};
