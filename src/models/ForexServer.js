import mongoose from "mongoose";

const forexServerSchema = new mongoose.Schema({
  serverName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Index for faster queries
forexServerSchema.index({ serverName: 1 });

export default mongoose.model("ForexServer", forexServerSchema);

