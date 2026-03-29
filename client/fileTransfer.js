// fileTransfer.js

const fileInput = document.getElementById("fileInput")
const sendFileBtn = document.getElementById("sendFileBtn")
const downloadArea = document.getElementById("downloadArea")
const senderProgressText = document.getElementById("senderProgressText")
const senderProgressBar = document.getElementById("senderProgressBar")
const senderSpeedText = document.getElementById("senderSpeedText")
const senderTimeText = document.getElementById("senderTimeText")

console.log("fileTransfer.js loaded");
sendFileBtn.addEventListener("click",sendFile)


async function sendFile() {
    const file = fileInput.files[0];
    if (!file) { alert("no file selected"); return; }
    if (!dataChannel || dataChannel.readyState !== "open") { alert("connection not ready!!"); return; }

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
        const bufferLimit = 1 * 1024 * 1024
        if (dataChannel.bufferedAmount < bufferLimit) {
            resolve()
        } else {

            const handler = () => {
                dataChannel.removeEventListener(
                    "bufferedamountlow",
                    handler
                )
                resolve()
            }

            dataChannel.addEventListener(
                "bufferedamountlow",
                handler
            )
        }
    })
}