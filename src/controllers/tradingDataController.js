import AccountConnectionService from "../services/accountConnectionService.js";
import AccountDataService from "../services/accountDataService.js";
import AccountValidationService from "../services/accountValidationService.js";

//  GET OPEN POSITIONS

export const getAccountPositions = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    const account = await AccountValidationService.findUserAccount(
      accountNumber,
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
    const { accountNumber } = req.params;
    const userId = req.user.id;

    const account = await AccountValidationService.findUserAccount(
      accountNumber,
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

//  GET ORDER HISTORY (Last 30 days)

export const getOrderHistory = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    // Find the trading account
    const account = await AccountValidationService.findUserAccount(
      accountNumber,
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
      message: "Order history synced & stored successfully",
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
