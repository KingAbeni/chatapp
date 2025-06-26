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
            text: msgInput.value // <-- fix typo here
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
    li.className = 'post'
    if(name === nameInput.value ) li.className ='post post--left'
    if(name !==nameInput.value && name !== 'Admin') li.className ='post post--right'
    if(name!== 'admin'){
        li.innerHTML = `<div class="post__header ${name === nameInput.value ? 'post__header--user' : 'post__header--reply'}">
        <span class="POST__header__name">${name}</span>
        <span class="POST__header__time">${time}</span>
        </div>
        <div class="post__text">${text}</div>`
    }
    else {
        li.innerHTML = `<div class="post__text">${text}</div>`
    }

    document.querySelector('.chat.display').appendChild(li)
    chatDisplay.scrollTop = chatDisplay.scrollHeight

})


socket.on('activity', (name) => {
    activity.textContent = `${name} is typing...`
    setTimeout(() => {
        activity.textContent = ''
    }, 1500)
})
socket.on('userList', ({ users }) => {
    showUsers(users)
})
socket.on('roomList', ({ rooms }) => {
    showRooms(rooms)
})

function showUsers(users){
    usersList.textContent = ''
    if(users) {
        usersList.innerHTML = `<em>Users in ${chatRoom.value} room </em>`
        users.forEach((user,i) => {
            usersList.textContent += `${user.name}`
            if (users.length > 1 && i == users.length - 1) {
                usersList.textContent += ` and ${user.name}`
            }
        })
    }
}

function showRooms(rooms){
    roomList.textContent = ''
    if(rooms) {
        roomList.innerHTML = '<em>Available rooms:</em>'
        rooms.forEach((room,i) => {
            roomList.textContent += `${room}`
            // Remove incorrect room.name usage
            // if (rooms.length > 1 && i == rooms.length - 1) {
            //     roomList.textContent += ` and ${room.name}`
            // }
        })
    }
}

