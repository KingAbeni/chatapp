

const socket= io('ws://localhost:3500')

const activity = document.querySelector('.activity')
const msginput = document.querySelector('input')

function sendMessage(e) {
    e.preventDefault()

    if(msginput.value) {
        socket.emit('message', msginput.value)
        msginput.value = ""
    }
    input.focus()
}

document.querySelector('form').addEventListener('submit', sendMessage)

// Listen for messages from the server
socket.on("message", (data) => {
    const li = document.createElement('li')
    li.textContent = data
    document.querySelector('ul').appendChild(li)

})
msginput.addEventListener('keypress', () => {
    socket.emit('activity', socket.id.substring(0,5))
})

socket.on('activity', (name) => {
    activity.textContent = `${name} is typing...`
    setTimeout(() => {
        activity.textContent = ''
    }, 1500)
})
