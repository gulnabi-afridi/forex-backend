import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    versionName: {
      type: String,
      required: true,
      trim: true,
    },
    file: {
      url: { type: String },
      cloudinaryId: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    },
    whatsNewHere: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const botSchema = new mongoose.Schema(
  {
    image: {
      url: { type: String, required: false },
      cloudinaryId: { type: String, required: false },
      uploadedAt: { type: Date, default: Date.now },
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    versions: [versionSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Bot || mongoose.model("Bot", botSchema);
