/**
 * Game 1: Khám Răng Cá Sấu (Crocodile Dentist) - Phiên Bản 2 Hàm Răng Tùy Chỉnh Răng Sâu
 * Mechanics:
 * - Cá sấu to vừa vặn toàn màn hình điện thoại
 * - 2 HÀM RĂNG ĐỀU NHẤN ĐƯỢC (Hàm trên + Hàm dưới)
 * - TỰ THIẾT LẬP SỐ LƯỢNG RĂNG SÂU: 1, 2, 3, 4, 5, ... răng sâu mỗi ván
 * - Chế độ "Mở hàm chơi tiếp" để nhiều người cùng tham gia một ván
 * - Hỗ trợ chạm cảm ứng tức thì (pointerdown, touchstart, click) không độ trễ
 */

class CrocodileGame {
    constructor() {
        this.container = document.getElementById("crocodile-game-container");
        
        // Cấu hình lưu trữ
        this.totalTeeth = this.loadStoredSetting(
            "croc_total_teeth",
            (value) => [12, 16, 20].includes(Number(value)) ? Number(value) : null,
            16
        );
        this.badTeethCount = this.loadStoredSetting(
            "croc_bad_teeth",
            (value) => {
                const count = Number(value);
                return Number.isInteger(count) && count >= 1 && count <= 8 && count < this.totalTeeth ? count : null;
            },
            1
        );
        this.continueMode = this.loadStoredSetting(
            "croc_continue_mode",
            (value) => ["continue", "end"].includes(value) ? value : null,
            "continue"
        ); // 'continue' hoặc 'end'
        
        // Phân bổ 2 hàm
        this.upperTeethCount = Math.floor(this.totalTeeth / 2);
        this.lowerTeethCount = Math.floor(this.totalTeeth / 2);
        
        this.badTeethIndices = new Set();
        this.foundBadTeeth = new Set();
        this.pressedTeeth = new Set();
        this.isGameOver = false;
        this.biteTimeout = null;
        this.lifecycleId = 0;
        
        this.init();
    }

    loadStoredSetting(key, sanitizer, fallback) {
        let stored;
        try {
            stored = localStorage.getItem(key);
        } catch (e) {
            return fallback;
        }
        if (stored === null) return fallback;
        const sanitized = sanitizer(stored);
        if (sanitized === null) {
            this.persistSetting(key, fallback);
            return fallback;
        }
        if (String(sanitized) !== stored) this.persistSetting(key, sanitized);
        return sanitized;
    }

    persistSetting(key, value) {
        try {
            localStorage.setItem(key, String(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    init() {
        this.render();
        this.initSettingsModalUI();
        this.resetGame();
    }

    renderArt(key) {
        // Static mirror of the approved manifest, verified by the art-pack test.
        // No async loader, layout measurement, gameplay state or storage owner.
        const assets = {
            upperHead: ['01-upper-head.webp', 1024, 448, 0.4997160704145372, 0.6900129701686122],
            mouthCavity: ['02-mouth-cavity.webp', 1024, 392, 0.49974502804691484, 0.4993342210386152],
            tongue: ['03-tongue.webp', 768, 427, 0.49957228400342174, 0.5215384615384615],
            upperGum: ['04-upper-gum.webp', 1024, 171, 0.49976213130352043, 0.6657142857142857],
            lowerGum: ['05-lower-gum.webp', 1024, 150, 0.4997674418604651, 0.5666666666666667],
            lowerJawBody: ['06-lower-jaw-body.webp', 1024, 339, 0.5007915567282322, 0.5796178343949044],
            paws: ['07-paws.webp', 1024, 223, 0.4997629208155524, 0.9456521739130435]
        };
        const [src, width, height, anchorX, anchorY] = assets[key];
        return `<img class="croc-production-art croc-art-${key}" src="assets/art/crocodile-game/${src}" width="${width}" height="${height}" alt="" aria-hidden="true" draggable="false" style="--art-anchor-x:${anchorX * 100}%;--art-anchor-y:${anchorY * 100}%">`;
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="game-header croc-local-header">
                <button class="back-btn" onclick="window.app.navigate('home')">
                    <svg class="ui-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#back"></use></svg> Quay lại
                </button>
                <div class="game-title-wrap">
                    <div class="game-title-kicker"><svg class="game-title-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#crocodile"></use></svg><span>CLASSIC PICK</span></div>
                    <h2>Khám Răng Cá Sấu</h2>
                    <p class="game-subtitle">2 hàm răng - Tùy chỉnh răng sâu</p>
                </div>
                <div class="croc-guide-slot"></div>
            </div>

            <div class="crocodile-stage">
                <!-- Front-facing from first paint. Decorations never move the tooth hitboxes. -->
                <div id="croc-character" class="croc-box croc-rig croc-rig--production">
                    <div class="croc-rig__shadow" aria-hidden="true"></div>
                    <div class="croc-rig__spines" aria-hidden="true"><i></i><i></i><i></i></div>
                    <div class="croc-rig__body" aria-hidden="true"></div>
                    <div class="croc-mouth-cavity croc-rig__mouth-cavity" aria-hidden="true">
                        ${this.renderArt('mouthCavity')}
                        <div class="croc-throat-depth"></div>
                        <div class="croc-tongue croc-rig__tongue">${this.renderArt('tongue')}</div>
                    </div>
                    <div id="croc-upper-jaw" class="croc-upper-jaw croc-rig__upper-head">
                        ${this.renderArt('upperHead')}
                        <div class="croc-eyes croc-rig__eyes" aria-hidden="true">
                            <div class="croc-eye left-eye"><div class="pupil croc-rig__pupils"></div><div class="eye-shine"></div></div>
                            <div class="croc-eye right-eye"><div class="pupil croc-rig__pupils"></div><div class="eye-shine"></div></div>
                        </div>
                        <div class="croc-snout" aria-hidden="true"><div class="nostril left-nostril"></div><div class="nostril right-nostril"></div></div>
                        <div class="upper-gum-bar croc-rig__upper-gum">
                            ${this.renderArt('upperGum')}
                            <div id="croc-upper-teeth-container" class="croc-teeth-row upper-teeth-row croc-rig__upper-teeth"></div>
                        </div>
                    </div>
                    <div id="croc-lower-jaw" class="croc-lower-jaw croc-rig__lower-jaw">
                        ${this.renderArt('lowerJawBody')}
                        <div class="lower-gum-bar croc-rig__lower-gum">
                            ${this.renderArt('lowerGum')}
                            <div id="croc-lower-teeth-container" class="croc-teeth-row lower-teeth-row croc-rig__lower-teeth"></div>
                        </div>
                        <div class="croc-chin" aria-hidden="true"></div>
                    </div>
                    <div class="croc-rig__front-paws" aria-hidden="true">${this.renderArt('paws')}<span><i></i><i></i><i></i></span><span><i></i><i></i><i></i></span></div>
                    <div class="croc-rig__fx" aria-hidden="true"></div>
                </div>
                <div class="croc-config-panel">
                <!-- Quick Bad Teeth Selector Bar -->
                <div class="croc-quick-bar">
                    <span class="quick-bar-label">Số răng sâu:</span>
                    <div class="bad-teeth-pills" id="bad-teeth-pills">
                        <button class="pill-btn ${this.badTeethCount === 1 ? 'active' : ''}" onclick="window.crocodileGame.setBadTeethCount(1)">1</button>
                        <button class="pill-btn ${this.badTeethCount === 2 ? 'active' : ''}" onclick="window.crocodileGame.setBadTeethCount(2)">2</button>
                        <button class="pill-btn ${this.badTeethCount === 3 ? 'active' : ''}" onclick="window.crocodileGame.setBadTeethCount(3)">3</button>
                        <button class="pill-btn ${this.badTeethCount === 4 ? 'active' : ''}" onclick="window.crocodileGame.setBadTeethCount(4)">4</button>
                        <button class="pill-btn ${this.badTeethCount === 5 ? 'active' : ''}" onclick="window.crocodileGame.setBadTeethCount(5)">5</button>
                        <button class="pill-btn-more" onclick="window.crocodileGame.openSettingsModal()" title="Tùy chọn khác">
                            ${this.badTeethCount > 5 ? this.badTeethCount + '+' : 'Thêm'}
                        </button>
                    </div>
                </div>

                <!-- Status Banner -->
                <div id="croc-status" class="croc-status-banner" role="status" aria-live="polite">
                    Có ${this.badTeethCount} răng sâu. Lần lượt chọn một răng ở hai hàm.
                </div>

                <div class="phase-b-stage-badge croc-hero-mark" aria-hidden="true">
                    <svg class="phase-b-stage-icon"><use href="assets/icons/game-icons.svg#crocodile"></use></svg>
                    <span>CHẠM RĂNG · NÉ RĂNG SÂU</span>
                </div>

                <!-- Control actions & Counter -->
                <div class="croc-controls">
                    <div class="turn-counter">
                        Đã khám: <span id="teeth-pressed-count" class="counter-highlight">0</span>/${this.totalTeeth} răng | 
                        Răng sâu: <span id="bad-teeth-found-count" class="counter-bad-highlight">0</span>/<span id="bad-teeth-total-count">${this.badTeethCount}</span>
                    </div>
                </div>
                <div class="croc-secondary-actions">
                    <button class="action-btn-small" onclick="window.crocodileGame.openSettingsModal()">Cài đặt</button>
                    <button class="action-btn-small" onclick="window.crocodileGame.resetGame()">Ván mới</button>
                </div>
                </div>
            </div>
        `;
    }

    setBadTeethCount(count) {
        count = Number(count);
        if (!Number.isInteger(count) || count < 1 || count > 8 || count >= this.totalTeeth) return false;
        if (count === this.badTeethCount) return false;
        this.badTeethCount = count;
        this.persistSetting("croc_bad_teeth", count);
        window.soundEngine.playClick();
        
        this.updatePillUI();
        this.resetGame();
        return true;
    }

    setTotalTeeth(count) {
        count = Number(count);
        if (![12, 16, 20].includes(count) || count === this.totalTeeth) return false;
        this.totalTeeth = count;
        this.upperTeethCount = Math.floor(count / 2);
        this.lowerTeethCount = Math.floor(count / 2);
        
        // Giới hạn răng sâu không vượt quá tổng số răng - 1
        if (this.badTeethCount >= this.totalTeeth) {
            this.badTeethCount = Math.max(1, this.totalTeeth - 2);
            this.persistSetting("croc_bad_teeth", this.badTeethCount);
        }
        
        this.persistSetting("croc_total_teeth", count);
        window.soundEngine.playClick();
        
        this.render();
        this.initSettingsModalUI();
        this.resetGame();
        return true;
    }

    setContinueMode(mode) {
        if (!["continue", "end"].includes(mode) || mode === this.continueMode) return false;
        this.continueMode = mode;
        this.persistSetting("croc_continue_mode", mode);
        window.soundEngine.playClick();
        return true;
    }

    updatePillUI() {
        const pillsContainer = document.getElementById("bad-teeth-pills");
        if (pillsContainer) {
            const btns = pillsContainer.querySelectorAll(".pill-btn");
            btns.forEach((btn, idx) => {
                const val = idx + 1;
                if (val === this.badTeethCount) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
            const moreBtn = pillsContainer.querySelector(".pill-btn-more");
            if (moreBtn) {
                moreBtn.innerText = this.badTeethCount > 5 ? `${this.badTeethCount}+` : 'Thêm';
            }
        }
    }

    openSettingsModal() {
        window.soundEngine.playClick();
        this.initSettingsModalUI();
        window.app.openModal("croc-settings-modal");
    }

    initSettingsModalUI() {
        // Cập nhật nhãn răng sâu trong modal
        const badCountBadge = document.getElementById("modal-bad-count-badge");
        if (badCountBadge) badCountBadge.innerText = `${this.badTeethCount} răng`;

        const totalTeethBadge = document.getElementById("modal-total-teeth-badge");
        if (totalTeethBadge) totalTeethBadge.innerText = `${this.totalTeeth} răng`;

        // Tạo các nút chọn răng sâu (1 đến 8)
        const badSelector = document.getElementById("modal-bad-teeth-selector");
        if (badSelector) {
            badSelector.innerHTML = "";
            const maxBad = Math.min(8, this.totalTeeth - 1);
            for (let i = 1; i <= maxBad; i++) {
                const btn = document.createElement("button");
                btn.className = `pill-btn ${i === this.badTeethCount ? 'active' : ''}`;
                btn.style.width = "38px";
                btn.style.height = "34px";
                btn.style.fontSize = "14px";
                btn.innerText = i;
                btn.onclick = () => {
                    this.setBadTeethCount(i);
                    this.initSettingsModalUI();
                };
                badSelector.appendChild(btn);
            }
        }

        // Tạo các nút chọn tổng số răng (12, 16, 20)
        const totalSelector = document.getElementById("modal-total-teeth-selector");
        if (totalSelector) {
            const teethOptions = [
                { count: 12, label: "12 Răng", sub: "6 trên / 6 dưới" },
                { count: 16, label: "16 Răng", sub: "8 trên / 8 dưới (Chuẩn)" },
                { count: 20, label: "20 Răng", sub: "10 trên / 10 dưới" }
            ];
            totalSelector.innerHTML = "";
            teethOptions.forEach(opt => {
                const btn = document.createElement("button");
                btn.className = `option-pill ${opt.count === this.totalTeeth ? 'active' : ''}`;
                btn.innerHTML = `<strong>${opt.label}</strong><br><small style="font-size: 10px; opacity: 0.8;">${opt.sub}</small>`;
                btn.onclick = () => {
                    this.setTotalTeeth(opt.count);
                    this.initSettingsModalUI();
                };
                totalSelector.appendChild(btn);
            });
        }

        // Cập nhật radio mode
        const radioInputs = document.querySelectorAll("input[name='croc-continue-mode']");
        radioInputs.forEach(r => {
            r.checked = (r.value === this.continueMode);
        });
    }

    resetGame() {
        this.cancelPendingBite();
        this.isGameOver = false;
        this.pressedTeeth.clear();
        this.foundBadTeeth.clear();
        this.badTeethIndices.clear();

        // Chọn ngẫu nhiên N chiếc răng sâu độc nhất
        const maxBad = Math.min(this.badTeethCount, this.totalTeeth - 1);
        while (this.badTeethIndices.size < maxBad) {
            const rand = Math.floor(Math.random() * this.totalTeeth);
            this.badTeethIndices.add(rand);
        }

        const character = document.getElementById("croc-character");
        const statusEl = document.getElementById("croc-status");

        if (character) {
            character.classList.remove("snapped", "bite-danger");
        }
        if (statusEl) {
            statusEl.className = "croc-status-banner";
            statusEl.innerText = `Có ${this.badTeethIndices.size} răng sâu bí mật! Lần lượt ấn từng răng!`;
        }

        this.updateCounter();
        this.updatePillUI();
        this.generateTeeth();
    }

    updateCounter() {
        const countEl = document.getElementById("teeth-pressed-count");
        const badCountEl = document.getElementById("bad-teeth-found-count");
        const badTotalEl = document.getElementById("bad-teeth-total-count");
        if (countEl) countEl.innerText = this.pressedTeeth.size;
        if (badCountEl) badCountEl.innerText = `${this.foundBadTeeth.size}`;
        if (badTotalEl) badTotalEl.innerText = `${this.badTeethCount}`;
    }

    generateTeeth() {
        const upperContainer = document.getElementById("croc-upper-teeth-container");
        const lowerContainer = document.getElementById("croc-lower-teeth-container");

        // High-Performance Optimization: If teeth DOM already exists and matches counts, just reset state!
        if (upperContainer && lowerContainer) {
            const existingTeeth = document.querySelectorAll(".croc-tooth-btn");
            if (existingTeeth.length === this.totalTeeth && 
                upperContainer.children.length === this.upperTeethCount && 
                lowerContainer.children.length === this.lowerTeethCount) {
                existingTeeth.forEach(t => {
                    t.classList.remove("pressed", "bad-tooth");
                    t.disabled = false;
                });
                return;
            }
        }

        if (upperContainer) upperContainer.innerHTML = "";
        if (lowerContainer) lowerContainer.innerHTML = "";

        // 1. TẠO HÀM TRÊN: Răng chỉa xuống (Chỉ số 0 đến upperTeethCount - 1)
        for (let i = 0; i < this.upperTeethCount; i++) {
            const tooth = this.createToothElement(i, "upper");
            if (upperContainer) upperContainer.appendChild(tooth);
        }

        // 2. TẠO HÀM DƯỚI: Răng chỉa lên (Chỉ số upperTeethCount đến totalTeeth - 1)
        for (let j = 0; j < this.lowerTeethCount; j++) {
            const index = this.upperTeethCount + j;
            const tooth = this.createToothElement(index, "lower");
            if (lowerContainer) lowerContainer.appendChild(tooth);
        }
    }

    createToothElement(index, jawType) {
        const btn = document.createElement("button");
        btn.className = `croc-tooth-btn tooth-${jawType}`;
        btn.id = `croc-tooth-${index}`;
        btn.setAttribute("type", "button");
        const localIndex = jawType === "upper" ? index : index - this.upperTeethCount;
        const jawCount = jawType === "upper" ? this.upperTeethCount : this.lowerTeethCount;
        const offset = (localIndex - (jawCount - 1) / 2) / ((jawCount - 1) / 2);
        btn.setAttribute("aria-label", `Răng ${jawType === 'upper' ? 'trên' : 'dưới'} số ${localIndex + 1}`);
        // Presentation only: symmetric shallow arc; transform the button and its art together.
        btn.style.setProperty("--tooth-arc", `${(offset * offset * 9).toFixed(2)}px`);
        btn.style.setProperty("--tooth-angle", `${(offset * (jawType === "upper" ? -8 : 8)).toFixed(2)}deg`);
        btn.style.setProperty("--tooth-scale", (1 - Math.abs(offset) * 0.12).toFixed(2));

        // HTML cấu trúc răng 3D (Cap và Root)
        if (jawType === "upper") {
            btn.innerHTML = `
                <div class="tooth-touch-target">
                    <div class="tooth-root root-upper"></div>
                    <div class="tooth-cap cap-upper"></div>
                </div>
            `;
        } else {
            btn.innerHTML = `
                <div class="tooth-touch-target">
                    <div class="tooth-cap cap-lower"></div>
                    <div class="tooth-root root-lower"></div>
                </div>
            `;
        }

        // Xử lý sự kiện cảm ứng đa nền tảng tức thì (pointerdown, touchstart, click)
        let lastHandledAt = 0;
        const triggerTouch = (e) => {
            const now = Date.now();
            if (now - lastHandledAt < 350 || this.isGameOver || this.pressedTeeth.has(index)) return;
            lastHandledAt = now;

            if (e && e.cancelable) {
                e.preventDefault();
            }
            if (e) {
                e.stopPropagation();
            }
            this.handleToothClick(index, btn, jawType);
        };

        btn.addEventListener("pointerdown", triggerTouch, { passive: false });
        btn.addEventListener("touchstart", triggerTouch, { passive: false });
        btn.addEventListener("click", triggerTouch);

        return btn;
    }

    handleToothClick(index, toothElement, jawType) {
        if (this.isGameOver || this.pressedTeeth.has(index)) return;

        // Đánh dấu răng đã ấn
        this.pressedTeeth.add(index);
        toothElement.classList.add("pressed");
        toothElement.disabled = true;

        this.updateCounter();

        if (this.badTeethIndices.has(index)) {
            // CÁ SẤU CẮN!
            this.foundBadTeeth.add(index);
            this.triggerBite(toothElement, index);
        } else {
            // RĂNG AN TOÀN
            window.soundEngine.playToothSafe();
            window.soundEngine.vibrate([40]);

            const statusEl = document.getElementById("croc-status");
            if (statusEl) {
                const jawName = jawType === "upper" ? "hàm trên" : "hàm dưới";
                const remainingBad = this.badTeethIndices.size - this.foundBadTeeth.size;
                const safeQuotes = [
                    `Răng ${jawName} an toàn. Còn ${remainingBad} răng sâu.`,
                    `An toàn. Mời người tiếp theo chọn răng.`,
                    `Chưa bị cắn. Còn ${remainingBad} răng sâu.`,
                    `Đến lượt người chơi kế tiếp.`
                ];
                statusEl.innerText = safeQuotes[Math.floor(Math.random() * safeQuotes.length)];
                statusEl.className = "croc-status-banner safe-flash";
            }
        }
    }

    triggerBite(badToothEl, index) {
        badToothEl.classList.add("bad-tooth");

        const character = document.getElementById("croc-character");
        const statusEl = document.getElementById("croc-status");

        if (character) {
            character.classList.add("snapped", "bite-danger");
        }

        // TRIGGER EPIC CHOMP FX (Blood-red hazard strobe + claw slash + tooth splinters + comic badge)
        window.app.triggerEpicChompFX();

        // Âm thanh đớp gầm và rung giật phần cứng cực mạnh
        window.soundEngine.playCrocodileChomp();

        const remaining = this.badTeethIndices.size - this.foundBadTeeth.size;

        if (statusEl) {
            if (remaining > 0 && this.continueMode === "continue") {
                statusEl.innerText = `Cá sấu đã cắn. Còn ${remaining} răng sâu.`;
            } else {
                statusEl.innerText = "Cá sấu đã cắn. Xem kết quả lượt này.";
            }
            statusEl.className = "croc-status-banner danger-flash";
        }

        this.updateCounter();

        // Hiện án phạt sau khi hiệu ứng sập hàm hoành tráng hoàn tất
        const lifecycleId = this.lifecycleId;
        this.biteTimeout = setTimeout(() => {
            this.biteTimeout = null;
            if (lifecycleId !== this.lifecycleId) return;
            const penalty = window.penaltyManager.getRandomPenalty();
            
            if (remaining > 0 && this.continueMode === "continue") {
                // Vẫn còn răng sâu -> Cung cấp lựa chọn mở hàm chơi tiếp
                window.app.showPenaltyModal({
                    title: "Cá sấu đã cắn",
                    subtitle: `Đã tìm thấy ${this.foundBadTeeth.size}/${this.badTeethIndices.size} răng sâu; còn ${remaining} răng:`,
                    penalty: penalty,
                    historyEvent: {
                        type: "penalty",
                        gameId: "crocodile",
                        label: penalty.text,
                        detail: { category: penalty.type || "drink", toothIndex: index },
                        dedupeKey: `crocodile:${lifecycleId}:tooth:${index}:result`
                    },
                    customActions: `
                        <div style="display: flex; gap: 8px; width: 100%;">
                            <button class="neon-button" style="background: linear-gradient(135deg, #00b09b, #96c93d); flex: 1.2; font-size: 13px;" onclick="window.crocodileGame.reopenJaw()">
                        Mở Hàm Chơi Tiếp (${remaining} răng)
                            </button>
                            <button class="neon-button secondary-btn" style="flex: 0.8; font-size: 13px;" onclick="window.app.closePenaltyModal(); window.crocodileGame.resetGame();">
                                Ván Mới
                            </button>
                        </div>
                    `,
                    onClose: () => {}
                });
            } else {
                // Đã hết răng sâu hoặc chế độ cắn 1 phát hết ván
                this.isGameOver = true;
                window.app.showPenaltyModal({
                    title: "Cá sấu đã cắn",
                    subtitle: this.badTeethIndices.size > 1 
                        ? `Đã tìm thấy đủ ${this.badTeethIndices.size} răng sâu. Ván chơi kết thúc:`
                        : "Kết quả lượt này:",
                    penalty: penalty,
                    historyEvent: {
                        type: "penalty",
                        gameId: "crocodile",
                        label: penalty.text,
                        detail: { category: penalty.type || "drink", toothIndex: index },
                        dedupeKey: `crocodile:${lifecycleId}:tooth:${index}:result`
                    },
                    customActions: `
                        <button class="neon-button primary-btn" onclick="window.app.closePenaltyModal(); window.crocodileGame.resetGame();">
                            BẮT ĐẦU VÁN MỚI
                        </button>
                    `,
                    onClose: () => {}
                });
            }
        }, 750);
    }

    cancelPendingBite() {
        this.lifecycleId += 1;
        if (this.biteTimeout !== null) {
            clearTimeout(this.biteTimeout);
            this.biteTimeout = null;
        }
    }

    stop() {
        this.cancelPendingBite();
        document.getElementById("croc-character")?.classList.remove("snapped", "bite-danger");
        document.getElementById("croc-status")?.classList.remove("danger-flash", "safe-flash");
    }

    reopenJaw() {
        window.app.closePenaltyModal();
        
        const character = document.getElementById("croc-character");
        if (character) {
            character.classList.remove("snapped", "bite-danger");
        }
        
        // Âm thanh mở khớp hàm cá sấu
        window.soundEngine.playJawOpen();
        window.soundEngine.vibrate([60]);

        const remaining = this.badTeethIndices.size - this.foundBadTeeth.size;
        const statusEl = document.getElementById("croc-status");
        if (statusEl) {
            statusEl.className = "croc-status-banner safe-flash";
            statusEl.innerText = `Đã mở lại hàm. Còn ${remaining} răng sâu; mời người tiếp theo.`;
        }

        this.updateCounter();
    }
}
