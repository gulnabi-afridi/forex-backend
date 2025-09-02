import TradingAccount from "../models/TradingAccount.js";
import { mtapiService } from "../services/mtapiService.js";

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

    const mtapiId = connectionResult.data.id || connectionResult.data.accountId;

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
          freeMargin: accountInfo.freeMargin || 0,
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
      accountNumber: accountNumber, // Search by accountNumber field
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

    // Get live account data from MTAPI if connected
    let liveData = null;
    if (account.mtapiId && account.connectionStatus === "connected") {
      try {
        const accountInfoResult = await mtapiService.getAccountInfo(
          account.mtapiId
        );
        if (accountInfoResult.success) {
          const accountInfo = accountInfoResult.data;
          liveData = {
            balance: accountInfo.balance || 0,
            equity: accountInfo.equity || 0,
            margin: accountInfo.margin || 0,
            freeMargin: accountInfo.freeMargin || 0,
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
        }
      } catch (mtapiError) {
        console.error("⚠️ MTAPI fetch error:", mtapiError);
        liveData = account.accountStats; // Use cached data
      }
    } else {
      liveData = account.accountStats;
    }

    res.status(200).json({
      success: true,
      data: {
        ...account.toObject(),
        liveStats: liveData,
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
        await mtapiService.disconnectAccount(account.mtapiId);
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
export const updateConnectionStatus = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    const account = await TradingAccount.findOne({
      _id: accountId,
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

    // Check connection status
    try {
      const statusResult = await mtapiService.getConnectionStatus(
        account.mtapiId
      );

      if (statusResult.success) {
        const status = statusResult.data.connected
          ? "connected"
          : "disconnected";
        account.connectionStatus = status;
        await account.save();

        res.status(200).json({
          success: true,
          data: {
            accountId: accountId,
            connectionStatus: status,
            lastChecked: new Date(),
          },
        });
      } else {
        account.connectionStatus = "error";
        await account.save();

        res.status(200).json({
          success: true,
          data: {
            accountId: accountId,
            connectionStatus: "error",
            error: statusResult.error,
          },
        });
      }
    } catch (error) {
      account.connectionStatus = "error";
      await account.save();

      res.status(500).json({
        success: false,
        message: "Failed to check connection status",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("❌ Connection Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check connection status",
    });
  }
};
