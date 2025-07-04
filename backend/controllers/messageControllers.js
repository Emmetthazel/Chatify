const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const multer = require("multer");
const path = require("path");
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({
      chat: req.params.chatId,
      deletedBy: { $ne: req.user._id },
    })
      .populate("sender", "name pic email")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  let { content, chatId, isForward, originalMessageId, callInfo } = req.body;
  let attachment = null;
  
  if (req.file) {
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    attachment = `${baseUrl}/uploads/${req.file.filename}`;
  } else if (req.body.attachment) {
    attachment = req.body.attachment;
  }

  // Handle forwarding of local files
  if (isForward && attachment && attachment.includes('localhost:5000/uploads/')) {
    try {
      console.log('Forwarding local file, uploading to Cloudinary...');
      
      // Extract filename from URL
      const filename = attachment.split('/').pop();
      const filePath = path.join(__dirname, '../uploads/', filename);
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: 'auto',
          folder: 'chatify_uploads',
        });
        
        attachment = result.secure_url;
        console.log('File uploaded to Cloudinary:', attachment);
      } else {
        console.log('Local file not found:', filePath);
        // If file doesn't exist, try to use the original attachment
        // This might happen if the file was already moved/deleted
      }
    } catch (error) {
      console.error('Error uploading local file to Cloudinary:', error);
      // Continue with original attachment if upload fails
    }
  }

  // Ensure content is always a string
  if (!content) content = "";

  if (!content && !attachment) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    attachment: attachment,
  };

  // Add callInfo if it exists (for call system messages)
  if (callInfo) {
    newMessage.callInfo = callInfo;
  }

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic").execPopulate();
    message = await message.populate("chat").execPopulate();
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Delete Message for current user
//@route           PUT /api/Message/delete
//@access          Protected
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      res.status(404);
      throw new Error("Message not found");
    }

    // Check if user is part of the chat
    const chat = await Chat.findById(message.chat);
    if (!chat) {
      res.status(404);
      throw new Error("Chat not found");
    }

    // Check if user is a member of the chat
    const isMember = chat.users.some(user => user.toString() === userId.toString());
    if (!isMember) {
      res.status(403);
      throw new Error("You can only delete messages from chats you're a member of");
    }

    // Add user to deletedBy array
    await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedBy: userId } },
      { new: true }
    );

    // Find the new latest message for this chat (not deleted for this user)
    const latestMessage = await Message.findOne({
      chat: message.chat,
      deletedBy: { $ne: userId }
    }).sort({ createdAt: -1 });

    await Chat.findByIdAndUpdate(message.chat, { latestMessage });

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage, deleteMessage, upload };
