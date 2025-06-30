import { Box } from "@chakra-ui/layout";
import "./styles.css";
import SingleChat from "./SingleChat";
import { ChatState } from "../Context/ChatProvider";
import { useTheme } from "../Context/ThemeProvider";

const Chatbox = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat } = ChatState();
  const { theme } = useTheme();

  return (
    <Box
      d={{ base: selectedChat ? "flex" : "none", md: "flex" }}
      alignItems="center"
      flexDir="column"
      p={3}
      bg={theme.colors.card}
      w={{ base: "100%", md: "68%" }}
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
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </Box>
  );
};

export default Chatbox;
