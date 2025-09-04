import AccountConnectionService from "../services/accountConnectionService.js";
import AccountDataService from "../services/accountDataService.js";
import AccountValidationService from "../services/accountValidationService.js";
import OrderHistory from "../models/orderHistorySchema.js";
import TradingAccount from "../models/TradingAccount.js";

//  GET OPEN POSITIONS

export const getAccountPositions = async (req, res) => {
  try {
    const { mtapiId } = req.params;
    const userId = req.user.id;

    const account = await AccountValidationService.findUserAccount(
      mtapiId,
      userId,
      true
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check and ensure connection
    const connectionCheck = await AccountConnectionService.ensureConnection(
      account
    );

    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: [],
      });
    }

    const positionsResult = await AccountDataService.getOpenPositions(account);

    if (!positionsResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch positions",
        error: positionsResult.error,
      });
    }

    res.status(200).json({
      success: true,
      count: positionsResult.data.length,
      data: positionsResult.data,
      connectionVerified: true,
    });
  } catch (error) {
    console.error("❌ Get Positions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch positions",
    });
  }
};

//  GET CLOSED ORDERS - Return the most reson one.

export const getAccountClosedOrders = async (req, res) => {
  try {
    const { mtapiId } = req.params;
    const userId = req.user.id;

    const account = await AccountValidationService.findUserAccount(
      mtapiId,
      userId,
      true
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check and ensure connection
    const connectionCheck = await AccountConnectionService.ensureConnection(
      account
    );

    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: [],
      });
    }

    const closedOrdersResult = await AccountDataService.getClosedOrders(
      account
    );

    if (!closedOrdersResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch closed orders",
        error: closedOrdersResult.error,
      });
    }

    res.status(200).json({
      success: true,
      data: closedOrdersResult.data,
      connectionVerified: true,
    });
  } catch (error) {
    console.error("❌ Get Closed Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch closed orders",
    });
  }
};

//  GET ORDER HISTORY

export const getOrderHistory = async (req, res) => {
  try {
    const { mtapiId } = req.params;
    const userId = req.user.id;

    // Find the trading account
    const account = await AccountValidationService.findUserAccount(
      mtapiId,
      userId,
      true
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Check account connection
    const connectionCheck = await AccountConnectionService.ensureConnection(
      account
    );
    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: [],
      });
    }

    // Get order history
    const historyResult = await AccountDataService.getOrderHistory(account);

    res.status(200).json({
      success: true,
      message: "Order history stored successfully",
      count: historyResult.orders.length,
      data: historyResult.orders,
      dateRange: historyResult.dateRange,
      connectionVerified: true,
    });
  } catch (error) {
    console.error("❌ Get Order History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch/store order history",
    });
  }
};

// Get getAccountSummaryAndHistory from database ---------->

export const getAccountSummaryAndHistory = async (req, res) => {
  try {
    const { mtapiId } = req.params;
    const userId = req.user.id;
    const { forceSync = false } = req.query;

    // 1. Find account
    const account = await TradingAccount.findOne({ mtapiId, userId });
    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    // 2. Get latest stats (from DB first)
    let accountStats = account.accountSummary;

    if (forceSync) {
      console.log(`🔄 [${account.accountNumber}] Force sync started...`);
      const syncResult = await AccountDataService.syncAccountData(account);
      if (syncResult.success) {
        accountStats = syncResult.data;
        console.log(`✅ [${account.accountNumber}] Force sync completed`);
      } else {
        console.log(`⚠️ [${account.accountNumber}] Force sync failed`);
      }
    } else {
      console.log(`⏳ [${account.accountNumber}] Background sync triggered...`);
      AccountDataService.syncAccountData(account)
        .then(() =>
          console.log(`✅ [${account.accountNumber}] Background sync completed`)
        )
        .catch((err) =>
          console.error(
            `❌ [${account.accountNumber}] Background sync failed:`,
            err
          )
        );
    }

    // 3. Fetch order history (cached DB)
    let orderHistory = await OrderHistory.findOne({ accountId: account._id });
    if (!orderHistory) {
      console.log(
        `📥 [${account.accountNumber}] No history in DB, fetching from MTAPI...`
      );
      const syncResult = await AccountDataService.syncAccountData(account, {
        days: null,
      });

      if (syncResult.success) {
        orderHistory = await OrderHistory.findOne({ accountId: account._id });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to sync order history for new account",
        });
      }
    }

    // 5. Return response with metadata + stats
    res.status(200).json({
      success: true,
      account: {
        accountNumber: account.accountNumber,
        serverName: account.serverName,
        platform: account.platform,
        connectionStatus: account.connectionStatus,
        accountSummary: accountStats,
      },
      orderHistory: orderHistory.data,
      count: orderHistory.data.length,
      message: "Data fetched (updates may still be syncing)",
    });
  } catch (error) {
    console.error("❌ Get Summary + History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch account summary/history",
    });
  }
};
