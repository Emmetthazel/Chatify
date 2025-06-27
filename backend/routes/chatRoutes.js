const express = require("express");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  removeFromGroup,
  addToGroup,
  renameGroup,
  archiveChat,
  unarchiveChat,
} = require("../controllers/chatControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup);
router.route("/groupremove").put(protect, removeFromGroup);
router.route("/groupadd").put(protect, addToGroup);
router.route("/archive").put(protect, archiveChat);
router.route("/unarchive").put(protect, unarchiveChat);
router.route("/archived").get(protect, require("../controllers/chatControllers").fetchArchivedChats);
router.route("/deleteforme").put(protect, require("../controllers/chatControllers").deleteChatForMe);

module.exports = router;
