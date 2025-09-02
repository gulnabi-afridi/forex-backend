import express from "express";
import {
  addAccount,
  getUserAccounts,
  getAccountById,
  deleteAccount,
  checkConnectionStatus,
  getAccountPositions,
  getAccountClosedOrders,
  getAccountOrders,
} from "../controllers/accountController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", addAccount);
router.get("/", getUserAccounts);
router.get("/:accountNumber", getAccountById);
router.get("/:accountNumber/positions", getAccountPositions);
router.get("/:accountNumber/closePositions", getAccountClosedOrders);
router.get("/:accountNumber/orders", getAccountOrders);
router.put("/:accountNumber/status", checkConnectionStatus);
router.delete("/:accountNumber", deleteAccount);

export default router;
