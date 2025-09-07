import { mtapiService } from "./mtapiService.js";

// Service to handle trading account connections and reconnections

class AccountConnectionService {
  static async ensureConnection(account) {
    try {
      if (!account.mtapiId) {
        throw new Error("Account was never connected to MTAPI");
      }
  
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
        // Update mtapiId if it changed (fresh connection)
        if (result.mtapiId && result.mtapiId !== account.mtapiId) {
          console.log(`🔄 Updating mtapiId: ${account.mtapiId} → ${result.mtapiId}`);
          account.mtapiId = result.mtapiId;
        }
  
        account.connectionStatus = "connected";
        await account.save();
        
        return { 
          success: true, 
          connected: true,
          reconnected: result.autoReconnected || result.freshConnection
        };
      }
  
      // Connection failed
      account.connectionStatus = "disconnected";
      await account.save();
  
      return {
        success: false,
        connected: false,
        error: result.error || "Connection check failed",
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
