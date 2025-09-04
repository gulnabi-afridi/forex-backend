import { mtapiService } from "./mtapiService.js";
import OrderHistory from "../models/orderHistorySchema.js";
import TradingAccount from "../models/TradingAccount.js";

//  Service to handle trading account data operations

class AccountDataService {
  static async accountSummary(account) {
    try {
      const accountInfoResult = await mtapiService.getAccountInfo(
        account.mtapiId,
        account.platform
      );

      if (accountInfoResult.success) {
        const accountInfo = accountInfoResult.data;
        const stats = {
          type: accountInfo.type || "Demo",
          userName: accountInfo.userName || null,
          balance: accountInfo.balance || 0,
          currency: accountInfo.currency || "USD",
          leverage: accountInfo.leverage || 100,
          profit: accountInfo.profit || 0,
          equity: accountInfo.equity || 0,
          margin: accountInfo.margin || 0,
          freeMargin: accountInfo.free_margin || accountInfo.freeMargin || 0,
        };

        // Update cached stats
        account.accountSummary = stats;
        await TradingAccount.findByIdAndUpdate(account._id, {
          $set: {
            accountSummary: stats,
            lastSyncAt: new Date(),
          },
        });

        return { success: true, data: stats };
      }

      return { success: false, error: "Failed to fetch account info" };
    } catch (error) {
      console.error("⚠️ Account stats sync error:", error);
      return { success: false, error: error.message };
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

  static async getOrderHistory(account, days = null) {
    const toDate = new Date();
    const fromDate = days
      ? (() => {
          const date = new Date();
          date.setDate(date.getDate() - days);
          return date;
        })()
      : null;

    const formatDate = (date) => date.toISOString().slice(0, 19);

    // Fetch from MTAPI
    const orderHistoryResult = await mtapiService.getOrderHistory(
      account.mtapiId,
      account.platform,
      fromDate ? formatDate(fromDate) : null,
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
        from: fromDate ? formatDate(fromDate) : "All history",
        to: formatDate(toDate),
      },
    };
  }

  static async storeOrderHistory(accountId, orders) {
    const formattedOrders = orders.map((order) =>
      this.formatOrderForStorage(order)
    );

    // Overwriting to avoid duplicates
    await OrderHistory.findOneAndUpdate(
      { accountId },
      { $set: { data: formattedOrders } },
      { upsert: true, new: true }
    );
  }

  //  Sync both stats + order history
  static async syncAccountData(account, { days = null } = {}) {
    try {
      const [statsResult, historyResult] = await Promise.allSettled([
        this.accountSummary(account),
        this.getOrderHistory(account, days),
      ]);

      return {
        success: true,
        stats:
          statsResult.status === "fulfilled" ? statsResult.value.data : null,
        orders:
          historyResult.status === "fulfilled"
            ? historyResult.value.orders
            : [],
        dateRange:
          historyResult.status === "fulfilled"
            ? historyResult.value.dateRange
            : null,
      };
    } catch (error) {
      console.error("⚠️ Full account sync error:", error);
      return { success: false, error: error.message };
    }
  }

  static formatOrderForStorage(order) {
    return {
      ticket: order.ticket,
      symbol: order.symbol,
      type: order.orderType,
      lots: order.lots,
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
