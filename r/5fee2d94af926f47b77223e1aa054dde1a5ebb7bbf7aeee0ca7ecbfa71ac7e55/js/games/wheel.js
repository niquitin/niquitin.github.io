/**
 * Game 2: Vòng Quay May Mắn (Party Lucky Wheel)
 * Mechanics:
 * - HTML5 Canvas 2D with smooth 60fps physics-based rotation & inertia deceleration
 * - Audio click ticking as each slice crosses the needle indicator
 * - Needle bounce animation
 * - Custom slice configuration (editable by user)
 */

class WheelGame {
    constructor() {
        this.container = document.getElementById("wheel-game-container");
        this.canvas = null;
        this.ctx = null;
        this.slices = [];
        this.currentAngle = 0;
        this.angularVelocity = 0;
        this.friction = 0.985;
        this.isSpinning = false;
        this.lastTickAngle = 0;
        this.rafId = null;
        this.resultTimeout = null;
        this.spinDeadlineTimeout = null;
        this.spinStartedAt = null;
        this.spinStep = 0;
        this.spinTotalSteps = 0;
        this.spinReducedMotion = false;
        this.runId = 0;
        this.init();
    }

    init() {
        this.render();
        this.canvas = document.getElementById("wheel-canvas");
        if (this.canvas) {
            this.ctx = this.canvas.getContext("2d");
            this.setupCanvas();
            this.slices = window.penaltyManager.getActiveWheelSlices();
            this.renderWheelModeUI();
            this.drawWheel();
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="game-header">
                <button class="back-btn" onclick="window.app.navigate('home')">
                    <svg class="ui-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#back"></use></svg> Quay lại
                </button>
                <div class="game-title-wrap">
                    <div class="game-title-kicker"><svg class="game-title-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#wheel"></use></svg><span>BAR ROULETTE</span></div>
                    <h2>Vòng Quay May Mắn</h2>
                    <p class="game-subtitle">Quay để chọn một kết quả bất ngờ.</p>
                </div>
                <button class="action-btn-small" onclick="window.wheelGame.openWheelEditor()">
                    Tùy Chỉnh
                </button>
            </div>

            <div class="wheel-mode-selector" id="wheel-mode-selector" role="group" aria-label="Vòng Quay May Mắn">
                <button type="button" data-mode="base12" onclick="window.wheelGame.setMode('base12')">Gốc 12</button>
                <button type="button" data-mode="expanded12" onclick="window.wheelGame.setMode('expanded12')">Mở rộng 12</button>
                <button type="button" data-mode="all18" onclick="window.wheelGame.setMode('all18')">Tất cả 18</button>
                <button type="button" data-mode="custom" onclick="window.wheelGame.setMode('custom')">Tùy Chỉnh</button>
            </div>
            <div class="wheel-stage">
                <div class="phase-b-stage-badge wheel-hero-mark" aria-hidden="true">
                    <svg class="phase-b-stage-icon"><use href="assets/icons/game-icons.svg#wheel"></use></svg>
                    <span>VUỐT HOẶC CHẠM · ĐỂ VẬN MAY CHỌN</span>
                </div>
                <!-- Pointer indicator with jeweled pin -->
                <div class="wheel-pointer-container">
                    <div class="wheel-needle-pin"></div>
                    <div id="wheel-pointer" class="wheel-needle"></div>
                </div>

                <!-- Interactive Wheel Canvas -->
                <div class="canvas-wrapper">
                    <canvas id="wheel-canvas" width="400" height="400"></canvas>
                    <button id="wheel-center-btn" class="wheel-center-btn" onclick="window.wheelGame.spin()">
                        <svg class="center-btn-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#target"></use></svg>
                        <span class="center-btn-text">QUAY</span>
                    </button>
                </div>

                <ol id="wheel-mode-legend" class="wheel-mode-legend" hidden></ol>

                <!-- Spin controls -->
                <div class="wheel-controls">
                    <button id="spin-btn" class="neon-button primary-btn" onclick="window.wheelGame.spin()">
                        <svg class="cta-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#target"></use></svg> QUAY NGAY
                    </button>
                </div>
            </div>
        `;
    }

    setMode(mode) {
        return window.penaltyManager.chooseWheelMode(mode);
    }

    renderWheelModeUI() {
        const mode = window.penaltyManager.wheelMode;
        const selector = document.getElementById("wheel-mode-selector");
        if (selector) selector.querySelectorAll("button[data-mode]").forEach((button) => {
            const selected = button.dataset.mode === mode;
            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", String(selected));
            button.disabled = this.isSpinning || this.resultTimeout !== null;
        });
        const legend = document.getElementById("wheel-mode-legend");
        if (!legend) return;
        const numbered = mode === "expanded12" || mode === "all18";
        legend.hidden = !numbered;
        legend.replaceChildren();
        if (!numbered) return;
        this.slices.forEach((slice, i) => {
            const row = document.createElement("li");
            row.textContent = String(i + 1).padStart(2, "0") + " — " + slice.text;
            legend.appendChild(row);
        });
    }

    setupCanvas() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        // Optimal size: adapts to both width and available screen height
        const availableHeight = Math.floor((window.innerHeight || 600) * 0.52);
        const availableWidth = Math.floor((window.innerWidth || 360) - 20);
        const size = Math.round(Math.min(410, Math.max(320, Math.min(availableWidth, availableHeight))));
        
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
        this.ctx.scale(dpr, dpr);
        this.size = size;

        const wrapper = this.canvas.parentElement;
        if (wrapper) {
            wrapper.style.width = `${size}px`;
            wrapper.style.height = `${size}px`;
        }
    }



    drawWheel() {
        if (!this.ctx) return;
        const size = this.size;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 14;
        const numSlices = this.slices.length;
        const sliceAngle = (2 * Math.PI) / numSlices;

        this.ctx.clearRect(0, 0, size, size);

        // Draw Outer Neon Ring
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
        this.ctx.strokeStyle = "#ff007f";
        this.ctx.lineWidth = 7;
        this.ctx.shadowColor = "#ff007f";
        this.ctx.shadowBlur = 18;
        this.ctx.stroke();
        this.ctx.restore();

        // Draw Slices
        for (let i = 0; i < numSlices; i++) {
            const start = this.currentAngle + i * sliceAngle;
            const end = start + sliceAngle;
            const item = this.slices[i];

            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, start, end);
            this.ctx.closePath();

            // Alternate slice colors with sleek gradients
            this.ctx.fillStyle = item.color || (i % 2 === 0 ? "#25124d" : "#3b177d");
            this.ctx.fill();

            // Border between slices
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw Big Icon & Text along the slice bisector
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(start + sliceAngle / 2);

            // 1. BIG PROMINENT ICON (26px) near the outer rim
            const icon = item.type === 'safe' ? '✓' : item.type === 'perform' ? '♪' : item.type === 'dare' ? '?' : '●';
            this.ctx.font = "bold 26px 'Be Vietnam Pro', sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            this.ctx.shadowBlur = 6;
            this.ctx.fillText(icon, radius - 28, 0);

            // 2. CLEAR BOLD TEXT (along the slice toward center)
            const maxTextWidth = radius - 58 - 46; // Space between icon and center hub
            let fontSize = 13;
            this.ctx.font = `bold ${fontSize}px 'Be Vietnam Pro', sans-serif`;
            const sectorLabel = window.penaltyManager.wheelMode === "expanded12" || window.penaltyManager.wheelMode === "all18"
                ? String(i + 1).padStart(2, "0") : item.text;
            let textWidth = this.ctx.measureText(sectorLabel).width;
            if (textWidth > maxTextWidth) {
                fontSize = Math.max(10, Math.floor(fontSize * (maxTextWidth / textWidth)));
                this.ctx.font = `bold ${fontSize}px 'Be Vietnam Pro', sans-serif`;
            }
            this.ctx.textAlign = "right";
            this.ctx.textBaseline = "middle";
            this.ctx.fillStyle = "#ffffff";
            this.ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            this.ctx.shadowBlur = 5;
            this.ctx.fillText(sectorLabel, radius - 52, 0);

            this.ctx.restore();
        }

        // Draw Gold Casino Bulbs around the wheel rim
        for (let i = 0; i < numSlices; i++) {
            const pegAngle = this.currentAngle + i * sliceAngle;
            const px = centerX + (radius + 2) * Math.cos(pegAngle);
            const py = centerY + (radius + 2) * Math.sin(pegAngle);

            // Outer golden bulb
            this.ctx.beginPath();
            this.ctx.arc(px, py, 5, 0, 2 * Math.PI);
            this.ctx.fillStyle = "#ffd700";
            this.ctx.shadowColor = "#ffaa00";
            this.ctx.shadowBlur = 8;
            this.ctx.fill();

            // Inner bulb highlight shine
            this.ctx.beginPath();
            this.ctx.arc(px - 1, py - 1, 1.8, 0, 2 * Math.PI);
            this.ctx.fillStyle = "#ffffff";
            this.ctx.fill();
        }
    }

    spin() {
        if (this.isSpinning || this.resultTimeout !== null) return;
        const runId = ++this.runId;
        this.isSpinning = true;
        this.renderWheelModeUI();

        const spinBtn = document.getElementById("spin-btn");
        if (spinBtn) spinBtn.disabled = true;

        // Keep the existing single random impulse and legacy per-step physics.
        this.angularVelocity = 0.35 + Math.random() * 0.25;
        this.spinStartedAt = performance.now();
        this.spinStep = 0;
        this.spinTotalSteps = this.getSpinStepCount(this.angularVelocity);
        this.spinReducedMotion = Boolean(
            window.matchMedia
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
        this.spinDeadlineTimeout = setTimeout(() => this.finishSpinAtDeadline(runId), 8000);
        this.animate(runId, this.spinStartedAt);
    }

    getSpinStepCount(initialVelocity) {
        let velocity = initialVelocity;
        let steps = 0;
        do {
            velocity *= this.friction;
            steps += 1;
        } while (velocity > 0.002);
        return steps;
    }

    advanceSpinToStep(targetStep) {
        const cappedTarget = Math.min(this.spinTotalSteps, Math.max(this.spinStep, targetStep));
        while (this.spinStep < cappedTarget) {
            this.currentAngle += this.angularVelocity;
            this.angularVelocity *= this.friction;
            this.spinStep += 1;
        }
    }

    renderSpinFrame() {
        // A dropped frame may cross many slices; emit at most one tick for this rendered frame.
        const numSlices = this.slices.length;
        const sliceAngle = (2 * Math.PI) / numSlices;
        const currentSliceIndex = Math.floor(
            ((this.currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / sliceAngle
        );

        if (currentSliceIndex !== this.lastTickIndex) {
            this.lastTickIndex = currentSliceIndex;
            window.soundEngine.playWheelTick();

            // Needle flapper jiggle
            const needle = document.getElementById("wheel-pointer");
            if (needle) {
                needle.classList.remove("flap");
                void needle.offsetWidth;
                needle.classList.add("flap");
            }
        }

        this.drawWheel();
    }

    animate(runId = this.runId, frameTime) {
        if (!this.isSpinning || runId !== this.runId) return;

        const now = Number.isFinite(frameTime) ? frameTime : performance.now();
        const elapsed = Math.max(0, now - this.spinStartedAt);
        const virtualStep = this.spinReducedMotion
            ? this.spinTotalSteps
            : Math.min(this.spinTotalSteps, 1 + Math.floor((elapsed + 0.01) / (1000 / 60)));
        this.advanceSpinToStep(virtualStep);
        this.renderSpinFrame();

        if (this.spinStep < this.spinTotalSteps) {
            this.rafId = requestAnimationFrame((nextFrameTime) => {
                this.rafId = null;
                this.animate(runId, nextFrameTime);
            });
        } else {
            this.finishSpin(runId);
        }
    }

    finishSpinAtDeadline(runId) {
        this.spinDeadlineTimeout = null;
        if (!this.isSpinning || runId !== this.runId || document.hidden) return;
        this.advanceSpinToStep(this.spinTotalSteps);
        this.renderSpinFrame();
        this.finishSpin(runId);
    }

    finishSpin(runId) {
        if (!this.isSpinning || runId !== this.runId) return false;
        this.isSpinning = false;
        this.angularVelocity = 0;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.spinDeadlineTimeout !== null) {
            clearTimeout(this.spinDeadlineTimeout);
            this.spinDeadlineTimeout = null;
        }

        const spinBtn = document.getElementById("spin-btn");
        if (spinBtn) spinBtn.disabled = false;
        this.announceResult(runId);
        return true;
    }

    announceResult(runId = this.runId) {
        if (runId !== this.runId) return;
        // Needle points at TOP (3 * PI / 2 or 270 deg)
        const numSlices = this.slices.length;
        const sliceAngle = (2 * Math.PI) / numSlices;
        const normalizedAngle = (2 * Math.PI - (this.currentAngle % (2 * Math.PI))) % (2 * Math.PI);
        const topAngle = (normalizedAngle + (3 * Math.PI) / 2) % (2 * Math.PI);
        const winningIndex = Math.floor(topAngle / sliceAngle) % numSlices;
        const winner = this.slices[winningIndex];

        window.soundEngine.playWin();

        this.renderWheelModeUI();
        this.resultTimeout = setTimeout(() => {
            this.resultTimeout = null;
            this.renderWheelModeUI();
            if (runId !== this.runId) return;
            window.app.showPenaltyModal({
                title: "Kết quả vòng quay",
                subtitle: "Ô được chọn:",
                penalty: {
                    text: winner.text,
                    badge: "Kết quả",
                    icon: winner.icon || "🍺",
                    type: winner.type || "drink"
                },
                historyEvent: {
                    type: "penalty",
                    gameId: "wheel",
                    label: winner.text,
                    detail: { category: winner.type || "drink" },
                    dedupeKey: `wheel:${runId}:result`
                }
            });
        }, 500);
    }

    stop() {
        this.runId += 1;
        this.isSpinning = false;
        this.angularVelocity = 0;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.resultTimeout !== null) {
            clearTimeout(this.resultTimeout);
            this.resultTimeout = null;
        }
        if (this.spinDeadlineTimeout !== null) {
            clearTimeout(this.spinDeadlineTimeout);
            this.spinDeadlineTimeout = null;
        }
        const spinBtn = document.getElementById("spin-btn");
        if (spinBtn) spinBtn.disabled = false;
        this.renderWheelModeUI();
    }

    resetWheelToBase() {
        if (this.isSpinning || this.resultTimeout !== null) return false;
        if (!window.confirm("Đưa Wheel về Gốc 12? Các ô tùy chỉnh vẫn được giữ lại.")) return false;
        const manager = window.penaltyManager;
        const changed = manager.wheelMode === "base12" || manager.resetWheelToBase();
        if (changed) window.app.closeModal("wheel-editor-modal");
        return changed;
    }

    deleteSavedCustomWheel() {
        if (this.isSpinning || this.resultTimeout !== null) return false;
        if (!window.confirm("Xóa các ô Wheel tùy chỉnh đã lưu? Thao tác này không thể hoàn tác.")) return false;
        const deleted = window.penaltyManager.deleteCustomWheel(true);
        if (deleted) window.app.closeModal("wheel-editor-modal");
        return deleted;
    }

    openWheelEditor() {
        if (window.penaltyManager.wheelStorageBlocked) {
            window.alert("Không thể đọc dữ liệu đã lưu. Dữ liệu cũ được giữ để khôi phục; game vẫn có thể dùng nội dung mặc định.");
            return false;
        }
        if (this.isSpinning || this.resultTimeout !== null) return false;
        if (window.penaltyManager.wheelMode !== "custom"
            && !window.penaltyManager.chooseWheelMode("custom")) return false;
        window.app.openModal("wheel-editor-modal");
        this.renderEditorList();
    }

    renderEditorList() {
        const list = document.getElementById("wheel-items-list");
        if (!list) return;
        list.innerHTML = "";

        this.slices.forEach((item, idx) => {
            const row = document.createElement("div");
            row.className = "editor-row";
            const safeText = window.partyAssets ? window.partyAssets.escape(item.text) : String(item.text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            row.innerHTML = `
                ${window.partyAssets ? window.partyAssets.icon(item.type === 'safe' ? 'safe' : item.type === 'perform' ? 'bolt' : item.type === 'dare' ? 'question' : 'cup', 'editor-icon') : '<span class="editor-icon">●</span>'}
                <input type="text" value="${safeText}" class="editor-input" aria-label="Nội dung ô vòng quay ${idx + 1}" aria-describedby="wheel-slice-error"
                       onchange="window.wheelGame.updateSliceText(${idx}, this.value)">
                <button class="delete-slice-btn" aria-label="Xóa ô vòng quay" onclick="window.wheelGame.removeSlice(${idx})">
                    ${window.partyAssets ? window.partyAssets.icon('trash', 'ui-icon') : '<span aria-hidden="true">×</span>'}
                </button>
            `;
            list.appendChild(row);
        });
    }

    updateSliceText(index, newText) {
        if (this.isSpinning || this.resultTimeout !== null || window.penaltyManager.wheelMode !== "custom") return false;
        if (!this.slices[index]) return false;
        const validation = window.penaltyManager.validateWheelText(newText);
        const input = document.querySelectorAll("#wheel-items-list .editor-input")[index] || null;
        if (!validation.valid) {
            if (window.app && window.app.setFieldError) window.app.setFieldError(input, "wheel-slice-error", validation.error);
            if (input) input.focus();
            return false;
        }
        if (window.app && window.app.setFieldError) window.app.setFieldError(input, "wheel-slice-error", "");
        if (validation.value === this.slices[index].text) return false;
        const next = this.slices.map((slice, sliceIndex) => (
            sliceIndex === index ? { ...slice, text: validation.value } : { ...slice }
        ));
        if (!window.penaltyManager.saveWheelSlices(next)) return false;
        this.slices = window.penaltyManager.getActiveWheelSlices();
        if (input) input.value = validation.value;
        this.drawWheel();
        return true;
    }

    removeSlice(index) {
        if (this.isSpinning || this.resultTimeout !== null || window.penaltyManager.wheelMode !== "custom") return false;
        if (this.slices.length <= 3) {
            alert("Vòng quay cần có tối thiểu 3 ô!");
            return;
        }
        const next = this.slices.filter((_, sliceIndex) => sliceIndex !== index);
        if (!window.penaltyManager.saveWheelSlices(next)) return false;
        this.slices = window.penaltyManager.getActiveWheelSlices();
        this.renderEditorList();
        this.drawWheel();
        return true;
    }

    addNewSlice() {
        if (this.isSpinning || this.resultTimeout !== null || window.penaltyManager.wheelMode !== "custom") return false;
        const input = document.getElementById("new-slice-input");
        if (!input) return;
        const validation = window.penaltyManager.validateWheelText(input.value);
        if (!validation.valid) {
            if (window.app && window.app.setFieldError) window.app.setFieldError(input, "wheel-slice-error", validation.error);
            input.focus();
            return false;
        }

        const colors = ["#FF3366", "#9900FF", "#00CC66", "#FF9900", "#3366FF", "#00CCCC"];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const next = [...this.slices, {
            text: validation.value,
            type: "drink",
            color: randomColor,
            icon: "🍺"
        }];

        if (!window.penaltyManager.saveWheelSlices(next)) return false;
        this.slices = window.penaltyManager.getActiveWheelSlices();
        input.value = "";
        if (window.app && window.app.setFieldError) window.app.setFieldError(input, "wheel-slice-error", "");
        this.renderEditorList();
        this.drawWheel();
        return true;
    }
}
