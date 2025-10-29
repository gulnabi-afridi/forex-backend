import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { changePassword } from "../controllers/userController.js";
import { getUserProfile } from "../controllers/userController.js";
import {
  addPreset,
  getOfficalPresets,
  getBots,
  getBotFile,
  communityPresets,
  myPresets,
  toggleFavoritePreset
} from "../controllers/userBotController.js";
import {
  getBotPresetData,
  editPreset,
  deletePresetFile,
} from "../controllers/admin/botController.js";
import { singleFileUpload } from "../middlewares/fileUploadMiddleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post("/change-password", changePassword);
router.get("/me", getUserProfile);
router.get("/bots", getBots);
router.get("/bot-file", getBotFile);

router.post("/add-preset", singleFileUpload("botFile"), addPreset);
router.get("/preset", getBotPresetData);
router.delete("/preset-file", deletePresetFile);
router.put("/preset", singleFileUpload("botFile"), editPreset);

router.get("/offical-presets", getOfficalPresets);
router.get("/community-presets", communityPresets);
router.get("/my-presets", myPresets);
router.post("/toggle-favorite-preset", toggleFavoritePreset);

export default router;
