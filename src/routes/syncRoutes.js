import express from "express";
import {
  syncUserLicenseKeys,
  addUserFromBot,
} from "../controllers/syncController.js";

const router = express.Router();

// Manual sync endpoint
router.get("/license-keys", async (req, res) => {
  try {
    await syncUserLicenseKeys();
    res
      .status(200)
      .json({ success: true, message: "Sync completed successfully" });
  } catch (error) {
    console.error("❌ Error during manual sync:", error);
    res
      .status(500)
      .json({ success: false, message: "Sync failed", error: error.message });
  }
});

router.post("/add-user-from-bot", addUserFromBot);

// 🔄 Automatic sync every 1 minute (60,000 milliseconds)
let syncInterval;

// Function to start the sync
const startAutoSync = () => {
  console.log("🚀 Starting auto-sync for license keys (every 1 minute)...");
  
  // Run immediately on startup
  syncUserLicenseKeys()
    .then(() => console.log("✅ Initial sync completed"))
    .catch((error) => console.error("❌ Initial sync failed:", error.message));

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

startAutoSync();

// Optional: Cleanup function (useful for graceful shutdown)
process.on("SIGTERM", () => {
  console.log("⏹️ Stopping auto-sync...");
  if (syncInterval) clearInterval(syncInterval);
});

export default router;