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

export const changeUserActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res
        .status(400)
        .json({ message: "Active status must be true or false" });
    }

    // update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { active },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: `User status updated to ${active ? "Active" : "Inactive"}`,
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error while updating user status",
      error: err.message,
    });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;

    // calculate how many to skip
    const skip = (page - 1) * limit;

    // fetch paginated users
    const users = await User.find().skip(skip).limit(limit);

    // get total count
    const totalUsers = await User.countDocuments();

    return res.status(200).json({
      message: "All users fetched successfully",
      count: users.length,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      users,
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      };
    }

    // fetch filtered & paginated users
    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .select("-password");

    // total matched users
    const totalUsers = await User.countDocuments(query);

    res.json({
      message: "Users fetched successfully",
      count: users.length,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error in searching the users",
      error: err.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if user exists

    const user = User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user
    await User.findByIdAndDelete(id);

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({
      message: "Server error in deleting the user",
      error: err.message,
    });
  }
};
