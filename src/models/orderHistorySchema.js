import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    ticket: { type: String, required: true },
    symbol: { type: String },
  type: { type: String, enum: ["buy", "sell"] },
    volume: { type: Number, required: true },
    openTime: { type: Date, required: true },
    closeTime: { type: Date },
    openPrice: { type: Number, required: true },
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
    data: [orderSchema], 
  },
  { timestamps: true }
);

export default mongoose.model("OrderHistory", orderHistorySchema);
