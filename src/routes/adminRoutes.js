import express from "express";
import { loginAdmin } from "../controllers/admin/adminAuthController.js";
import { adminAuthMiddleware } from "../middlewares/adminMiddleware.js";
import { addNewUser } from "../controllers/admin/adminController.js";
import { getUserStats } from "../controllers/admin/adminController.js";
import { getAllUser } from "../controllers/admin/adminController.js";
import { searchUsers } from "../controllers/admin/adminController.js";

const router = express.Router();

router.get("/", () => console.log("Admin routes working...."));
router.post("/", loginAdmin);

router.use(adminAuthMiddleware);

router.post("/add-new-user", addNewUser);
router.get("/user-stats", getUserStats);
router.get("/all-users", getAllUser);
router.get("/search-users", searchUsers);

export default router;
