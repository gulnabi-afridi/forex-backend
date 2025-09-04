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
  getAccountSummaryAndHistory,
} from "../controllers/tradingDataController.js";

import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Account Management Routes
router.post("/", addAccount);
router.get("/", getUserAccounts);
router.get("/:mtapiId", getAccountById);
router.put("/:mtapiId/status", checkConnectionStatus);
router.delete("/:mtapiId", deleteAccount);

// Trading Data Routes
router.get("/:mtapiId/positions", getAccountPositions);
router.get("/:mtapiId/close-positions", getAccountClosedOrders);
router.get("/:mtapiId/history", getOrderHistory);
router.get("/:mtapiId/summary-history", getAccountSummaryAndHistory);

export default router;
