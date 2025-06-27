import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import './simple_css.css';

const socket = io('ws://localhost:3500');

export default function ChatApp() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activity, setActivity] = useState("");
  const chatDisplayRef = useRef(null);

  // Responsive chat display height
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

  useEffect(() => {
    socket.on("message", (data) => {
      setActivity("");
      setMessages((msgs) => [...msgs, data]);
      setTimeout(() => {
        if (chatDisplayRef.current) {
          chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
        }
      }, 100);
    });
    socket.on("activity", (name) => {
      setActivity(name ? `⌨️ ${name} is typing...` : "");
      if (name) {
        setTimeout(() => setActivity(""), 1500);
      }
    });
    socket.on("userList", ({ users }) => setUsers(users));
    socket.on("roomList", ({ rooms }) => setRooms(rooms));
    return () => {
      socket.off("message");
      socket.off("activity");
      socket.off("userList");
      socket.off("roomList");
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (name && room) {
      socket.emit("enterRoom", { name, room });
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (name && message && room) {
      socket.emit("message", { name, text: message });
      setMessage("");
    }
  };

  const handleTyping = () => {
    socket.emit("activity", name);
  };

  return (
    <div>
      <form className="form-join" onSubmit={handleJoin}>
        <input type="text" value={name} maxLength={15} placeholder="your name" size={8} required onChange={e => setName(e.target.value)} />
        <input type="text" value={room} placeholder="chat room" size={8} required onChange={e => setRoom(e.target.value)} />
        <button id="join" type="submit">Join</button>
      </form>

      <ul className="chat display" ref={chatDisplayRef}>
        {messages.map((msg, i) => {
          let liClass = "post";
          if (msg.name === name) liClass = "post post--right";
          else if (msg.name !== "Admin" && msg.name !== "admin") liClass = "post post--left";
          // Fade-in animation
          return (
            <li key={i} className={liClass} style={{ animation: "slideIn 0.3s ease" }}>
              {msg.name !== "admin" && msg.name !== "Admin" ? (
                <div>
                  <div className={`post__header ${msg.name === name ? 'post__header--reply' : 'post__header--user'}`}>
                    <span className="POST__header__name">{msg.name}</span>
                    <span className="POST__header__time">{msg.time}</span>
                  </div>
                  <div className="post__text">{msg.text}</div>
                </div>
              ) : (
                <div className="post__text">💬 {msg.text}</div>
              )}
            </li>
          );
        })}
      </ul>

      {users.length > 0 && (
        <p className="user-list">
          <em>👥 Users in {room} room</em>
          {users.map((u, i) => (
            <span key={u.name} style={{color:'#667eea', fontWeight:'bold'}}> {u.name}{i < users.length-1 ? ',' : ''}</span>
          ))}
        </p>
      )}

      {rooms.length > 0 && (
        <p className="room-list">
          <em>🗂️ Available rooms:</em>
          {rooms.map((r, i) => (
            <span key={r} style={{color:'#20c997', fontWeight:'bold'}}> {r}{i < rooms.length-1 ? ',' : ''}</span>
          ))}
        </p>
      )}

      {activity && (
        <p className="activity">
          <span dangerouslySetInnerHTML={{__html: activity.replace(/(.*) is typing\.\.\./, '⌨️ <span style="color:#764ba2">$1</span> is typing...')}} />
        </p>
      )}

      <form className="form-msg" onSubmit={handleSend}>
        <input type="text" value={message} placeholder="your message" required
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleTyping}
        />
        <button type="submit">send</button>
      </form>
    </div>
  );
}
