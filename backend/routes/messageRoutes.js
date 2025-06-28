const express = require("express");
const {
  allMessages,
  sendMessage,
  deleteMessage,
  upload,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, upload.single("file"), sendMessage);
router.route("/delete").put(protect, deleteMessage);

module.exports = router;
