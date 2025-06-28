import {
  Box,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { ChatIcon } from "@chakra-ui/icons";
import { useEffect } from "react";
import { useHistory } from "react-router";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";

function Homepage() {
  const history = useHistory();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));

    if (user) history.push("/chats");
  }, [history]);

  return (
    <Container maxW="xl" centerContent>
      <Box
        d="flex"
        justifyContent="center"
        p={3}
        bg="white"
        w="100%"
        m="40px 0 15px 0"
        borderRadius="lg"
        borderWidth="1px"
      >
        <HStack spacing={3}>
          <Icon
            as={ChatIcon}
            w={8}
            h={8}
            color="teal.400"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
          />
          <Text
            fontSize="4xl"
            fontFamily="Work sans"
            fontWeight="bold"
            bgGradient="linear(to-r, teal.400, blue.500)"
            bgClip="text"
            letterSpacing="wide"
          >
            Chatify
          </Text>
        </HStack>
      </Box>
      <Box bg="white" w="100%" p={4} borderRadius="lg" borderWidth="1px">
        <Tabs isFitted variant="soft-rounded">
          <TabList mb="1em">
            <Tab>Login</Tab>
            <Tab>Sign Up</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Login />
            </TabPanel>
            <TabPanel>
              <Signup />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
}

export default Homepage;
