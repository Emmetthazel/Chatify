import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ArrowBackIcon, AttachmentIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import { Avatar } from "@chakra-ui/avatar";
import { FaMicrophone, FaStop, FaFileAlt } from "react-icons/fa";
const ENDPOINT = "http://localhost:5000"; // "https://talk-a-tive.herokuapp.com"; -> After deployment
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const { selectedChat, setSelectedChat, user, notification, setNotification } = ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        setNewMessage("");
        const { data } = await axios.post(
          "/api/message",
          {
            content: newMessage,
            chatId: selectedChat,
          },
          config
        );
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (error) {
        toast({
          title: "Error Occured!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      
      await axios.put(
        "/api/message/delete",
        {
          messageId: messageId,
        },
        config
      );

      // Remove the message from the local state
      setMessages(messages.filter((msg) => msg._id !== messageId));

      toast({
        title: "Message deleted!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Error deleting message",
        description: error.response?.data?.message || "Failed to delete message",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    socket.on("message recieved", (newMessageRecieved) => {
      if (
        !selectedChatCompare || // if chat is not selected or doesn't match current chat
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageRecieved]);
      }
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const addEmoji = (emoji) => {
    setNewMessage((prev) => prev + emoji.native);
  };

  // Upload image to Cloudinary and send as message
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageLoading(true);
    if (file.type === "image/jpeg" || file.type === "image/png") {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "chat-app");
      data.append("cloud_name", "piyushproj");
      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/piyushproj/image/upload", {
          method: "post",
          body: data,
        });
        const imgData = await res.json();
        if (imgData.url) {
          // Send image as message
          await sendImageMessage(imgData.url);
        } else {
          throw new Error("Upload failed");
        }
      } catch (err) {
        toast({
          title: "Error uploading image",
          description: err.message,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "bottom",
        });
      }
      setImageLoading(false);
    } else {
      toast({
        title: "Please select a JPEG or PNG image!",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setImageLoading(false);
    }
  };

  // Send image message
  const sendImageMessage = async (imageUrl) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(
        "/api/message",
        {
          content: imageUrl,
          chatId: selectedChat,
        },
        config
      );
      socket.emit("new message", data);
      setMessages([...messages, data]);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to send the image",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // Audio recording logic
  const handleAudioStart = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast({
        title: "Audio recording not supported",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setAudioChunks((prev) => [...prev, e.data]);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      toast({
        title: "Could not start recording",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleAudioStop = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
    }
  };

  // Upload audio to Cloudinary and send as message
  const handleAudioUpload = async (audioBlob) => {
    setAudioLoading(true);
    const data = new FormData();
    data.append("file", audioBlob);
    data.append("upload_preset", "chat-app");
    data.append("cloud_name", "piyushproj");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/piyushproj/video/upload", {
        method: "post",
        body: data,
      });
      const audioData = await res.json();
      if (audioData.url) {
        await sendAudioMessage(audioData.url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      toast({
        title: "Error uploading audio",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
    setAudioLoading(false);
  };

  // Send audio message
  const sendAudioMessage = async (audioUrl) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(
        "/api/message",
        {
          content: audioUrl,
          chatId: selectedChat,
        },
        config
      );
      socket.emit("new message", data);
      setMessages([...messages, data]);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to send the audio",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // Document upload handler
  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocLoading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("chatId", selectedChat._id);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const res = await axios.post("/api/message", data, config);
      socket.emit("new message", res.data);
      setMessages([...messages, res.data]);
    } catch (err) {
      toast({
        title: "Error uploading document",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
    setDocLoading(false);
  };

  // Video upload handler
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoLoading(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "chat-app");
    data.append("cloud_name", "piyushproj");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/piyushproj/video/upload", {
        method: "post",
        body: data,
      });
      const videoData = await res.json();
      if (videoData.url) {
        await sendVideoMessage(videoData.url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      toast({
        title: "Error uploading video",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    }
    setVideoLoading(false);
  };

  const sendVideoMessage = async (videoUrl) => {
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(
        "/api/message",
        {
          content: videoUrl,
          chatId: selectedChat,
        },
        config
      );
      socket.emit("new message", data);
      setMessages([...messages, data]);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to send the video",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  // Helper to format the date for the top separator
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            <Box d="flex" alignItems="center">
              {messages && !selectedChat.isGroupChat ? (
                <>
                  <Avatar
                    size="md"
                    name={getSender(user, selectedChat.users)}
                    src={getSenderFull(user, selectedChat.users).pic}
                    mr={2}
                  />
                  <Text
                    fontWeight="bold"
                    fontSize={{ base: "28px", md: "30px" }}
                  >
                    {getSender(user, selectedChat.users)}
                  </Text>
                </>
              ) : messages && selectedChat.isGroupChat ? (
                <>
                  {selectedChat.pic && (
                    <Avatar
                      size="md"
                      name={selectedChat.chatName}
                      src={selectedChat.pic}
                      mr={2}
                    />
                  )}
                  <Text
                    fontWeight="bold"
                    fontSize={{ base: "28px", md: "30px" }}
                  >
                    {selectedChat.chatName && selectedChat.chatName}
                  </Text>
                </>
              ) : null}
            </Box>
            {messages && !selectedChat.isGroupChat ? (
              <ProfileModal user={getSenderFull(user, selectedChat.users)} />
            ) : messages && selectedChat.isGroupChat ? (
              <UpdateGroupChatModal
                fetchMessages={fetchMessages}
                fetchAgain={fetchAgain}
                setFetchAgain={setFetchAgain}
              />
            ) : null}
          </Text>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            className="input-background"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                {messages && messages.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 12px 0' }}>
                    <span style={{
                      fontWeight: 500,
                      color: '#555',
                      background: 'rgba(255,255,255,0.7)',
                      display: 'inline-block',
                      borderRadius: 12,
                      padding: '2px 12px',
                      fontSize: '0.98em',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      minWidth: 0,
                      width: 'auto',
                      maxWidth: '100%',
                      textAlign: 'center',
                    }}>
                      {formatDate(messages[messages.length - 1].createdAt)}
                    </span>
                  </div>
                )}
                <ScrollableChat 
                  messages={messages} 
                  isGroupChat={selectedChat.isGroupChat} 
                  users={selectedChat.users}
                  deleteMessage={deleteMessage}
                  user={user}
                />
              </div>
            )}

            <FormControl
              onKeyDown={sendMessage}
              id="first-name"
              isRequired
              mt={3}
              style={{ position: 'relative' }}
            >
              {istyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    // height={50}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              {/* Emoji Button inside input */}
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((val) => !val)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.3rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  aria-label="Add emoji"
                >
                  🙂
                </button>
              </span>
              {/* Image upload button */}
              <span style={{ position: 'absolute', left: 45, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                <label htmlFor="chat-image-upload" style={{ cursor: 'pointer', margin: 0 }}>
                  <AttachmentIcon boxSize={5} color="#555" />
                  <input
                    id="chat-image-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    disabled={imageLoading}
                  />
                </label>
              </span>
              {/* Document upload button with different icon */}
              <span style={{ position: 'absolute', left: 80, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                <label htmlFor="chat-doc-upload" style={{ cursor: 'pointer', margin: 0 }}>
                  <FaFileAlt size={20} color="#555" />
                  <input
                    id="chat-doc-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,.json,.xml,.md,.rtf,.odt,.ods,.odp"
                    style={{ display: 'none' }}
                    onChange={handleDocUpload}
                    disabled={docLoading}
                  />
                </label>
              </span>
              {/* Video upload button */}
              <span style={{ position: 'absolute', left: 115, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                <label htmlFor="chat-video-upload" style={{ cursor: 'pointer', margin: 0 }}>
                  <i className="fas fa-video" style={{ fontSize: 20, color: "#555" }} />
                  <input
                    id="chat-video-upload"
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={handleVideoUpload}
                    disabled={videoLoading}
                  />
                </label>
              </span>
              {showEmojiPicker && (
                <div style={{ position: 'absolute', bottom: '60px', left: 0, zIndex: 10 }}>
                  <Picker data={data} onEmojiSelect={addEmoji} theme="dark" />
                </div>
              )}
              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder={docLoading ? "Uploading document..." : imageLoading ? "Uploading image..." : audioLoading ? "Uploading audio..." : videoLoading ? "Uploading video..." : "Type a message"}
                value={newMessage}
                onChange={typingHandler}
                style={{ paddingLeft: 160, paddingRight: 50 }}
                disabled={imageLoading || audioLoading || docLoading || videoLoading}
              />
              {/* Audio record button on the right */}
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                {recording ? (
                  <button
                    type="button"
                    onClick={handleAudioStop}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.3rem',
                      cursor: 'pointer',
                      color: '#e53e3e',
                      padding: 0,
                    }}
                    aria-label="Stop recording"
                  >
                    <FaStop />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAudioStart}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.3rem',
                      cursor: 'pointer',
                      color: '#555',
                      padding: 0,
                    }}
                    aria-label="Record audio"
                    disabled={audioLoading || imageLoading || docLoading || videoLoading}
                  >
                    <FaMicrophone />
                  </button>
                )}
              </span>
            </FormControl>
          </Box>
        </>
      ) : (
        // to get socket.io on same page
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
