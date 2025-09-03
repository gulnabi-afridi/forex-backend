import { mtapiService } from "./mtapiService.js";
import OrderHistory from "../models/orderHistorySchema.js";

//  Service to handle trading account data operations

class AccountDataService {
  static async syncAccountStats(account) {
    try {
      const accountInfoResult = await mtapiService.getAccountInfo(
        account.mtapiId,
        account.platform
      );

      if (accountInfoResult.success) {
        const accountInfo = accountInfoResult.data;
        const stats = {
          balance: accountInfo.balance || 0,
          equity: accountInfo.equity || 0,
          margin: accountInfo.margin || 0,
          profit: accountInfo.profit || 0,
          freeMargin: accountInfo.free_margin || accountInfo.freeMargin || 0,
          currency: accountInfo.currency || "USD",
          leverage: accountInfo.leverage || 100,
        };

        // Update cached stats
        account.accountStats = stats;
        account.lastSyncAt = new Date();
        await account.save();

        return { success: true, data: stats };
      }

      return { success: false, error: "Failed to fetch account info" };
    } catch (error) {
      console.error("⚠️ Account stats sync error:", error);
      return { success: false, error: error.message };
    }
  }

  static async getLiveAccountData(account) {
    try {
      const syncResult = await this.syncAccountStats(account);

      if (syncResult.success) {
        console.log("✅ Live data fetched for account:", account.accountNumber);
        return syncResult.data;
      } else {
        console.log("⚠️ Using cached data due to MTAPI error");
        return account.accountStats;
      }
    } catch (error) {
      console.error("⚠️ MTAPI fetch error:", error);
      return account.accountStats; 
    }
  }

  static async getOpenPositions(account) {
    return await mtapiService.getOpenPositions(
      account.mtapiId,
      account.platform
    );
  }

  static async getClosedOrders(account) {
    return await mtapiService.getClosedOrders(
      account.mtapiId,
      account.platform
    );
  }

  static async getOrderHistory(account, days = 30) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const formatDate = (date) => date.toISOString().slice(0, 19);

    // Fetch from MTAPI
    const orderHistoryResult = await mtapiService.getOrderHistory(
      account.mtapiId,
      account.platform,
      formatDate(fromDate),
      formatDate(toDate)
    );

    if (!orderHistoryResult.success) {
      throw new Error(
        orderHistoryResult.error || "Failed to fetch order history"
      );
    }

    const orders = orderHistoryResult.data.orders || orderHistoryResult.data;

    // Save/merge into DB
    await this.storeOrderHistory(account._id, orders);

    return {
      orders,
      dateRange: {
        from: formatDate(fromDate),
        to: formatDate(toDate),
      },
    };
  }

  static async storeOrderHistory(accountId, orders) {
    let history = await OrderHistory.findOne({ accountId });

    if (!history) {
      // Create new document
      history = await OrderHistory.create({
        accountId,
        data: orders.map((order) => this.formatOrderForStorage(order)),
      });
    } else {
      // Merge new orders (skip duplicates)
      const existingTickets = new Set(history.data.map((o) => o.ticket));
      const newOrders = orders
        .filter((order) => !existingTickets.has(order.ticket))
        .map((order) => this.formatOrderForStorage(order));

      if (newOrders.length > 0) {
        history.data.push(...newOrders);
        await history.save();
      }
    }
  }

  static formatOrderForStorage(order) {
    return {
      ticket: order.ticket,
      symbol: order.symbol,
      type: order.type,
      volume: order.volume,
      openTime: new Date(order.openTime),
      closeTime: order.closeTime ? new Date(order.closeTime) : null,
      openPrice: order.openPrice,
      closePrice: order.closePrice,
      profit: order.profit,
      commission: order.commission,
      swap: order.swap,
      rawData: order,
    };
  }
}

export default AccountDataService;
