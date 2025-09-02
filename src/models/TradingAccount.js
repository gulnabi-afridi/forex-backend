import mongoose from "mongoose";

const tradingAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    serverName: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["MT4", "MT5"],
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    // MTAPI Integration
    mtapiId: {
      type: String,
      default: null,
    },
    connectionStatus: {
      type: String,
      enum: ["pending", "connected", "disconnected", "error"],
      default: "pending",
    },
    accountStats: {
      balance: { type: Number, default: 0 },
      equity: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
      margin: { type: Number, default: 0 },
      freeMargin: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      leverage: { type: Number, default: 100 },
      lastPrice: { type: Number, default: null },
      marginLevel: { type: Number, default: null },
    },

    // Account Management
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate accounts for same user
tradingAccountSchema.index({ userId: 1, accountNumber: 1 }, { unique: true });

// Index for efficient sync queries
tradingAccountSchema.index({
  userId: 1,
  isActive: 1,
  connectionStatus: 1,
  lastSyncAt: 1,
});

// Virtual to populate user info
tradingAccountSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

export default mongoose.model("TradingAccount", tradingAccountSchema);
