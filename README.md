# 🔄 P2P File Transfer

Transfer your files directly between peers without the need for a centralized server. Built with **WebRTC** and **Socket.io** for secure, real-time peer-to-peer communication.
[Try it now](https://p2p-file-transfer-gmnj.onrender.com)
## Overview

P2P File Transfer is a minimal MVP (Minimum Viable Product) that demonstrates the feasibility of file transfer over WebRTC data channels. Two users can connect to the same room and transfer files directly to each other with zero intermediary storage—what you send is what they receive, instantly.

## ✨ Features

- **Direct Peer-to-Peer Connection**: Files transfer directly between peers using WebRTC data channels
- **No Server Storage**: Files don't get stored on the signaling server—it only handles connection negotiation
- **Real-Time Communication**: Built with Socket.io for signaling and WebRTC for data transfer
- **Room-Based Matching**: Users join rooms to find and connect with transfer partners
- **Automatic Cleanup**: Rooms are automatically deleted when all peers disconnect
- **CORS Enabled**: Ready for cross-origin requests
- **Bi-Directional Transfers**: Both peers can send files simultaneously, each with independent transfer controls
- **Multiple File Transfer**: Queue and send multiple files in sequence with progress tracking for each
- **Text Sharing**: Send instant text messages alongside file transfers