import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Avatar, Button, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
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
import { FaMicrophone, FaStop, FaFileAlt, FaPhoneSlash, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaImage } from "react-icons/fa";
import { MdVideoLibrary } from "react-icons/md";
const ENDPOINT = "http://localhost:5000"; // "https://talk-a-tive.herokuapp.com"; -> After deployment
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat, setSelectedChat, user, notification, setNotification, callModalOpen, setCallModalOpen } = ChatState();
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
  const audioChunksRef = useRef([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const toast = useToast();
  const [callType, setCallType] = useState(null); // 'audio' or 'video'
  const [incomingCall, setIncomingCall] = useState(null); // { from, type }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const peerName = (selectedChat && selectedChat.users && selectedChat.users.find(u => u._id !== user._id)?.name) || "Contact";
  const peerAvatar = (selectedChat && selectedChat.users && selectedChat.users.find(u => u._id !== user._id)?.pic) || undefined;
  const [peerInfo, setPeerInfo] = useState(null);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  // Update state and refs together
  const setPeerConnectionSafe = (pc) => {
    peerConnectionRef.current = pc;
    setPeerConnection(pc);
  };
  const setLocalStreamSafe = (stream) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  };
  const setRemoteStreamSafe = (stream) => {
    remoteStreamRef.current = stream;
    setRemoteStream(stream);
  };

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
    if (event.key === "Enter") {
      // If recording, stop the recording first
      if (recording && mediaRecorder) {
        handleAudioStop();
        return; // The audio will be sent via the onstop callback
      }
      
      // If there's text message, send it
      if (newMessage) {
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
          setMessages(prevMessages => [...prevMessages, data]);
          setFetchAgain(prev => !prev);
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

    return () => {
      socket.off("connected");
      socket.off("typing");
      socket.off("stop typing");
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    fetchMessages();

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    socket.on("message received", (newMessageRecieved) => {
      if (
        !selectedChatCompare || // if chat is not selected or doesn't match current chat
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification(prevNotifications => [newMessageRecieved, ...prevNotifications]);
          setFetchAgain(prevFetchAgain => !prevFetchAgain);
        }
      } else {
        setMessages(prevMessages => [...prevMessages, newMessageRecieved]);
      }
    });

    return () => {
      socket.off("message received");
    };
  }, [selectedChatCompare]);

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
      setMessages(prevMessages => [...prevMessages, data]);
      setFetchAgain(prev => !prev);
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
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          setAudioChunks(prev => [...prev, e.data]);
        }
      };
      
      recorder.onstop = async () => {
        try {
          // Use the ref to get the current audio chunks
          const currentChunks = audioChunksRef.current;
          if (currentChunks.length === 0) {
            toast({
              title: "No audio recorded",
              status: "warning",
              duration: 3000,
              isClosable: true,
              position: "bottom",
            });
            stream.getTracks().forEach(track => track.stop());
            setRecording(false);
            return;
          }
          
          const audioBlob = new Blob(currentChunks, { type: 'audio/webm' });
          await handleAudioUpload(audioBlob);
        } catch (error) {
          toast({
            title: "Error processing audio",
            description: error.message,
            status: "error",
            duration: 3000,
            isClosable: true,
            position: "bottom",
          });
        } finally {
          stream.getTracks().forEach(track => track.stop());
          setRecording(false);
          setAudioChunks([]);
          audioChunksRef.current = [];
        }
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
    if (mediaRecorder && recording && mediaRecorder.state === 'recording') {
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
      setMessages(prevMessages => [...prevMessages, data]);
      setFetchAgain(prev => !prev);
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
      setMessages(prevMessages => [...prevMessages, res.data]);
      setFetchAgain(prev => !prev);
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
      setMessages(prevMessages => [...prevMessages, data]);
      setFetchAgain(prev => !prev);
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

  // Helper to get media
  const getMedia = async (type) => {
    if (type === 'video') {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } else {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  };

  const initiateCall = async (type) => {
    setCallType(type);
    setCallModalOpen(true);
    const stream = await getMedia(type);
    setLocalStreamSafe(stream);
    if (type === 'video' && localVideoRef.current) localVideoRef.current.srcObject = stream;
    if (type === 'audio' && localAudioRef.current) localAudioRef.current.srcObject = stream;

    const pc = new RTCPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    setPeerConnectionSafe(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: selectedChat.users.find(u => u._id !== user._id)._id,
          candidate: event.candidate,
        });
      }
    };
    pc.ontrack = (event) => {
      setRemoteStreamSafe(event.streams[0]);
      if (type === 'video' && remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      if (type === 'audio' && remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call-offer', {
      to: selectedChat.users.find(u => u._id !== user._id)._id,
      offer,
      type,
      from: user._id,
    });
  };

  const acceptCall = async (call) => {
    setCallType(call.type);
    setCallModalOpen(true);
    setIncomingCall(null);
    setPeerInfo({
      name: call.callerName,
      avatar: call.callerAvatar,
    });

    const stream = await getMedia(call.type);
    setLocalStreamSafe(stream);
    if (call.type === 'video' && localVideoRef.current) localVideoRef.current.srcObject = stream;
    if (call.type === 'audio' && localAudioRef.current) localAudioRef.current.srcObject = stream;

    const pc = new RTCPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    setPeerConnectionSafe(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: call.from,
          candidate: event.candidate,
        });
      }
    };
    pc.ontrack = (event) => {
      setRemoteStreamSafe(event.streams[0]);
      if (call.type === 'video' && remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      if (call.type === 'audio' && remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
    };

    await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('call-answer', {
      to: call.from,
      answer,
    });
  };

  const rejectCall = (call) => {
    socket.emit('call-reject', { to: call.from });
    setIncomingCall(null);
  };

  const hangUpCall = () => {
    setCallModalOpen(false);
    setCallType(null);

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      setLocalStreamSafe(null);
    }

    // Stop all remote tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      setRemoteStreamSafe(null);
    }

    // Close and reset peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      setPeerConnectionSafe(null);
    }

    // Find the peer user ID safely
    let peerId = null;
    if (selectedChat && selectedChat.users) {
      peerId = selectedChat.users.find(u => u._id !== user._id)?._id;
    } else if (incomingCall && incomingCall.from) {
      peerId = incomingCall.from;
    }
    if (peerId) {
      socket.emit('call-hangup', { to: peerId });
    }
    setIncomingCall(null);
  };

  // In useEffect, set up socket event listeners only once (empty dependency array)
  useEffect(() => {
    if (!socket) return;

    socket.on('call-offer', async (data) => {
      // Fetch caller profile
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const res = await axios.get(`/api/user/${data.from}`, config);
        console.log('Caller API response:', res.data); // Debug log
        const caller = res.data;
        setIncomingCall({
          ...data,
          callerName: caller.name,
          callerAvatar: caller.pic,
        });
      } catch (err) {
        setIncomingCall({ ...data, callerName: 'Contact', callerAvatar: undefined });
      }
    });

    socket.on('call-answer', async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on('ice-candidate', async (data) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    socket.on('call-reject', () => {
      hangUpCall();
    });

    socket.on('call-hangup', () => {
      hangUpCall();
    });

    return () => {
      socket.off('call-offer');
      socket.off('call-answer');
      socket.off('ice-candidate');
      socket.off('call-reject');
      socket.off('call-hangup');
    };
  }, [socket]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsCameraOff(!track.enabled);
      });
    }
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
              <Box d="flex" alignItems="center" ml={2}>
                <IconButton
                  icon={<i className="fas fa-phone"></i>}
                  aria-label="Voice Call"
                  onClick={() => initiateCall('audio')}
                  size="md"
                  mr={2}
                />
                <IconButton
                  icon={<i className="fas fa-video"></i>}
                  aria-label="Video Call"
                  onClick={() => initiateCall('video')}
                  size="md"
                  mr={2}
                />
                <ProfileModal user={getSenderFull(user, selectedChat.users)} />
              </Box>
            ) : messages && selectedChat.isGroupChat ? (
              <Box d="flex" alignItems="center" ml={2}>
                {selectedChat.isGroupChat && (
                  <Box ml={0}>
                    <UpdateGroupChatModal
                      fetchMessages={fetchMessages}
                      fetchAgain={fetchAgain}
                      setFetchAgain={setFetchAgain}
                    />
                  </Box>
                )}
              </Box>
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

            {/* Typing indicator above input bar */}
            {istyping && (
              <div style={{ width: 70, margin: '0 auto', marginBottom: 5 }}>
                <Lottie
                  options={defaultOptions}
                  width={70}
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
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<AttachmentIcon />}
                  aria-label="Attach"
                  variant="ghost"
                  size="lg"
                  style={{ position: 'absolute', left: 45, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
                />
                <MenuList>
                  <MenuItem icon={<FaImage />} onClick={() => document.getElementById('chat-image-upload').click()}>
                    Attach Image
                  </MenuItem>
                  <MenuItem icon={<FaFileAlt />} onClick={() => document.getElementById('chat-doc-upload').click()}>
                    Attach Document
                  </MenuItem>
                  <MenuItem icon={<MdVideoLibrary />} onClick={() => document.getElementById('chat-video-upload').click()}>
                    Attach Video
                  </MenuItem>
                </MenuList>
              </Menu>
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
          <Box
            textAlign="center"
            p={8}
            borderRadius="xl"
            bg="white"
            boxShadow="0 4px 20px rgba(0,0,0,0.08)"
            maxW="400px"
            mx="auto"
          >
            <Text
              fontSize="4xl"
              mb={3}
              display="block"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
            >
              👋
            </Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              mb={2}
              bgGradient="linear(to-r, teal.400, blue.500)"
              bgClip="text"
              fontFamily="Work sans"
            >
              Welcome to Luma!
            </Text>
            <Text
              fontSize="md"
              color="gray.600"
              fontFamily="Work sans"
              lineHeight="1.6"
            >
              Click a user from the left to start your conversation.
            </Text>
          </Box>
        </Box>
      )}
      <Modal isOpen={callModalOpen} onClose={hangUpCall} isCentered size="2xl">
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent p={0} maxW="600px" minH="400px" bg="black">
          <ModalHeader textAlign="center" color="white" bg="black" borderTopRadius="md">
            {callType === "video" ? "Video Call" : "Voice Call"}
          </ModalHeader>
          <ModalBody p={0} position="relative" minH="340px" bg="black">
            {callType === "video" ? (
              <Box width="100%" height="340px" position="relative" bg="black">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 0
                  }}
                />
                {/* Local video overlay */}
                <Box
                  position="absolute"
                  bottom={0}
                  right={0}
                  border="2px solid #fff"
                  borderRadius="md"
                  overflow="hidden"
                  zIndex={2}
                  width="600px"
                  height="402px"
                  bg="#444"
                  boxShadow="0 2px 8px rgba(0,0,0,0.15)"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 8,
                      objectFit: "cover"
                    }}
                  />
                </Box>
              </Box>
            ) : (
              <>
                <Avatar size="2xl" name={peerInfo?.name || peerName} src={peerInfo?.avatar || peerAvatar} mb={4} top={20} left={60}/>
                <audio
                  ref={remoteAudioRef}
                  autoPlay
                  playsInline
                  style={{ display: 'block' }}
                />
              </>
            )}
          </ModalBody>
          <ModalFooter flexDirection="column" bg="white" borderBottomRadius="md">
            <Text fontWeight="bold" fontSize="xl" mt={2} mb={2} color="black">{peerInfo?.name || peerName}</Text>
            <Box display="flex" justifyContent="center" gap={4}>
              <IconButton
                icon={isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                aria-label="Mute"
                onClick={toggleMute}
                colorScheme={isMuted ? "gray" : "teal"}
                variant="ghost"
              />
              {callType === "video" && (
                <IconButton
                  icon={isCameraOff ? <FaVideoSlash /> : <FaVideo />}
                  aria-label="Camera"
                  onClick={toggleCamera}
                  colorScheme={isCameraOff ? "gray" : "teal"}
                  variant="ghost"
                />
              )}
              <IconButton
                icon={<FaPhoneSlash />}
                aria-label="Hang Up"
                onClick={hangUpCall}
                colorScheme="red"
                size="lg"
                borderRadius="full"
              />
            </Box>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {incomingCall && (
        <Modal isOpen={!!incomingCall} onClose={() => rejectCall(incomingCall)} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader textAlign="center">
              Incoming {incomingCall?.type === "video" ? "Video" : "Voice"} Call
            </ModalHeader>
            <ModalBody display="flex" flexDirection="column" alignItems="center" justifyContent="center">
              <Avatar size="xl" name={incomingCall?.callerName || "Contact"} src={incomingCall?.callerAvatar} mb={4} />
              <Text fontWeight="bold" fontSize="lg" mb={2}>
                {incomingCall?.callerName || "Contact"}
              </Text>
              <Text color="gray.500" fontSize="md" mb={2}>
                is calling you...
              </Text>
            </ModalBody>
            <ModalFooter display="flex" justifyContent="center" gap={4}>
              <Button colorScheme="teal" onClick={() => acceptCall(incomingCall)}>
                Accept
              </Button>
              <Button colorScheme="red" onClick={() => rejectCall(incomingCall)}>
                Reject
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      <input
        id="chat-image-upload"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
        disabled={imageLoading}
      />
      <input
        id="chat-doc-upload"
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,.json,.xml,.md,.rtf,.odt,.ods,.odp"
        style={{ display: 'none' }}
        onChange={handleDocUpload}
        disabled={docLoading}
      />
      <input
        id="chat-video-upload"
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleVideoUpload}
        disabled={videoLoading}
      />
    </>
  );
};

export default SingleChat;
