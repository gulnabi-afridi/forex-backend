import Bot from "../../models/Bots.js";
import cloudinaryService from "../../services/cloudinaryService.js";

export const addBot = async (req, res) => {
  try {
    const { title, description, version, whatsNewHere } = req.body;
    const { botImage, botFile } = req.files || {};

    // ✅ Validate required fields
    if (!title || !description || !version) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and version are required",
      });
    }

    // ✅ Ensure both image and file are provided
    if (!botImage || !botImage[0]) {
      return res.status(400).json({
        success: false,
        message: "Bot image is required",
      });
    }

    if (!botFile || !botFile[0]) {
      return res.status(400).json({
        success: false,
        message: "Bot file is required",
      });
    }

    // --- Upload bot image to Cloudinary
    const imageUpload = await cloudinaryService.uploadFile(
      botImage[0],
      title,
      version,
      false
    );

    if (!imageUpload.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to upload bot image",
      });
    }

    const uploadedImage = {
      url: imageUpload.data.url,
      cloudinaryId: imageUpload.data.public_id,
      uploadedAt: new Date(imageUpload.data.created_at),
    };

    // --- Upload bot file to Cloudinary
    const fileUpload = await cloudinaryService.uploadFile(
      botFile[0],
      title,
      version,
      false
    );

    if (!fileUpload.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to upload bot file",
      });
    }

    const uploadedFile = {
      url: fileUpload.data.url,
      cloudinaryId: fileUpload.data.public_id,
      uploadedAt: new Date(fileUpload.data.created_at),
    };

    // --- Create new Bot document
    const newBot = new Bot({
      image: uploadedImage,
      file: uploadedFile,
      title,
      description,
      version,
      whatsNewHere,
    });

    await newBot.save();

    return res.status(201).json({
      success: true,
      message: "Bot added successfully",
    });
  } catch (error) {
    console.error("Add Bot Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add bot",
      error: error.message,
    });
  }
};
