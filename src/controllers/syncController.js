import UserLicenseKey from "../models/UserLicenseKey.js";
import SyncState from "../models/SyncState.js";
import readOnlyPool from "../utils/readOnlyPool.js";
import User from "../models/User.js";
import TradingAccount from "../models/TradingAccount.js";

export const syncUserLicenseKeys = async () => {
  try {
    console.log("🔄 Starting license key sync...");

    // Get the last sync timestamp
    let syncState = await SyncState.findOne();
    const lastSyncedAt = syncState?.lastSyncedAt || new Date(0);
    console.log(`🕒 Last synced at: ${lastSyncedAt.toISOString()}`);

    // Fetch only license keys and user emails
    const [users] = await readOnlyPool.query(
      `SELECT 
         ul.licenseKey,
         u.email AS userEmail,
         ul.createdAt
       FROM UserLicenses ul
       INNER JOIN User u ON ul.userId = u.id
       WHERE ul.licenseKey IS NOT NULL 
       AND ul.createdAt > ?
       ORDER BY ul.createdAt ASC`,
      [lastSyncedAt]
    );

    if (!users.length) {
      console.log("⚠️ No new license keys found.");
      return;
    }

    console.log(`📦 Found ${users.length} new license keys to sync`);

    let inserted = 0;
    let skipped = 0;

    for (const user of users) {
      const { licenseKey, userEmail } = user;

      // Check if license key already exists in MongoDB
      const existing = await UserLicenseKey.findOne({ licenseKey });
      if (existing) {
        skipped++;
        continue;
      }

      // Create a new record (only license + email)
      await UserLicenseKey.create({
        licenseKey,
        userEmail,
      });

      inserted++;
    }

    // Update sync timestamp to latest createdAt
    const latestTimestamp = users.reduce((max, u) => {
      const ts = new Date(u.createdAt);
      return ts > max ? ts : max;
    }, lastSyncedAt);

    if (syncState) {
      syncState.lastSyncedAt = latestTimestamp;
      await syncState.save();
    } else {
      await SyncState.create({ lastSyncedAt: latestTimestamp });
    }

    console.log(
      `✅ Sync complete — Inserted: ${inserted}, Skipped: ${skipped}, Total: ${users.length}`
    );
  } catch (error) {
    console.error("❌ Error during license sync:", error.message);
    console.error("Full error details:", error);
    throw error;
  }
};

export const addUserFromBot = async (req, res) => {
  try {
    const { licenseKey, accountNumber, serverName, platform } = req.body;

    // Validate request
    if ((!licenseKey, !accountNumber, !serverName)) {
      return res.status(400).json({
        success: false,
        message: "licenseKey, accountNumber and password are required.",
      });
    }

    // 1️⃣ Find license key in UserLicenseKey collection
    const licenseData = await UserLicenseKey.findOne({ licenseKey });
    if (!licenseData) {
      return res.status(404).json({
        success: false,
        message: "License key not found or invalid.",
      });
    }

    // 2️⃣ Check if user exists by email
    const user = await User.findOne({ email: licenseData.userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not registered on the platform.",
      });
    }

    // 3️⃣ Check if trading account already exists
    const existingAccount = await TradingAccount.findOne({
      userId: user._id,
      accountNumber: accountNumber,
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: "Trading account already exists for this user.",
      });
    }

    // 4️⃣ Create new trading account
    const newAccount = await TradingAccount.create({
      userId: user._id,
      accountNumber: accountNumber || null,
      serverName: serverName || null,
      isLicenseTrue: true,
      platform: platform || "MT5",
      password: null,
      accountSummary: null,
    });

    return res.status(201).json({
      success: true,
      message: "License verified and trading account created successfully.",
      data: newAccount,
    });
  } catch (error) {
    console.error("❌ Error verifying license:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
