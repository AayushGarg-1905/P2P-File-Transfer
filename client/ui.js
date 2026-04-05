// ui.js

(function () {
    setInterval(() => {
        const sBar = document.getElementById('senderProgressBar');
        const rBar = document.getElementById('receiverProgressBar');
        const sBarA = document.getElementById('senderProgressBarAnswerer');

        if (sBar && sBar.value > 0) {
            document.getElementById('senderFill').style.width = sBar.value + '%';
        }
        if (rBar && rBar.value > 0) {
            document.getElementById('receiverFill').style.width = rBar.value + '%';
        }
        if (sBarA && sBarA.value > 0) {
            document.getElementById('senderFillAnswerer').style.width = sBarA.value + '%';
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

    // Queue dropdown setup - extract shared logic
    const queueConfig = {
        offerer: {
            dropdown: document.getElementById('queueDropdown'),
            toggle: document.getElementById('queueDropdownToggle'),
            body: document.getElementById('queueDropdownBody'),
            label: document.getElementById('queueDropdownLabel'),
            arrow: document.getElementById('queueDropdownArrow'),
            files: [],
            isOpen: false
        },
        answerer: {
            dropdown: document.getElementById('queueDropdownAnswerer'),
            toggle: document.getElementById('queueDropdownToggleAnswerer'),
            body: document.getElementById('queueDropdownBodyAnswerer'),
            label: document.getElementById('queueDropdownLabelAnswerer'),
            arrow: document.getElementById('queueDropdownArrowAnswerer'),
            files: [],
            isOpen: false
        }
    };

    // Initialize queue dropdowns
    function createQueueDropdown(role) {
        const cfg = queueConfig[role];
        cfg.toggle.addEventListener('click', () => {
            cfg.isOpen = !cfg.isOpen;
            cfg.body.style.display = cfg.isOpen ? 'block' : 'none';
            cfg.arrow.textContent = cfg.isOpen ? '▲' : '▼';
        });

        return function updateQueueDropdown(files, activeIndex) {
            if (files !== null) cfg.files = files;

            if (!cfg.files.length) {
                cfg.dropdown.style.display = 'none';
                cfg.body.innerHTML = '';
                cfg.isOpen = false;
                cfg.body.style.display = 'none';
                cfg.arrow.textContent = '▼';
                return;
            }

            cfg.label.textContent = activeIndex === -1
                ? `${cfg.files.length} file${cfg.files.length > 1 ? 's' : ''} queued`
                : `Sending ${activeIndex + 1} of ${cfg.files.length}`;

            cfg.dropdown.style.display = 'block';

            cfg.body.innerHTML = cfg.files.map((f, i) => {
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
            </div>`;
            }).join('');
        };
    }

    window.updateQueueDropdown = createQueueDropdown('offerer');
    window.updateQueueDropdownAnswerer = createQueueDropdown('answerer');

    window.onDataChannelOpen = function () {
        if (!_isCreator) {
            document.getElementById('alsoSendWrap').style.display = 'block';
        }
    };

    
    const toggleAnswererSendBtn = document.getElementById('toggleAnswererSendBtn');
    const answererSenderCard = document.getElementById('answererSenderCard');

    toggleAnswererSendBtn.addEventListener('click', () => {
        const visible = answererSenderCard.style.display !== 'none';
        answererSenderCard.style.display = visible ? 'none' : 'block';
        toggleAnswererSendBtn.textContent = visible ? '⬆  Also Send Files' : '✕  Hide Send Panel';
    });

    
    window.updateSendBtnState = function () {
        const warning = document.getElementById('peerTransferWarning');
        const btn = document.getElementById('sendFileBtnAnswerer');
        if (!warning || !btn) return;

        if (window.peerIsTransferring) {
            warning.style.display = 'block';
            btn.disabled = true;
        } else {
            warning.style.display = 'none';
            btn.disabled = Array.from(
                document.getElementById('fileInputAnswerer')?.files || []
            ).length === 0;
        }
    };

    
    const fileInputAnswerer = document.getElementById('fileInputAnswerer');
    const selectedFileNameAnswerer = document.getElementById('selectedFileNameAnswerer');
    const sendFileBtnAnswerer = document.getElementById('sendFileBtnAnswerer');

    fileInputAnswerer.addEventListener('change', function () {
        const files = Array.from(this.files);
        if (!files.length) {
            selectedFileNameAnswerer.textContent = '';
            sendFileBtnAnswerer.disabled = true;
            return;
        }
        selectedFileNameAnswerer.textContent = files.length === 1
            ? files[0].name
            : `${files.length} files selected`;
        sendFileBtnAnswerer.disabled = window.peerIsTransferring || false;
    });

    sendFileBtnAnswerer.addEventListener('click', function () {
        document.getElementById('senderProgressBlockAnswerer').style.display = 'flex';
    }, true);

    
    const toggleTextBtnAnswerer = document.getElementById('toggleTextBtnAnswerer');
    const textPanelAnswerer = document.getElementById('textPanelAnswerer');

    toggleTextBtnAnswerer.addEventListener('click', () => {
        const isVisible = textPanelAnswerer.style.display !== 'none';
        textPanelAnswerer.style.display = isVisible ? 'none' : 'block';
        toggleTextBtnAnswerer.textContent = isVisible ? '⌨  Share Text' : '✕  Close Text';
    });

    
    const dzAnswerer = document.getElementById('dropZoneAnswerer');
    let dragCounterAnswerer = 0;

    dzAnswerer.addEventListener('dragover', (e) => {
        e.preventDefault();
        dzAnswerer.classList.add('drag-over');
    });

    dzAnswerer.addEventListener('dragleave', () => {
        dzAnswerer.classList.remove('drag-over');
    });

    dzAnswerer.addEventListener('drop', (e) => {
        e.preventDefault();
        dzAnswerer.classList.remove('drag-over');
        dragCounterAnswerer = 0;
        if (e.dataTransfer.files.length) {
            fileInputAnswerer.files = e.dataTransfer.files;
            fileInputAnswerer.dispatchEvent(new Event('change'));
        }
    });

})();