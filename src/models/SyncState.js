import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      default: "license-sync-state"
    },
    lastSyncedAt: {
      type: Date,
      required: true,
      default: () => new Date(0) 
    }
  },
  {
    timestamps: false,
  }
);

const Model = mongoose.model("SyncState", Schema);

export default Model;