const WebSocket = require('ws')
const express = require('express')
const app = express()
const path = require('path')

app.use('/', express.static(path.resolve(__dirname, '../client')))

const server = app.listen(9876)

const wss = new WebSocket.Server({
	noServer: true
})

wss.on('connection', function(ws) {
	ws.on('message', function(data) {
		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(data)
			}
		})
	})
})

server.on('upgrade', async function upgrade(request, socket, head) {
	// Do what you normally do in `verifyClient()` here and then use
	// `WebSocketServer.prototype.handleUpgrade()`.

	// test for authentication

	if (Math.random() > 0.5) {
		return socket.end('HTTP/1.1 401 Unauthorized\r\n', 'ascii')
	}
	wss.handleUpgrade(request, socket, head, function done(ws) {
		wss.emit('connection', ws, request, ...args)
	})
})
