import express from "express";
import {
  addAccount,
  getUserAccounts,
  getAccountById,
  deleteAccount,
  checkConnectionStatus,
} from "../controllers/accountController.js";

import {
  getAccountPositions,
  getAccountClosedOrders,
  getOrderHistory,
} from "../controllers/tradingDataController.js";

import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Account Management Routes
router.post("/", addAccount);
router.get("/", getUserAccounts);
router.get("/:accountNumber", getAccountById);
router.put("/:accountNumber/status", checkConnectionStatus);
router.delete("/:accountNumber", deleteAccount);

// Trading Data Routes
router.get("/:accountNumber/positions", getAccountPositions);
router.get("/:accountNumber/closePositions", getAccountClosedOrders);
router.get("/:accountNumber/history", getOrderHistory);

export default router;
