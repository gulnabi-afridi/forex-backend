import mongoose from "mongoose";

const UserLicenseKeySchema = new mongoose.Schema(
  {
    licenseKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    }
  },
  {
    timestamps: false,
  }
);



const UserLicenseKey = mongoose.model("UserLicenseKey", UserLicenseKeySchema);

export default UserLicenseKey;