require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const Chat = require('./models/Chat');
const Complaint = require('./models/Complaint');
const User = require('./models/User');
const { canAccessComplaint, isValidId } = require('./utils/access');
const { notify, setIo } = require('./services/notify');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random string of at least 32 characters (see .env.example)');
  process.exit(1);
}

connectDB();

const app = express();
const server = http.createServer(app);

// CLIENT_ORIGIN is a comma-separated allowlist; unset means reflect any origin (local dev only)
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
};

// Separate counters per route, so signing up doesn't use up sign-in attempts
const authLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.AUTH_RATE_LIMIT || '20', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in a few minutes' }
});

const io = new Server(server, {
  cors: corsOptions
});
setIo(io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth/login', authLimiter());
app.use('/api/auth/register', authLimiter());
app.use('/api/auth/password', authLimiter());
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Upload rejections, oversized bodies and bad JSON come through here
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File must be 5MB or smaller' : 'Invalid file upload';
    return res.status(400).json({ message });
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Server error' : err.message });
});

// ----- Socket.io: real-time chat -----
// Client connects with: io(URL, { auth: { token: jwtToken } })
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name role isActive');
    if (!user || !user.isActive) return next(new Error('User not found or inactive'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Personal room for live notifications
  socket.join(`user:${socket.user._id}`);

  // Access is re-checked on every event, since assignment can change while connected
  const chatComplaint = async (complaintId) => {
    if (!isValidId(complaintId)) return null;
    const complaint = await Complaint.findById(complaintId).select('userId agentId title');
    return canAccessComplaint(complaint, socket.user) ? complaint : null;
  };

  // Join a "room" for a specific complaint's chat thread
  socket.on('join_complaint', async (complaintId) => {
    try {
      if (!(await chatComplaint(complaintId))) {
        return socket.emit('chat_error', { message: 'Access denied' });
      }
      socket.join(complaintId);
    } catch (err) {
      socket.emit('chat_error', { message: 'Failed to join chat' });
    }
  });

  socket.on('leave_complaint', (complaintId) => {
    if (typeof complaintId === 'string') socket.leave(complaintId);
  });

  // Send a chat message, save to DB, broadcast to the room
  socket.on('send_message', async (payload) => {
    try {
      const { complaintId, message } = payload || {};
      if (typeof message !== 'string' || !message.trim()) return;
      if (message.length > 2000) {
        return socket.emit('chat_error', { message: 'Message is too long' });
      }
      const complaint = await chatComplaint(complaintId);
      if (!complaint) {
        return socket.emit('chat_error', { message: 'Access denied' });
      }

      // Role comes from the database, never from the client
      const senderRole = socket.user.role;
      const chat = await Chat.create({
        complaintId,
        senderId: socket.user._id,
        senderRole,
        message: message.trim()
      });

      io.to(complaintId).emit('receive_message', {
        _id: chat._id,
        complaintId,
        senderId: socket.user._id,
        senderRole,
        message: chat.message,
        timestamp: chat.timestamp
      });

      notify({
        to: [complaint.userId, complaint.agentId], actorId: socket.user._id, type: 'message', complaint,
        title: `New message from ${socket.user.name}`, body: chat.message.slice(0, 140)
      });
    } catch (err) {
      socket.emit('chat_error', { message: 'Failed to send message' });
    }
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io };
