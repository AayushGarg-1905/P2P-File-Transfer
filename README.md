# RELAY — P2P File Transfer

> Transfer files directly between your devices. No login. No cloud. No trace.

[**Try it live →**](https://p2p-file-transfer-gmnj.onrender.com)

---

## What is this?

RELAY is a browser-based file transfer tool built on WebRTC. Open it on two devices, share a room ID or scan a QR code, and transfer files directly — peer to peer, no intermediary storage, no account required.

The signaling server exists only to help the two peers find each other. Once connected, it steps out of the way entirely. Your files never touch it.

---

## Features

### Core Transfer
- **True P2P** — files travel directly between browsers over WebRTC data channels
- **Multi-file queue** — select multiple files at once, transferred sequentially with per-file progress
- **Bidirectional** — both sides can send files and text, not just the room creator
- **Text & snippet sharing** — send a URL, a password, a code snippet instantly alongside files
- **No size limit** — transfer is constrained only by your connection, not an upload cap

### Connection
- **Room-based** — share a 6-character room ID or let the other device scan a QR code
- **TURN fallback** — automatically relays through a TURN server when direct connection fails (symmetric NAT, VPN, etc.)

### Experience
- **PWA installable** — add to home screen on iOS and Android, works like a native app
- **Offline page** — graceful fallback when there's no connection
- **No login** — no account, no email, no tracking
- **No cloud** — nothing is stored anywhere

---