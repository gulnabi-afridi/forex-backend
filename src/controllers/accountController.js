import TradingAccount from "../models/TradingAccount.js";
import { mtapiService } from "../services/mtapiService.js";
import OrderHistory from "../models/orderHistorySchema.js";

// Helper function to ensure account is connected
const ensureAccountConnection = async (account) => {
  try {
    // If no mtapiId, account was never connected
    if (!account.mtapiId) {
      throw new Error("Account was never connected to MTAPI");
    }

    // Check current connection status
    const statusResult = await mtapiService.getConnectionStatus(
      account.mtapiId,
      account.platform
    );

    if (statusResult.success && statusResult.data) {
      // Account is connected
      if (account.connectionStatus !== "connected") {
        account.connectionStatus = "connected";
        await account.save();
        console.log("✅ Account connection status updated to connected");
      }
      return { success: true, connected: true };
    }

    // Account is disconnected, try to reconnect
    console.log("🔄 Account disconnected, attempting to reconnect...");

    const reconnectResult = await mtapiService.connectAccount({
      accountNumber: account.accountNumber,
      password: account.password,
      serverName: account.serverName,
      platform: account.platform,
    });

    if (reconnectResult.success) {
      // Update mtapiId in case it changed
      const newMtapiId =
        reconnectResult.data.id ||
        reconnectResult.data.token ||
        reconnectResult.data;

      account.mtapiId = newMtapiId;
      account.connectionStatus = "connected";
      await account.save();

      console.log("✅ Account reconnected successfully");
      return { success: true, connected: true };
    }

    // Failed to reconnect
    account.connectionStatus = "disconnected";
    await account.save();

    return {
      success: false,
      connected: false,
      error: "Failed to reconnect account",
    };
  } catch (error) {
    console.error("❌ Connection check error:", error);
    account.connectionStatus = "error";
    await account.save();

    return {
      success: false,
      connected: false,
      error: error.message,
    };
  }
};

// ADD NEW TRADING ACCOUNT
export const addAccount = async (req, res) => {
  try {
    const { accountNumber, serverName, platform, password } = req.body;
    const userId = req.user.id;

    // 1. Validate input
    if (!accountNumber || !serverName || !platform || !password) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required: accountNumber, serverName, platform, password",
      });
    }

    if (!["MT4", "MT5"].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: "Platform must be MT4 or MT5",
      });
    }

    // 2. Check if account already exists
    const existingAccount = await TradingAccount.findOne({
      userId,
      accountNumber,
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: "This trading account is already added",
      });
    }

    // 3. Connect account via MTAPI
    const connectionResult = await mtapiService.connectAccount({
      accountNumber,
      password,
      serverName,
      platform,
    });

    if (!connectionResult.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to connect account. Please check your credentials.",
        error: connectionResult.error,
      });
    }

    // The MTAPI returns an id/token that we use for subsequent requests
    const mtapiId =
      connectionResult.data.id ||
      connectionResult.data.token ||
      connectionResult.data;

    // 4. Save account to database
    const newAccount = new TradingAccount({
      userId,
      accountNumber,
      serverName,
      platform,
      password,
      mtapiId,
      connectionStatus: "connected",
    });

    await newAccount.save();

    // 5. Get initial account info
    try {
      const accountInfoResult = await mtapiService.getAccountInfo(
        mtapiId,
        platform
      );




      if (accountInfoResult.success) {
        const accountInfo = accountInfoResult.data;
        newAccount.accountStats = {
          balance: accountInfo.balance || 0,
          equity: accountInfo.equity || 0,
          margin: accountInfo.margin || 0,
          profit: accountInfo.profit || 0,
          freeMargin: accountInfo.free_margin || accountInfo.freeMargin || 0,
          currency: accountInfo.currency || "USD",
          leverage: accountInfo.leverage || 100,
        };
        newAccount.lastSyncAt = new Date();
        await newAccount.save();
        console.log("✅ Initial account data synced");
      }
    } catch (syncError) {
      console.error("⚠️ Initial sync warning:", syncError);
    }

    // 6. Return success response
    res.status(201).json({
      success: true,
      message: "Trading account added successfully",
      data: {
        id: newAccount._id,
        accountNumber: newAccount.accountNumber,
        serverName: newAccount.serverName,
        platform: newAccount.platform,
        connectionStatus: newAccount.connectionStatus,
        accountStats: newAccount.accountStats,
        createdAt: newAccount.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Add Account Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add trading account",
      error: error.message,
    });
  }
};

// GET ALL USER ACCOUNTS
export const getUserAccounts = async (req, res) => {
  try {
    const userId = req.user.id;

    const accounts = await TradingAccount.find({
      userId: userId,
      isActive: true,
    })
      .select("-password") // Don't return password
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Accounts fetched successfully",
      data: accounts,
    });
  } catch (error) {
    console.error("❌ Get Accounts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch accounts",
    });
  }
};

// GET SPECIFIC ACCOUNT DETAILS
export const getAccountById = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    // Validate accountNumber
    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Account number is required",
      });
    }

    // Find account by accountNumber (not _id)
    const account = await TradingAccount.findOne({
      accountNumber: accountNumber,
      userId: userId,
      isActive: true,
    }).select("-password");

    console.log("Found account:", account);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // CHECK AND ENSURE CONNECTION BEFORE PROCEEDING
    const connectionCheck = await ensureAccountConnection(account);

    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: {
          ...account.toObject(),
          liveStats: account.accountStats, // Return cached data
          connectionStatus: account.connectionStatus,
          lastAttempt: new Date(),
        },
      });
    }

    // Get live account data from MTAPI (connection is now ensured)
    let liveData = null;
    try {
      const accountInfoResult = await mtapiService.getAccountInfo(
        account.mtapiId,
        account.platform
      );

      if (accountInfoResult.success) {
        const accountInfo = accountInfoResult.data;
        liveData = {
          balance: accountInfo.balance || 0,
          equity: accountInfo.equity || 0,
          margin: accountInfo.margin || 0,
          freeMargin: accountInfo.free_margin || accountInfo.freeMargin || 0,
          currency: accountInfo.currency || "USD",
          leverage: accountInfo.leverage || 100,
        };

        // Update cached stats
        account.accountStats = liveData;
        account.lastSyncAt = new Date();
        await account.save();

        console.log("✅ Live data fetched for account:", accountNumber);
      } else {
        liveData = account.accountStats; // Use cached data
        console.log("⚠️ Using cached data due to MTAPI error");
      }
    } catch (mtapiError) {
      console.error("⚠️ MTAPI fetch error:", mtapiError);
      liveData = account.accountStats; // Use cached data
    }

    res.status(200).json({
      success: true,
      data: {
        ...account.toObject(),
        liveStats: liveData,
        connectionVerified: true,
        lastSyncAt: account.lastSyncAt,
      },
    });
  } catch (error) {
    console.error("❌ Get Account Details Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch account details",
    });
  }
};

// GET OPEN POSITIONS
export const getAccountPositions = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    const account = await TradingAccount.findOne({
      accountNumber: accountNumber,
      userId: userId,
      isActive: true,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // CHECK AND ENSURE CONNECTION BEFORE PROCEEDING
    const connectionCheck = await ensureAccountConnection(account);

    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: [],
      });
    }

    const positionsResult = await mtapiService.getOpenPositions(
      account.mtapiId,
      account.platform
    );

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

// GET CLOSED ORDERS
export const getAccountClosedOrders = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    const account = await TradingAccount.findOne({
      accountNumber,
      userId,
      isActive: true,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // CHECK AND ENSURE CONNECTION BEFORE PROCEEDING
    const connectionCheck = await ensureAccountConnection(account);

    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: [],
      });
    }

    const closedOrdersResult = await mtapiService.getClosedOrders(
      account.mtapiId,
      account.platform
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


// GET ORDER HISTORY (Last 30 days)
export const getOrderHistory = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    // 1. Find the trading account
    const account = await TradingAccount.findOne({
      accountNumber,
      userId,
      isActive: true,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // 2. Check account connection
    const connectionCheck = await ensureAccountConnection(account);
    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: [],
      });
    }

    // 3. Date range (last 30 days)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);

    const formatDate = (date) => date.toISOString().slice(0, 19);

    // 4. Fetch order history from MTAPI
    const orderHistoryResult = await mtapiService.getOrderHistory(
      account.mtapiId,
      account.platform,
      formatDate(fromDate),
      formatDate(toDate)
    );

    if (!orderHistoryResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch order history",
        error: orderHistoryResult.error,
      });
    }

    const orders = orderHistoryResult.data.orders || orderHistoryResult.data;

    // 5. Save/merge into DB (single document per account)
    let history = await OrderHistory.findOne({ accountId: account._id });

    if (!history) {
      // Create new document
      history = await OrderHistory.create({
        accountId: account._id,
        data: orders.map((order) => ({
          ticket: order.ticket,
          symbol: order.symbol,
          type: order.type,
          volume: order.volume,
          openTime: new Date(order.openTime),
          closeTime: order.closeTime ? new Date(order.closeTime) : null,
          openPrice: order.openPrice,
          closePrice: order.closePrice,
          profit: order.profit,
          commission: order.commission,
          swap: order.swap,
          rawData: order,
        })),
      });
    } else {
      // Merge new orders (skip duplicates)
      const existingTickets = new Set(history.data.map((o) => o.ticket));
      const newOrders = orders
        .filter((order) => !existingTickets.has(order.ticket))
        .map((order) => ({
          ticket: order.ticket,
          symbol: order.symbol,
          type: order.type,
          volume: order.volume,
          openTime: new Date(order.openTime),
          closeTime: order.closeTime ? new Date(order.closeTime) : null,
          openPrice: order.openPrice,
          closePrice: order.closePrice,
          profit: order.profit,
          commission: order.commission,
          swap: order.swap,
          rawData: order,
        }));

      if (newOrders.length > 0) {
        history.data.push(...newOrders);
        await history.save();
      }
    }

    // 6. Response
    res.status(200).json({
      success: true,
      message: "Order history synced & stored successfully",
      count: orders.length,
      data: orders,
      dateRange: {
        from: formatDate(fromDate),
        to: formatDate(toDate),
      },
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


// DELETE ACCOUNT
export const deleteAccount = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    console.log("Deleting account:", accountNumber, "for user:", userId);

    const account = await TradingAccount.findOne({
      accountNumber: accountNumber,
      userId: userId,
    });

    console.log("Found account for deletion:", account);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Disconnect from MTAPI
    if (account.mtapiId) {
      try {
        await mtapiService.disconnectAccount(account.mtapiId, account.platform);
        console.log("✅ Account disconnected from MTAPI");
      } catch (mtapiError) {
        console.error("⚠️ MTAPI disconnect error:", mtapiError);
      }
    }

    // Soft delete (keep data but mark as inactive)
    account.isActive = false;
    await account.save();

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete Account Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};

// UPDATE ACCOUNT CONNECTION STATUS
export const checkConnectionStatus = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const userId = req.user.id;

    const account = await TradingAccount.findOne({
      accountNumber: accountNumber,
      userId: userId,
      isActive: true,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (!account.mtapiId) {
      return res.status(400).json({
        success: false,
        message: "Account not connected to MTAPI",
      });
    }

    // Use the enhanced connection check
    const connectionResult = await ensureAccountConnection(account);

    if (connectionResult.success) {
      return res.status(200).json({
        success: true,
        data: {
          accountNumber,
          connectionStatus: "connected",
          lastChecked: new Date(),
          reconnected: connectionResult.reconnected || false,
        },
      });
    } else {
      return res.status(200).json({
        success: true,
        data: {
          accountNumber,
          connectionStatus: account.connectionStatus,
          error: connectionResult.error,
          lastChecked: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("❌ Connection Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check connection status",
    });
  }
};
