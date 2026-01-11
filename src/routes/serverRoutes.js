import express from "express";
import { getServers } from "../controllers/serverController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all active servers
router.get("/", getServers);

export default router;

