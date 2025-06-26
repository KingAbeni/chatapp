

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
            test: msgInput.value 
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
    const li = document.createElement('li')
    li.textContent = data
    document.querySelector('ul').appendChild(li)

})


socket.on('activity', (name) => {
    activity.textContent = `${name} is typing...`
    setTimeout(() => {
        activity.textContent = ''
    }, 1500)
})
