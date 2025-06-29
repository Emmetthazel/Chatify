const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();
const app = express();

app.use(express.json()); // to accept json data

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});

// Global error handler for socket.io
io.on("error", (error) => {
  console.error("Socket.io error:", error);
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  
  // Error handler for individual socket
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("setup", (userData) => {
    try {
      socket.join(userData._id);
      socket.emit("connected");
    } catch (error) {
      console.error("Error in setup:", error);
    }
  });

  socket.on("join chat", (room) => {
    try {
      socket.join(room);
      console.log("User Joined Room: " + room);
    } catch (error) {
      console.error("Error joining chat:", error);
    }
  });
  
  socket.on("typing", (room) => {
    try {
      socket.in(room).emit("typing");
    } catch (error) {
      console.error("Error in typing:", error);
    }
  });
  
  socket.on("stop typing", (room) => {
    try {
      socket.in(room).emit("stop typing");
    } catch (error) {
      console.error("Error in stop typing:", error);
    }
  });

  socket.on("new message", (newMessageRecieved) => {
    try {
      var chat = newMessageRecieved.chat;

      if (!chat.users) {
        console.log("chat.users not defined");
        return;
      }

      chat.users.forEach((user) => {
        if (user._id == newMessageRecieved.sender._id) return;

        socket.in(user._id).emit("message received", newMessageRecieved);
      });
    } catch (error) {
      console.error("Error in new message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("USER DISCONNECTED");
  });

  // Call-related socket events with error handling
  socket.on('call-offer', (data) => {
    try {
      console.log('Call offer received:', data);
      if (data && data.to) {
        io.to(data.to).emit('call-offer', data);
      } else {
        console.error('Invalid call-offer data:', data);
      }
    } catch (error) {
      console.error("Error in call-offer:", error);
    }
  });
  
  socket.on('call-answer', (data) => {
    try {
      console.log('Call answer received:', data);
      if (data && data.to) {
        io.to(data.to).emit('call-answer', data);
      } else {
        console.error('Invalid call-answer data:', data);
      }
    } catch (error) {
      console.error("Error in call-answer:", error);
    }
  });
  
  socket.on('ice-candidate', (data) => {
    try {
      if (data && data.to) {
        io.to(data.to).emit('ice-candidate', data);
      } else {
        console.error('Invalid ice-candidate data:', data);
      }
    } catch (error) {
      console.error("Error in ice-candidate:", error);
    }
  });
  
  socket.on('call-reject', (data) => {
    try {
      console.log('Call reject received:', data);
      if (data && data.to) {
        io.to(data.to).emit('call-reject', data);
      } else {
        console.error('Invalid call-reject data:', data);
      }
    } catch (error) {
      console.error("Error in call-reject:", error);
    }
  });
  
  socket.on('call-hangup', (data) => {
    try {
      console.log('Call hangup received:', data);
      if (data && data.to) {
        io.to(data.to).emit('call-hangup', data);
      } else {
        console.error('Invalid call-hangup data:', data);
      }
    } catch (error) {
      console.error("Error in call-hangup:", error);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

