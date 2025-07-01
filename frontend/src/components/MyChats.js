import { AddIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { Button, Tabs, TabList, Tab, IconButton } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";
import { FaArchive, FaChevronDown, FaChevronRight, FaTrash } from "react-icons/fa";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";
import { useTheme } from "../Context/ThemeProvider";
import io from "socket.io-client";
import { Avatar } from "@chakra-ui/avatar";

function getMessagePreview(message) {
  if (!message) return "";
  const content = message.content ? message.content.toLowerCase() : "";
  // Check for audio FIRST (now includes webm)
  if (/.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/i.test(content)) return "Audio";
  // Then image
  if (/\.(jpeg|jpg|png|gif)(\?|$)/i.test(content)) return "Image";
  // Then video
  if (/\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(content)) return "Video";
  // Then document
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar)(\?|$)/i.test(content)) return "Document";
  return message.content;
}

const ENDPOINT = "http://localhost:5000"; // À adapter si besoin
let socket;

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const [selectedTab, setSelectedTab] = useState(0); // 0: All, 1: Groups, 2: Unread
  const [archivedChats, setArchivedChats] = useState([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]); // Ajouté pour stocker les users online

  const { selectedChat, setSelectedChat, user, chats, setChats, notification, setNotification } = ChatState();
  const { theme } = useTheme();

  const toast = useToast();

  const fetchChats = async () => {
    // console.log(user._id);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get("/api/chat", config);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  const fetchArchivedChats = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get("/api/chat/archived", config);
      setArchivedChats(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the archived chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  const handleArchive = async (chatId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.put("/api/chat/archive", { chatId }, config);
      toast({
        title: "Chat archived!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
      fetchChats();
      fetchArchivedChats();
    } catch (error) {
      toast({
        title: "Error archiving chat",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  const handleUnarchive = async (chatId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.put("/api/chat/unarchive", { chatId }, config);
      toast({
        title: "Chat unarchived!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
      fetchArchivedChats();
      fetchChats();
    } catch (error) {
      toast({
        title: "Error unarchiving chat",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  const handleDelete = async (chatId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.put("/api/chat/deleteforme", { chatId }, config);
      toast({
        title: "Chat deleted!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
      fetchChats();
      fetchArchivedChats();
    } catch (error) {
      toast({
        title: "Error deleting chat",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    fetchChats();
    fetchArchivedChats();
    // Connexion à Socket.io et écoute de la liste online
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("online-users", (users) => {
      setOnlineUsers(users);
    });
    // Nettoyage à la destruction
    return () => {
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line
  }, [fetchAgain]);

  // Filtering logic
  let filteredChats = chats || [];
  if (selectedTab === 1) {
    filteredChats = filteredChats.filter((chat) => chat.isGroupChat);
  } else if (selectedTab === 2) {
    // Show chats that have a notification for them
    const unreadChatIds = notification.map((notif) => notif.chat && notif.chat._id);
    filteredChats = filteredChats.filter((chat) => unreadChatIds.includes(chat._id));
  }

  return (
    <Box
      d={{ base: selectedChat ? "none" : "flex", md: "flex" }}
      flexDir="column"
      alignItems="center"
      p={3}
      bg={theme.colors.sidebar}
      w={{ base: "100%", md: "31%" }}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={theme.colors.border}
      boxShadow={`0 4px 20px ${theme.colors.shadow}`}
      transition="all 0.3s ease"
      _hover={{
        boxShadow: `0 8px 30px ${theme.colors.shadowHover}`,
        transform: "translateY(-2px)"
      }}
    >
      <Box
        pb={3}
        px={3}
        fontSize={{ base: "28px", md: "30px" }}
        fontFamily="Work sans"
        d="flex"
        w="100%"
        justifyContent="space-between"
        alignItems="center"
        color={theme.colors.text}
      >
        <Text fontWeight="bold">Chats</Text>
        <GroupChatModal>
          <Button
            d="flex"
            fontSize={{ base: "17px", md: "10px", lg: "17px" }}
            rightIcon={<AddIcon />}
            bg={theme.colors.primary}
            color={theme.colors.buttonText}
            _hover={{
              bg: theme.colors.buttonHover,
              transform: "translateY(-1px)",
              boxShadow: `0 4px 15px ${theme.colors.shadowHover}`
            }}
            transition="all 0.3s ease"
          >
            New Group Chat
          </Button>
        </GroupChatModal>
      </Box>
      {/* Tabs for filtering */}
      <Tabs
        index={selectedTab}
        onChange={setSelectedTab}
        variant="soft-rounded"
        colorScheme="teal"
        w="100%"
        mb={2}
      >
        <TabList>
          <Tab>All</Tab>
          <Tab>Groups</Tab>
          <Tab>Unread</Tab>
        </TabList>
      </Tabs>
      <Box
        d="flex"
        flexDir="column"
        p={3}
        bg={theme.colors.sidebar}
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {chats ? (
          <>
            <Stack overflowY="scroll">
              {filteredChats.map((chat) => {
                const otherUser = !chat.isGroupChat && getSenderFull(user, chat.users);
                const isOnline = otherUser && onlineUsers.includes(otherUser._id);
                const unreadCount = notification.filter(n => n.chat && n.chat._id === chat._id).length;
                return (
                  <Box
                    onClick={() => {
                      setSelectedChat(chat);
                      setNotification(notification.filter((n) => n.chat && n.chat._id !== chat._id));
                    }}
                    cursor="pointer"
                    bg={selectedChat === chat ? theme.colors.primary : theme.colors.sidebar}
                    color={selectedChat === chat ? theme.colors.buttonText : theme.colors.text}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    key={chat._id}
                    position="relative"
                    transition="all 0.3s ease"
                    _hover={{
                      bg: selectedChat === chat ? theme.colors.buttonHover : theme.colors.sidebarHover,
                      transform: "translateX(4px)"
                    }}
                  >
                    <Box d="flex" justifyContent="space-between" alignItems="center">
                      <Box d="flex" alignItems="center" flex={1} minWidth={0}>
                        {unreadCount > 0 && (
                          <Box mr={2} display="flex" alignItems="center">
                            <NotificationBadge
                              count={unreadCount}
                              effect={Effect.SCALE}
                            />
                          </Box>
                        )}
                        {chat.isGroupChat ? (
                          <Avatar
                            size="sm"
                            name={chat.chatName}
                            src={chat.pic}
                            mr={2}
                          />
                        ) : otherUser && (
                          <Box position="relative" mr={2}>
                            <Avatar
                              size="sm"
                              name={otherUser.name}
                              src={otherUser.pic}
                            />
                            <Box
                              position="absolute"
                              bottom={0}
                              right={0}
                              width="10px"
                              height="10px"
                              borderRadius="50%"
                              background={isOnline ? "#4caf50" : "#bbb"}
                              border="2px solid white"
                              zIndex={1}
                              title={isOnline ? "En ligne" : "Hors ligne"}
                            />
                          </Box>
                        )}
                        <Text
                          isTruncated
                          maxWidth="100%"
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                        >
                          {!chat.isGroupChat
                            ? otherUser.name
                            : chat.chatName}
                        </Text>
                      </Box>
                    </Box>
                    {chat.latestMessage && (
                      <Text fontSize="xs">
                        <b>{chat.latestMessage.sender?.name} : </b>
                        {chat.latestMessage.content
                          ? getMessagePreview(chat.latestMessage)
                          : chat.latestMessage.attachment
                            ? (() => {
                                const att = chat.latestMessage.attachment ? chat.latestMessage.attachment.toLowerCase() : "";
                                if (/.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/i.test(att)) return "Audio";
                                if (/\.(jpeg|jpg|png|gif)(\?|$)/i.test(att)) return "Image";
                                if (/\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(att)) return "Video";
                                if (/\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar)(\?|$)/i.test(att)) return "Document";
                                return att.split('/').pop();
                              })()
                            : ""}
                      </Text>
                    )}
                    <IconButton
                      icon={<FaArchive />}
                      size="sm"
                      aria-label="Archive chat"
                      position="absolute"
                      top={2}
                      right={9}
                      mr={2}
                      onClick={e => {
                        e.stopPropagation();
                        handleArchive(chat._id);
                      }}
                      title="Archive chat"
                      bg={theme.colors.button}
                      color={theme.colors.buttonText}
                      _hover={{ bg: theme.colors.buttonHover }}
                    />
                    <IconButton
                      icon={<FaTrash />}
                      size="sm"
                      aria-label="Delete chat"
                      position="absolute"
                      top={2}
                      right={2}
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(chat._id);
                      }}
                      title="Delete chat"
                      bg={theme.colors.error}
                      color={theme.colors.buttonText}
                      _hover={{ bg: theme.colors.warning }}
                    />
                  </Box>
                );
              })}
            </Stack>
            {selectedTab === 0 && (
              <Box mt={4}>
                <Box
                  d="flex"
                  alignItems="center"
                  cursor="pointer"
                  onClick={() => setArchivedOpen((open) => !open)}
                  px={2}
                  py={1}
                  borderRadius="md"
                  _hover={{ bg: theme.colors.cardHover }}
                  bg={theme.colors.card}
                  mb={archivedOpen && archivedChats.length > 0 ? 2 : 0}
                >
                  {archivedOpen ? <FaChevronDown color={theme.colors.textSecondary} /> : <FaChevronRight color={theme.colors.textSecondary} />}
                  <Text ml={2} fontWeight="bold" color={theme.colors.textSecondary}>
                    Archived ({archivedChats.length})
                  </Text>
                </Box>
                {archivedOpen && archivedChats.length > 0 && (
                  <Stack>
                    {archivedChats.map((chat) => {
                      const otherUser = !chat.isGroupChat && getSenderFull(user, chat.users);
                      const isOnline = otherUser && onlineUsers.includes(otherUser._id);
                      const unreadCount = notification.filter(n => n.chat && n.chat._id === chat._id).length;
                      return (
                        <Box
                          cursor="pointer"
                          bg={selectedChat === chat ? theme.colors.primary : theme.colors.sidebar}
                          color={selectedChat === chat ? theme.colors.buttonText : theme.colors.text}
                          px={3}
                          py={2}
                          borderRadius="lg"
                          key={chat._id}
                          position="relative"
                          transition="all 0.3s ease"
                          _hover={{
                            bg: selectedChat === chat ? theme.colors.buttonHover : theme.colors.sidebarHover,
                            transform: "translateX(4px)"
                          }}
                        >
                          <Box d="flex" alignItems="center">
                            {!chat.isGroupChat && otherUser && (
                              <Box position="relative" mr={2}>
                                <Avatar
                                  size="sm"
                                  name={otherUser.name}
                                  src={otherUser.pic}
                                />
                                <Box
                                  position="absolute"
                                  bottom={0}
                                  right={0}
                                  width="10px"
                                  height="10px"
                                  borderRadius="50%"
                                  background={isOnline ? "#4caf50" : "#bbb"}
                                  border="2px solid white"
                                  zIndex={1}
                                  title={isOnline ? "En ligne" : "Hors ligne"}
                                />
                              </Box>
                            )}
                            <Text>
                              {!chat.isGroupChat
                                ? otherUser.name
                                : chat.chatName}
                            </Text>
                          </Box>
                          {chat.latestMessage && (
                            <Text fontSize="xs">
                              <b>{chat.latestMessage.sender.name} : </b>
                              {getMessagePreview(chat.latestMessage)}
                            </Text>
                          )}
                          <IconButton
                            icon={<FaArchive />}
                            size="sm"
                            aria-label="Unarchive chat"
                            position="absolute"
                            top={2}
                            right={9}
                            mr={2}
                            onClick={e => {
                              e.stopPropagation();
                              handleUnarchive(chat._id);
                            }}
                            title="Unarchive chat"
                            bg={theme.colors.button}
                            color={theme.colors.buttonText}
                            _hover={{ bg: theme.colors.buttonHover }}
                          />
                          <IconButton
                            icon={<FaTrash />}
                            size="sm"
                            aria-label="Delete chat"
                            position="absolute"
                            top={2}
                            right={2}
                            onClick={e => {
                              e.stopPropagation();
                              handleDelete(chat._id);
                            }}
                            title="Delete chat"
                            bg={theme.colors.error}
                            color={theme.colors.buttonText}
                            _hover={{ bg: theme.colors.warning }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            )}
          </>
        ) : (
          <ChatLoading />
        )}
      </Box>
    </Box>
  );
};

export default MyChats;
