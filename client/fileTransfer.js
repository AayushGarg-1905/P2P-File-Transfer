// fileTransfer.js


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


let fileQueue = [];
let isTransferring = false;
let queueTotal = 0;
let queueIndex = 0;

let fileQueueAnswerer = [];
let isTransferringAnswerer = false;
let queueTotalAnswerer = 0;
let queueIndexAnswerer = 0;


sendFileBtn.addEventListener("click", startQueue);
sendFileBtnAnswerer.addEventListener("click", startQueueAnswerer);
sendTextBtn.addEventListener("click", sendTextData);
sendTextBtnAnswerer.addEventListener("click", sendTextDataAnswerer);


function startQueue() {
    const files = Array.from(fileInput.files);
    if (!files.length) { alert("No files selected"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("Connection not ready"); return; }
    if (isTransferring) { alert("Transfer already in progress"); return; }
    if (window.peerIsTransferring) { alert("Peer is currently sending. Please wait."); return; }

    fileQueue = files;
    queueTotal = files.length;
    queueIndex = 0;

    document.getElementById('senderProgressBlock').style.display = 'flex';
    window.updateQueueDropdown(files, -1);

    dataChannel.send(JSON.stringify({ type: "transfer-start" }));
    sendNextFile();
}

function sendNextFile() {
    if (fileQueue.length === 0) {
        isTransferring = false;
        window.isTransferring = false;
        queueStatus.style.display = 'none';
        queueStatusText.textContent = '';
        fileInput.value = '';
        document.getElementById('selectedFileName').textContent = '';
        sendFileBtn.disabled = true;
        window.updateQueueDropdown([], -1);
        dataChannel.send(JSON.stringify({ type: "transfer-end" }));
        return;
    }

    isTransferring = true;
    window.isTransferring = true;
    sendFileBtn.disabled = true;

    const file = fileQueue[0];
    queueIndex++;
    window.updateQueueDropdown(null, queueIndex - 1);

    if (queueTotal > 1) {
        queueStatus.style.display = 'block';
        queueStatusText.textContent = `File ${queueIndex} of ${queueTotal} — ${file.name}`;
    }

    fileQueue.shift();

    senderProgressBar.value = 0;
    senderProgressText.innerText = '0%';
    senderSpeedText.innerText = '— MB/s';
    senderTimeText.innerText = '—';

    sendFile(file).then(() => sendNextFile());
}



function startQueueAnswerer() {
    const files = Array.from(fileInputAnswerer.files);
    if (!files.length) { alert("No files selected"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("Connection not ready"); return; }
    if (isTransferringAnswerer) { alert("Transfer already in progress"); return; }
    if (window.peerIsTransferring) { alert("Peer is currently sending. Please wait."); return; }

    fileQueueAnswerer = files;
    queueTotalAnswerer = files.length;
    queueIndexAnswerer = 0;

    document.getElementById('senderProgressBlockAnswerer').style.display = 'flex';
    window.updateQueueDropdownAnswerer(files, -1);

    dataChannel.send(JSON.stringify({ type: "transfer-start" }));
    sendNextFileAnswerer();
}

function sendNextFileAnswerer() {
    if (fileQueueAnswerer.length === 0) {
        isTransferringAnswerer = false;
        queueStatusAnswerer.style.display = 'none';
        queueStatusTextAnswerer.textContent = '';
        fileInputAnswerer.value = '';
        document.getElementById('selectedFileNameAnswerer').textContent = '';
        sendFileBtnAnswerer.disabled = true;
        window.updateQueueDropdownAnswerer([], -1);
        dataChannel.send(JSON.stringify({ type: "transfer-end" }));
        return;
    }

    isTransferringAnswerer = true;
    sendFileBtnAnswerer.disabled = true;

    const file = fileQueueAnswerer[0];
    queueIndexAnswerer++;
    window.updateQueueDropdownAnswerer(null, queueIndexAnswerer - 1);

    if (queueTotalAnswerer > 1) {
        queueStatusAnswerer.style.display = 'block';
        queueStatusTextAnswerer.textContent = `File ${queueIndexAnswerer} of ${queueTotalAnswerer} — ${file.name}`;
    }

    fileQueueAnswerer.shift();

    senderProgressBarAnswerer.value = 0;
    senderProgressTextAnswerer.innerText = '0%';
    senderSpeedTextAnswerer.innerText = '— MB/s';
    senderTimeTextAnswerer.innerText = '—';

    sendFileAnswerer(file).then(() => sendNextFileAnswerer());
}



async function sendFile(file) {
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
        senderProgressBar.value = percent;
        senderProgressText.innerText = `${percent}% (${(offset / 1024 / 1024).toFixed(2)} MB / ${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        let elapsed = (Date.now() - startTime) / 1000;
        senderTimeText.innerText = elapsed.toFixed(2) + " sec";
        senderSpeedText.innerText = ((offset / 1024 / 1024) / elapsed).toFixed(2) + " MB/s";
    }

    dataChannel.send(JSON.stringify({ type: "end" }));
}

async function sendFileAnswerer(file) {
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
        senderProgressBarAnswerer.value = percent;
        senderProgressTextAnswerer.innerText = `${percent}% (${(offset / 1024 / 1024).toFixed(2)} MB / ${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        let elapsed = (Date.now() - startTime) / 1000;
        senderTimeTextAnswerer.innerText = elapsed.toFixed(2) + " sec";
        senderSpeedTextAnswerer.innerText = ((offset / 1024 / 1024) / elapsed).toFixed(2) + " MB/s";
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

function sendTextData() {
    const text = textInput.value.trim();
    if (!text) { alert("Nothing to send"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("Connection not ready"); return; }
    dataChannel.send(JSON.stringify({ type: "text", content: text }));
    textInput.value = "";
    sendTextBtn.textContent = "✓ Sent!";
    setTimeout(() => sendTextBtn.textContent = "Send Text →", 2000);
}

function sendTextDataAnswerer() {
    const text = textInputAnswerer.value.trim();
    if (!text) { alert("Nothing to send"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("Connection not ready"); return; }
    dataChannel.send(JSON.stringify({ type: "text", content: text }));
    textInputAnswerer.value = "";
    sendTextBtnAnswerer.textContent = "✓ Sent!";
    setTimeout(() => sendTextBtnAnswerer.textContent = "Send Text →", 2000);
}