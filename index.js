//File name: Index.js

const { createServer } = require('node:http');
const express = require("express");
const app = express();
const server = createServer(app);
const path = require('path');
const { Server } = require('socket.io');
const io = new Server(server);

app.use(express.static(path.resolve("./Public")));

app.get('/', (req, res) => {
    res.sendFile(path.resolve("./Public/index.html"));
});
server.listen(3000, () => {
    console.log("Server Started at 3000");
});