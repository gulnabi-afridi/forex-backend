import express from "express";
import cors from "cors";
import { loginUser } from "./controllers/authController.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const router = express.Router();

// Routes
router.post("/login", loginUser);

// Mount router
app.use("/", router);

// Default
app.get("/", (req, res) => {
  res.send("API is running...");
});

export { app };
