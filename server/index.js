import { createServer } from 'http'
import { Server} from 'socket.io'

const httpServer = createServer()

const io=new Server(httpServer, {
    cors:{
        origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:5500"]
    }
})

io.on('connection', socket => {
    socket.on('message',message => {
        console.log(`User ${socket.id} connected`)

        const b=Buffer.from(message)
        console.log(b.toString)
        socket.send(`${message}`)
    })
})

httpServer.listen(3000)