const routes = require('./routes')
const shell = require('shelljs')

const express = require("express");
const { Server } = require("socket.io");

const app = express(); // create express app
const http = require('http').createServer(routes(app));

const io = new Server(http, {
	pingTimeout: 1000 * 60 * 5
});

try {
	io.on('connection', client => {
		setTimeout(() => {
			shell.exec('ls', { silent: false })
			client.emit('activate', client.id)
		}, 5000);
	});
} catch (e) {
	console.log('ERROR', e)
}

http.listen(3001, () => {
	console.log("server started on port 3001");
});