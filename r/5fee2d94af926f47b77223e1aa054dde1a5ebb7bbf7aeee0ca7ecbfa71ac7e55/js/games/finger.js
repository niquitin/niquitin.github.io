/**
 * Game 3: Chạm Ngón Tay Giật Điện (Finger Shock Roulette)
 * Mechanics:
 * - Multi-touch tracking (2–4 people recommended; no runtime contact cap)
 * - Desktop fallback (click to simulate touch points or test)
 * - Unique glowing Neon rings for each finger
 * - 3-second charging countdown with escalating electric hum sound
 * - Lightning strike on 1 unlucky person + vibration + penalty modal
 */

class FingerGame {
    constructor() {
        this.container = document.getElementById("finger-game-container");
        this.touches = new Map(); // id -> {x, y, color}
        this.countdownTimer = null;
        this.timeLeft = 3;
        this.isSelecting = false;
        this.isResultLocked = false;
        this.chosenTouchId = null;
        this.autoSecondTimer = null;
        this.resultTimer = null;
        this.lifecycleId = 0;

        this.neonPalette = [
            "#00f0ff", // Neon Cyan
            "#ff007f", // Hot Pink
            "#39ff14", // Neon Lime
            "#ffae00", // Amber Gold
            "#b026ff", // Electric Purple
            "#ff3b30", // Crimson
            "#00ffcc", // Mint
            "#ffd700", // Gold
            "#ff0055", // Magenta
            "#0088ff"  // Deep Sky Blue
        ];

        this.init();
    }

    init() {
        this.render();
        this.setupTouchListeners();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="game-header overlay-header">
                <button class="back-btn" onclick="window.app.navigate('home')">
                    <svg class="ui-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#back"></use></svg> Quay lại
                </button>
                <div class="game-title-wrap">
                    <h2>Chạm Ngón Tay</h2>
                    <p class="game-subtitle">Mỗi người đặt 1 ngón tay lên màn hình</p>
                </div>
                <button class="action-btn-small" onclick="window.fingerGame.resetState()">
                    Đặt Lại
                </button>
            </div>

            <!-- Fullscreen Touch Canvas & Stage -->
            <div id="finger-stage" class="finger-stage">
                <div class="finger-hero-object" aria-hidden="true">
                    <div class="finger-hero-halo"></div>
                    <div class="finger-hero-core">
                        <svg class="finger-hero-icon"><use href="assets/icons/game-icons.svg#finger"></use></svg>
                    </div>
                    <span class="finger-hero-label">TOUCH ROULETTE</span>
                </div>

                <div id="finger-instruction" class="finger-hint">
                    <div class="gesture-guide"><span class="gesture-guide-dot"></span><span class="gesture-guide-dot"></span></div>
                    <svg class="pulse-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#finger"></use></svg>
                    <div class="hint-text">Đặt ít nhất 2 ngón tay lên vùng sáng</div>
                    <div class="finger-rule-chip">Giữ ngón tới khi có kết quả</div>
                </div>

                <p id="finger-contact-status" class="finger-contact-status" aria-live="off">Đã nhận 0 ngón tay · Cần ít nhất 2 ngón</p>

                <div id="countdown-circle" class="countdown-overlay hidden">
                    <span id="countdown-number">3</span>
                </div>

                <!-- Touch ripple rings rendered dynamically here -->
                <div id="touch-elements-layer"></div>
            </div>
        `;
    }

    setupTouchListeners() {
        const stage = document.getElementById("finger-stage");
        if (!stage) return;

        // Prevent default browser gestures like pinch zoom, scroll
        stage.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: false });
        stage.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
        stage.addEventListener("touchend", (e) => this.handleTouchEnd(e), { passive: false });
        stage.addEventListener("touchcancel", (e) => this.handleTouchEnd(e), { passive: false });

        // Desktop click emulation for testing
        let mouseFingerCount = 0;
        stage.addEventListener("mousedown", (e) => {
            if ("ontouchstart" in window) return; // Skip if mobile
            if (this.isResultLocked) {
                this.resetState();
                return;
            }
            const fakeId = `mouse-${mouseFingerCount++}`;
            const rect = stage.getBoundingClientRect();
            const color = this.neonPalette[this.touches.size % this.neonPalette.length];
            this.touches.set(fakeId, {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                color: color
            });
            this.updateTouchUI();
            this.checkCountdown();

            // Auto simulate second finger for desktop demo if alone
            if (this.touches.size === 1) {
                if (this.autoSecondTimer !== null) clearTimeout(this.autoSecondTimer);
                const lifecycleId = this.lifecycleId;
                this.autoSecondTimer = setTimeout(() => {
                    this.autoSecondTimer = null;
                    if (lifecycleId !== this.lifecycleId) return;
                    if (this.touches.size === 1 && !this.isResultLocked) {
                        const fakeId2 = `mouse-${mouseFingerCount++}`;
                        this.touches.set(fakeId2, {
                            x: (e.clientX - rect.left) + 120,
                            y: (e.clientY - rect.top) + 80,
                            color: this.neonPalette[1]
                        });
                        this.updateTouchUI();
                        this.checkCountdown();
                    }
                }, 400);
            }
        });
    }

    handleTouchStart(e) {
        e.preventDefault();
        if (this.isResultLocked) {
            this.resetState();
            return;
        }

        const stage = document.getElementById("finger-stage");
        const rect = stage.getBoundingClientRect();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const color = this.neonPalette[this.touches.size % this.neonPalette.length];
            this.touches.set(touch.identifier, {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
                color: color
            });
        }

        this.updateTouchUI();
        this.checkCountdown();
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (this.isResultLocked) return;

        const stage = document.getElementById("finger-stage");
        const rect = stage.getBoundingClientRect();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (this.touches.has(touch.identifier)) {
                const item = this.touches.get(touch.identifier);
                item.x = touch.clientX - rect.left;
                item.y = touch.clientY - rect.top;
            }
        }
        this.updateTouchUI();
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (this.isResultLocked) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            this.touches.delete(touch.identifier);
        }

        this.updateTouchUI();
        this.checkCountdown();
    }

    updateTouchUI() {
        const layer = document.getElementById("touch-elements-layer");
        const hint = document.getElementById("finger-instruction");
        const status = document.getElementById("finger-contact-status");
        if (status) {
            // Selection freezes the existing contact visuals until reset; do not
            // advertise the frozen result snapshot as a live hardware count.
            const text = this.isResultLocked
                ? "Ngón có viền đôi và dấu ✓ được chọn"
                : `Đã nhận ${this.touches.size} ngón tay${this.touches.size < 2 ? " · Cần ít nhất 2 ngón" : " · Giữ ngón tới kết quả"}`;
            if (status.textContent !== text) status.textContent = text;
        }
        if (!layer) return;

        layer.innerHTML = "";

        if (this.touches.size === 0) {
            if (hint) hint.classList.remove("hidden");
            return;
        } else {
            if (hint) hint.classList.add("hidden");
        }

        this.touches.forEach((item, id) => {
            const circle = document.createElement("div");
            circle.className = "touch-halo";
            circle.id = `halo-${id}`;
            circle.style.left = `${item.x}px`;
            circle.style.top = `${item.y}px`;
            circle.style.borderColor = item.color;
            circle.style.boxShadow = `0 0 25px ${item.color}, inset 0 0 15px ${item.color}`;

            circle.innerHTML = `
                <div class="inner-core" style="background: ${item.color};"></div>
                <div class="electric-arc"></div>
            `;

            if (this.chosenTouchId === id) {
                circle.classList.add("shocked-target");
                const marker = document.createElement("span");
                marker.className = "finger-winner-marker";
                marker.textContent = "✓";
                marker.setAttribute("aria-label", "Ngón được chọn");
                circle.appendChild(marker);
            } else if (this.isResultLocked) {
                circle.classList.add("faded-target");
            }

            layer.appendChild(circle);
        });
    }

    checkCountdown() {
        // Need at least 2 fingers to start selection
        if (this.touches.size >= 2) {
            if (!this.isSelecting) {
                this.startCountdown();
            }
        } else {
            this.stopCountdown();
        }
    }

    startCountdown() {
        this.isSelecting = true;
        this.timeLeft = 3;
        const lifecycleId = this.lifecycleId;

        const overlay = document.getElementById("countdown-circle");
        const countEl = document.getElementById("countdown-number");
        if (overlay) overlay.classList.remove("hidden");
        if (countEl) countEl.innerText = this.timeLeft;

        window.soundEngine.startElectricHum();

        this.countdownTimer = setInterval(() => {
            if (lifecycleId !== this.lifecycleId) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                return;
            }
            this.timeLeft--;
            if (countEl) countEl.innerText = this.timeLeft;

            if (this.timeLeft <= 0) {
                clearInterval(this.countdownTimer);
                this.triggerShockSelection();
            }
        }, 1000);
    }

    stopCountdown() {
        this.isSelecting = false;
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        const overlay = document.getElementById("countdown-circle");
        if (overlay) overlay.classList.add("hidden");
        window.soundEngine.stopElectricHum();
    }

    triggerShockSelection() {
        this.stopCountdown();
        this.isResultLocked = true;

        // Pick one unlucky touch ID at random
        const touchIds = Array.from(this.touches.keys());
        const unluckyIndex = Math.floor(Math.random() * touchIds.length);
        this.chosenTouchId = touchIds[unluckyIndex];

        // Sound & haptic shock
        window.soundEngine.playElectricShock();

        this.updateTouchUI();

        // Flash entire stage
        const stage = document.getElementById("finger-stage");
        if (stage) stage.classList.add("lightning-flash");

        const lifecycleId = this.lifecycleId;
        this.resultTimer = setTimeout(() => {
            this.resultTimer = null;
            if (lifecycleId !== this.lifecycleId) return;
            if (stage) stage.classList.remove("lightning-flash");
            const penalty = window.penaltyManager.getRandomPenalty();
            window.app.showPenaltyModal({
                title: "Đã chọn xong",
                subtitle: "Ngón tay được chọn nhận kết quả:",
                penalty: penalty,
                historyEvent: {
                    type: "penalty",
                    gameId: "finger",
                    label: penalty.text,
                    detail: { category: penalty.type || "drink" },
                    dedupeKey: `finger:${lifecycleId}:result`
                },
                onClose: () => {
                    this.resetState();
                }
            });
        }, 800);
    }

    resetState() {
        this.clearPendingCallbacks();
        this.stopCountdown();
        this.touches.clear();
        this.isResultLocked = false;
        this.chosenTouchId = null;
        this.updateTouchUI();

        const stage = document.getElementById("finger-stage");
        if (stage) stage.classList.remove("lightning-flash");
    }

    clearPendingCallbacks() {
        this.lifecycleId += 1;
        if (this.autoSecondTimer !== null) {
            clearTimeout(this.autoSecondTimer);
            this.autoSecondTimer = null;
        }
        if (this.resultTimer !== null) {
            clearTimeout(this.resultTimer);
            this.resultTimer = null;
        }
    }

    stop() {
        this.resetState();
    }
}
