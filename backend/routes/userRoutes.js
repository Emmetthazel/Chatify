const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  updateProfile,
  getUserById,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/").post(registerUser);
router.post("/login", authUser);
router.put("/profile", protect, updateProfile);
router.get("/:id", getUserById);

module.exports = router;
