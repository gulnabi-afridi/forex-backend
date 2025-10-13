import express from "express";
import mongoose from "mongoose";
import {
  syncUserLicenseKeys,
  addUserFromBot,
} from "../controllers/syncController.js";

const router = express.Router();

// Manual sync endpoint
router.get("/license-keys", async (req, res) => {
  try {
    const result = await syncUserLicenseKeys();
    res.status(200).json({ 
      success: true, 
      message: "Sync completed successfully",
      data: result
    });
  } catch (error) {
    console.error("❌ Error during manual sync:", error);
    res.status(500).json({ 
      success: false, 
      message: "Sync failed", 
      error: error.message 
    });
  }
});

router.post("/add-user-from-bot", addUserFromBot);

// 🔄 Automatic sync - starts only after MongoDB is connected
let syncInterval;

const startAutoSync = async () => {
  // Wait for MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    console.log("⏳ Waiting for MongoDB connection before starting auto-sync...");
    
    // Wait for the connection event
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });
  }

  console.log("🚀 MongoDB connected. Starting auto-sync for license keys (every 1 minute)...");
  
  // Run immediately on startup
  try {
    await syncUserLicenseKeys();
    console.log("✅ Initial sync completed");
  } catch (error) {
    console.error("❌ Initial sync failed:", error.message);
  }

  // Then run every 1 minute
  syncInterval = setInterval(async () => {
    console.log("⏰ Running scheduled license key sync...");
    try {
      await syncUserLicenseKeys();
      console.log("✅ Scheduled sync completed successfully");
    } catch (error) {
      console.error("❌ Scheduled sync failed:", error.message);
    }
  }, 60000); // 1 minute = 60,000 ms
};

// Start auto-sync (it will wait for MongoDB internally)
startAutoSync();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("⏹️ Stopping auto-sync...");
  if (syncInterval) clearInterval(syncInterval);
});

process.on("SIGINT", () => {
  console.log("⏹️ Stopping auto-sync...");
  if (syncInterval) clearInterval(syncInterval);
  process.exit(0);
});

export default router;