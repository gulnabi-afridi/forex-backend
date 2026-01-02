import axios from "axios";
import { generate64BitId } from "../utils/generate64BitId.js";

const createMtapiClient = (platform) =>
  axios.create({
    baseURL:
      platform === "MT5"
        ? "https://mt5full3.mtapi.io"
        : "https://mt4full3.mtapi.io",
    timeout: 30000,
    headers: {
      ApiKey: process.env.MTAPI_TOKEN,
      Accept: "text/plain",
    },
  });

export const mtapiService = {
  // ✅ Connect Account
  async connectAccount(accountData) {
    try {
      const { accountNumber, password, serverName, platform } = accountData;
      const client = createMtapiClient(platform);

      const response = await client.get("/ConnectEx", {
        params: {
          user: accountNumber,
          password: password,
          server: serverName,
          id: generate64BitId().toString(),
        },
        headers: {
          Accept: "application/json",
        },
      });

      const res = response.data;

      // ❌ Check if MTAPI returned a known error code
      if (res?.code === "CONNECT_ERROR") {
        return {
          success: false,
          error: res.message || "Connection failed",
          raw: res,
        };
      }

      // ❌ Check for invalid credentials
      if (
        res?.code === "INVALID_ACCOUNT" ||
        /invalid (account|credentials|login|password)/i.test(res?.message)
      ) {
        return {
          success: false,
          error:
            "Invalid account credentials. Please check your login and password.",
          raw: res,
        };
      }

      // ❌ Check for generic server-related issues
      if (
        res?.code === "DONE" &&
        typeof res.message === "string" &&
        /(server not found|invalid|error)/i.test(res.message)
      ) {
        return {
          success: false,
          error: `MTAPI error: ${res.message}`,
          raw: res,
        };
      }

      // ✅ Normal success
      return {
        success: true,
        mtapiId: res,
        connectionStatus: "connected",
      };
    } catch (error) {
      console.error(
        "MTAPI Connect Error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      };
    }
  },

  // ✅ Get Account Info
  async getAccountInfo(mtapiId, platform) {
    try {
      const client = createMtapiClient(platform);
      const [summaryRes, accountRes] = await Promise.all([
        client.get("/AccountSummary", { params: { id: mtapiId } }),
        client.get("/Account", { params: { id: mtapiId } }),
      ]);

      const { type, userName } = accountRes.data;

      const data = {
        ...summaryRes.data,
        type,
        userName,
      };
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  },

  // ✅ Get Open Positions
  async getOpenPositions(mtapiId, platform) {
    try {
      const client = createMtapiClient(platform);
      const response = await client.get("/OpenedOrders", {
        params: { id: mtapiId },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  },

  // ✅ Get Closed Orders
  async getClosedOrders(mtapiId, platform) {
    try {
      const client = createMtapiClient(platform);
      const response = await client.get("/ClosedOrders", {
        params: { id: mtapiId },
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  },

  //  ✅ Order History!
  async getOrderHistory(mtapiId, platform, fromDate, toDate) {
    try {
      const client = createMtapiClient(platform);
      const response = await client.get("/OrderHistory", {
        params: {
          id: mtapiId,
          from: fromDate,
          to: toDate,
          sort: "CloseTime",
          ascending: false,
        },
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  },

  // ✅ Check Connection Status (with auto-reconnect)

  async checkAndReconnect(mtapiId, platform, accountData = null) {
    try {
      console.log(
        `🔍 Checking connection for MTAPI ID: ${mtapiId} (${platform})`
      );

      const client = createMtapiClient(platform);
      const response = await client.get("/CheckConnect", {
        params: { id: mtapiId },
      });

      const rawData = response.data;
      console.log(`📡 MTAPI CheckConnect response:`, rawData);

      // ⚠️ Handle INVALID_TOKEN error (API returns 200 but with error object)
      if (rawData?.code === "INVALID_TOKEN") {
        console.log(
          `🔄 INVALID_TOKEN detected, attempting fresh connection...`
        );

        if (!accountData) {
          return {
            success: false,
            connected: false,
            error: "Invalid token - need account credentials for reconnection",
            needsReconnect: true,
          };
        }

        // Try fresh connection
        const freshConnection = await this.connectAccount(accountData);

        if (freshConnection.success) {
          console.log(
            `✅ Fresh connection established with new ID: ${freshConnection.mtapiId}`
          );
          return {
            success: true,
            connected: true,
            autoReconnected: false, // This was a fresh connection, not auto-reconnect
            freshConnection: true,
            mtapiId: freshConnection.mtapiId, // Return the NEW mtapiId
          };
        } else {
          return {
            success: false,
            connected: false,
            error: freshConnection.error || "Failed to create fresh connection",
          };
        }
      }

      // ✅ Handle successful connection check
      // CheckConnect returns 'OK' if connected or successfully reconnected
      const isConnected = rawData === "OK" || rawData === true;

      if (isConnected) {
        console.log(`✅ Account ${mtapiId} is connected (or auto-reconnected)`);
        return {
          success: true,
          connected: true,
          autoReconnected: true,
          freshConnection: false,
          mtapiId: mtapiId, // Keep existing mtapiId
        };
      } else {
        console.log(
          `❌ Account ${mtapiId} connection failed. Raw response:`,
          rawData
        );

        // If we have account data, try a fresh connection
        if (accountData) {
          console.log(`🔄 Connection failed, attempting fresh connection...`);
          const freshConnection = await this.connectAccount(accountData);

          if (freshConnection.success) {
            console.log(
              `✅ Fresh connection established with new ID: ${freshConnection.mtapiId}`
            );
            return {
              success: true,
              connected: true,
              autoReconnected: false,
              freshConnection: true,
              mtapiId: freshConnection.mtapiId,
            };
          }
        }

        return {
          success: false,
          connected: false,
          error: `Connection check failed: ${rawData.message || rawData}`,
          needsReconnect: true,
        };
      }
    } catch (error) {
      console.error(`❌ CheckConnect API error for ${mtapiId}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // If we have account data and got a network/API error, try fresh connection
      if (accountData && error.response?.status >= 400) {
        console.log(`🔄 API error occurred, attempting fresh connection...`);

        try {
          const freshConnection = await this.connectAccount(accountData);

          if (freshConnection.success) {
            console.log(
              `✅ Fresh connection established after API error with new ID: ${freshConnection.mtapiId}`
            );
            return {
              success: true,
              connected: true,
              autoReconnected: false,
              freshConnection: true,
              mtapiId: freshConnection.mtapiId,
            };
          }
        } catch (reconnectError) {
          console.error(`❌ Fresh connection also failed:`, reconnectError);
        }
      }

      return {
        success: false,
        connected: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  },

  // ✅ Disconnect Account
  async disconnectAccount(mtapiId, platform) {
    try {
      const client = createMtapiClient(platform);
      const response = await client.get("/Disconnect", {
        params: { id: mtapiId },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  },
};
