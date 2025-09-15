import User from "../../models/User.js";
import bcrypt from "bcryptjs";

export const addNewUser = async (req, res) => {
  try {
    const { name, email, password, activeStatus } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, Email and Password are required" });
    }

    // check if user already exist

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    // hashed passowrd

    const saltRounds = 12;
    const hashedPassowrd = await bcrypt.hash(password, saltRounds);

    // Create New User

    const user = new User({
      name,
      email,
      password: hashedPassowrd,
      active: activeStatus,
    });

    await user.save();

    return res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ active: true });
    const inactive = await User.countDocuments({ active: false });

    res.json({ total, active, inactive });
  } catch (err) {
    res.status(500).json({
      message: "Server error in getting the UserStats",
      error: err.message,
    });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const allUser = await User.find();

    return res.status(200).json({
      message: "All users fetched successfully",
      count: allUser.length,
      users: allUser,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error while fetching users",
      error: err.message,
    });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};

    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      };
    }

    const users = await User.find(query).select("-password");

    res.json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error in searching the users",
      error: err.message,
    });
  }
};
