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

  let lastDate = null;

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div key={m._id}>
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
                  borderRadius: "20px",
                  padding: "5px 15px",
                  maxWidth: "75%",
                  position: "relative",
                  display: "inline-block",
                  wordBreak: 'break-word',
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
                  {/^(https?:\/\/.*\.(mp3|wav|ogg|webm))$/i.test(m.content) ? (
                    <AudioPlayer
                      src={m.content}
                      style={{
                        borderRadius: '16px',
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
                  ) :
                  (/^(https?:\/\/.*\.(jpg|jpeg|png|gif))$/i.test(m.content) ? (
                    <a href={m.content} target="_blank" rel="noopener noreferrer">
                      <img
                        src={m.content}
                        alt="chat-img"
                        style={{
                          maxWidth: '220px',
                          maxHeight: '220px',
                          borderRadius: '12px',
                          marginBottom: 4,
                          display: 'block',
                        }}
                      />
                    </a>
                  ) : (
                    m.content
                  ))}
                  <span
                    style={{
                      fontSize: "0.75em",
                      color: "#555",
                      marginLeft: 8,
                      float: "right",
                      opacity: 0.7,
                    }}
                  >
                    {formatTime(m.createdAt)}
                  </span>
                </span>
              </span>
            </div>
          </div>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
