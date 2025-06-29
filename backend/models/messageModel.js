const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    attachment: { type: String },
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    forwardedFrom: {
      name: { type: String },
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      originalChat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" }
    },
    callInfo: {
      type: { type: String, enum: ['audio', 'video'] },
      direction: { type: String, enum: ['outgoing', 'incoming'] },
      status: { type: String, enum: ['missed', 'ended', ''] },
      from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date }
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
