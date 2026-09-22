require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const Chat = require('./models/Chat');
const Complaint = require('./models/Complaint');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: true, // reflects request origin - fine for local dev across devices
  methods: ['GET', 'POST', 'PUT', 'DELETE']
};

const io = new Server(server, {
  cors: corsOptions
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ----- Socket.io: real-time chat -----
// Client connects with: io(URL, { auth: { token: jwtToken } })
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Join a "room" for a specific complaint's chat thread
  socket.on('join_complaint', (complaintId) => {
    socket.join(complaintId);
  });

  // Send a chat message, save to DB, broadcast to the room
  socket.on('send_message', async ({ complaintId, senderRole, message }) => {
    try {
      if (!message || !message.trim()) return;

      const chat = await Chat.create({
        complaintId,
        senderId: socket.userId,
        senderRole,
        message: message.trim()
      });

      io.to(complaintId).emit('receive_message', {
        _id: chat._id,
        complaintId,
        senderId: socket.userId,
        senderRole,
        message: chat.message,
        timestamp: chat.timestamp
      });
    } catch (err) {
      socket.emit('chat_error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
