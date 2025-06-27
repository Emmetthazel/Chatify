const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const Message = require("../models/messageModel");

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.sendStatus(400);
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (isChat.length > 0) {
    // If the chat was previously deleted for this user, undelete it and mark all previous messages as deleted for this user
    const chat = isChat[0];
    if (chat.deletedBy && chat.deletedBy.includes(req.user._id)) {
      await Chat.findByIdAndUpdate(chat._id, { $pull: { deletedBy: req.user._id } });
      await Message.updateMany(
        { chat: chat._id },
        { $addToSet: { deletedBy: req.user._id } }
      );
    }
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  try {
    Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
      archivedBy: { $ne: req.user._id },
      deletedBy: { $ne: req.user._id },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ message: "Please Fill all the feilds" });
  }

  var users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(updatedChat);
  }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(added);
  }
});

// @desc    Archive chat for current user
// @route   PUT /api/chat/archive
// @access  Protected
const archiveChat = asyncHandler(async (req, res) => {
  const { chatId } = req.body;
  const userId = req.user._id;
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    { $addToSet: { archivedBy: userId } },
    { new: true }
  );
  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(chat);
  }
});

// @desc    Unarchive chat for current user
// @route   PUT /api/chat/unarchive
// @access  Protected
const unarchiveChat = asyncHandler(async (req, res) => {
  const { chatId } = req.body;
  const userId = req.user._id;
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { archivedBy: userId } },
    { new: true }
  );
  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(chat);
  }
});

// @desc    Fetch archived chats for a user
// @route   GET /api/chat/archived
// @access  Protected
const fetchArchivedChats = asyncHandler(async (req, res) => {
  try {
    Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
      archivedBy: req.user._id,
      deletedBy: { $ne: req.user._id },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Delete chat for current user (delete for me)
// @route   PUT /api/chat/deleteforme
// @access  Protected
const deleteChatForMe = asyncHandler(async (req, res) => {
  const { chatId } = req.body;
  const userId = req.user._id;
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    { $addToSet: { deletedBy: userId } },
    { new: true }
  );
  // Mark all messages in this chat as deleted for this user
  await Message.updateMany(
    { chat: chatId },
    { $addToSet: { deletedBy: userId } }
  );
  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(chat);
  }
});

module.exports = {
  accessChat,
  fetchChats,
  fetchArchivedChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  archiveChat,
  unarchiveChat,
  deleteChatForMe,
};
