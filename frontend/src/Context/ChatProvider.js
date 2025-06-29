import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import io from "socket.io-client";

const ChatContext = createContext();

const ENDPOINT = "http://localhost:5000";
let socket;

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState();
  const [incomingCall, setIncomingCall] = useState(null);
  const [callType, setCallType] = useState(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [peerInfo, setPeerInfo] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();

  const history = useHistory();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);
    setSelectedChat(undefined);

    if (!userInfo) history.push("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  // Initialize socket only once
  useEffect(() => {
    if (!socket) {
      socket = io(ENDPOINT);
    }
  }, []);

  // Accept/reject/hangup handlers (to be used globally)
  const acceptCall = async (call, user, socket, getMedia, setSelectedChat) => {
    setCallType(call.type);
    setCallModalOpen(true);
    setIncomingCall(null);
    setSelectedChat(call.chatObj); // Open the chat
    const stream = await getMedia(call.type);
    setLocalStream(stream);
    if (call.type === 'video' && localVideoRef.current) localVideoRef.current.srcObject = stream;
    if (call.type === 'audio' && localAudioRef.current) localAudioRef.current.srcObject = stream;
    const pc = new RTCPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    setPeerConnection(pc);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: call.from,
          candidate: event.candidate,
        });
      }
    };
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
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
  const rejectCall = (call, socket) => {
    socket.emit('call-reject', { to: call.from });
    setIncomingCall(null);
  };

  useEffect(() => {
    if (!socket) return;
    socket.on('call-offer', (data) => {
      setIncomingCall(data);
    });
    socket.on('call-hangup', () => {
      setIncomingCall(null);
      setCallModalOpen(false);
      setCallType(null);
      if (typeof setPeerInfo === 'function') setPeerInfo(null); // If peerInfo is in context
    });
    return () => {
      socket.off('call-offer');
      socket.off('call-hangup');
    };
  }, [socket]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
        socket,
        incomingCall,
        setIncomingCall,
        callType,
        setCallType,
        callModalOpen,
        setCallModalOpen,
        localStream,
        setLocalStream,
        remoteStream,
        setRemoteStream,
        peerConnection,
        setPeerConnection,
        localVideoRef,
        remoteVideoRef,
        localAudioRef,
        remoteAudioRef,
        acceptCall,
        rejectCall,
        peerInfo,
        setPeerInfo,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
