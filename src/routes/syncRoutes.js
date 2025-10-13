import express from "express";
import { syncUserLicenseKeys,addUserFromBot } from "../controllers/syncController.js";

const router = express.Router();

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

export default router;
