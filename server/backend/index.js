import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin";
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : [
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:5500", "http://127.0.0.1:5500"
  ],
  credentials: true
}));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3 },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  room: String,
  content: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

const authenticate = async (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000
    });
    
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: { id: user._id, username: user.username } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
    
    user.lastSeen = new Date();
    await user.save();
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000
    });
    
    res.json({ 
      message: 'Login successful', 
      user: { id: user._id, username: user.username } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

app.get('/api/user', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/users', authenticate, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }, 'username lastSeen');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/messages/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId, isPrivate: true },
        { sender: userId, receiver: req.user._id, isPrivate: true }
      ]
    })
    .sort('timestamp')
    .populate('sender', 'username')
    .populate('receiver', 'username');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/rooms', authenticate, async (req, res) => {
  try {
    // Get all rooms that have been created (not necessarily active)
    const rooms = await Message.distinct('room', { room: { $ne: null } });
    res.json(rooms.filter(room => room !== null));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const expressServer = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const UserState = {
  users: [],
  setUsers: function (newUsersArray) {
    this.users = newUsersArray;
  }
};

const io = new Server(expressServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : [
      "http://localhost:3000", "http://127.0.0.1:3000",
      "http://localhost:5500", "http://127.0.0.1:5500"
    ],
    credentials: true
  }
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }
    
    socket.user = {
      id: user._id.toString(),
      username: user.username
    };
    
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  console.log(`User ${socket.user.username} connected`);
  
  // Activate user without a room initially
  activateUser(socket.id, socket.user.username, null, socket.user.id);
  
  // Send welcome message to new connection
  socket.emit('message', buildMsg(ADMIN, `Welcome to the chat app, ${socket.user.username}!`));
  
  // Send updated user list to all clients
  io.emit('userList', { users: getOnlineUsers() });
  
  // Send room list to all clients
  updateRoomList();
  
  // Handle user joining a room
  socket.on('enterRoom', async ({ room: newRoom }) => {
    const prevRoom = getUser(socket.id)?.room;
    
    // Leave previous room if any
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit('message', buildMsg(ADMIN, `${socket.user.username} left the room`));
      
      // Update user list for previous room
      io.to(prevRoom).emit('userList', { users: getUsersInRoom(prevRoom) });
    }
    
    // Only join new room if it's provided
    if (newRoom) {
      // Activate user in new room
      const user = activateUser(socket.id, socket.user.username, newRoom, socket.user.id);
      
      // Join new room
      socket.join(user.room);
      
      // Welcome message to joining user
      socket.emit('message', buildMsg(ADMIN, `You joined room ${user.room}`));
      
      // Notify others in the room
      socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} joined the room`));
      
      // Update user list for new room
      io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });
      
      // Load room history
      try {
        const roomMessages = await Message.find({ room: newRoom })
          .sort('timestamp')
          .populate('sender', 'username')
          .limit(100);
        
        socket.emit('roomHistory', {
          messages: roomMessages.map(msg => ({
            name: msg.sender.username,
            text: msg.content,
            time: new Date(msg.timestamp).toLocaleTimeString()
          }))
        });
      } catch (err) {
        console.error('Error loading room history:', err);
      }
    } else {
      // If no new room, just update user state without room
      activateUser(socket.id, socket.user.username, null, socket.user.id);
    }
    
    // Update room list for all users
    updateRoomList();
  });
  
  // Handle user disconnect
  socket.on('disconnect', async () => {
    const user = getUser(socket.id);
    userleaveApp(socket.id);
    
    if (user) {
      try {
        await User.findByIdAndUpdate(user.userId, { lastSeen: new Date() });
      } catch (err) {
        console.error('Error updating last seen:', err);
      }
      
      if (user.room) {
        io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} left the room`));
        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });
      }
      
      // Update online users list
      io.emit('userList', { users: getOnlineUsers() });
      
      // Update room list
      updateRoomList();
    }
  });
  
  // Handle chat messages
  socket.on('message', async ({ content, isPrivate, receiverId }) => {
    const user = getUser(socket.id);
    
    if (!user) return;
    
    try {
      // Create message in database
      const message = new Message({
        sender: user.userId,
        receiver: isPrivate ? receiverId : null,
        room: isPrivate ? null : user.room,
        content,
        isPrivate
      });
      
      await message.save();
      
      // Build message object
      const msgObj = buildMsg(user.name, content, isPrivate);
      
      if (isPrivate && receiverId) {
        // Find receiver's socket
        const receiver = UserState.users.find(u => u.userId === receiverId);
        
        // Send private message to both users
        socket.emit('message', { ...msgObj, isPrivate: true });
        if (receiver) {
          io.to(receiver.id).emit('message', { ...msgObj, isPrivate: true });
        } else {
          socket.emit('message', buildMsg(ADMIN, `${receiverId} is offline. Message will be delivered when they come online.`));
        }
      } else if (user.room) {
        // Broadcast to room (including sender)
        io.to(user.room).emit('message', msgObj);
      }
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('message', buildMsg(ADMIN, 'Error sending message'));
    }
  });
  
  // Handle typing activity
  socket.on('activity', (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit('activity', { name, isTyping: true });
    }
  });
  
  // Handle private message request
  socket.on('startPrivateChat', async (receiverId) => {
    const sender = getUser(socket.id);
    
    if (!sender) return;
    
    try {
      const messages = await Message.find({
        $or: [
          { sender: sender.userId, receiver: receiverId, isPrivate: true },
          { sender: receiverId, receiver: sender.userId, isPrivate: true }
        ]
      })
      .sort('timestamp')
      .populate('sender', 'username');
      
      socket.emit('privateChatHistory', {
        receiverId,
        messages: messages.map(msg => ({
          name: msg.sender.username,
          text: msg.content,
          time: new Date(msg.timestamp).toLocaleTimeString(),
          isPrivate: true
        }))
      });
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  });
  
  // Request room history
  socket.on('requestRoomHistory', async (roomName) => {
    try {
      const roomMessages = await Message.find({ room: roomName })
        .sort('timestamp')
        .populate('sender', 'username')
        .limit(100);
      
      socket.emit('roomHistory', {
        room: roomName,
        messages: roomMessages.map(msg => ({
          name: msg.sender.username,
          text: msg.content,
          time: new Date(msg.timestamp).toLocaleTimeString()
        }))
      });
    } catch (err) {
      console.error('Error loading room history:', err);
    }
  });
});

// Helper: Update room list for all clients
function updateRoomList() {
  io.emit('roomList', { rooms: getAllActiveRooms() });
}

// Helper: Build a message object
function buildMsg(name, text, isPrivate = false) {
  return {
    name,
    text,
    isPrivate,
    time: new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date())
  };
}

// Helper: Activate user in a room
function activateUser(id, name, room, userId) {
  const user = { id, name, room, userId };
  UserState.setUsers([
    ...UserState.users.filter(user => user.id !== id), 
    user
  ]);
  return user;
}

// Helper: Remove user from state
function userleaveApp(id) {
  UserState.setUsers(UserState.users.filter(user => user.id !== id));
}

// Helper: Get user by socket id
function getUser(id) {
  return UserState.users.find(user => user.id === id);
}

// Helper: Get all users in a room
function getUsersInRoom(room) {
  return UserState.users.filter(user => user.room === room);
}

// Helper: Get all active rooms
function getAllActiveRooms() {
  return [...new Set(UserState.users
    .filter(user => user.room !== null)
    .map(user => user.room)
  )];
}

// Helper: Get all online users
function getOnlineUsers() {
  return UserState.users.map(user => ({
    id: user.userId,
    username: user.name,
    room: user.room,
    isOnline: true
  }));
}