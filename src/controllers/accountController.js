import TradingAccount from "../models/TradingAccount.js";
import AccountConnectionService from "../services/accountConnectionService.js";
import AccountDataService from "../services/accountDataService.js";
import AccountValidationService from "../services/accountValidationService.js";

//  ADD NEW TRADING ACCOUNT

export const addAccount = async (req, res) => {
  try {
    const { accountNumber, serverName, platform, password } = req.body;
    const userId = req.user.id;

    // 1. Validate input
    AccountValidationService.validateAccountData(req.body);

    // 2. Check if account already exists
    const accountExists = await AccountValidationService.checkAccountExists(
      userId,
      accountNumber
    );

    if (accountExists) {
      return res.status(400).json({
        success: false,
        message: "This trading account is already added",
      });
    }

    // 3. Connect account via MTAPI
    const connectionData = await AccountConnectionService.connectNewAccount({
      accountNumber,
      password,
      serverName,
      platform,
    });

    if (!connectionData.success) {
      return res.status(400).json({
        success: false,
        error: connectionData.error || "Unable to connect to MT5 server",
      });
    }

    // 4. Save account to database
    const newAccount = new TradingAccount({
      userId,
      accountNumber,
      serverName,
      platform,
      password,
      mtapiId: connectionData.mtapiId,
      connectionStatus: connectionData.connectionStatus,
    });

    await newAccount.save();

    // 5. Get initial account info
    try {
      await AccountDataService.accountSummary(newAccount);
      console.log("✅ Account Summary fetched!");
    } catch (syncError) {
      console.error("⚠️ Initial sync warning:", syncError);
    }

    // 6. Return success response
    res.status(201).json({
      success: true,
      message: "Trading account added successfully",
      data: {
        id: newAccount._id,
        mtapiId: newAccount.mtapiId,
        accountNumber: newAccount.accountNumber,
        serverName: newAccount.serverName,
        platform: newAccount.platform,
        connectionStatus: newAccount.connectionStatus,
        accountSummary: newAccount.accountSummary,
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

//  GET ALL USER ACCOUNTS

export const getUserAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const accounts = await AccountValidationService.findUserAccounts(userId);

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
    const { mtapiId } = req.params;
    const userId = req.user.id;

    AccountValidationService.validateAccountNumber(mtapiId);

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

    // Ensure connection
    const connectionCheck = await AccountConnectionService.ensureConnection(
      account
    );

    if (!connectionCheck.success) {
      return res.status(400).json({
        success: false,
        message: "Account connection failed",
        connectionError: connectionCheck.error,
        data: {
          ...account.toObject(),
          liveStats: account.accountStats,
          connectionStatus: account.connectionStatus,
          lastAttempt: new Date(),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...account.toObject(),
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

//  DELETE ACCOUNT

export const deleteAccount = async (req, res) => {
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

    // Disconnect from MTAPI
    await AccountConnectionService.disconnectAccount(account);

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

    if (!account.mtapiId) {
      return res.status(400).json({
        success: false,
        message: "Account not connected to MTAPI",
      });
    }

    const connectionResult = await AccountConnectionService.ensureConnection(
      account
    );

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
