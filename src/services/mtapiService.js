import axios from "axios";
import { generate64BitId } from "../utils/generate64BitId.js";

const createMtapiClient = (platform) =>
  axios.create({
    baseURL:
      platform === "MT5" ? "https://mt5.mtapi.io" : "https://mt4.mtapi.io",
    timeout: 30000,
    headers: {
      "Content-Type": "text/plain",
      Authorization: `Bearer ${process.env.MTAPI_TOKEN}`,
    },
  });

export const mtapiService = {
  async connectAccount(accountData) {
    try {
      const { accountNumber, password, serverName, platform } = accountData;
      const client = createMtapiClient(platform);

      // MTAPI Connect endpoint expects GET with query params
      const response = await client.get("/ConnectEx", {
        params: {
          user: accountNumber,
          password: password,
          server: serverName,
          // id: `account-${accountNumber}`,
          id: generate64BitId().toString(),
        },
        headers: {
          Accept: "text/plain",
        },
      });

      return { success: true, data: response.data };
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
      const response = await client.get("/AccountSummary", {
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
