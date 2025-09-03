import { mtapiService } from "./mtapiService.js";

// Service to handle trading account connections and reconnections

class AccountConnectionService {
  static async ensureConnection(account) {
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
        return { success: true, connected: true, reconnected: true };
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
  }

  static async connectNewAccount(accountData) {
    const connectionResult = await mtapiService.connectAccount(accountData);

    return {
      ...connectionResult,
      success: connectionResult.success,
      mtapiId: connectionResult.mtapiId,
      connectionStatus: connectionResult.connectionStatus || "connected",
    };
  }

  static async disconnectAccount(account) {
    if (account.mtapiId) {
      try {
        await mtapiService.disconnectAccount(account.mtapiId, account.platform);
        console.log("✅ Account disconnected from MTAPI");
      } catch (mtapiError) {
        console.error("⚠️ MTAPI disconnect error:", mtapiError);
      }
    }
  }
}

export default AccountConnectionService;
