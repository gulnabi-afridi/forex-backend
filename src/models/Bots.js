import mongoose from "mongoose";

const botSchema = new mongoose.Schema(
  {
    image: {
      url: { type: String, required: false },
      cloudinaryId: { type: String, required: false },
      uploadedAt: { type: Date, default: Date.now },
    },
    file: {
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
    version: {
      type: String,
      required: true,
      trim: true,
    },
    whatsNewHere: {
      type: String, // Quill's HTML content
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Bot || mongoose.model("Bot", botSchema);
