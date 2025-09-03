import TradingAccount from "../models/TradingAccount.js";

//  Service to handle account validation and checks

class AccountValidationService {
  static validateAccountData(accountData) {
    const { accountNumber, serverName, platform, password } = accountData;

    if (!accountNumber || !serverName || !platform || !password) {
      throw new Error(
        "All fields are required: accountNumber, serverName, platform, password"
      );
    }

    if (!["MT4", "MT5"].includes(platform)) {
      throw new Error("Platform must be MT4 or MT5");
    }
  }

  static async checkAccountExists(userId, accountNumber) {
    const existingAccount = await TradingAccount.findOne({
      userId,
      accountNumber,
    });

    return !!existingAccount;
  }

  static async findUserAccount(accountNumber, userId, includePassword = false) {
    const query = TradingAccount.findOne({
      accountNumber,
      userId,
      isActive: true,
    });

    if (!includePassword) {
      query.select("-password");
    }

    return await query;
  }

  static async findUserAccounts(userId) {
    return await TradingAccount.find({
      userId,
      isActive: true,
    })
      .select("-password")
      .sort({ createdAt: -1 });
  }

  static validateAccountNumber(accountNumber) {
    if (!accountNumber) {
      throw new Error("Account number is required");
    }
  }
}

export default AccountValidationService;
