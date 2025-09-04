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

  // ✅ Check Connection Status
  async getConnectionStatus(mtapiId, platform) {
    try {
      const client = createMtapiClient(platform);
      const response = await client.get("/CheckConnect", {
        params: { id: mtapiId },
      });

      const rawData = response.data;

      // Normalize response
      const isConnected =
        rawData === true ||
        rawData?.connected === true ||
        rawData === "OK" ||
        rawData === "Connected";

      return { success: true, data: isConnected };
    } catch (error) {
      return {
        success: false,
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
