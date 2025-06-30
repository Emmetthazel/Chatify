import "./App.css";
import Homepage from "./Pages/Homepage";
import { Route } from "react-router-dom";
import Chatpage from "./Pages/Chatpage";
import { useHistory } from "react-router-dom";
import { ChatState } from "./Context/ChatProvider";
import ThemeProvider from "./Context/ThemeProvider";
// import ThemeSelector from "./components/ThemeSelector";

function App() {
  const history = useHistory();
  const { incomingCall, acceptCall, rejectCall, setSelectedChat, chats, user, socket } = ChatState();

  // Helper to get media
  const getMedia = async (type) => {
    if (type === 'video') {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } else {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  };

  const handleAccept = async (call) => {
    // Find the chat object for navigation
    const chatObj = chats && chats.find(c => c._id === call.chatId);
    if (chatObj) {
      setSelectedChat(chatObj);
      history.push("/chats");
      // Accept the call (using context handler)
      await acceptCall({ ...call, chatObj }, user, socket, getMedia, setSelectedChat);
    }
  };

  return (
    <ThemeProvider>
      <div className="App">
        {/* <div className="theme-selector">
          <ThemeSelector />
        </div> */}
        <Route path="/" component={Homepage} exact />
        <Route path="/chats" component={Chatpage} />
        {incomingCall && (
          <div className="call-modal" style={{ position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)', background: '#fff', zIndex: 1000, padding: 20, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
            <h2>Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call</h2>
            <button onClick={() => handleAccept(incomingCall)}>Accept</button>
            <button onClick={() => rejectCall(incomingCall, socket)}>Reject</button>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
