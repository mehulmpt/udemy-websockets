const WebSocket = require('ws')
const express = require('express')
const app = express()
const path = require('path')

app.use('/', express.static(path.resolve(__dirname, '../client')))

const server = app.listen(9876)

const wss = new WebSocket.Server({
	noServer: true
})

const typingUsers = []
const allClients = []
const messages = []

function broadcastNewMessage(user, msg) {
    allClients.forEach(client => {
        if(client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                event: 'newMessage',
                data: {
                    user, msg
                }
            }))
        }
    })
}

function updateAllUsers() {
    allClients.forEach(client => {
        if(client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                event: 'all-Users',
                data: allClients.map(userWS => ({
                    status: userWS.info.onlineStatus,
                    user: userWS.info.user
                }))
            }))
        }
    })
}

function broadcastTypingUsers() {
    allClients.forEach(client => {
        if(client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                event: 'showTypingUsers',
                data: typingUsers.map(userWS => ({
                    user: userWS.info.user
                }))
            }))
        }
    })
}

wss.on('connection', function(ws) {
    ws.info = {
        onlineStatus: 'green',
        user: ''
    }
	ws.on('message', function(message) {
		try {
            const { event, data } = JSON.parse(message)
            
            switch(event) {
                case 'addTypingUsers': {
                    typingUsers.push(ws)
                    broadcastTypingUsers()
                    break
                }
                case 'removeTypingUsers': {
                    const user = typingUsers.findIndex(user => user === ws)
                    if(user !== -1) {
                        typingUsers.splice(user, 1)
                    }
                    broadcastTypingUsers()
                    break
                }
                case 'oldMessage': {
                    messages.push({
                        contents: data.msg,
                        user: ws.info.user
                    })
                    broadcastNewMessage(ws.info.user, data.msg)
                    break
                }
                case 'thisUser': {
                    ws.info = data
                    allClients.push(ws)
                    updateAllUsers()
                    break
                }
                case 'updateUserStatus': {
                    ws.info.onlineStatus = data
                    updateAllUsers()
                    break
                }
            }

        } catch(error) {
            // not expected
        }
	})
})

server.on('upgrade', async function upgrade(request, socket, head) {
	// Do what you normally do in `verifyClient()` here and then use
	// `WebSocketServer.prototype.handleUpgrade()`.

	// test for authentication
    
	wss.handleUpgrade(request, socket, head, function done(ws) {
		wss.emit('connection', ws, request)
	})
})
