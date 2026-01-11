import ForexServer from "../models/ForexServer.js";

export const getServers = async (req, res) => {
  try {
    const servers = await ForexServer.find({ isActive: true })
      .select("serverName")
      .sort({ serverName: 1 })
      .lean();

    const serverNames = servers.map((server) => server.serverName);

    return res.status(200).json({
      success: true,
      message: "Servers retrieved successfully",
      data: serverNames,
    });
  } catch (error) {
    console.error("Get Servers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve servers",
      error: error.message,
    });
  }
};

export const addServer = async (req, res) => {
  try {
    const { serverName, isActive } = req.body;

    if (!serverName || !serverName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Server name is required",
      });
    }

    // Check if server already exists
    const existingServer = await ForexServer.findOne({
      serverName: serverName.trim(),
    });

    if (existingServer) {
      return res.status(409).json({
        success: false,
        message: "Server with this name already exists",
      });
    }

    // Create new server
    const newServer = new ForexServer({
      serverName: serverName.trim(),
      isActive: isActive !== undefined ? isActive : true,
    });

    await newServer.save();

    return res.status(201).json({
      success: true,
      message: "Server created successfully",
      data: {
        _id: newServer._id,
        serverName: newServer.serverName,
        isActive: newServer.isActive,
      },
    });
  } catch (error) {
    console.error("Add Server Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create server",
      error: error.message,
    });
  }
};

