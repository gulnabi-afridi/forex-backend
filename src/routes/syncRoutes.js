import express from "express";
import { addUserFromBot } from "../controllers/syncController.js";

const router = express.Router();


router.post("/add-user-from-bot", addUserFromBot);

export default router;
