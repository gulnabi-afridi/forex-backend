import { v2 as cloudinary } from "cloudinary";

const cloudinaryConfig = {
  cloud_name: "dcyzxjuzu",
  api_key: "986228112961812",
  api_secret: "D0g11tQ1rF9LpVGN1SukdGkGHFQ",
};

cloudinary.config(cloudinaryConfig);

export default cloudinary;

export { cloudinaryConfig };
