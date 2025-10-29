import mongoose from "mongoose";

const presetSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bot",
      required: true,
    },
    botVersion: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    presetFile: {
      url: { type: String },
      cloudinaryId: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String, // Quill JSON or HTML string
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    suggestedTimeFrame: {
      type: String,
      required: false,
    },
    suggestedAccountSize: {
      type: String,
      required: false,
    },
    broker: {
      type: String,
      required: false,
    },
    isPublishToCommunity: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Preset || mongoose.model("Preset", presetSchema);
