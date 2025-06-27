import { Avatar } from "@chakra-ui/avatar";
import { Tooltip } from "@chakra-ui/tooltip";
import ScrollableFeed from "react-scrollable-feed";
import {
  isLastMessage,
  isSameSender,
  isSameSenderMargin,
  isSameUser,
} from "../config/ChatLogics";
import { ChatState } from "../Context/ChatProvider";
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useRef, useEffect, useState } from "react";

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const COLORS = [
  '#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ffb74d', '#a1887f', '#90a4ae', '#f06292'
];

// Helper to format the date for the top separator
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

// Helper to check if two dates are the same day
const isSameDay = (d1, d2) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const ScrollableChat = ({ messages, isGroupChat, users }) => {
  const { user } = ChatState();

  // Helper to get a color for a user
  const getUserColor = (userId) => {
    if (!users) return '#888';
    const idx = users.findIndex(u => u._id === userId);
    return COLORS[idx % COLORS.length] || '#888';
  };

  // Sticky date header logic
  const containerRef = useRef(null);
  const messageRefs = useRef([]);
  const [currentDate, setCurrentDate] = useState(messages.length > 0 ? formatDate(messages[messages.length - 1].createdAt) : "");

  useEffect(() => {
    messageRefs.current = messageRefs.current.slice(0, messages.length);
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const containerTop = containerRef.current.getBoundingClientRect().top;
      let topMsgIdx = 0;
      for (let i = 0; i < messageRefs.current.length; i++) {
        const ref = messageRefs.current[i];
        if (ref) {
          const rect = ref.getBoundingClientRect();
          if (rect.top - containerTop >= -10) { // -10 for some tolerance
            topMsgIdx = i;
            break;
          }
        }
      }
      setCurrentDate(formatDate(messages[topMsgIdx]?.createdAt));
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    // Initial call
    handleScroll();
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Sticky floating date header */}
      {currentDate && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,0.85)',
          textAlign: 'center',
          fontWeight: 500,
          color: '#555',
          borderRadius: 8,
          padding: '2px 12px',
          fontSize: '0.98em',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          margin: '0 auto 8px auto',
          width: 'fit-content',
        }}>
          {currentDate}
        </div>
      )}
      <ScrollableFeed>
        <div ref={containerRef} style={{ height: '100%', overflowY: 'auto' }}>
          {messages && messages.map((m, i) => {
            const showDaySeparator =
              i === 0 || !isSameDay(messages[i - 1].createdAt, m.createdAt);
            return (
              <div key={m._id} ref={el => messageRefs.current[i] = el}>
                {showDaySeparator && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '12px 0',
                  }}>
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
                      {formatDate(m.createdAt)}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex" }}>
                  {(isSameSender(messages, m, i, user._id) ||
                    isLastMessage(messages, i, user._id)) && (
                    <Tooltip label={m.sender.name} placement="bottom-start" hasArrow>
                      <Avatar
                        mt="7px"
                        mr={1}
                        size="sm"
                        cursor="pointer"
                        name={m.sender.name}
                        src={m.sender.pic}
                      />
                    </Tooltip>
                  )}
                  <span
                    style={{
                      backgroundColor: `${
                        m.sender._id === user._id ? "#BEE3F8" : "#B9F5D0"
                      }`,
                      marginLeft: isSameSenderMargin(messages, m, i, user._id),
                      marginTop: isSameUser(messages, m, i, user._id) ? 3 : 10,
                      borderRadius: /\.(jpg|jpeg|png|gif|mp4|mov|avi|mkv)$/i.test(m.attachment || m.content) ? '6px' : '9px',
                      padding: /\.(jpg|jpeg|png|gif|mp4|mov|avi|mkv)$/i.test(m.attachment || m.content) ? '2px 2px' : '5px 10px',
                      maxWidth: "75%",
                      position: "relative",
                      display: "inline-block",
                      wordBreak: 'break-word',
                      marginBottom: /\.(jpg|jpeg|png|gif|mp4|mov|avi|mkv)$/i.test(m.attachment || m.content) ? '2px' : undefined,
                    }}
                  >
                    {isGroupChat && m.sender._id !== user._id && (
                      <span
                        style={{
                          fontWeight: 600,
                          color: getUserColor(m.sender._id),
                          fontSize: '0.85em',
                          position: 'absolute',
                          top: 6,
                          left: 12,
                          zIndex: 2,
                          opacity: 0.95,
                        }}
                      >
                        {m.sender.name}
                      </span>
                    )}
                    <span style={{ display: 'block', paddingTop: isGroupChat && m.sender._id !== user._id ? 18 : 0 }}>
                      {m.attachment ? (
                        /\.(jpg|jpeg|png|gif)$/i.test(m.attachment) ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <a href={m.attachment} target="_blank" rel="noopener noreferrer">
                              <img
                                src={m.attachment}
                                alt="chat-img"
                                style={{
                                  maxWidth: '220px',
                                  maxHeight: '220px',
                                  borderRadius: '9px',
                                  marginBottom: 4,
                                  display: 'block',
                                }}
                              />
                            </a>
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 10,
                                fontSize: '0.75em',
                                color: '#fff',
                                background: 'rgba(0,0,0,0.35)',
                                borderRadius: 8,
                                padding: '0px 5px',
                                zIndex: 2,
                                fontWeight: 400,
                                letterSpacing: 0.2,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                              }}
                            >
                              {formatTime(m.createdAt)}
                            </span>
                          </div>
                        ) : /\.(mp3|wav|ogg|webm)$/i.test(m.attachment) ? (
                          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '220px', paddingRight: 60, minHeight: 40 }}>
                            <AudioPlayer
                              src={m.attachment}
                              style={{
                                background: 'transparent',
                                boxShadow: 'none',
                                width: '220px',
                                minWidth: '160px',
                                margin: '0 auto',
                                padding: '0',
                              }}
                              showJumpControls={false}
                              customAdditionalControls={[]}
                              customVolumeControls={[]}
                              customProgressBarSection={['CURRENT_TIME', 'PROGRESS_BAR']}
                              layout="horizontal-reverse"
                            />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 4,
                                right: 10,
                                fontSize: '0.75em',
                                color: '#fff',
                                background: 'rgba(0,0,0,0.35)',
                                borderRadius: 8,
                                padding: '0px 5px',
                                zIndex: 2,
                                fontWeight: 400,
                                letterSpacing: 0.2,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                pointerEvents: 'none',
                              }}
                            >
                              {formatTime(m.createdAt)}
                            </span>
                          </div>
                        ) : /\.(mp4|mov|avi|mkv)$/i.test(m.attachment) ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <video
                              src={m.attachment}
                              controls
                              style={{
                                maxWidth: '220px',
                                maxHeight: '220px',
                                borderRadius: '9px',
                                marginBottom: 0,
                                display: 'block',
                                background: '#000',
                              }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 10,
                                fontSize: '0.75em',
                                color: '#fff',
                                background: 'rgba(0,0,0,0.35)',
                                borderRadius: 8,
                                padding: '0px 5px',
                                zIndex: 2,
                                fontWeight: 400,
                                letterSpacing: 0.2,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                              }}
                            >
                              {formatTime(m.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <a href={m.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span role="img" aria-label="attachment">📎</span>
                            {m.attachment.split('/').pop()}
                          </a>
                        )
                      ) : /^(https?:\/\/.*\.(jpg|jpeg|png|gif))$/i.test(m.content) ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <a href={m.content} target="_blank" rel="noopener noreferrer">
                            <img
                              src={m.content}
                              alt="chat-img"
                              style={{
                                maxWidth: '220px',
                                maxHeight: '220px',
                                borderRadius: '9px',
                                marginBottom: 4,
                                display: 'block',
                              }}
                            />
                          </a>
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              right: 10,
                              fontSize: '0.75em',
                              color: '#fff',
                              background: 'rgba(0,0,0,0.35)',
                              borderRadius: 8,
                              padding: '0px 5px',
                              zIndex: 2,
                              fontWeight: 400,
                              letterSpacing: 0.2,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            }}
                          >
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                      ) : /^(https?:\/\/.*\.(mp3|wav|ogg|webm))$/i.test(m.content) ? (
                        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '220px', paddingRight: 60, minHeight: 50 }}>
                          <AudioPlayer
                            src={m.content}
                            style={{
                              background: 'transparent',
                              boxShadow: 'none',
                              width: '220px',
                              minWidth: '160px',
                              margin: '0 auto',
                              padding: '0',
                            }}
                            showJumpControls={false}
                            customAdditionalControls={[]}
                            customVolumeControls={[]}
                            customProgressBarSection={['CURRENT_TIME', 'PROGRESS_BAR']}
                            layout="horizontal-reverse"
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 4,
                              right: 10,
                              fontSize: '0.75em',
                              color: '#fff',
                              background: 'rgba(0,0,0,0.35)',
                              borderRadius: 8,
                              padding: '0px 5px',
                              zIndex: 2,
                              fontWeight: 400,
                              letterSpacing: 0.2,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                              pointerEvents: 'none',
                            }}
                          >
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                      ) : /^(https?:\/\/.*\.(mp4|mov|avi|mkv))$/i.test(m.content) ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <video
                            src={m.content}
                            controls
                            style={{
                              maxWidth: '220px',
                              maxHeight: '220px',
                              borderRadius: '9px',
                              marginBottom: 0,
                              display: 'block',
                              background: '#000',
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              right: 10,
                              fontSize: '0.75em',
                              color: '#fff',
                              background: 'rgba(0,0,0,0.35)',
                              borderRadius: 8,
                              padding: '0px 5px',
                              zIndex: 2,
                              fontWeight: 400,
                              letterSpacing: 0.2,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            }}
                          >
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                      ) : (
                        <>
                          {m.content}
                          <span
                            style={{
                              fontSize: '0.75em',
                              color: '#555',
                              marginLeft: 8,
                              fontWeight: 400,
                              letterSpacing: 0.2,
                              opacity: 0.7,
                              padding: '0px 5px',
                            }}
                          >
                            {formatTime(m.createdAt)}
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollableFeed>
    </div>
  );
};

export default ScrollableChat;
