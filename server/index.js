import express from 'express'
import { Server} from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname= path.dirname(__filename)


const PORT = process.env.PORT || 3500
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
        origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:5500" , "http://127.0.0.1:5500"]
    }
})

io.on('connection', socket => {
console.log(`User ${socket.id} connected`)

socket.emit('message', 'welcome to chat!')

socket.broadcast.emit('message', `${socket.id.substring(0,5)} connected`)

    socket.on('message',data => {
        console.log(`User ${socket.id.substring(0,5)} sent: ${data}`)
        io.emit('message', `${socket.id.substring(0,5)} : ${data}`)
    })

    socket.on('disconnect', () => {
        socket.broadcast.emit('message', `${socket.id.substring(0,5)} disconnected`)
    })
let activityTime

socket.on('activity', (name) => {
    // You can emit an event to all clients to notify about typing activity
    socket.broadcast.emit('activity',name)
})
})

function buildMsg(name, msg) {
    return {
        name,
        test,
        time:new Intl.DateTimeFormat('default', {
            hour:  'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}