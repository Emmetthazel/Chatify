import { AddIcon } from "@chakra-ui/icons";
import { Box, Stack, Text } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/toast";
import axios from "axios";
import { useEffect, useState } from "react";
import { getSender } from "../config/ChatLogics";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { Button, Tabs, TabList, Tab, IconButton } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";
import { FaArchive, FaChevronDown, FaChevronRight, FaTrash } from "react-icons/fa";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const [selectedTab, setSelectedTab] = useState(0); // 0: All, 1: Groups, 2: Unread
  const [archivedChats, setArchivedChats] = useState([]);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const { selectedChat, setSelectedChat, user, chats, setChats, notification, setNotification } = ChatState();

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
      bg="white"
      w={{ base: "100%", md: "31%" }}
      borderRadius="lg"
      borderWidth="1px"
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
      >
        <Text fontWeight="bold">Chats</Text>
        <GroupChatModal>
          <Button
            d="flex"
            bg="gray.100"
            h="37px"
            borderWidth="1px"
            borderRadius="md"
            boxShadow="sm"
            fontSize={{ base: "17px", md: "10px", lg: "17px" }}
            rightIcon={<AddIcon />}
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
        bg="#F8F8F8"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {chats ? (
          <>
            <Stack overflowY="scroll">
              {filteredChats.map((chat) => (
                <Box
                  onClick={() => {
                    setSelectedChat(chat);
                    setNotification(notification.filter((n) => n.chat && n.chat._id !== chat._id));
                  }}
                  cursor="pointer"
                  bg={selectedChat === chat ? "#38B2AC" : "#E8E8E8"}
                  color={selectedChat === chat ? "white" : "black"}
                  px={3}
                  py={2}
                  borderRadius="lg"
                  key={chat._id}
                  position="relative"
                >
                  <Text>
                    {!chat.isGroupChat
                      ? getSender(loggedUser, chat.users)
                      : chat.chatName}
                  </Text>
                  {chat.latestMessage && (
                    <Text fontSize="xs">
                      <b>{chat.latestMessage.sender?.name} : </b>
                      {chat.latestMessage.content
                        ? (chat.latestMessage.content.length > 50
                            ? chat.latestMessage.content.substring(0, 51) + "..."
                            : chat.latestMessage.content)
                        : chat.latestMessage.attachment
                          ? (
                              <>
                                <span role="img" aria-label="attachment">📎</span>
                                {chat.latestMessage.attachment.split('/').pop()}
                              </>
                            )
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
                    colorScheme="red"
                  />
                </Box>
              ))}
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
                  _hover={{ bg: "gray.200" }}
                  bg="gray.100"
                  mb={archivedOpen && archivedChats.length > 0 ? 2 : 0}
                >
                  {archivedOpen ? <FaChevronDown /> : <FaChevronRight />}
                  <Text ml={2} fontWeight="bold">
                    Archived ({archivedChats.length})
                  </Text>
                </Box>
                {archivedOpen && archivedChats.length > 0 && (
                  <Stack>
                    {archivedChats.map((chat) => (
                      <Box
                         cursor="pointer"
                         bg={selectedChat === chat ? "#38B2AC" : "#E8E8E8"}
                         color={selectedChat === chat ? "white" : "black"}
                         px={3}
                         py={2}
                         borderRadius="lg"
                         key={chat._id}
                         position="relative"
                         onClick={() => {
                           setSelectedChat(chat);
                           setNotification(notification.filter((n) => n.chat && n.chat._id !== chat._id));
                         }}
                       >
                         <Text>
                           {!chat.isGroupChat
                             ? getSender(loggedUser, chat.users)
                           : chat.chatName}
                         </Text>
                         {chat.latestMessage && (
                           <Text fontSize="xs">
                             <b>{chat.latestMessage.sender?.name} : </b>
                             {chat.latestMessage.content
                               ? (chat.latestMessage.content.length > 50
                                   ? chat.latestMessage.content.substring(0, 51) + "..."
                                   : chat.latestMessage.content)
                               : chat.latestMessage.attachment
                                 ? (
                                     <>
                                       <span role="img" aria-label="attachment">📎</span>
                                       {chat.latestMessage.attachment.split('/').pop()}
                                     </>
                                   )
                                 : ""}
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
                           colorScheme="red"
                         />
                       </Box>
                     ))}
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
