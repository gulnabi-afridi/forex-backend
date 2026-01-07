import User from "../models/User.js";

export const expertsMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not found in request",
      });
    }

    const user = await User.findById(userId).select("experts");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.experts) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Experts feature is not enabled for your account. Please contact your administrator.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while checking experts access",
      error: error.message,
    });
  }
};

