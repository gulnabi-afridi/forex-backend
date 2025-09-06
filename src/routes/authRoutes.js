import express from "express";
import { loginUser } from "../controllers/authController.js";
import { logoutUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/logout", logoutUser);

export default router;
