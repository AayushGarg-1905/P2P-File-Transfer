const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {}; // { roomId: { offer: {}, answer: {}, candidates: { offerer: [], answerer: [] } } }

io.on('connection', socket => {
    console.log('Socket connected:', socket.id);

    socket.on('join-room', (roomId) => {
        
        const room = io.sockets.adapter.rooms.get(roomId);
        const numberOfClients = room ? room.size : 0;

        if (numberOfClients >= 2) {
            socket.emit('room-full');
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        rooms[roomId] = rooms[roomId] || {
            offer: null,
            answer: null,
            candidates: {
                offerer: [],
                answerer: []
            }
        };

        console.log('Socket joined room:', roomId);

        if (rooms[roomId].offer) {
            socket.emit('receive-offer', rooms[roomId].offer);
        }
    });

    socket.on('send-offer', ({ roomId, offer }) => {
        console.log('send offer initiated');
        rooms[roomId] = rooms[roomId] || { candidates: { offerer: [], answerer: [] } };
        rooms[roomId].offer = offer;
        socket.to(roomId).emit('receive-offer', offer);
    });

    socket.on('send-answer', ({ roomId, answer }) => {
        rooms[roomId].answer = answer;
        socket.to(roomId).emit('receive-answer', answer);
    });

    socket.on('send-ice-candidate', ({ roomId, role, candidate }) => {
        if (rooms[roomId]) {
            rooms[roomId].candidates[role].push(candidate);
            socket.to(roomId).emit('receive-ice-candidate', { role, candidate });
        }
    });

    socket.on('disconnect', () => {
        const { roomId } = socket;

        console.log('Socket disconnected:', socket.id);

        if (!roomId) return;

        socket.to(roomId).emit('peer-disconnected');
        const room = io.sockets.adapter.rooms.get(roomId);

        if (!room || room.size === 0) {
            delete rooms[roomId];
            console.log('Room deleted:', roomId);
        }
    });
});

server.listen(8081, () => {
    console.log('Signaling server running on port 8081');
});
