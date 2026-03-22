const fileInput = document.getElementById("fileInput")
const sendFileBtn = document.getElementById("sendFileBtn")
const downloadArea = document.getElementById("downloadArea")
console.log("fileTransfer.js loaded");
sendFileBtn.addEventListener("click",sendFile)

async function sendFile(){
    console.log("file send click")
    const file = fileInput.files[0]
    console.log("file:: ",file)
    if(!file){
        alert("no file selected")
        return;
    }

    if(!dataChannel || dataChannel.readyState!=="open"){
        alert("connection not ready !!");
        return;
    }

    // sending metadata
    dataChannel.send(JSON.stringify({
        "type": "metadata",
        "name": file.name,
        "size": file.size
    }))

    // sending data chunks
    const reader = new FileReader()
    const chunkSize = 64 * 1024;
    let offset = 0;
    

    reader.onload = async (e) => {
        
        await waitForBufferCheck();

        dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;
        if (offset < file.size) {
            const slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
        } else {
            dataChannel.send(JSON.stringify({
                type: "end"
            }));
        }
        console.log("Sent:", offset, "/", file.size);
    };
    const slice = file.slice(0, chunkSize)
    reader.readAsArrayBuffer(slice)

}

function waitForBufferCheck(){
    return new Promise(resolve=>{
        const bufferLimit = 1*1024*1024

        function check(){
            if(dataChannel.bufferedAmount < bufferLimit){
                resolve()
            }
            else{
                setTimeout(check,10)
            }
        }
        check()
    })
}