import express from "express";
import cors from "cors";

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());



// Default
app.get("/", (req, res) => {
  res.send("API is running...");
});
