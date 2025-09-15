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
