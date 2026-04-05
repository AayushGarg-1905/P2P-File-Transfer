// fileTransfer.js


// DOM Element References
const fileInput = document.getElementById("fileInput")
const sendFileBtn = document.getElementById("sendFileBtn")
const senderProgressText = document.getElementById("senderProgressText")
const senderProgressBar = document.getElementById("senderProgressBar")
const senderSpeedText = document.getElementById("senderSpeedText")
const senderTimeText = document.getElementById("senderTimeText")
const queueStatus = document.getElementById("queueStatus")
const queueStatusText = document.getElementById("queueStatusText")
const sendTextBtn = document.getElementById("sendTextBtn");
const textInput = document.getElementById("textInput");

const fileInputAnswerer = document.getElementById("fileInputAnswerer")
const sendFileBtnAnswerer = document.getElementById("sendFileBtnAnswerer")
const senderProgressBarAnswerer = document.getElementById("senderProgressBarAnswerer")
const senderProgressTextAnswerer = document.getElementById("senderProgressTextAnswerer")
const senderSpeedTextAnswerer = document.getElementById("senderSpeedTextAnswerer")
const senderTimeTextAnswerer = document.getElementById("senderTimeTextAnswerer")
const queueStatusAnswerer = document.getElementById("queueStatusAnswerer")
const queueStatusTextAnswerer = document.getElementById("queueStatusTextAnswerer")
const sendTextBtnAnswerer = document.getElementById("sendTextBtnAnswerer");
const textInputAnswerer = document.getElementById("textInputAnswerer");

console.log("fileTransfer.js loaded");

// Element configuration objects for role-agnostic functions
const offererElements = {
    fileInput,
    fileInputLabel: document.getElementById('selectedFileName'),
    sendFileBtn,
    progressBar: senderProgressBar,
    progressText: senderProgressText,
    speedText: senderSpeedText,
    timeText: senderTimeText,
    queueStatus,
    queueStatusText,
    progressBlock: document.getElementById('senderProgressBlock'),
    textInput,
    sendTextBtn,
    updateQueueDropdown: window.updateQueueDropdown
};

const answererElements = {
    fileInput: fileInputAnswerer,
    fileInputLabel: document.getElementById('selectedFileNameAnswerer'),
    sendFileBtn: sendFileBtnAnswerer,
    progressBar: senderProgressBarAnswerer,
    progressText: senderProgressTextAnswerer,
    speedText: senderSpeedTextAnswerer,
    timeText: senderTimeTextAnswerer,
    queueStatus: queueStatusAnswerer,
    queueStatusText: queueStatusTextAnswerer,
    progressBlock: document.getElementById('senderProgressBlockAnswerer'),
    textInput: textInputAnswerer,
    sendTextBtn: sendTextBtnAnswerer,
    updateQueueDropdown: window.updateQueueDropdownAnswerer
};

// Transfer state (role-agnostic)
const transferState = {
    offerer: {
        fileQueue: [],
        isTransferring: false,
        queueTotal: 0,
        queueIndex: 0
    },
    answerer: {
        fileQueue: [],
        isTransferring: false,
        queueTotal: 0,
        queueIndex: 0
    }
};

sendFileBtn.addEventListener("click", () => startQueue(offererElements));
sendFileBtnAnswerer.addEventListener("click", () => startQueue(answererElements));
sendTextBtn.addEventListener("click", () => sendTextData(offererElements));
sendTextBtnAnswerer.addEventListener("click", () => sendTextData(answererElements));


function startQueue(elements) {
    const role = elements === offererElements ? 'offerer' : 'answerer';
    const state = transferState[role];
    const files = Array.from(elements.fileInput.files);
    
    if (!files.length) { alert("No files selected"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("Connection not ready"); return; }
    if (state.isTransferring) { alert("Transfer already in progress"); return; }
    if (window.peerIsTransferring) { alert("Peer is currently sending. Please wait."); return; }

    state.fileQueue = files;
    state.queueTotal = files.length;
    state.queueIndex = 0;

    elements.progressBlock.style.display = 'flex';
    elements.updateQueueDropdown(files, -1);

    dataChannel.send(JSON.stringify({ type: "transfer-start" }));
    sendNextFile(elements);
}

function sendNextFile(elements) {
    const role = elements === offererElements ? 'offerer' : 'answerer';
    const state = transferState[role];

    if (state.fileQueue.length === 0) {
        state.isTransferring = false;
        window.isTransferring = false;
        elements.queueStatus.style.display = 'none';
        elements.queueStatusText.textContent = '';
        elements.fileInput.value = '';
        elements.fileInputLabel.textContent = '';
        elements.sendFileBtn.disabled = true;
        elements.updateQueueDropdown([], -1);
        dataChannel.send(JSON.stringify({ type: "transfer-end" }));
        return;
    }

    state.isTransferring = true;
    window.isTransferring = true;
    elements.sendFileBtn.disabled = true;

    const file = state.fileQueue[0];
    state.queueIndex++;
    elements.updateQueueDropdown(null, state.queueIndex - 1);

    if (state.queueTotal > 1) {
        elements.queueStatus.style.display = 'block';
        elements.queueStatusText.textContent = `File ${state.queueIndex} of ${state.queueTotal} — ${file.name}`;
    }

    state.fileQueue.shift();

    elements.progressBar.value = 0;
    elements.progressText.innerText = '0%';
    elements.speedText.innerText = '— MB/s';
    elements.timeText.innerText = '—';

    sendFile(file, elements).then(() => sendNextFile(elements));
}



async function sendFile(file, elements) {
    const chunkSize = 256 * 1024;
    const PIPELINE_SIZE = 4;
    let offset = 0;
    let startTime = Date.now();

    dataChannel.send(JSON.stringify({ type: "metadata", name: file.name, size: file.size }));

    async function readChunk(off) {
        if (off >= file.size) return null;
        return file.slice(off, off + chunkSize).arrayBuffer();
    }

    let pipeline = [];
    for (let i = 0; i < PIPELINE_SIZE; i++) {
        pipeline.push(readChunk(offset + i * chunkSize));
    }

    while (offset < file.size) {
        await waitForBufferCheck();
        const chunk = await pipeline.shift();
        if (!chunk) break;

        dataChannel.send(chunk);
        offset += chunk.byteLength;
        pipeline.push(readChunk(offset + (PIPELINE_SIZE - 1) * chunkSize));

        let percent = ((offset / file.size) * 100).toFixed(2);
        elements.progressBar.value = percent;
        elements.progressText.innerText = `${percent}% (${(offset / 1024 / 1024).toFixed(2)} MB / ${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        let elapsed = (Date.now() - startTime) / 1000;
        elements.timeText.innerText = elapsed.toFixed(2) + " sec";
        elements.speedText.innerText = ((offset / 1024 / 1024) / elapsed).toFixed(2) + " MB/s";
    }

    dataChannel.send(JSON.stringify({ type: "end" }));
}


function waitForBufferCheck() {
    return new Promise(resolve => {
        const bufferLimit = 1 * 1024 * 1024;
        if (dataChannel.bufferedAmount < bufferLimit) {
            resolve();
        } else {
            const handler = () => {
                dataChannel.removeEventListener("bufferedamountlow", handler);
                resolve();
            }
            dataChannel.addEventListener("bufferedamountlow", handler);
        }
    });
}

function sendTextData(elements) {
    const text = elements.textInput.value.trim();
    if (!text) { alert("Nothing to send"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("Connection not ready"); return; }
    dataChannel.send(JSON.stringify({ type: "text", content: text }));
    elements.textInput.value = "";
    elements.sendTextBtn.textContent = "✓ Sent!";
    setTimeout(() => elements.sendTextBtn.textContent = "Send Text →", 2000);
}