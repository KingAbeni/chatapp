import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import '../simple_css.css';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3500', {
  autoConnect: false,
  withCredentials: true
});

export default function ChatApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [room, setRoom] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activity, setActivity] = useState("");
  const [privateChat, setPrivateChat] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatDisplayRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setIsAuthenticated(true);
          connectSocket();
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
      }
    };
    
    checkAuth();
    
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setAllUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms', { credentials: 'include' });
        if (response.ok) {
          const rooms = await response.json();
          setRooms(rooms);
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
      }
    };
    
    if (isAuthenticated) {
      fetchUsers();
      fetchRooms();
    }
  }, [isAuthenticated]);

  const connectSocket = () => {
    socket.connect();
    
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    socket.on('message', (data) => {
      setActivity("");
      setMessages((msgs) => [...msgs, data]);
      scrollToBottom();
    });
    
    socket.on('privateChatHistory', (data) => {
      setMessages(data.messages);
      scrollToBottom();
    });
    
    socket.on('roomHistory', (data) => {
      setMessages(data.messages);
      scrollToBottom();
    });
    
    socket.on('activity', ({ name, isTyping }) => {
      setActivity(isTyping ? `⌨️ <span style="color:#764ba2">${name}</span> is typing...` : "");
      if (isTyping) {
        setTimeout(() => setActivity(""), 1500);
      }
    });
    
    socket.on('userList', ({ users }) => setUsers(users));
    
    socket.on('roomList', ({ rooms }) => {
      console.log('Room list updated:', rooms);
      setRooms(rooms);
    });
    
    return () => {
      socket.off('message');
      socket.off('privateChatHistory');
      socket.off('roomHistory');
      socket.off('activity');
      socket.off('userList');
      socket.off('roomList');
      socket.disconnect();
    };
  };

  useEffect(() => {
    function adjustChatDisplayHeight() {
      if (chatDisplayRef.current) {
        if (window.innerWidth <= 768) {
          chatDisplayRef.current.style.maxHeight = '350px';
          chatDisplayRef.current.style.padding = '15px';
        } else {
          chatDisplayRef.current.style.maxHeight = '500px';
          chatDisplayRef.current.style.padding = '20px';
        }
      }
    }
    
    adjustChatDisplayHeight();
    window.addEventListener('resize', adjustChatDisplayHeight);
    return () => window.removeEventListener('resize', adjustChatDisplayHeight);
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatDisplayRef.current) {
        chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setIsAuthenticated(true);
        connectSocket();
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setIsAuthenticated(true);
        connectSocket();
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setIsAuthenticated(false);
      setUser(null);
      socket.disconnect();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const joinRoom = (roomName) => {
    setPrivateChat(null);
    setRoom(roomName);
    setMessages([]);
    socket.emit("enterRoom", { room: roomName });
    socket.emit("requestRoomHistory", roomName);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (message) {
      // Create temporary message for immediate UI update
      const tempMessage = {
        name: user.username,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPrivate: !!privateChat
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setMessage("");
      scrollToBottom();
      
      // Send through socket
      if (privateChat) {
        socket.emit("message", { 
          content: message, 
          isPrivate: true, 
          receiverId: privateChat.id 
        });
      } else if (room) {
        socket.emit("message", { content: message, isPrivate: false });
      }
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("activity", user.username);
      setTimeout(() => setIsTyping(false), 1000);
    }
  };

  const startPrivateChat = (selectedUser) => {
    setPrivateChat(selectedUser);
    setRoom("");
    setMessages([]);
    socket.emit("startPrivateChat", selectedUser.id);
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMinutes = Math.floor((now - lastSeenDate) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  const getUserCountInRoom = (roomName) => {
    return users.filter(user => user.room === roomName).length;
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Chat Application</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="Enter username" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter password" 
                required 
              />
            </div>
            <div className="auth-actions">
              <button type="submit">Login</button>
              <button type="button" onClick={handleRegister}>Register</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Chat App</h2>
        <div className="user-info">
          <span>Welcome, {user?.username}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="chat-layout">
        <div className="chat-sidebar">
          <div className="sidebar-section">
            <h3>Available Rooms</h3>
            <div className="create-room">
              <input
                type="text"
                value={newRoom}
                onChange={e => setNewRoom(e.target.value)}
                placeholder="New room name"
              />
              <button onClick={() => {
                if (newRoom.trim()) {
                  joinRoom(newRoom);
                  setNewRoom("");
                }
              }}>
                Create
              </button>
            </div>
            <ul className="room-list">
              {rooms.map((roomName, i) => (
                <li 
                  key={i} 
                  className={roomName === room ? 'active' : ''}
                  onClick={() => joinRoom(roomName)}
                >
                  #{roomName} 
                  <span className="room-count">
                    ({getUserCountInRoom(roomName)})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section">
            <h3>Online Users</h3>
            <ul className="user-list">
              {users.map((u, i) => (
                <li key={i} className={privateChat?.id === u.id ? 'active' : ''}>
                  <div className="user-item" onClick={() => startPrivateChat(u)}>
                    <span className="username">{u.username}</span>
                    <span className="online-dot"></span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-section">
            <h3>All Users</h3>
            <ul className="user-list">
              {allUsers.map((u, i) => (
                <li key={i} className={privateChat?.id === u._id ? 'active' : ''}>
                  <div className="user-item" onClick={() => startPrivateChat({
                    id: u._id,
                    username: u.username
                  })}>
                    <span className="username">{u.username}</span>
                    <span className={`status ${users.some(online => online.id === u._id) ? 'online' : 'offline'}`}>
                      {users.some(online => online.id === u._id) 
                        ? 'Online' 
                        : `Last seen: ${formatLastSeen(u.lastSeen)}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="chat-main">
          <div className="chat-info">
            {privateChat ? (
              <h3>Private Chat with {privateChat.username}</h3>
            ) : room ? (
              <h3>Room: #{room} ({getUserCountInRoom(room)} users)</h3>
            ) : (
              <h3>Select a room or user to start chatting</h3>
            )}
          </div>

          <div className="chat-display" ref={chatDisplayRef}>
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isCurrentUser = msg.name === user.username;
                const isAdmin = msg.name === "Admin";
                
                return (
                  <div 
                    key={i} 
                    className={`message ${isCurrentUser ? 'current-user' : ''} ${isAdmin ? 'admin' : ''}`}
                  >
                    {!isAdmin && !isCurrentUser && (
                      <div className="message-sender">{msg.name}</div>
                    )}
                    <div className="message-content">
                      {msg.text}
                      <div className="message-time">
                        {msg.time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {activity && (
            <div className="typing-indicator" dangerouslySetInnerHTML={{__html: activity}} />
          )}

          <form className="message-form" onSubmit={handleSend}>
            <div className="message-input">
              <input 
                type="text" 
                value={message} 
                placeholder={privateChat 
                  ? `Message ${privateChat.username}...` 
                  : room 
                    ? `Message in #${room}...` 
                    : "Select a room or user to chat..."}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleTyping}
                disabled={!room && !privateChat}
              />
              <button 
                type="submit" 
                disabled={!room && !privateChat}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}