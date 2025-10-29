import Bot from "../../models/Bots.js";
import cloudinaryService from "../../services/cloudinaryService.js";
import Preset from "../../models/Preset.js";

export const getBots = async (req, res) => {
  try {
    const bots = await Bot.find()
      .select("title description image createdAt updatedAt")
      .sort({ createdAt: -1 });

    if (!bots || bots.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bots found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bots retrieved successfully",
      data: bots,
    });
  } catch (error) {
    console.error("Get Bots Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bots",
      error: error.message,
    });
  }
};

export const addBot = async (req, res) => {
  try {
    const { title, description, version, whatsNewHere } = req.body;
    const { botImage, botFile } = req.files || {};

    if (!title || !description || !version) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and version are required",
      });
    }

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

    let existingBot = await Bot.findOne({ title });

    if (existingBot) {
      const botId = existingBot._id.toString();

      const tempVersion = {
        versionName: version,
        whatsNewHere: whatsNewHere || "",
      };

      existingBot.versions.push(tempVersion);
      const createdVersion =
        existingBot.versions[existingBot.versions.length - 1];
      const versionId = createdVersion._id.toString();

      try {
        const fileUpload = await cloudinaryService.uploadFile(
          botFile[0],
          botId,
          versionId,
          false,
          false
        );

        if (!fileUpload.success) {
          existingBot.versions.pull(createdVersion._id);
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

        createdVersion.file = uploadedFile;

        await existingBot.save();

        return res.status(201).json({
          success: true,
          message: "New version added successfully",
        });
      } catch (uploadError) {
        existingBot.versions.pull(createdVersion._id);
        console.error("Upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "File upload failed",
          error: uploadError.message,
        });
      }
    } else {
      const newBot = new Bot({
        title,
        description,
        versions: [],
      });

      const tempVersion = {
        versionName: version,
        whatsNewHere: whatsNewHere || "",
      };

      newBot.versions.push(tempVersion);
      const createdVersion = newBot.versions[0];
      const versionId = createdVersion._id.toString();

      await newBot.save();
      const botId = newBot._id.toString();

      try {
        const imageUpload = await cloudinaryService.uploadFile(
          botImage[0],
          botId,
          "images",
          false,
          false
        );

        if (!imageUpload.success) {
          await Bot.findByIdAndDelete(botId);
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

        const fileUpload = await cloudinaryService.uploadFile(
          botFile[0],
          botId,
          versionId,
          false,
          false
        );

        if (!fileUpload.success) {
          await Bot.findByIdAndDelete(botId);
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

        newBot.image = uploadedImage;
        createdVersion.file = uploadedFile;

        await newBot.save();

        return res.status(201).json({
          success: true,
          message: "Bot created successfully with initial version",
        });
      } catch (uploadError) {
        await Bot.findByIdAndDelete(botId);
        console.error("Upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "File upload failed",
          error: uploadError.message,
        });
      }
    }
  } catch (error) {
    console.error("Add Bot Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add bot",
      error: error.message,
    });
  }
};

export const getBotTitleDesc = async (req, res) => {
  try {
    const { botId } = req.query;

    if (!botId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID is required",
      });
    }

    const bot = await Bot.findById(botId).select("title description image");

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bot details retrieved successfully",
      data: {
        botId: bot._id,
        title: bot.title,
        description: bot.description,
        image: bot.image,
      },
    });
  } catch (error) {
    console.error("Get Bot Title Description Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bot details",
      error: error.message,
    });
  }
};

export const editBotTitleDesc = async (req, res) => {
  try {
    const { botId } = req.query;
    const botImage = req.file;

    if (!botId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID is required",
      });
    }

    const bot = await Bot.findById(botId);

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    if (botImage) {
      try {
        if (bot.image && bot.image.cloudinaryId) {
          try {
            await cloudinaryService.deleteFile(bot.image.cloudinaryId);
          } catch (deleteError) {
            console.error("Failed to delete old image:", deleteError);
          }
        }

        const imageUpload = await cloudinaryService.uploadFile(
          botImage,
          botId,
          "images",
          false,
          false
        );

        if (!imageUpload.success) {
          return res.status(400).json({
            success: false,
            message: imageUpload.message || "Failed to upload bot image",
          });
        }

        bot.image = {
          url: imageUpload.data.url,
          cloudinaryId: imageUpload.data.public_id,
          uploadedAt: new Date(imageUpload.data.created_at),
        };
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Image upload failed",
          error: uploadError.message,
        });
      }
    }

    if (req.body) {
      const { title, description } = req.body;

      if (title !== undefined) bot.title = title;
      if (description !== undefined) bot.description = description;
    }

    await bot.save();

    return res.status(200).json({
      success: true,
      message: "Bot details updated successfully",
    });
  } catch (error) {
    console.error("Edit Bot Title Description Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update bot details",
      error: error.message,
    });
  }
};

export const deleteBot = async (req, res) => {
  try {
    const { botId } = req.query;

    if (!botId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID is required",
      });
    }

    const bot = await Bot.findById(botId);

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    try {
      const botFolderPath = `${cloudinaryService.baseFolder}/${botId}`;

      try {
        await cloudinaryService.deleteFolder(botFolderPath);
      } catch (cloudinaryError) {
        console.error("Cloudinary folder deletion error:", cloudinaryError);
      }

      const deletePresetsResult = await Preset.deleteMany({ bot: botId });

      await Bot.findByIdAndDelete(botId);

      return res.status(200).json({
        success: true,
        message: "Bot and all associated data deleted successfully",
      });
    } catch (deleteError) {
      console.error("Delete operation error:", deleteError);
      return res.status(500).json({
        success: false,
        message: "Failed to delete bot and associated data",
        error: deleteError.message,
      });
    }
  } catch (error) {
    console.error("Delete Bot Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete bot",
      error: error.message,
    });
  }
};

export const addBotVersion = async (req, res) => {
  try {
    const { botId, version, whatsNewHere } = req.body;
    const botFile = req.file;

    if (!botId || !version) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and version are required",
      });
    }

    if (!botFile) {
      return res.status(400).json({
        success: false,
        message: "Bot file is required",
      });
    }

    const existingBot = await Bot.findById(botId);

    if (!existingBot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    const versionExists = existingBot.versions.some(
      (v) => v.versionName.toLowerCase() === version.toLowerCase()
    );

    if (versionExists) {
      return res.status(400).json({
        success: false,
        message: `Version "${version}" already exists for this bot.`,
      });
    }

    const tempVersion = {
      versionName: version,
      whatsNewHere: whatsNewHere || "",
    };

    existingBot.versions.push(tempVersion);
    const createdVersion =
      existingBot.versions[existingBot.versions.length - 1];
    const versionId = createdVersion._id.toString();

    try {
      const fileUpload = await cloudinaryService.uploadFile(
        botFile,
        botId,
        versionId,
        false,
        false
      );

      if (!fileUpload.success) {
        existingBot.versions.pull(createdVersion._id);

        return res.status(400).json({
          success: false,
          message: fileUpload.message || "Failed to upload bot file",
        });
      }

      createdVersion.file = {
        url: fileUpload.data.url,
        cloudinaryId: fileUpload.data.public_id,
        uploadedAt: new Date(fileUpload.data.created_at),
      };

      await existingBot.save();

      return res.status(201).json({
        success: true,
        message: "New version added successfully",
      });
    } catch (uploadError) {
      existingBot.versions.pull(createdVersion._id);

      console.error("Cloudinary upload error:", uploadError);
      return res.status(500).json({
        success: false,
        message: "File upload failed",
        error: uploadError.message,
      });
    }
  } catch (error) {
    console.error("Add Bot Version Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add bot version",
      error: error.message,
    });
  }
};

export const getBotVersionData = async (req, res) => {
  try {
    const { botId, versionId } = req.query;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and version ID are required",
      });
    }

    const bot = await Bot.findById(botId);

    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    const version = bot.versions.id(versionId);

    if (!version) {
      return res.status(404).json({
        success: false,
        message: "Version not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bot version data retrieved successfully",
      data: {
        versionId: version._id,
        versionName: version.versionName,
        whatsNewHere: version.whatsNewHere,
        file: version.file,
        createdAt: version.createdAt,
      },
    });
  } catch (error) {
    console.error("Get Bot Version Data Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bot version data",
      error: error.message,
    });
  }
};

export const deleteBotVersionFile = async (req, res) => {
  try {
    const { botId, versionId } = req.query;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and version ID are required",
      });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    const version = bot.versions.id(versionId);
    if (!version) {
      return res.status(404).json({
        success: false,
        message: "Version not found",
      });
    }

    if (!version.file || !version.file.cloudinaryId) {
      return res.status(404).json({
        success: false,
        message: "No file found for this version",
      });
    }

    try {
      const deleteResult = await cloudinaryService.deleteFile(
        version.file.cloudinaryId
      );

      if (!deleteResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete file from Cloudinary",
        });
      }

      version.file = {
        url: null,
        cloudinaryId: null,
        uploadedAt: null,
      };

      await bot.save();

      return res.status(200).json({
        success: true,
        message: "Bot version file deleted successfully",
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary delete error:", cloudinaryError);
      return res.status(500).json({
        success: false,
        message: "Failed to delete file from Cloudinary",
        error: cloudinaryError.message,
      });
    }
  } catch (error) {
    console.error("Delete Bot Version File Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete bot version file",
      error: error.message,
    });
  }
};

export const editBotVersion = async (req, res) => {
  try {
    const { botId, versionId } = req.query;
    const botFile = req.file;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and version ID are required",
      });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    const version = bot.versions.id(versionId);
    if (!version) {
      return res.status(404).json({
        success: false,
        message: "Version not found",
      });
    }

    if (botFile) {
      if (version.file && version.file.cloudinaryId) {
        return res.status(400).json({
          success: false,
          message:
            "File already exists. Please delete the existing file first before uploading a new one.",
        });
      }

      try {
        const fileUpload = await cloudinaryService.uploadFile(
          botFile,
          botId,
          versionId,
          false,
          false
        );

        if (!fileUpload.success) {
          return res.status(400).json({
            success: false,
            message: fileUpload.message || "Failed to upload bot file",
          });
        }

        version.file = {
          url: fileUpload.data.url,
          cloudinaryId: fileUpload.data.public_id,
          uploadedAt: new Date(fileUpload.data.created_at),
        };
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "File upload failed",
          error: uploadError.message,
        });
      }
    }

    if (req.body) {
      const { versionName, whatsNewHere } = req.body;

      if (versionName !== undefined) version.versionName = versionName;
      if (whatsNewHere !== undefined) version.whatsNewHere = whatsNewHere;
    }

    await bot.save();

    return res.status(200).json({
      success: true,
      message: "Bot version updated successfully",
    });
  } catch (error) {
    console.error("Edit Bot Version Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to edit bot version",
      error: error.message,
    });
  }
};

export const deleteBotVersion = async (req, res) => {
  try {
    const { botId, versionId } = req.query;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and version ID are required",
      });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    const version = bot.versions.id(versionId);
    if (!version) {
      return res.status(404).json({
        success: false,
        message: "Version not found",
      });
    }

    try {
      try {
        await cloudinaryService.deleteVersionFolder(botId, versionId);
      } catch (cloudinaryError) {
        console.error("Cloudinary folder deletion error:", cloudinaryError);
      }

      const deleteResult = await Preset.deleteMany({ botVersion: versionId });

      bot.versions.pull(versionId);
      await bot.save();

      return res.status(200).json({
        success: true,
        message: "Bot version and all associated presets deleted successfully",
      });
    } catch (deleteError) {
      console.error("Delete operation error:", deleteError);
      return res.status(500).json({
        success: false,
        message: "Failed to delete version and presets",
        error: deleteError.message,
      });
    }
  } catch (error) {
    console.error("Delete Bot Version Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete bot version",
      error: error.message,
    });
  }
};

export const countPreset = async (req, res) => {
  try {
    const { botId, versionId } = req.query;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and version ID are required",
      });
    }

    const count = await Preset.countDocuments({
      bot: botId,
      botVersion: versionId,
    });

    return res.status(200).json({
      success: true,
      message: "Presets count retrieved successfully",
      count: count,
    });
  } catch (error) {
    console.error("Count Preset Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to count presets",
      error: error.message,
    });
  }
};

export const getPresets = async (req, res) => {
  try {
    const { botId, versionId } = req.query;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and version ID are required",
      });
    }

    const presets = await Preset.find({
      bot: botId,
      botVersion: versionId,
    })
      .select(
        "name description symbol suggestedTimeFrame suggestedAccountSize broker isPublishToCommunity presetFile"
      )
      .sort({ createdAt: -1 });

    if (!presets || presets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No presets found for this version",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Presets retrieved successfully",
      data: presets,
    });
  } catch (error) {
    console.error("Get Presets Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve presets",
      error: error.message,
    });
  }
};

export const addPreset = async (req, res) => {
  try {
    const { botId, versionId } = req.query;

    const {
      name,
      description,
      symbol,
      suggestedTimeFrame,
      suggestedAccountSize,
      broker,
      isPublishToCommunity,
    } = req.body;

    const botFile = req.file;

    if (!botId || !versionId || !name || !description || !botFile) {
      return res.status(400).json({
        success: false,
        message:
          "botId, botVersionId, name, description, and preset file are required",
      });
    }

    const bot = await Bot.findById(botId);
    if (!bot) {
      return res.status(404).json({
        success: false,
        message: "Bot not found",
      });
    }

    const versionExists = bot.versions.id(versionId);
    if (!versionExists) {
      return res.status(404).json({
        success: false,
        message: "Bot version not found",
      });
    }

    const newPreset = new Preset({
      bot: botId,
      botVersion: versionId,
      name,
      description,
      symbol,
      suggestedTimeFrame,
      suggestedAccountSize,
      broker,
      isPublishToCommunity: isPublishToCommunity || false,
    });

    await newPreset.save();
    const presetId = newPreset._id.toString();

    try {
      const fileUpload = await cloudinaryService.uploadPresetFile(
        botFile,
        botId,
        versionId,
        presetId
      );

      if (!fileUpload.success) {
        await Preset.findByIdAndDelete(presetId);
        return res.status(400).json({
          success: false,
          message: "Failed to upload preset file",
        });
      }

      newPreset.presetFile = {
        url: fileUpload.data.url,
        cloudinaryId: fileUpload.data.public_id,
        uploadedAt: new Date(fileUpload.data.created_at),
      };

      await newPreset.save();

      return res.status(201).json({
        success: true,
        message: "Preset added successfully",
      });
    } catch (uploadError) {
      await Preset.findByIdAndDelete(presetId);
      console.error("Preset upload error:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Preset file upload failed",
        error: uploadError.message,
      });
    }
  } catch (error) {
    console.error("Add Preset Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add preset",
      error: error.message,
    });
  }
};

export const getBotPresetData = async (req, res) => {
  try {
    const { presetId } = req.query;

    if (!presetId) {
      return res.status(400).json({
        success: false,
        message: "Preset ID is required",
      });
    }

    const preset = await Preset.findById(presetId);

    if (!preset) {
      return res.status(404).json({
        success: false,
        message: "Preset not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Preset data retrieved successfully",
      data: {
        presetId: preset._id,
        name: preset.name,
        description: preset.description,
        symbol: preset.symbol,
        suggestedTimeFrame: preset.suggestedTimeFrame,
        suggestedAccountSize: preset.suggestedAccountSize,
        broker: preset.broker,
        isPublishToCommunity: preset.isPublishToCommunity,
        presetFile: preset.presetFile,
      },
    });
  } catch (error) {
    console.error("Get Bot Preset Data Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve preset data",
      error: error.message,
    });
  }
};

export const deletePresetFile = async (req, res) => {
  try {
    const { presetId } = req.query;

    if (!presetId) {
      return res.status(400).json({
        success: false,
        message: "Preset ID is required",
      });
    }

    const preset = await Preset.findById(presetId);
    if (!preset) {
      return res.status(404).json({
        success: false,
        message: "Preset not found",
      });
    }

    if (!preset.presetFile || !preset.presetFile.cloudinaryId) {
      return res.status(404).json({
        success: false,
        message: "No preset file found",
      });
    }

    try {
      const deleteResult = await cloudinaryService.deleteFile(
        preset.presetFile.cloudinaryId
      );

      if (!deleteResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete preset file from Cloudinary",
        });
      }

      preset.presetFile.url = undefined;
      preset.presetFile.cloudinaryId = undefined;
      preset.presetFile.uploadedAt = undefined;

      await preset.save();

      return res.status(200).json({
        success: true,
        message: "Preset file deleted successfully",
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary delete error:", cloudinaryError);
      return res.status(500).json({
        success: false,
        message: "Failed to delete preset file from Cloudinary",
        error: cloudinaryError.message,
      });
    }
  } catch (error) {
    console.error("Delete Preset File Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete preset file",
      error: error.message,
    });
  }
};

export const editPreset = async (req, res) => {
  try {
    const { presetId } = req.query;
    const presetFile = req.file;

    if (!presetId) {
      return res.status(400).json({
        success: false,
        message: "Preset ID is required",
      });
    }

    const preset = await Preset.findById(presetId);
    if (!preset) {
      return res.status(404).json({
        success: false,
        message: "Preset not found",
      });
    }

    if (presetFile) {
      if (preset.presetFile && preset.presetFile.cloudinaryId) {
        return res.status(400).json({
          success: false,
          message:
            "Preset file already exists. Please delete the existing file first before uploading a new one.",
        });
      }

      try {
        const botId = preset.bot.toString();
        const versionId = preset.botVersion.toString();

        const fileUpload = await cloudinaryService.uploadPresetFile(
          presetFile,
          botId,
          versionId,
          presetId
        );

        if (!fileUpload.success) {
          return res.status(400).json({
            success: false,
            message: fileUpload.message || "Failed to upload preset file",
          });
        }

        preset.presetFile = {
          url: fileUpload.data.url,
          cloudinaryId: fileUpload.data.public_id,
          uploadedAt: new Date(fileUpload.data.created_at),
        };
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Preset file upload failed",
          error: uploadError.message,
        });
      }
    }

    if (req.body) {
      const {
        name,
        description,
        symbol,
        suggestedTimeFrame,
        suggestedAccountSize,
        broker,
        isPublishToCommunity,
      } = req.body;

      if (name !== undefined) preset.name = name;
      if (description !== undefined) preset.description = description;
      if (symbol !== undefined) preset.symbol = symbol;
      if (suggestedTimeFrame !== undefined)
        preset.suggestedTimeFrame = suggestedTimeFrame;
      if (suggestedAccountSize !== undefined)
        preset.suggestedAccountSize = suggestedAccountSize;
      if (broker !== undefined) preset.broker = broker;
      if (isPublishToCommunity !== undefined) {
        preset.isPublishToCommunity =
          isPublishToCommunity === "true" || isPublishToCommunity === true;
      }
    }

    await preset.save();

    return res.status(200).json({
      success: true,
      message: "Preset updated successfully",
    });
  } catch (error) {
    console.error("Edit Preset Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to edit preset",
      error: error.message,
    });
  }
};

export const deletePreset = async (req, res) => {
  try {
    const { presetId } = req.query;

    if (!presetId) {
      return res.status(400).json({
        success: false,
        message: "Preset ID is required",
      });
    }

    const preset = await Preset.findById(presetId);
    if (!preset) {
      return res.status(404).json({
        success: false,
        message: "Preset not found",
      });
    }

    try {
      if (preset.presetFile && preset.presetFile.cloudinaryId) {
        const botId = preset.bot.toString();
        const versionId = preset.botVersion.toString();

        try {
          await cloudinaryService.deletePreset(botId, versionId, presetId);
        } catch (cloudinaryError) {
          console.error("Cloudinary preset deletion error:", cloudinaryError);
        }
      }

      await Preset.findByIdAndDelete(presetId);

      return res.status(200).json({
        success: true,
        message: "Preset deleted successfully",
      });
    } catch (deleteError) {
      console.error("Delete preset error:", deleteError);
      return res.status(500).json({
        success: false,
        message: "Failed to delete preset",
        error: deleteError.message,
      });
    }
  } catch (error) {
    console.error("Delete Preset Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete preset",
      error: error.message,
    });
  }
};
