// app.js

// -------------------- SOCKET --------------------

const socket = io();

const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const roomInput = document.getElementById("roomInput");
const roomDisplay = document.getElementById("roomDisplay");
const receiverProgressText = document.getElementById("receiverProgressText");
const receiverProgressBar = document.getElementById("receiverProgressBar");
const receiverSpeedText = document.getElementById("receiverSpeedText")
const receiverTimeText = document.getElementById("receiverTimeText")

let roomId;
let peerConnection;
let dataChannel;
let role;
let receivedBuffers = [];
let fileMetadata = null;
let receivedSize = 0;
let receiveStartTime = 0;

// Auto-fill RoomId From Url In Case Joining By Qr Scan
const params = new URLSearchParams(window.location.search);
if (params.get('room')) roomInput.value = params.get('room');

async function getTurnConfig() {
    const turnServers = await fetch('/turn-server-config').then(r => r.json());
    return {
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302"
                ]
            },
            turnServers
        ]
    };
}

// -------------------- SOCKET CONNECT --------------------

socket.on("connect", () => {
    console.log("Connected to signaling server:", socket.id);
});

// -------------------- CREATE ROOM (OFFERER) --------------------

createRoomBtn.addEventListener("click", async () => {

    role = "offerer"
    roomId = Math.random().toString(36).substring(2, 8);

    socket.emit("join-room", roomId);

    roomDisplay.innerText = "Room ID: " + roomId;

    console.log("Room created:", roomId);

    await createPeerConnection();

    createDataChannel();

    await createOffer();
});

// -------------------- JOIN ROOM (ANSWERER) --------------------

joinRoomBtn.addEventListener("click", () => {

    role = "answerer"
    roomId = roomInput.value;
    if (!roomId) {
        alert("Enter room ID");
        return;
    }

    socket.emit("join-room", roomId);

    roomDisplay.innerText = "Joined Room: " + roomId;

    console.log("Joined room:", roomId);
});

// -------------------- PEER CONNECTION --------------------

async function createPeerConnection() {
    const configuration = await getTurnConfig();
    peerConnection = new RTCPeerConnection(configuration);

    console.log("Peer connection created");

    peerConnection.onicecandidate = (event) => {

        if (event.candidate) {

            socket.emit("send-ice-candidate", {
                roomId,
                role: role,
                candidate: event.candidate
            });
        }
    };

    peerConnection.onconnectionstatechange = () => {

        const state = peerConnection.connectionState;
        console.log("Connection state:", state);

        if (state === "connected") {
            window.updateRoomBannerStatus("connected");
        } else if (state === "disconnected" || state === "failed" || state === "closed") {
            window.updateRoomBannerStatus("disconnected");
        }
    };
    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === "connected") {
            peerConnection.getStats().then(stats => {
                stats.forEach(report => {
                    if (report.type === "candidate-pair" && report.state === "succeeded") {
                        console.log("Active candidate pair:", report);
                    }
                });
            });
        }
    };

    peerConnection.ondatachannel = (event) => {

        console.log("Data channel received");

        dataChannel = event.channel;

        dataChannel.onopen = () => {
            console.log("Data channel open");
        };

        dataChannel.onmessage = (msg) => {
            // console.log("Message received:", msg.data);
            console.log("data channel msg")
            if (typeof msg.data === "string") {
                const data = JSON.parse(msg.data)

                if (data.type == "metadata") {
                    fileMetadata = data
                    receivedBuffers = []
                    receivedSize = 0;
                    receiveStartTime = Date.now();
                    receiverProgressBar.value = 0;
                    receiverProgressText.innerText = "0%";
                    console.log("Metadata is received, now receving the file buffer: ", data.name)
                }

                if (data.type == "text") {
                    const wrapper = document.createElement("div");
                    wrapper.className = "received-text";
                    console.log("data of text:  ",data)
                    const preview = data.content.length > 60
                        ? data.content.slice(0, 60) + "…"
                        : data.content;

                    wrapper.innerHTML = `
        <div class="received-text-header" onclick="this.nextElementSibling.classList.toggle('open'); this.querySelector('.received-text-toggle').textContent = this.nextElementSibling.classList.contains('open') ? '▲ collapse' : '▼ expand'">
            <div class="received-text-meta">
                <span>⌨</span>
                <span>Text received</span>
                <span class="received-text-preview">${preview}</span>
            </div>
            <span class="received-text-toggle">▼ expand</span>
        </div>
        <div class="received-text-body">
            <div class="received-text-content">${data.content}</div>
            <div class="received-text-actions">
                <button class="btn" style="font-size:0.7rem; padding:6px 12px;" 
                    onclick="navigator.clipboard.writeText(this.closest('.received-text').querySelector('.received-text-content').textContent).then(()=>{this.textContent='✓ Copied';setTimeout(()=>this.textContent='Copy',2000)})">
                    Copy
                </button>
            </div>
        </div>
    `;

                    document.getElementById("downloadArea").appendChild(wrapper);
                }

                if (data.type == "end") {
                    console.log("File received complete")
                    const blob = new Blob(receivedBuffers)
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url;
                    a.download = fileMetadata.name
                    a.innerText = "Download " + fileMetadata.name;
                    document.getElementById("downloadArea").appendChild(a)
                }
            }
            else {
                receivedBuffers.push(msg.data)
                receivedSize += msg.data.byteLength

                let percent = ((receivedSize / fileMetadata.size) * 100).toFixed(2)
                receiverProgressBar.value = percent
                receiverProgressText.innerText =
                    `${percent}% (${(receivedSize / 1024 / 1024).toFixed(2)} MB / ${(fileMetadata.size / 1024 / 1024).toFixed(2)} MB)`

                let elapsedTime = (Date.now() - receiveStartTime) / 1000
                receiverTimeText.innerText = elapsedTime.toFixed(2) + " sec"

                let speed = (receivedSize / 1024 / 1024) / elapsedTime
                receiverSpeedText.innerText = speed.toFixed(2) + " MB/s"
            }
        };
    };
}

// -------------------- DATA CHANNEL (OFFERER) --------------------

function createDataChannel() {

    dataChannel = peerConnection.createDataChannel("fileTransfer");
    dataChannel.bufferedAmountLowThreshold = 512 * 1024 // 512KB
    console.log("Data channel created");

    dataChannel.onopen = () => {
        console.log("Data channel open");
        // dataChannel.send("Hello from sender");
    };

    dataChannel.onmessage = (msg) => {
        console.log("Message received:", msg.data);
    };
}

// -------------------- CREATE OFFER --------------------

async function createOffer() {

    try {

        console.log("Creating offer...");

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        socket.emit("send-offer", {
            roomId,
            offer
        });

        console.log("Offer sent");

    } catch (error) {
        console.log("Offer error", error);
    }
}

// -------------------- RECEIVE OFFER --------------------

socket.on("receive-offer", async (offer) => {

    console.log("Offer received");

    await createPeerConnection();

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
    );

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    socket.emit("send-answer", {
        roomId,
        answer
    });

    console.log("Answer sent");
});

// -------------------- RECEIVE ANSWER --------------------

socket.on("receive-answer", async (answer) => {

    console.log("Answer received");

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
    );
});

// -------------------- ICE CANDIDATE --------------------

socket.on("receive-ice-candidate", async ({ role, candidate }) => {

    try {

        await peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
        );

        console.log("ICE candidate added");

    } catch (error) {

        console.log("ICE error", error);
    }
});

// -------------------- Notify other user on disconnect

socket.on("peer-disconnected", () => {
    alert("Other user left the room");
});


socket.on('peer-rejoined', async () => {
    console.log('Peer rejoined — restarting connection');
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        dataChannel = null;
    }
    if (role === 'offerer') {
        await createPeerConnection();
        createDataChannel();
        await createOffer();
    }
});