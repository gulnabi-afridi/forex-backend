import express from "express";
import { loginAdmin } from "../controllers/admin/adminAuthController.js";
import { adminAuthMiddleware } from "../middlewares/adminMiddleware.js";
import { addNewUser } from "../controllers/admin/adminController.js";

const router = express.Router();

router.get("/", () => console.log("Admin routes working...."));
router.post("/", loginAdmin);

router.use(adminAuthMiddleware);

router.post("/add-new-user", addNewUser);

export default router;
