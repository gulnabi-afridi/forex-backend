import express from "express";
import { loginAdmin } from "../controllers/admin/adminAuthController.js";
import { adminAuthMiddleware } from "../middlewares/adminMiddleware.js";
import { addNewUser } from "../controllers/admin/adminController.js";
import { getUserStats } from "../controllers/admin/adminController.js";
import { getAllUser } from "../controllers/admin/adminController.js";
import { searchUsers } from "../controllers/admin/adminController.js";
import { deleteUser } from "../controllers/admin/adminController.js";
import { changeUserActiveStatus } from "../controllers/admin/adminController.js";
import {
  addBot,
  addBotVersion,
  editBotVersion,
  addPreset,
  deleteBotVersionFile
} from "../controllers/admin/botController.js";
import {
  multipleFileUpload,
  singleFileUpload,
} from "../middlewares/fileUploadMiddleware.js";

const router = express.Router();

router.get("/", () => console.log("Admin routes working...."));
router.post("/", loginAdmin);

router.use(adminAuthMiddleware);

router.post("/add-new-user", addNewUser);
router.get("/user-stats", getUserStats);
router.get("/all-users", getAllUser);
router.get("/search-users", searchUsers);
router.patch("/users/:id", changeUserActiveStatus);
router.delete("/delete-user/:id", deleteUser);

// bots
router.post(
  "/bot",
  multipleFileUpload([
    { name: "botImage", maxCount: 1 },
    { name: "botFile", maxCount: 1 },
  ]),
  addBot
);

router.post("/bot-version", singleFileUpload("botFile"), addBotVersion);
router.delete("/bot-version-file",deleteBotVersionFile);
router.put("/bot-version", singleFileUpload("botFile"), editBotVersion);
router.post("/preset", singleFileUpload("botFile"), addPreset);



  
export default router;
