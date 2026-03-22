// -------------------- SOCKET --------------------

const socket = io("http://localhost:8081");

const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const roomInput = document.getElementById("roomInput");
const roomDisplay = document.getElementById("roomDisplay");

let roomId;
let peerConnection;
let dataChannel;
let role;
let receivedBuffers = [];
let fileMetadata = null;

const configuration = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302"
            ]
        }
    ]
};

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

        console.log(
            "Connection state:",
            peerConnection.connectionState
        );
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
            if(typeof msg.data === "string"){
                const data = JSON.parse(msg.data)

                if(data.type=="metadata"){
                    fileMetadata = data
                    receivedBuffers = []
                    console.log("Metadata is received, now receving the file buffer: ",data.name)
                }

                if(data.type=="end"){
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
            else{
                receivedBuffers.push(msg.data)
            }
        };
    };
}

// -------------------- DATA CHANNEL (OFFERER) --------------------

function createDataChannel() {

    dataChannel = peerConnection.createDataChannel("fileTransfer");

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