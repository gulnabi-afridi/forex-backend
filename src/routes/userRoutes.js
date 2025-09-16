import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { changePassword } from "../controllers/userController.js";
import { getUserProfile } from "../controllers/userController.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post("/change-password", changePassword);
router.get("/me", getUserProfile);

export default router;
