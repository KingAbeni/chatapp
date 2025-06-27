// Main App component that handles the chat application state and routing
// Manages the flow between join room screen and chat room interface

import React, { useState, useEffect, useRef } from 'react';
import { Hash, Users, Send } from 'lucide-react';

// JoinRoom Component - Handles user entry to chat rooms
const JoinRoom = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  // Handle form submission for joining a room
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (name.trim() && room.trim()) {
      onJoin(name.trim(), room.trim());
    }
  };

  // Handle Enter key press for form submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="join-container">
      <div className="join-card">
        <div className="join-header">
          <div className="join-icon">
            <Hash className="icon" />
          </div>
          <h1 className="join-title">Join Chat</h1>
          <p className="join-subtitle">Enter your details to start chatting</p>
        </div>
        
        <div className="join-form">
          <div className="input-group">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Your name"
              maxLength={15}
              className="join-input"
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Chat room"
              className="join-input"
            />
          </div>
          <button onClick={handleSubmit} className="join-button">
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
};

// Sidebar Component - Displays users and available rooms
const Sidebar = ({ users, room, currentUser }) => {
  const availableRooms = ['General', 'Random', 'Tech', 'Gaming', 'Music', 'Sports'];

  // Get user initials for avatar display
  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  // Generate avatar color based on user index
  const getAvatarColor = (index) => {
    const colors = [
      'from-green-400 to-blue-400',
      'from-purple-400 to-pink-400',
      'from-yellow-400 to-orange-400',
      'from-red-400 to-pink-400',
      'from-blue-400 to-purple-400',
      'from-indigo-400 to-blue-400'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="room-info">
          <div className="room-icon">
            <Hash className="icon" />
          </div>
          <div className="room-details">
            <h2 className="room-name">#{room}</h2>
            <p className="room-members">{users.length} members</p>
          </div>
        </div>
      </div>

      <div className="sidebar-content">
        {/* Users section showing online members */}
        <div className="users-section">
          <div className="section-header">
            <Users className="section-icon" />
            <span className="section-title">ONLINE - {users.length}</span>
          </div>
          <div className="users-list">
            {users.map((user, index) => (
              <div key={index} className="user-item">
                <div className={`user-avatar bg-gradient-to-r ${getAvatarColor(index)}`}>
                  <span className="avatar-text">{getInitials(user.name)}</span>
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  {user.name === currentUser && <span className="user-badge">(you)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available rooms section */}
        <div className="rooms-section">
          <div className="section-header">
            <span className="section-title">AVAILABLE ROOMS</span>
          </div>
          <div className="rooms-list">
            {availableRooms.map((roomName, index) => (
              <div 
                key={index} 
                className={`room-item ${roomName === room ? 'room-item-active' : ''}`}
              >
                # {roomName}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ChatDisplay Component - Renders chat messages
const ChatDisplay = ({ messages, currentUser }) => {
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="chat-display">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message-wrapper ${message.isOwn ? 'message-own' : 'message-other'}`}>
            {message.isAdmin ? (
              // Admin/system messages (join/leave notifications)
              <div className="admin-message">
                <span className="admin-text">{message.text}</span>
              </div>
            ) : (
              // Regular user messages
              <div className={`message ${message.isOwn ? 'message-sent' : 'message-received'}`}>
                {!message.isOwn && (
                  <div className="message-sender">{message.name}</div>
                )}
                <div className="message-content">{message.text}</div>
                <div className="message-time">{message.time}</div>
              </div>
            )}
          </div>
        ))}
        {/* Invisible element to enable auto-scrolling */}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

// MessageInput Component - Handles message composition and sending
const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');

  // Handle message submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  // Handle key press events and typing indicators
  const handleKeyPress = (e) => {
    onTyping();
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="message-input"
        />
        <button onClick={handleSubmit} className="send-button">
          <Send className="send-icon" />
        </button>
      </div>
    </div>
  );
};

// ChatRoom Component - Main chat interface
const ChatRoom = ({ name, room }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Initialize chat room data when component mounts
  useEffect(() => {
    // Set initial users list (simulated data)
    setUsers([{ name }, { name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]);
    
    // Add welcome message when user joins
    setMessages([
      {
        name: 'Admin',
        text: `${name} joined the ${room} room`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAdmin: true
      }
    ]);
  }, [name, room]);

  // Handle sending messages
  const handleSendMessage = (message) => {
    if (message.trim()) {
      const newMessage = {
        name,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true
      };
      setMessages(prev => [...prev, newMessage]);
      
      // Simulate automatic responses from other users (for demo purposes)
      // In a real app, this would be handled by the backend
      setTimeout(() => {
        const responses = [
          "That's interesting!",
          "I agree with that",
          "Thanks for sharing",
          "Great point!",
          "Cool stuff",
          "Nice!",
          "Tell me more about that",
          "I see what you mean"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const otherUsers = users.filter(user => user.name !== name);
        const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
        
        if (randomUser) {
          setMessages(prev => [...prev, {
            name: randomUser.name,
            text: randomResponse,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOwn: false
          }]);
        }
      }, 1000 + Math.random() * 2000);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      setActivity(`${name} is typing...`);
    }
    
    // Clear typing indicator after 1.5 seconds of inactivity
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setActivity('');
    }, 1500);
  };

  return (
    <div className="chat-container">
      {/* Sidebar showing users and rooms */}
      <Sidebar users={users} room={room} currentUser={name} />
      
      {/* Main chat area */}
      <div className="chat-main">
        {/* Chat header with room info and connection status */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-icon">
              <Hash className="icon" />
            </div>
            <div>
              <h1 className="chat-title">#{room}</h1>
              <p className="chat-subtitle">Welcome, {name}!</p>
            </div>
          </div>
          <div className="connection-status">
            <div className="status-indicator"></div>
            <span className="status-text">Connected</span>
          </div>
        </div>

        {/* Messages display area */}
        <ChatDisplay messages={messages} currentUser={name} />
        
        {/* Typing activity indicator */}
        {activity && (
          <div className="activity-container">
            <div className="activity-indicator">
              <span className="activity-text">{activity}</span>
            </div>
          </div>
        )}

        {/* Message input area */}
        <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
};

// Main App Component - Manages application state and routing
const App = () => {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  // Handle joining a chat room
  const handleJoinRoom = (userName, roomName) => {
    setName(userName);
    setRoom(roomName);
    setIsJoined(true);
  };

  return (
    <div className="app">
      {!isJoined ? (
        // Show join room interface if user hasn't joined yet
        <JoinRoom onJoin={handleJoinRoom} />
      ) : (
        // Show chat room interface once user has joined
        <ChatRoom name={name} room={room} />
      )}
    </div>
  );
};

export default App;