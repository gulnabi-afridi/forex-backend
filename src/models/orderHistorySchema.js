import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    ticket: { type: String, required: true },
    symbol: { type: String },
    type: { type: String, enum: ["buy", "sell", "Balance"] },
    volume: { type: Number },
    openTime: { type: Date },
    closeTime: { type: Date },
    openPrice: { type: Number },
    lots:{type:Number},
    closePrice: { type: Number },
    profit: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    swap: { type: Number, default: 0 },
    rawData: { type: Object },
  },
  { _id: false }
);

const orderHistorySchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TradingAccount",
      required: true,
      unique: true,
    },

    // ✅ Orders history
    data: [orderSchema],
  },
  { timestamps: true }
);

export default mongoose.model("OrderHistory", orderHistorySchema);
