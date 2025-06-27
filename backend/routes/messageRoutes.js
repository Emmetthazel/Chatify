const express = require("express");
const {
  allMessages,
  sendMessage,
  upload,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, upload.single("file"), sendMessage);

module.exports = router;
