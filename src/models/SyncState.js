import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    lastSyncedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: false,
  }
);

const Model = mongoose.model("SyncState", Schema);

export default Model;