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
    <Box minH="100vh" w="100vw" d="flex" alignItems="center" justifyContent="center" bg="none" overflow="hidden">
      <Container maxW="xl" centerContent d="flex" alignItems="center" justifyContent="center" minH="100vh" p={0}>
        <Box
          className="auth-container"
          d="flex"
          flexDirection="column"
          justifyContent="center"
          p={0}
          w="100%"
          maxW="480px"
          m="0"
          overflow="hidden"
        >
          <Box className="auth-header">
            <HStack spacing={3} justifyContent="center">
              <Icon
                as={ChatIcon}
                w={10}
                h={10}
                color="white"
                filter="drop-shadow(0 4px 8px rgba(0,0,0,0.2))"
              />
              <Text className="auth-title">
                Luma
              </Text>
            </HStack>
          </Box>
          <Box className="auth-form" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
            <Tabs className="auth-tabs" isFitted variant="soft-rounded">
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
        </Box>
      </Container>
    </Box>
  );
}

export default Homepage;
