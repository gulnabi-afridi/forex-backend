import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { expertsMiddleware } from "../middlewares/expertsMiddleware.js";
import { changePassword } from "../controllers/userController.js";
import { getUserProfile } from "../controllers/userController.js";
import {
  addPreset,
  getOfficalPresets,
  getBots,
  getBotFile,
  communityPresets,
  myPresets,
  toggleFavoritePreset,
  favoritePresets,
  getBotVersions
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

// Experts routes - require experts access
router.get("/bots", expertsMiddleware, getBots);
router.get("/bot-file", expertsMiddleware, getBotFile);

router.post("/add-preset", expertsMiddleware, singleFileUpload("botFile"), addPreset);
router.get("/preset", expertsMiddleware, getBotPresetData);
router.delete("/preset-file", expertsMiddleware, deletePresetFile);
router.put("/preset", expertsMiddleware, singleFileUpload("botFile"), editPreset);

router.get("/offical-presets", expertsMiddleware, getOfficalPresets);
router.get("/community-presets", expertsMiddleware, communityPresets);
router.get('/bot-versions', expertsMiddleware, getBotVersions);
router.get("/my-presets", expertsMiddleware, myPresets);
router.post("/toggle-favorite-preset", expertsMiddleware, toggleFavoritePreset);
router.get("/favorite-presets", expertsMiddleware, favoritePresets);

export default router;