import { mtapiService } from "./mtapiService.js";

// Service to handle trading account connections and reconnections

class AccountConnectionService {
  static async ensureConnection(account) {
    try {
      if (!account.mtapiId) {
        throw new Error("Account was never connected to MTAPI");
      }

      console.log(
        `🔍 Checking connection for account ${account.accountNumber} (MTAPI ID: ${account.mtapiId})`
      );

      // Pass account credentials for potential fresh connection
      const accountData = {
        accountNumber: account.accountNumber,
        password: account.password,
        serverName: account.serverName,
        platform: account.platform,
      };

      const result = await mtapiService.checkAndReconnect(
        account.mtapiId,
        account.platform,
        accountData
      );

      if (result.success && result.connected) {
        let mtapiIdUpdated = false;
        let connectionType = "existing";

        // Update mtapiId if it changed (fresh connection)
        if (result.mtapiId && result.mtapiId !== account.mtapiId) {
          console.log(
            `🔄 [${account.accountNumber}] Updating mtapiId: ${account.mtapiId} → ${result.mtapiId}`
          );
          account.mtapiId = result.mtapiId;
          account.markModified("mtapiId");
          mtapiIdUpdated = true;
          connectionType = result.freshConnection ? "fresh" : "reconnected";
        } else if (result.autoReconnected) {
          connectionType = "auto-reconnected";
        }

        // Update account status
        account.connectionStatus = "connected";
        account.lastSyncAt = new Date();

        try {
          await account.save();
          console.log(
            `✅ [${account.accountNumber}] Connection status updated (${connectionType})`
          );
        } catch (saveError) {
          console.error(
            `⚠️ [${account.accountNumber}] Failed to save connection status:`,
            saveError
          );
          // Don't fail the entire operation if save fails
        }

        return {
          success: true,
          connected: true,
          reconnected:
            result.autoReconnected || result.freshConnection || false,
          connectionType,
          mtapiIdUpdated,
          newMtapiId: result.mtapiId,
        };
      }

      // Connection failed - update status
      console.warn(
        `❌ [${account.accountNumber}] Connection failed: ${result.error}`
      );
      account.connectionStatus = "disconnected";

      try {
        await account.save();
      } catch (saveError) {
        console.error(
          `⚠️ [${account.accountNumber}] Failed to save disconnected status:`,
          saveError
        );
      }

      return {
        success: false,
        connected: false,
        error: result.error || "Connection check failed",
        reconnected: false,
        connectionType: "failed",
      };
    } catch (error) {
      console.error(
        `❌ [${account.accountNumber}] Connection check error:`,
        error
      );

      // Update account status to error
      account.connectionStatus = "error";

      try {
        await account.save();
      } catch (saveError) {
        console.error(
          `⚠️ [${account.accountNumber}] Failed to save error status:`,
          saveError
        );
      }

      return {
        success: false,
        connected: false,
        error: error.message || "Unknown connection error",
        reconnected: false,
        connectionType: "error",
      };
    }
  }

  static async connectNewAccount(accountData) {
    const connectionResult = await mtapiService.connectAccount(accountData);

    console.log(connectionResult);

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
