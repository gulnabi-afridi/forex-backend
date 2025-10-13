import TradingAccount from "../models/TradingAccount.js";
import AccountConnectionService from "../services/accountConnectionService.js";
import AccountDataService from "../services/accountDataService.js";
import AccountValidationService from "../services/accountValidationService.js";
import OrderHistory from "../models/orderHistorySchema.js";

//  ADD NEW TRADING ACCOUNT

export const addAccount = async (req, res) => {
  try {
    const { accountNumber, serverName, platform, password } = req.body;
    const userId = req.user.id;

    AccountValidationService.validateAccountData(req.body);

    const existingAccount = await TradingAccount.findOne({
      userId,
      accountNumber,
    });


    if (existingAccount) {
      if (existingAccount.isLicenseTrue && existingAccount.connectionStatus === "pending") {
        console.log("License valid. Reconnecting account...");
      } else if (!existingAccount.isLicenseTrue && existingAccount.connectionStatus === "connected") {
        return res.status(400).json({
          success: false,
          message: "You already have a connected account. Please disconnect first.",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "This trading account is already added.",
        });
      }
    }

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

    let accountToSave;

    if (existingAccount) {
      existingAccount.connectionStatus = connectionData.connectionStatus;
      existingAccount.mtapiId = connectionData.mtapiId;
      existingAccount.isLicenseTrue = false; // 👈 set to false after connecting
      await existingAccount.save();
      accountToSave = existingAccount;
    } else {
      accountToSave = new TradingAccount({
        userId,
        accountNumber,
        serverName,
        platform,
        password,
        mtapiId: connectionData.mtapiId,
        connectionStatus: connectionData.connectionStatus,
      });
      await accountToSave.save();
    }

    try {
      await AccountDataService.accountSummary(accountToSave);
      console.log("✅ Account Summary fetched!");
    } catch (syncError) {
      console.error("⚠️ Initial sync warning:", syncError);
    }

    res.status(201).json({
      success: true,
      message: "Trading account connected successfully",
      data: {
        id: accountToSave._id,
        mtapiId: accountToSave.mtapiId,
        accountNumber: accountToSave.accountNumber,
        serverName: accountToSave.serverName,
        platform: accountToSave.platform,
        connectionStatus: accountToSave.connectionStatus,
        accountSummary: accountToSave.accountSummary,
        createdAt: accountToSave.createdAt,
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


// Receive and process bot account data

export const receiveBotAccountData = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { serverName, accountNumber, password, platform } = req.body;

    // Validate data using your existing validation service
    AccountValidationService.validateAccountData({
      serverName,
      accountNumber,
      password,
      platform,
    });

    console.log(serverName, accountNumber, password, platform);

    // Check if this account already exists for this user
    const accountExists = await AccountValidationService.checkAccountExists(
      userId,
      accountNumber
    );

    if (accountExists) {
      return res.status(400).json({
        success: false,
        message: "This trading account already exists for the user",
      });
    }

    //  Attempt connection using MTAPI
    const connectionData = await AccountConnectionService.connectNewAccount({
      serverName,
      accountNumber,
      password,
      platform,
    });

    if (!connectionData.success) {
      return res.status(400).json({
        success: false,
        message: connectionData.error || "Unable to connect to trading server",
      });
    }

    //  Save the new trading account
    const newAccount = new TradingAccount({
      userId,
      serverName,
      accountNumber,
      password,
      platform,
      mtapiId: connectionData.mtapiId,
      connectionStatus: connectionData.connectionStatus,
    });

    await newAccount.save();

    // Optionally fetch and store initial account summary
    try {
      await AccountDataService.accountSummary(newAccount);
      console.log("✅ Account summary fetched successfully");
    } catch (syncError) {
      console.warn("⚠️ Initial summary fetch failed:", syncError.message);
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: "Trading account received and created successfully",
      data: {
        id: newAccount._id,
        accountNumber: newAccount.accountNumber,
        serverName: newAccount.serverName,
        platform: newAccount.platform,
        connectionStatus: newAccount.connectionStatus,
        mtapiId: newAccount.mtapiId,
        createdAt: newAccount.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ receiveBotAccountData Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bot account data",
      error: error.message,
    });
  }
};

//  GET ALL USER ACCOUNTS

export const getUserAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const accounts = await AccountValidationService.findUserAccounts(userId);

    // Check and update connection status for each account
    const updatedAccounts = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          // Skip if account doesn't have mtapiId
          if (!account.mtapiId) {
            return {
              ...account.toObject(),
              connectionStatus: "not_connected",
              lastConnectionCheck: new Date(),
            };
          }

          console.log(
            `🔍 Checking connection for account ${account.accountNumber} (MTAPI ID: ${account.mtapiId})`
          );

          // Check connection status and reconnect if needed
          const connectionResult =
            await AccountConnectionService.ensureConnection(account);

          // IMPORTANT: Reload account from database to get the latest state including updated mtapiId
          const refreshedAccount = await TradingAccount.findById(account._id);

          if (!refreshedAccount) {
            throw new Error("Account not found after connection check");
          }

          if (connectionResult.success && connectionResult.connected) {
            console.log(
              `✅ Account ${account.accountNumber} connection verified`
            );

            return {
              ...refreshedAccount.toObject(),
              connectionVerified: true,
              reconnected: connectionResult.reconnected || false,
              mtapiIdUpdated: connectionResult.mtapiIdUpdated || false,
              lastConnectionCheck: new Date(),
              connectionError: null,
            };
          } else {
            console.warn(
              `⚠️ Account ${account.accountNumber} connection failed: ${connectionResult.error}`
            );

            return {
              ...refreshedAccount.toObject(),
              connectionVerified: false,
              reconnected: false,
              lastConnectionCheck: new Date(),
              connectionError: connectionResult.error || "Connection failed",
            };
          }
        } catch (error) {
          console.error(
            `❌ Connection check failed for account ${account.accountNumber}:`,
            error
          );

          // Update account status to error
          try {
            account.connectionStatus = "error";
            await account.save();
          } catch (saveError) {
            console.error(
              `Failed to save error status for account ${account.accountNumber}:`,
              saveError
            );
          }

          return {
            ...account.toObject(),
            connectionVerified: false,
            reconnected: false,
            lastConnectionCheck: new Date(),
            connectionError: error.message || "Unknown connection error",
          };
        }
      })
    );

    // Extract successful results and handle any failures
    const processedAccounts = updatedAccounts.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(
          `Failed to process account ${accounts[index].accountNumber}:`,
          result.reason
        );
        return {
          ...accounts[index].toObject(),
          connectionVerified: false,
          reconnected: false,
          connectionError: "Failed to check connection",
          lastConnectionCheck: new Date(),
        };
      }
    });

    // Log detailed summary of connection checks
    const connectedCount = processedAccounts.filter(
      (acc) => acc.connectionVerified
    ).length;
    const reconnectedCount = processedAccounts.filter(
      (acc) => acc.reconnected
    ).length;
    const errorCount = processedAccounts.filter(
      (acc) => acc.connectionError
    ).length;
    const totalCount = processedAccounts.length;

    console.log(
      `📊 Connection Summary: ${connectedCount}/${totalCount} connected, ${reconnectedCount} reconnected, ${errorCount} errors`
    );

    res.status(200).json({
      success: true,
      message: "Accounts fetched successfully with connection verification",
      data: processedAccounts,
      summary: {
        totalAccounts: totalCount,
        connectedAccounts: connectedCount,
        reconnectedAccounts: reconnectedCount,
        errorAccounts: errorCount,
        lastCheckAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ Get Accounts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch accounts",
      error: error.message,
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
    const { mtapiId } = req.params;
    const userId = req.user.id;

    // Find the account
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

    // Disconnect from MTAPI
    await AccountConnectionService.disconnectAccount(account);

    // Delete order history
    await OrderHistory.deleteOne({ accountId: account._id });

    // Delete the account completely
    await TradingAccount.deleteOne({ _id: account._id });

    res.status(200).json({
      success: true,
      message: "Account and its order history deleted successfully",
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
