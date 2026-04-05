const fileInput = document.getElementById("fileInput")
const sendFileBtn = document.getElementById("sendFileBtn")
const downloadArea = document.getElementById("downloadArea")
const senderProgressText = document.getElementById("senderProgressText")
const senderProgressBar = document.getElementById("senderProgressBar")
const senderSpeedText = document.getElementById("senderSpeedText")
const senderTimeText = document.getElementById("senderTimeText")
const queueStatus = document.getElementById("queueStatus")
const queueStatusText = document.getElementById("queueStatusText")
const sendTextBtn = document.getElementById("sendTextBtn");
const textInput = document.getElementById("textInput");

console.log("fileTransfer.js loaded");
sendFileBtn.addEventListener("click", startQueue);
sendTextBtn.addEventListener("click", sendTextData);

let fileQueue = [];
let isTransferring = false;
let queueTotal = 0;
let queueIndex = 0;

function startQueue() {
    const files = Array.from(fileInput.files);
    if (!files.length) { alert("No files selected"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("Connection not ready"); return; }
    if (isTransferring) { alert("Transfer already in progress"); return; }

    fileQueue = files;
    queueTotal = files.length;
    queueIndex = 0;

    document.getElementById('senderProgressBlock').style.display = 'flex';
    window.updateQueueDropdown(files, -1);
    sendNextFile();
}


function sendNextFile() {
    if (fileQueue.length === 0) {
        isTransferring = false;
        queueStatus.style.display = 'none';
        queueStatusText.textContent = '';
        fileInput.value = '';
        document.getElementById('selectedFileName').textContent = '';
        sendFileBtn.disabled = true;

        window.updateQueueDropdown([], -1);
        return;
    }

    isTransferring = true;
    sendFileBtn.disabled = true;

    const file = fileQueue[0];
    queueIndex++;

    if (queueTotal > 1) {
        queueStatus.style.display = 'block';
        queueStatusText.textContent = `File ${queueIndex} of ${queueTotal} — ${file.name}`;
    }
    fileQueue.shift(); 

    senderProgressBar.value = 0;
    senderProgressText.innerText = '0%';
    senderSpeedText.innerText = '— MB/s';
    senderTimeText.innerText = '—';

    sendFile(file).then(() => {
        sendNextFile();
    });
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