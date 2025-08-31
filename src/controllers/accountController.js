import TradingAccount from "../models/TradingAccount.js";
import MetaApi from "metaapi.cloud-sdk";

const metaApi = new MetaApi(process.env.META_API_TOKEN);

export const addAccount = async (req, res) => {
  try {
    const { accountNumber, serverName, platform, password } = req.body;
    const userId = req.user.id;

    // validate input
    if (!accountNumber || !serverName || !platform || !password) {
      return res.status(400).json({
        message:
          "All fields required: accountNumber, serverName, platform, password",
      });
    }

    if (!["MT4", "MT5"].includes(platform)) {
      return res.status(400).json({
        message: "Platform must be MT4 or MT5",
      });
    }

    // check if account already exists for this user
    const existingAccount = await TradingAccount.findOne({
      userId: userId,
      accountNumber: accountNumber,
    });

    if (existingAccount) {
      return res.status(400).json({
        message: "This trading account is already added",
      });
    }

    // create MetaAPI account
    let metaApiAccountId = null;
    try {
      const metaApiAccount = await metaApi.metatraderAccountApi.createAccount({
        login: accountNumber,
        password: password,
        name: `Account ${accountNumber}`,
        server: serverName,
        platform: platform.toLowerCase(),
        magic: 0,
      });
      metaApiAccountId = metaApiAccount.id;
    } catch (metaApiError) {
      return res.status(400).json({
        message: "Failed to connect account. Please check your credentials.",
        error: metaApiError.message,
      });
    }

    // save account to database
    const newAccount = new TradingAccount({
      userId: userId,
      accountNumber: accountNumber,
      serverName: serverName,
      platform: platform,
      password: password,
      metaApiAccountId: metaApiAccountId,
      connectionStatus: "pending",
    });

    await newAccount.save();

    // deploy account
    try {
      const account = await metaApi.metatraderAccountApi.getAccount(
        metaApiAccountId
      );
      await account.deploy();

      newAccount.connectionStatus = "connected";
      await newAccount.save();
    } catch (deployError) {
      console.log("Deployment pending:", deployError.message);
    }

    res.status(201).json({
      message: "Trading account added successfully",
      account: {
        id: newAccount._id,
        accountNumber: newAccount.accountNumber,
        serverName: newAccount.serverName,
        platform: newAccount.platform,
        connectionStatus: newAccount.connectionStatus,
        createdAt: newAccount.createdAt,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to add trading account", error: err.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    const account = await TradingAccount.findOne({
      _id: accountId,
      userId: userId,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // soft delete
    account.isActive = false;
    await account.save();

    // undeploy from MetaAPI
    if (account.metaApiAccountId) {
      try {
        const metaApiAccount = await metaApi.metatraderAccountApi.getAccount(
          account.metaApiAccountId
        );
        await metaApiAccount.undeploy();
      } catch (metaApiError) {
        console.log("MetaAPI undeploy error:", metaApiError.message);
      }
    }

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete account", error: err.message });
  }
};

export const syncAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    const account = await TradingAccount.findOne({
      _id: accountId,
      userId: userId,
      isActive: true,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (!account.metaApiAccountId) {
      return res
        .status(400)
        .json({ message: "Account not connected to MetaAPI" });
    }

    // sync with MetaAPI
    const metaApiAccount = await metaApi.metatraderAccountApi.getAccount(
      account.metaApiAccountId
    );
    const connection = await metaApiAccount.getStreamingConnection();
    await connection.connect();

    const accountInfo = await connection.getAccountInformation();

    // update account stats
    account.accountStats = {
      balance: accountInfo.balance,
      equity: accountInfo.equity,
      margin: accountInfo.margin,
      freeMargin: accountInfo.freeMargin,
      currency: accountInfo.currency,
    };
    account.lastSyncAt = new Date();
    account.connectionStatus = "connected";
    await account.save();

    res.json({
      message: "Account synced successfully",
      stats: account.accountStats,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to sync account", error: err.message });
  }
};
