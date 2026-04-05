// ui.js

(function () {
    setInterval(() => {
        const sBar = document.getElementById('senderProgressBar');
        const rBar = document.getElementById('receiverProgressBar');

        if (sBar && sBar.value > 0) {
            document.getElementById('senderFill').style.width = sBar.value + '%';
        }
        if (rBar && rBar.value > 0) {
            document.getElementById('receiverFill').style.width = rBar.value + '%';
            document.getElementById('receiverCard').style.display = 'block';
        }
    }, 80);

    const roomDisplayEl = document.getElementById('roomDisplay');
    const toggleTextBtn = document.getElementById('toggleTextBtn');
    const textPanel = document.getElementById('textPanel');
    toggleTextBtn.addEventListener('click', () => {
        const isVisible = textPanel.style.display !== 'none';
        textPanel.style.display = isVisible ? 'none' : 'block';
        toggleTextBtn.textContent = isVisible ? '⌨  Share Text' : '✕  Close Text';
    });
    let _roomText = '';
    let _isCreator = false;
    let _currentRoomId = '';

    Object.defineProperty(roomDisplayEl, 'innerText', {
        get() { return _roomText; },
        set(val) {
            _roomText = val;
            if (!val) { roomDisplayEl.style.display = 'none'; return; }

            const parts = val.split(' ');
            _currentRoomId = parts[parts.length - 1];
            _isCreator = val.toLowerCase().includes('room id:');

            renderRoomBanner('waiting');

            document.getElementById('sessionPanel').style.display = 'flex';
            document.getElementById('senderCard').style.display = _isCreator ? 'block' : 'none';
            document.getElementById('receiverCard').style.display = _isCreator ? 'none' : 'block';
            document.getElementById('initPanel').style.display = 'none';
        }
    });

    function renderRoomBanner(state) {
        // state: 'waiting' | 'connected' | 'disconnected'
        const dotClass = state === 'connected' ? 'connected' : state === 'disconnected' ? 'error' : 'busy';
        const statusText = state === 'connected'
            ? 'Peer connected'
            : state === 'disconnected'
                ? 'Peer disconnected'
                : (_isCreator ? 'Waiting for peer…' : 'Connected to room');

        roomDisplayEl.style.display = 'block';
        roomDisplayEl.innerHTML = `
      <div class="room-banner">
        <div class="room-banner-left">
          <div class="room-banner-sublabel">${_isCreator ? 'your room id — share with receiver' : 'joined room'}</div>
          <div class="room-id-value">${_currentRoomId}</div>
          ${_isCreator ? `
            <div id="qrContainer" style="margin-top:10px;"></div>
            <div class="qr-scan-label">Scan to join</div>
        ` : ''}
        </div>
        <div class="room-banner-right">
          ${_isCreator ? `<button class="copy-btn" onclick="navigator.clipboard.writeText('${_currentRoomId}').then(()=>{this.textContent='✓ Copied';setTimeout(()=>this.textContent='Copy ID',2000)})">Copy ID</button>` : ''}
          <div class="conn-status">
            <div class="status-dot ${dotClass}"></div>
            <span>${statusText}</span>
          </div>
        </div>
      </div>`;

        if (_isCreator) {
            console.log("Generating QR code ")
            new QRCode(document.getElementById("qrContainer"), {
                text: `${window.location.origin}?room=${_currentRoomId}`,
                width: 120,
                height: 120,
            });
        }
    }

    window.updateRoomBannerStatus = function (state) {
        if (_currentRoomId) renderRoomBanner(state);
    };

    const fileInput = document.getElementById('fileInput');
    const selectedFileName = document.getElementById('selectedFileName');
    const sendFileBtn = document.getElementById('sendFileBtn');

    fileInput.addEventListener('change', function () {
        const files = Array.from(this.files);
        if (!files.length) {
            selectedFileName.textContent = '';
            sendFileBtn.disabled = true;
            return;
        }
        if (files.length === 1) {
            selectedFileName.textContent = files[0].name;
        } else {
            selectedFileName.textContent = `${files.length} files selected`;
        }
        sendFileBtn.disabled = false;
    });

    sendFileBtn.addEventListener('click', function () {
        document.getElementById('senderProgressBlock').style.display = 'flex';
    }, true);


    const dz = document.getElementById('dropZone');
    let dragCounter = 0;

    window.addEventListener('dragenter', () => { dragCounter++; });
    window.addEventListener('dragleave', () => {
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            dz.classList.remove('drag-over');
        }
    });

    window.addEventListener('drop', () => { dragCounter = 0; });

    dz.addEventListener('dragover', (e) => {
        e.preventDefault();
        dz.classList.add('drag-over');
    });

    dz.addEventListener('dragleave', () => {
        if (dragCounter <= 0) {
            dz.classList.remove('drag-over');
        }
    });

    dz.addEventListener('drop', (e) => {
        e.preventDefault();
        dz.classList.remove('drag-over');
        dragCounter = 0;

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files; 
            fileInput.dispatchEvent(new Event('change'));
        }
    });

    const queueDropdown = document.getElementById('queueDropdown');
    const queueDropdownToggle = document.getElementById('queueDropdownToggle');
    const queueDropdownBody = document.getElementById('queueDropdownBody');
    const queueDropdownLabel = document.getElementById('queueDropdownLabel');
    const queueDropdownArrow = document.getElementById('queueDropdownArrow');

    let _queueFiles = [];
    let _dropdownOpen = false;

    queueDropdownToggle.addEventListener('click', () => {
        _dropdownOpen = !_dropdownOpen;
        queueDropdownBody.style.display = _dropdownOpen ? 'block' : 'none';
        queueDropdownArrow.textContent = _dropdownOpen ? '▲' : '▼';
    });

    // called from fileTransfer.js
    // files = array of File objects (initial population) or null (just update highlight)
    // activeIndex = index of currently sending file, -1 = none
    window.updateQueueDropdown = function (files, activeIndex) {
        if (files !== null) {
            _queueFiles = files;
        }

        if (!_queueFiles.length) {
            queueDropdown.style.display = 'none';
            queueDropdownBody.innerHTML = '';
            _dropdownOpen = false;
            queueDropdownBody.style.display = 'none';
            queueDropdownArrow.textContent = '▼';
            return;
        }

        // update label
        const remaining = _queueFiles.length - (activeIndex + 1);
        queueDropdownLabel.textContent = activeIndex === -1
            ? `${_queueFiles.length} file${_queueFiles.length > 1 ? 's' : ''} queued`
            : `Sending ${activeIndex + 1} of ${_queueFiles.length}`;

        queueDropdown.style.display = 'block';

        // rebuild list
        queueDropdownBody.innerHTML = _queueFiles.map((f, i) => {
            let stateClass = 'queue-item-pending';
            let stateLabel = 'queued';
            let stateIcon = '○';

            if (i < activeIndex) {
                stateClass = 'queue-item-done';
                stateLabel = 'sent';
                stateIcon = '✓';
            } else if (i === activeIndex) {
                stateClass = 'queue-item-active';
                stateLabel = 'sending…';
                stateIcon = '▶';
            }

            return `
            <div class="queue-item ${stateClass}">
                <span class="queue-item-icon">${stateIcon}</span>
                <span class="queue-item-name">${f.name}</span>
                <span class="queue-item-label">${stateLabel}</span>
            </div>
        `;
        }).join('');
    };

})();