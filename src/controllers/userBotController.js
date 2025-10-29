import Bot from "../models/Bots.js";
import cloudinaryService from "../services/cloudinaryService.js";
import Preset from "../models/Preset.js";

export const getBots = async (req, res) => {
  try {
    const bots = await Bot.find()
      .select("title description image versions")
      .sort({ createdAt: -1 })
      .lean();

    if (!bots || bots.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bots found",
      });
    }

    const botsWithPresetCount = await Promise.all(
      bots.map(async (bot) => {
        const presetCount = await Preset.countDocuments({ bot: bot._id });

        const versions = bot.versions.map((version) => ({
          _id: version._id,
          versionName: version.versionName,
          whatsNewHere: version.whatsNewHere,
        }));

        return {
          _id: bot._id,
          title: bot.title,
          description: bot.description,
          image: bot.image,
          versions,
          presetCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Bots retrieved successfully",
      count: botsWithPresetCount.length,
      data: botsWithPresetCount,
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

export const getBotFile = async (req, res) => {
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

    if (!version.file || !version.file.url) {
      return res.status(404).json({
        success: false,
        message: "No file found for this version",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bot file retrieved successfully",
      data: {
        url: version.file.url,
        cloudinaryId: version.file.cloudinaryId,
      },
    });
  } catch (error) {
    console.error("Get Bot File Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bot file",
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
    const userId = req.user?.id || null;

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
      user: userId,
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

export const getOfficalPresets = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { botId, versionId, symbol } = req.query;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and Version ID are required",
      });
    }

    const filter = {
      user: null,
      bot: botId,
      botVersion: versionId,
    };

    if (symbol) filter.symbol = symbol;

    const presets = await Preset.find(filter).sort({ createdAt: -1 }).lean();

    if (!presets || presets.length === 0) {
      return res.status(404).json({
        success: false,
        message: symbol
          ? `No official presets found for this bot version and symbol: ${symbol}`
          : "No official presets found for this bot version",
      });
    }

    const presetsWithFavorites = presets.map((preset) => ({
      ...preset,
      favoriteCount: preset.favorites?.length || 0,
      isFavorited: userId ? preset.favorites?.includes(userId) : false,
    }));

    return res.status(200).json({
      success: true,
      message: "Official presets retrieved successfully",
      count: presetsWithFavorites.length,
      data: presetsWithFavorites,
    });
  } catch (error) {
    console.error("Get Official Presets Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve official presets",
      error: error.message,
    });
  }
};

export const communityPresets = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { botId, versionId, symbol } = req.query;

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and Version ID are required",
      });
    }

    const filter = {
      user: { $ne: null },
      bot: botId,
      botVersion: versionId,
    };

    if (symbol) {
      filter.symbol = symbol;
    }

    const presets = await Preset.find(filter).sort({ createdAt: -1 }).lean();

    if (!presets || presets.length === 0) {
      return res.status(404).json({
        success: false,
        message: symbol
          ? `No community presets found for this bot version and symbol: ${symbol}`
          : "No community presets found for this bot version",
      });
    }

    const presetsWithFavorites = presets.map((preset) => ({
      ...preset,
      favoriteCount: preset.favorites?.length || 0,
      isFavorited: userId
        ? preset.favorites?.includes(userId.toString())
        : false,
    }));

    return res.status(200).json({
      success: true,
      message: "Community presets retrieved successfully",
      count: presetsWithFavorites.length,
      data: presetsWithFavorites,
    });
  } catch (error) {
    console.error("Community Presets Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve community presets",
      error: error.message,
    });
  }
};

export const myPresets = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { botId, versionId, symbol } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found in request",
      });
    }

    if (!botId || !versionId) {
      return res.status(400).json({
        success: false,
        message: "Bot ID and Version ID are required",
      });
    }

    const filter = {
      user: userId,
      bot: botId,
      botVersion: versionId,
    };

    if (symbol) {
      filter.symbol = symbol;
    }

    const presets = await Preset.find(filter).sort({ createdAt: -1 }).lean();

    if (!presets || presets.length === 0) {
      return res.status(404).json({
        success: false,
        message: symbol
          ? `You have not created any presets for this bot version and symbol: ${symbol}`
          : "You have not created any presets for this bot version yet",
      });
    }

    const presetsWithFavoriteStatus = presets.map((preset) => ({
      ...preset,
      isFavorited: userId
        ? preset.favorites?.map((f) => f.toString()).includes(userId.toString())
        : false,
    }));

    return res.status(200).json({
      success: true,
      message: "Your presets retrieved successfully",
      data: presetsWithFavoriteStatus,
    });
  } catch (error) {
    console.error("My Presets Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your presets",
      error: error.message,
    });
  }
};

export const toggleFavoritePreset = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { presetId } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found in request",
      });
    }

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

    let isFavorited;

    if (preset.favorites.includes(userId)) {
      preset.favorites.pull(userId);
      isFavorited = false;
    } else {
      preset.favorites.push(userId);
      isFavorited = true;
    }

    await preset.save();

    return res.status(200).json({
      success: true,
      message: isFavorited
        ? "Preset added to favorites"
        : "Preset removed from favorites",
    });
  } catch (error) {
    console.error("Toggle Favorite Preset Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle favorite preset",
      error: error.message,
    });
  }
};

export const favoritePresets = async (req, res) => {
  try {
    const userId =  req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found in request",
      });
    }

    const { botId, versionId, symbol } = req.query;

    const filter = {
      favorites: userId,
    };

    if (botId) filter.bot = botId;
    if (versionId) filter.botVersion = versionId;
    if (symbol) filter.symbol = symbol;

    const presets = await Preset.find(filter).sort({ createdAt: -1 }).lean();

    if (!presets || presets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No favorite presets found for this user",
      });
    }

    const presetsWithFavoriteStatus = presets.map((preset) => ({
      ...preset,
      isFavorited: true, 
    }));

    return res.status(200).json({
      success: true,
      message: "Favorite presets retrieved successfully",
      count: presetsWithFavoriteStatus.length,
      data: presetsWithFavoriteStatus,
    });
  } catch (error) {
    console.error("Favorite Presets Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve favorite presets",
      error: error.message,
    });
  }
};
