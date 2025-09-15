import jwt from "jsonwebtoken";
import Admin from "../../models/Admin.js";

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check user exist

    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // check password
    const isMatch = password === user.password;
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // generate token valid for 10 days
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
