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
    accountSummary: {
      balance: { type: Number, default: 0 },
      accountSize:{type:Number},
      equity: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      freeMargin: { type: Number, default: 0 },
      margin: { type: Number, default: 0 },
      type: { type: String, default: "Demo" },
      userName: { type: String, trim: true },
      marginLevel: { type: Number, default: null },
      profit: { type: Number, default: 0 },
      leverage: { type: Number, default: 100 },
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
