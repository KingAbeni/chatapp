const socket= io('ws://localhost:3500')


const msgInput = document.querySelector('#message')
const chatRoom = document.querySelector('#room')
const nameInput = document.querySelector('#name')
const activity = document.querySelector('.activity')
const usersList = document.querySelector('.user-list')
const roomList = document.querySelector('.room-list')
const chatDisplay = document.querySelector('.chat.display')

function sendMessage(e) {
    e.preventDefault()
    if(nameInput.value && msgInput.value && chatRoom.value) {
        socket.emit('message', { 
            name: nameInput.value, 
            text: msgInput.value
        })
        msgInput.value = ""
    }
    msgInput.focus()
}

function enterRoom(e){
    e.preventDefault()
    if(nameInput.value && chatRoom.value) {
        socket.emit('enterRoom', { 
            name: nameInput.value, 
            room: chatRoom.value 
        })
    }
}
//listener

document.querySelector('.form-msg').addEventListener('submit', sendMessage)
document.querySelector('.form-join').addEventListener('submit', enterRoom)
msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value)
})

// Listen for messages from the server
socket.on("message", (data) => {
    activity.textContent = ''
    const {name, text, time} = data
    const li = document.createElement('li')
    li.style.animation = "slideIn 0.3s ease"; // fade-in animation

    // Style: right = self, left = others, admin = neutral
    if(name === nameInput.value ) {
        li.className ='post post--right'
    } else if(name !== 'Admin' && name !== 'admin') {
        li.className ='post post--left'
    } else {
        li.className = 'post'
    }

    // Add emoji for admin messages
    if(name !== 'admin' && name !== 'Admin'){
        li.innerHTML = `<div class="post__header ${name === nameInput.value ? 'post__header--reply' : 'post__header--user'}">
        <span class="POST__header__name">${name}</span>
        <span class="POST__header__time">${time}</span>
        </div>
        <div class="post__text">${text}</div>`
    }
    else {
        li.innerHTML = `<div class="post__text">💬 ${text}</div>`
    }

    document.querySelector('.chat.display').appendChild(li)
    chatDisplay.scrollTop = chatDisplay.scrollHeight

})


function showUsers(users){
    if(users && users.length > 0) {
        usersList.style.display = '';
        usersList.innerHTML = `<em>👥 Users in ${chatRoom.value} room</em>`;
        users.forEach((user,i) => {
            usersList.innerHTML += ` <span style="color:#667eea;font-weight:bold">${user.name}</span>${i < users.length-1 ? ',' : ''}`;
        });
    } else {
        usersList.style.display = 'none';
        usersList.textContent = '';
    }
}

function showRooms(rooms){
    if(rooms && rooms.length > 0) {
        roomList.style.display = '';
        roomList.innerHTML = '<em>🗂️ Available rooms:</em>';
        rooms.forEach((room,i) => {
            roomList.innerHTML += ` <span style="color:#20c997;font-weight:bold">${room}</span>${i < rooms.length-1 ? ',' : ''}`;
        });
    } else {
        roomList.style.display = 'none';
        roomList.textContent = '';
    }
}

socket.on('activity', (name) => {
    if(name) {
        activity.style.display = '';
        activity.innerHTML = `⌨️ <span style="color:#764ba2">${name}</span> is typing...`;
        setTimeout(() => {
            activity.textContent = '';
            activity.style.display = 'none';
        }, 1500);
    } else {
        activity.textContent = '';
        activity.style.display = 'none';
    }
})

// Optional: Adjust chat display height based on screen size
function adjustChatDisplayHeight() {
    const chatDisplay = document.querySelector('.chat.display');
    if (window.innerWidth <= 768) {
        chatDisplay.style.maxHeight = '350px';
        chatDisplay.style.padding = '15px';
    } else {
        chatDisplay.style.maxHeight = '500px';
        chatDisplay.style.padding = '20px';
    }
}

// Initial adjustment
window.addEventListener('DOMContentLoaded', adjustChatDisplayHeight);
// Adjust on resize
window.addEventListener('resize', adjustChatDisplayHeight);
// Adjust on resize
window.addEventListener('resize', adjustChatDisplayHeight);

