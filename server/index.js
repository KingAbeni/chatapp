import express from 'express'
import { Server} from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname= path.dirname(__filename)


const PORT = process.env.PORT || 3500 || 3000
const ADMIN="Admin"

const app = express()

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
} )

// state 

const UserState = {
    users: [],
    setUsers : function(newUsersArray) {
        this.users = newUsersArray
    }
}


const io=new Server(expressServer, {
    cors:{
        origin: process.env.NODE_ENV === 'production' ? false : [
            "http://localhost:3000", "http://127.0.0.1:3000", // add this for React dev server
            "http://localhost:5500" , "http://127.0.0.1:5500"
        ]
    }
})

io.on('connection', socket => {
console.log(`User ${socket.id} connected`)

socket.emit('message', buildMsg(ADMIN, `Welcome to the chat app!`))
socket.on('enterRoom', ({name, room}) => {
    //leave previous room if any
    const prevRoom = getUser(socket.id)?.room
    if(prevRoom) {  
        socket.leave(prevRoom)
        io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} left the room`))
    } 
    //activate user
    const user = activateUser(socket.id, name, room)  

    //cannot update previous room user list until after the state in activate user
    if(prevRoom){
        io.to(prevRoom).emit('userList', {users : getUsersInRoom(prevRoom)
       })  
    }
    //join new room
    socket.join(user.room)
    //to the joining user
    socket.emit('message', buildMsg(ADMIN, `You joined room ${user.room}`))
    //to everyone in the room
    socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} joined the room`))

    //update user list for room
    io.to(user.room).emit('userList', {users : getUsersInRoom(user.room)})
    //update room list for all users
    io.emit('roomList', {rooms: getAllActiveRooms()})
})
//listen to disconnect event
 socket.on('disconnect', () => {
    const user = getUser(socket.id)
    userleaveApp(socket.id)
    
    if(user) {
        io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} left the room`))
        //update user list for room
        io.to(user.room).emit('userList', {users : getUsersInRoom(user.room)})
        //update room list for all users
        io.emit('roomList', {rooms: getAllActiveRooms()})
    }})

//listen to message event 

    socket.on('message',({name, text })=> {
        const room = getUser(socket.id)?.room
        if(room) {
            io.to(room).emit('message', buildMsg(name, text))
        }
    })

//listen for activity event
socket.on('activity', (name) => {
    const room = getUser(socket.id)?.room
    if(room) {
        // Send a payload with name and isTyping flag
        socket.broadcast.to(room).emit('activity', { name, isTyping: true })
    }
})

})

function buildMsg(name, text) {
    return {
        name,
        text,
        time:new Intl.DateTimeFormat('default', {
            hour:  'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}
//user active function function
function activateUser(id,name,room){
    const user = {id,name,room}
    UserState.setUsers([
        ...UserState.users.filter(user => user.id !== id), user])
    return user
}
// user  leave
function userleaveApp(id) {
    UserState.setUsers(UserState.users.filter(user => user.id !== id))
}
// get user by id
function getUser(id) {
    return UserState.users.find(user => user.id === id)
}
// get users by room
function getUsersInRoom(room) {
    return UserState.users.filter(user => user.room === room)
}
// get all rooms
function getAllActiveRooms() {
    return [...new Set(UserState.users.map(user => user.room))]
}