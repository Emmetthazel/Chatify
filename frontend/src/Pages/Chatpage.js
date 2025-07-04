import { Box } from "@chakra-ui/layout";
import { useState } from "react";
import Chatbox from "../components/Chatbox";
import MyChats from "../components/MyChats";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import { ChatState } from "../Context/ChatProvider";
import { useTheme } from "../Context/ThemeProvider";

const Chatpage = () => {
  const [fetchAgain, setFetchAgain] = useState(false);
  const { user } = ChatState();
  const { theme } = useTheme();

  return (
    <div 
      className="chat-container"
      style={{ 
        width: "100%",
        background: theme.colors.background,
        minHeight: "100vh"
      }}
    >
      {user && <SideDrawer />}
      <Box 
        d="flex" 
        justifyContent="space-between" 
        w="100%" 
        h="91.5vh" 
        p="10px"
        bg={theme.colors.background}
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && (
          <Chatbox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </Box>
    </div>
  );
};

export default Chatpage;
