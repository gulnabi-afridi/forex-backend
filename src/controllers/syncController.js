import { readOnlyPool } from "../utils/readOnlyPool.js";
import User from "../models/User.js";
import TradingAccount from "../models/TradingAccount.js";

export const addUserFromBot = async (req, res) => {
  try {
    const { licenseKey, accountNumber, serverName, platform } = req.body;

    console.log("🔑 Received licenseKey:", licenseKey);

    if (!licenseKey || !accountNumber || !serverName) {
      return res.status(400).json({
        success: false,
        message: "licenseKey, accountNumber and serverName are required.",
      });
    }

    // ✅ Fetch a single license directly from MySQL
    const [result] = await readOnlyPool.query(
      `SELECT ul.licenseKey, u.email AS userEmail
       FROM UserLicenses ul
       INNER JOIN User u ON ul.userId = u.id
       WHERE ul.licenseKey = ?
       LIMIT 1`,
      [licenseKey]
    );

    const licenseRecord = result?.[0]; // single record

    if (!licenseRecord) {
      return res.status(404).json({
        success: false,
        message: "License key not found or invalid.",
      });
    }

    const { userEmail } = licenseRecord;
    console.log("📧 Found user with email:", userEmail);

    // 2️⃣ Check if user exists in MongoDB
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not registered on the platform.",
      });
    }

    // 3️⃣ Check if trading account already exists
    const existingAccount = await TradingAccount.findOne({
      userId: user._id,
      accountNumber,
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: "Trading account already exists for this user.",
      });
    }

    // 4️⃣ Create trading account
    const newAccount = await TradingAccount.create({
      userId: user._id,
      accountNumber,
      serverName,
      platform: platform || "MT5",
      isLicenseTrue: true,
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
