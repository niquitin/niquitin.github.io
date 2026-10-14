/**
 * Master Application Controller (app.js)
 * Manages screen navigation, modals, confetti animations, settings & lifecycle
 */

class PartyApp {
    constructor() {
        this.currentScreen = "home";
        this.activeModal = null;
        this.modalReturnFocus = null;
        this.modalKeydownHandler = (event) => this.handleModalKeydown(event);
        this.navigationFrame = null;
        this.navigationId = 0;
        this.randomPenaltyDrawId = 0;
        this.tutorialFrame = null;
        this.celebrationFrame = null;
        this.gameFxTimers = new Set();
        this.gameFxFrames = new Set();
        this.init();
    }

    init() {
        // Initialize Game Instances
        window.crocodileGame = window.crocodileGame || new CrocodileGame();
        window.wheelGame = window.wheelGame || new WheelGame();
        window.fingerGame = window.fingerGame || new FingerGame();
        window.bombGame = window.bombGame || new BombGame();
        window.pirateGame = window.pirateGame || new PirateGame();
        window.diceGame = window.diceGame || new PartyDiceGame();
        window.cardsGame = window.cardsGame || new DrinkingCardsGame();

        this.setupNavigation();
        this.setupModalAccessibility();
        this.setupSettingsUI();
        this.setupMediumUI();
        this.setupPresetSelector();
        if (window.sessionHistoryUI && typeof window.sessionHistoryUI.init === "function") {
            window.sessionHistoryUI.init();
        }
    }

    navigate(screenId) {
        if (window.soundEngine) window.soundEngine.playClick();

        const target = document.getElementById(`screen-${screenId}`);
        if (!target) return;

        // Navigation owns the screen lifecycle. Do not restore focus to a
        // trigger that may become hidden or detached with the old screen.
        const modalWasOpen = Boolean(this.activeModal);
        if (modalWasOpen) {
            this.closeModal(null, { restoreFocus: false, playSound: false });
        }

        if (this.currentScreen !== screenId) {
            this.stopGame(this.currentScreen);
            this.stopGameEffects();
        }
        const navigationId = ++this.navigationId;
        if (this.navigationFrame !== null) {
            cancelAnimationFrame(this.navigationFrame);
            this.navigationFrame = null;
        }
        
        // Hide all screens
        const screens = document.querySelectorAll(".game-screen");
        screens.forEach(s => s.classList.remove("active"));

        target.classList.add("active");
        this.currentScreen = screenId;
        if (modalWasOpen) this.focusNavigationTarget(target);
        if (screenId === "home") {
            // Return the game picker to a predictable starting position
            // after Back; browser scroll restoration is unreliable inside
            // Android WebView for this single-page layout.
            target.scrollTop = 0;
            target.scrollLeft = 0;
        }

        if (screenId !== "home") this.showTutorial(screenId);
        else this.hideTutorial();

        // Defer game-specific initialization to next frame for 0ms instant transition!
        this.navigationFrame = requestAnimationFrame(() => {
            this.navigationFrame = null;
            if (navigationId !== this.navigationId || this.currentScreen !== screenId) return;
            if (screenId === "crocodile") {
                if (window.crocodileGame) window.crocodileGame.resetGame();
            } else if (screenId === "wheel") {
                if (window.wheelGame) {
                    window.wheelGame.setupCanvas();
                    window.wheelGame.drawWheel();
                }
            } else if (screenId === "finger") {
                if (window.fingerGame) window.fingerGame.resetState();
            } else if (screenId === "bomb") {
                if (window.bombGame) window.bombGame.resetBomb();
            } else if (screenId === "pirate") {
                if (window.pirateGame) window.pirateGame.start();
            } else if (screenId === "dice") {
                if (window.diceGame) window.diceGame.start();
            } else if (screenId === "cards") {
                if (window.cardsGame) window.cardsGame.start();
            } else if (screenId === "bottle") {
                if (window.bottleGame) window.bottleGame.start();
            } else if (screenId === "numberbomb") {
                if (window.numberBombGame) window.numberBombGame.start();
            } else if (screenId === "neverhave") {
                if (window.neverHaveGame) window.neverHaveGame.start();
            }
        });
    }

    stopGame(screenId) {
        const games = {
            crocodile: window.crocodileGame,
            wheel: window.wheelGame,
            finger: window.fingerGame,
            bomb: window.bombGame,
            pirate: window.pirateGame,
            dice: window.diceGame,
            cards: window.cardsGame,
            bottle: window.bottleGame,
            numberbomb: window.numberBombGame,
            neverhave: window.neverHaveGame
        };
        const game = games[screenId];
        if (game && typeof game.stop === "function") game.stop();
    }

    showTutorial(screenId) {
        // Dice already has the persistent CÁCH CHƠI disclosure directly in
        // its screen. Avoid stacking the global toast over the result/rules.
        if (screenId === "dice") {
            this.hideTutorial();
            return;
        }
        const hints = {
            crocodile: "Lần lượt chạm từng răng. Lượt kết thúc khi hàm sập.",
            wheel: "Vuốt bánh xe hoặc bấm QUAY để chọn kết quả.",
            finger: "Mọi người đặt ngón tay lên màn hình rồi giữ nguyên.",
            bomb: "Nói một đáp án, bấm chuyền máy và đưa máy cho người kế bên.",
            pirate: "Chọn một khe và cắm kiếm. Hải tặc bật lên sẽ kết thúc lượt.",
            dice: "Bấm LẮC XÍ NGẦU, sau đó đọc luật ở thẻ kết quả.",
            cards: "Chạm mặt sau lá bài để rút thử thách mới.",
            bottle: "Vuốt vòng chai hoặc bấm XOAY CHAI NGAY.",
            numberbomb: "Nhập số nằm giữa hai mốc hiện trên màn hình.",
            neverhave: "Chọn Đã từng nếu muốn chia sẻ; mọi người luôn có thể bỏ qua."
        };
        const text = hints[screenId];
        const toast = document.getElementById("tutorial-toast");
        const textEl = document.getElementById("tutorial-toast-text");
        if (!text || !toast || !textEl) return;

        let seen = false;
        try { seen = localStorage.getItem(`vbn_tutorial_${screenId}`) === "1"; } catch (e) {}
        if (seen) {
            this.hideTutorial();
            return;
        }

        textEl.textContent = text;
        toast.classList.remove("is-visible");
        toast.setAttribute("aria-hidden", "false");
        if (this.tutorialFrame !== null) cancelAnimationFrame(this.tutorialFrame);
        this.tutorialFrame = requestAnimationFrame(() => {
            this.tutorialFrame = null;
            if (this.currentScreen === screenId) toast.classList.add("is-visible");
        });
        const close = () => {
            toast.classList.remove("is-visible");
            toast.setAttribute("aria-hidden", "true");
            try { localStorage.setItem(`vbn_tutorial_${screenId}`, "1"); } catch (e) {}
        };
        const closeButton = document.getElementById("tutorial-toast-close");
        if (closeButton) closeButton.onclick = close;
        clearTimeout(this.tutorialTimer);
        this.tutorialTimer = setTimeout(close, 4200);
    }

    hideTutorial() {
        clearTimeout(this.tutorialTimer);
        if (this.tutorialFrame !== null) {
            cancelAnimationFrame(this.tutorialFrame);
            this.tutorialFrame = null;
        }
        const toast = document.getElementById("tutorial-toast");
        if (!toast) return;
        toast.classList.remove("is-visible");
        toast.setAttribute("aria-hidden", "true");
    }

    playRandomGame() {
        // The random pool follows the active party session; the canonical
        // registry fallback guards an unexpectedly empty pool.
        const partySession = window.partySession;
        let pool = partySession ? partySession.getActiveGames() : [];
        if (!pool.length && partySession) pool = partySession.getGameIds();
        if (!pool.length) {
            console.warn("PartyApp: no games available for random selection");
            return;
        }
        const selected = pool[Math.floor(Math.random() * pool.length)];
        this.navigate(selected);
    }

    showRandomPenalty() {
        const modal = typeof document !== "undefined" ? document.getElementById("penalty-modal") : null;
        if ((this.activeModal && this.activeModal === modal)
            || (modal && modal.classList && modal.classList.contains("active"))) return false;
        const penalty = window.penaltyManager && window.penaltyManager.getRandomPenalty
            ? window.penaltyManager.getRandomPenalty()
            : { text: "Cả bàn cùng vỗ tay ba nhịp.", icon: "👏", type: "drink", badge: "Cả Bàn" };
        const drawId = ++this.randomPenaltyDrawId;
        this.showPenaltyModal({
            title: "Án phạt ngẫu nhiên",
            subtitle: "Kết quả lượt này:",
            penalty,
            historyEvent: {
                type: "penalty",
                gameId: null,
                label: penalty.text,
                detail: { category: penalty.type || "drink" },
                dedupeKey: `quick-penalty:${drawId}`
            }
        });
        return true;
    }

    recordModalHistory(historyEvent) {
        if (!historyEvent || typeof historyEvent !== "object") return;
        const hasGameId = Object.prototype.hasOwnProperty.call(historyEvent, "gameId");
        if (!hasGameId
            || typeof historyEvent.type !== "string"
            || typeof historyEvent.label !== "string"
            || typeof historyEvent.dedupeKey !== "string"
            || historyEvent.dedupeKey.length === 0) return;

        const history = window.sessionHistory;
        if (!history || typeof history.record !== "function") return;
        try {
            history.record({
                type: historyEvent.type,
                gameId: historyEvent.gameId,
                label: historyEvent.label,
                detail: historyEvent.detail
            }, { dedupeKey: historyEvent.dedupeKey });
        } catch (e) {
            // History is observational; a storage/record failure must not
            // interrupt the already-finalized modal result.
        }
    }

    setupModalAccessibility() {
        document.addEventListener("keydown", this.modalKeydownHandler);
        document.querySelectorAll(".modal-overlay").forEach(modal => {
            modal.setAttribute("aria-hidden", modal.classList.contains("active") ? "false" : "true");
            const content = modal.querySelector(".modal-content");
            if (content && !content.hasAttribute("tabindex")) content.setAttribute("tabindex", "-1");
        });
    }

    focusNavigationTarget(screen) {
        if (!screen || !screen.isConnected) return;
        if (!screen.hasAttribute("tabindex")) screen.setAttribute("tabindex", "-1");
        try {
            screen.focus({ preventScroll: true });
        } catch (e) {
            screen.focus();
        }
    }

    isVisibleModalElement(element) {
        if (!element || !element.isConnected || element.disabled) return false;
        if (element.closest('[aria-hidden="true"]')) return false;
        const screen = element.closest(".game-screen");
        if (screen && !screen.classList.contains("active")) return false;
        const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
        return !style || (style.display !== "none" && style.visibility !== "hidden");
    }

    getModalFocusableElements(modal) {
        if (!modal) return [];
        const selector = [
            "button:not([disabled])",
            "[href]",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "[tabindex]:not([tabindex=\"-1\"]):not([disabled])"
        ].join(",");
        return Array.from(modal.querySelectorAll(selector)).filter(element => this.isVisibleModalElement(element));
    }

    focusModal(modal) {
        if (!modal) return;
        const target = this.getModalFocusableElements(modal)[0]
            || modal.querySelector(".modal-content")
            || modal;
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        try {
            target.focus({ preventScroll: true });
        } catch (e) {
            target.focus();
        }
    }

    handleModalKeydown(event) {
        const modal = this.activeModal;
        if (!modal || !modal.classList.contains("active")) return;

        if (event.key === "Escape") {
            event.preventDefault();
            this.closeModal();
            return;
        }

        if (event.key !== "Tab") return;
        const focusable = this.getModalFocusableElements(modal);
        if (!focusable.length) {
            event.preventDefault();
            this.focusModal(modal);
            return;
        }

        const current = document.activeElement;
        const currentIndex = focusable.indexOf(current);
        if (currentIndex === -1) {
            event.preventDefault();
            this.focusModal(modal);
            return;
        }

        if (event.shiftKey && currentIndex === 0) {
            event.preventDefault();
            focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
            event.preventDefault();
            focusable[0].focus();
        }
    }

    activateModal(modal) {
        if (!modal) return;
        if (this.activeModal && this.activeModal !== modal) {
            this.closeModal(null, { restoreFocus: false, playSound: false });
        }
        if (!this.activeModal) {
            const activeElement = document.activeElement;
            this.modalReturnFocus = activeElement && activeElement !== document.body
                && this.isVisibleModalElement(activeElement) && !modal.contains(activeElement)
                ? activeElement
                : null;
        }
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        this.activeModal = modal;
        this.focusModal(modal);
    }

    restoreModalFocus(target) {
        if (!target || this.activeModal || !this.isVisibleModalElement(target)) return false;
        try {
            target.focus({ preventScroll: true });
        } catch (e) {
            target.focus();
        }
        return true;
    }

    openModal(modalId) {
        if (modalId === "settings-modal") {
            this.syncPenaltyFilterInputs();
            this.updateApprovedPenaltyOptInUI();
        }
        window.soundEngine.playClick();
        this.activateModal(document.getElementById(modalId));
    }

    closeModal(modalId, { restoreFocus = true, playSound = true } = {}) {
        if (playSound && window.soundEngine) window.soundEngine.playClick();
        const targetId = modalId || (this.activeModal ? this.activeModal.id : null);
        const modal = targetId ? document.getElementById(targetId) : null;
        if (!modal) return;

        const isActiveModal = modal === this.activeModal;
        const returnFocus = isActiveModal ? this.modalReturnFocus : null;
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        if (isActiveModal) {
            this.activeModal = null;
            this.modalReturnFocus = null;
            if (restoreFocus) this.restoreModalFocus(returnFocus);
        }
    }

    showPenaltyModal({ title, subtitle, penalty, customActions, onClose, historyEvent }) {
        this.recordModalHistory(historyEvent);
        const modal = document.getElementById("penalty-modal");
        if (!modal) return;

        const titleEl = document.getElementById("penalty-title");
        const subEl = document.getElementById("penalty-sub");
        const iconEl = document.getElementById("penalty-icon");
        const badgeEl = document.getElementById("penalty-badge");
        const textEl = document.getElementById("penalty-text");
        const actionsBox = document.getElementById("penalty-actions");

        if (titleEl) titleEl.innerText = title || "Kết quả";
        if (subEl) subEl.innerText = subtitle || "Kết quả lượt này:";
        if (iconEl) {
            const penaltyType = penalty.type || "drink";
            const allowedTypes = ["drink", "perform", "dare", "safe"];
            const safeType = allowedTypes.includes(penaltyType) ? penaltyType : "drink";
            const use = iconEl.querySelector("use");
            if (use) use.setAttribute("href", `assets/icons/game-icons.svg#penalty-${safeType}`);
            iconEl.setAttribute("aria-label", penalty.badge || "Án phạt");
        }
        if (badgeEl) {
            const allowedTypes = ["drink", "perform", "dare", "safe"];
            const safeType = allowedTypes.includes(penalty.type) ? penalty.type : "drink";
            badgeEl.innerText = penalty.badge || "Án phạt";
            badgeEl.className = `penalty-badge badge-${safeType}`;
        }
        if (textEl) textEl.innerText = penalty.text;

        if (actionsBox) {
            if (customActions) {
                actionsBox.innerHTML = customActions;
            } else {
                actionsBox.innerHTML = `
                    <button class="neon-button primary-btn" onclick="window.app.closePenaltyModal()">
                        TIẾP TỤC
                    </button>
                `;
            }
        }

        this.onPenaltyCloseCallback = onClose;
        this.triggerConfetti();
        this.activateModal(modal);
    }

    closePenaltyModal() {
        window.soundEngine.playClick();
        const modal = document.getElementById("penalty-modal");
        const shouldRestoreFocus = modal === this.activeModal;
        const returnFocus = shouldRestoreFocus ? this.modalReturnFocus : null;
        this.closeModal("penalty-modal", { restoreFocus: false, playSound: false });
        if (this.onPenaltyCloseCallback) {
            this.onPenaltyCloseCallback();
            this.onPenaltyCloseCallback = null;
        }
        if (shouldRestoreFocus && !this.restoreModalFocus(returnFocus)) {
            const activeElement = document.activeElement;
            if (modal && modal.contains(activeElement) && !this.activeModal) {
                this.focusNavigationTarget(document.querySelector(".game-screen.active"));
            }
        }
    }

    // Festive Confetti burst on penalty / reward reveal
    triggerConfetti() {
        const canvas = document.getElementById("confetti-canvas");
        if (!canvas) return;
        if (this.celebrationFrame !== null) {
            cancelAnimationFrame(this.celebrationFrame);
            this.celebrationFrame = null;
        }
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const pieces = [];
        const colors = ["#ff007f", "#00f0ff", "#39ff14", "#ffd700", "#ff6600", "#b026ff"];

        for (let i = 0; i < 60; i++) {
            pieces.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.7) * 18,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }

        let frames = 0;
        const update = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.4; // gravity
                p.rotation += p.rotSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

            frames++;
            if (frames < 90) {
                this.celebrationFrame = requestAnimationFrame(update);
            } else {
                this.celebrationFrame = null;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        update();
    }

    // EPIC FX 1: BOM PHÁT NỔ HOÀNH TRÁNG (Nuclear flash + earthquake + 150+ particles + comic badge)
    triggerEpicExplosionFX(origin = {}) {
        this.stopGameEffects();
        const appRoot = document.getElementById("app-root");
        const flashLayer = document.getElementById("epic-flash-layer");
        const bannerContainer = document.getElementById("epic-banner-container");
        const canvas = document.getElementById("epic-fx-canvas");

        // 1. Heavy Earthquake Screen Shake
        if (appRoot) {
            appRoot.classList.remove("heavy-screen-shake");
            void appRoot.offsetWidth; // force reflow
            appRoot.classList.add("heavy-screen-shake");
            this.scheduleGameEffect(() => appRoot.classList.remove("heavy-screen-shake"), 800);
        }

        // 2. Nuclear Screen Flash
        if (flashLayer) {
            flashLayer.classList.remove("flash-active");
            void flashLayer.offsetWidth;
            flashLayer.classList.add("flash-active");
            this.scheduleGameEffect(() => flashLayer.classList.remove("flash-active"), 900);
        }

        // 3. Comic Impact Badge
        if (bannerContainer) {
            bannerContainer.innerHTML = `
                <div class="comic-epic-badge badge-bomb">
                    <div class="badge-main-text">BÙÙÙM!</div>
                    <div class="badge-sub-text">BOM ĐÃ NỔ · KẾT QUẢ ĐÃ CÓ</div>
                </div>
            `;
            this.scheduleGameEffect(() => { bannerContainer.innerHTML = ""; }, 1800);
        }

        // 4. Epic Canvas Explosion Particles (Shockwave, Fireballs, Sparks, Shrapnel)
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const centerX = origin.x || (canvas.width / 2);
        const centerY = origin.y || (canvas.height / 2);

        const particles = [];
        const flameColors = ["#ffffff", "#ffea00", "#ff7700", "#ff0044", "#ff007f", "#770022"];

        // A. Shockwave Ring
        let shockwaveRadius = 20;
        let shockwaveAlpha = 1.0;

        // B. 60 Fire & Smoke Blobs
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 4;
            particles.push({
                type: 'fire',
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (Math.random() * 3),
                radius: Math.random() * 22 + 10,
                color: flameColors[Math.floor(Math.random() * flameColors.length)],
                alpha: 1.0,
                decay: Math.random() * 0.02 + 0.015
            });
        }

        // C. 80 High-Velocity Sparks
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 20 + 8;
            particles.push({
                type: 'spark',
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                color: Math.random() > 0.3 ? "#ffd700" : "#ff3300",
                alpha: 1.0,
                decay: Math.random() * 0.025 + 0.018
            });
        }

        // D. 30 Shrapnel Metal Shards
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 16 + 6;
            particles.push({
                type: 'shard',
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 10 + 6,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 20,
                color: "#333344",
                alpha: 1.0,
                decay: Math.random() * 0.015 + 0.01
            });
        }

        let animFrame = 0;
        const renderParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Expanding shockwave ring
            if (shockwaveAlpha > 0.02) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, shockwaveRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 200, 50, ${shockwaveAlpha})`;
                ctx.lineWidth = 14 * shockwaveAlpha;
                ctx.shadowColor = "#ff5500";
                ctx.shadowBlur = 25;
                ctx.stroke();
                ctx.restore();
                shockwaveRadius += 18;
                shockwaveAlpha *= 0.92;
            }

            // Draw particles
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;
                if (p.alpha <= 0) return;

                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);

                if (p.type === 'fire') {
                    p.vx *= 0.94;
                    p.vy *= 0.94;
                    p.radius *= 1.02;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 15;
                    ctx.fill();
                } else if (p.type === 'spark') {
                    p.vy += 0.3;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.shadowColor = "#ffffff";
                    ctx.shadowBlur = 8;
                    ctx.fill();
                } else if (p.type === 'shard') {
                    p.vy += 0.4;
                    p.rotation += p.rotSpeed;
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                }
                ctx.restore();
            });

            animFrame++;
            if (animFrame < 85) {
                this.requestGameEffectFrame(renderParticles);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        renderParticles();
    }

    // EPIC FX 2: CÁ SẤU ĐỚP HOÀNH TRÁNG (Blood-red hazard strobe + claw slash + tooth splinters + comic badge)
    triggerEpicChompFX() {
        this.stopGameEffects();
        const appRoot = document.getElementById("app-root");
        const hazardLayer = document.getElementById("epic-hazard-layer");
        const bannerContainer = document.getElementById("epic-banner-container");
        const canvas = document.getElementById("epic-fx-canvas");

        // 1. Heavy Screen Shake
        if (appRoot) {
            appRoot.classList.remove("heavy-screen-shake");
            void appRoot.offsetWidth;
            appRoot.classList.add("heavy-screen-shake");
            this.scheduleGameEffect(() => appRoot.classList.remove("heavy-screen-shake"), 800);
        }

        // 2. Blood Hazard Strobe
        if (hazardLayer) {
            hazardLayer.classList.remove("hazard-active");
            void hazardLayer.offsetWidth;
            hazardLayer.classList.add("hazard-active");
            this.scheduleGameEffect(() => hazardLayer.classList.remove("hazard-active"), 1100);
        }

        // 3. Comic Impact Badge
        if (bannerContainer) {
            bannerContainer.innerHTML = `
                <div class="comic-epic-badge badge-chomp">
                    <div class="badge-main-text">ĐỚP RỒI!</div>
                    <div class="badge-sub-text">RĂNG SÂU ĐÃ SẬP · XEM KẾT QUẢ</div>
                </div>
            `;
            this.scheduleGameEffect(() => { bannerContainer.innerHTML = ""; }, 1800);
        }

        // 4. Canvas Claw / Bite Slash Marks & Tooth Splinters
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const particles = [];
        for (let i = 0; i < 70; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 18 + 5;
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 3,
                color: Math.random() > 0.4 ? "#ffffff" : "#ff0044",
                alpha: 1.0,
                decay: Math.random() * 0.025 + 0.015
            });
        }

        let slashProgress = 0;
        let animFrame = 0;

        const renderChomp = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw dynamic claw / bite slashes
            if (slashProgress < 1.0) {
                const w = canvas.width;
                ctx.save();
                ctx.lineWidth = 9;
                ctx.strokeStyle = `rgba(255, 30, 60, ${1 - slashProgress * 0.7})`;
                ctx.shadowColor = "#ff0033";
                ctx.shadowBlur = 24;

                [-50, 0, 50].forEach(offsetY => {
                    ctx.beginPath();
                    const startX = w * 0.12;
                    const startY = centerY - 70 + offsetY;
                    const endX = startX + (w * 0.76) * Math.min(1.0, slashProgress * 2.2);
                    const endY = startY + 140 * Math.min(1.0, slashProgress * 2.2);
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                });
                ctx.restore();
                slashProgress += 0.05;
            }

            // Draw splinter sparks
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35;
                p.alpha -= p.decay;
                if (p.alpha <= 0) return;

                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.restore();
            });

            animFrame++;
            if (animFrame < 75) {
                this.requestGameEffectFrame(renderChomp);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        renderChomp();
    }

    scheduleGameEffect(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.gameFxTimers.delete(timeoutId);
            callback();
        }, delay);
        this.gameFxTimers.add(timeoutId);
        return timeoutId;
    }

    requestGameEffectFrame(callback) {
        const frameId = requestAnimationFrame(() => {
            this.gameFxFrames.delete(frameId);
            callback();
        });
        this.gameFxFrames.add(frameId);
        return frameId;
    }

    stopGameEffects() {
        if (this.celebrationFrame !== null) {
            cancelAnimationFrame(this.celebrationFrame);
            this.celebrationFrame = null;
        }
        this.gameFxTimers.forEach((timeoutId) => clearTimeout(timeoutId));
        this.gameFxTimers.clear();
        this.gameFxFrames.forEach((frameId) => cancelAnimationFrame(frameId));
        this.gameFxFrames.clear();

        document.getElementById("app-root")?.classList.remove("heavy-screen-shake");
        document.getElementById("epic-flash-layer")?.classList.remove("flash-active");
        document.getElementById("epic-hazard-layer")?.classList.remove("hazard-active");
        const banner = document.getElementById("epic-banner-container");
        if (banner) banner.innerHTML = "";
        const canvas = document.getElementById("epic-fx-canvas");
        const context = canvas?.getContext("2d");
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
        const confetti = document.getElementById("confetti-canvas");
        const confettiContext = confetti?.getContext("2d");
        if (confettiContext) confettiContext.clearRect(0, 0, confetti.width, confetti.height);
    }


    setupNavigation() {
        // Toggle sound
        const soundBtn = document.getElementById("toggle-sound-btn");
        if (soundBtn) {
            soundBtn.addEventListener("click", () => {
                const state = window.soundEngine.toggleSound();
                const use = soundBtn.querySelector(".ui-symbol use");
                if (use) use.setAttribute("href", `assets/icons/game-icons.svg#speaker-${state ? "on" : "off"}`);
                soundBtn.setAttribute("aria-label", state ? "Tắt âm thanh" : "Bật âm thanh");
                soundBtn.setAttribute("aria-pressed", String(state));
            });
        }

        // Toggle haptic feedback. Persisting this preference is important in
        // a shared venue: some players enjoy the tactile punch, others need a
        // completely quiet phone on the table.
        const hapticsBtn = document.getElementById("toggle-haptics-btn");
        if (hapticsBtn && window.partyHaptics) {
            let savedHaptics = null;
            try { savedHaptics = localStorage.getItem("vbn_haptics"); } catch (e) {}
            if (savedHaptics !== null) window.partyHaptics.setEnabled(savedHaptics !== "0");

            const syncHapticsControl = (enabled) => {
                hapticsBtn.setAttribute("aria-pressed", String(enabled));
                hapticsBtn.setAttribute("aria-label", enabled ? "Tắt rung phản hồi" : "Bật rung phản hồi");
                const label = document.getElementById("haptics-toggle-label");
                if (label) label.textContent = enabled ? "Bật" : "Tắt";
                hapticsBtn.classList.toggle("is-off", !enabled);
            };

            syncHapticsControl(window.partyHaptics.enabled);
            hapticsBtn.addEventListener("click", () => {
                const enabled = window.partyHaptics.toggle();
                try { localStorage.setItem("vbn_haptics", enabled ? "1" : "0"); } catch (e) {}
                syncHapticsControl(enabled);
                if (enabled) window.partyHaptics.play("light");
            });
        }

        // Toggle Fullscreen
        const fsBtn = document.getElementById("toggle-fullscreen-btn");
        if (fsBtn) {
            const syncFullscreenControl = () => {
                const active = Boolean(document.fullscreenElement);
                const use = fsBtn.querySelector(".ui-symbol use");
                if (use) use.setAttribute("href", `assets/icons/game-icons.svg#fullscreen-${active ? "exit" : "enter"}`);
                fsBtn.setAttribute("aria-label", active ? "Thoát toàn màn hình" : "Toàn màn hình");
                fsBtn.setAttribute("aria-pressed", active ? "true" : "false");
            };
            document.addEventListener("fullscreenchange", syncFullscreenControl);
            syncFullscreenControl();
            fsBtn.addEventListener("click", () => {
                if (!document.fullscreenElement) {
                    const request = document.documentElement.requestFullscreen;
                    if (typeof request === "function") {
                        try {
                            Promise.resolve(request.call(document.documentElement)).catch(syncFullscreenControl);
                        } catch (e) {
                            syncFullscreenControl();
                        }
                    }
                } else if (typeof document.exitFullscreen === "function") {
                    try {
                        Promise.resolve(document.exitFullscreen()).catch(syncFullscreenControl);
                    } catch (e) {
                        syncFullscreenControl();
                    }
                }
            });
        }

        // Let the browser distinguish a vertical swipe from a deliberate tap.
        // Navigation stays on the native button click; pointerdown would open
        // a card immediately and made the home grid impossible to scroll.
        const cards = document.querySelectorAll(".game-card");

        const filterButtons = document.querySelectorAll(".filter-chip");
        filterButtons.forEach(filterButton => {
            filterButton.addEventListener("click", () => {
                const filter = filterButton.dataset.filter || "all";
                filterButtons.forEach(btn => {
                    const active = btn === filterButton;
                    btn.classList.toggle("active", active);
                    btn.setAttribute("aria-selected", active ? "true" : "false");
                });
                cards.forEach(card => {
                    const tags = (card.dataset.tags || "").split(" ");
                    card.classList.toggle("is-filtered-out", filter !== "all" && !tags.includes(filter));
                });
            });
        });
    }

    setupSettingsUI() {
        this.syncPenaltyFilterInputs();
        window.addEventListener("penaltyCategoriesChanged", () => this.syncPenaltyFilterInputs());
        this.renderPenaltiesList();
        this.updateApprovedPenaltyOptInUI();
    }

    syncPenaltyFilterInputs() {
        const manager = window.penaltyManager;
        if (!manager) return;
        document.querySelectorAll("#settings-modal input[data-penalty-category]").forEach((input) => {
            input.checked = manager.categories[input.dataset.penaltyCategory] !== false;
        });
    }

    showPenaltyStorageNotice(message = "") {
        const notice = document.getElementById("penalties-storage-status");
        if (!notice) return;
        notice.textContent = message;
        notice.hidden = !message;
    }

    updateApprovedPenaltyOptInUI() {
        const manager = window.penaltyManager;
        const button = document.getElementById("penalties-opt-in-btn");
        if (!manager || !button) return;
        const state = manager.getApprovedPenaltyMergeStatus();
        button.hidden = state === "unavailable" || state === "complete";
        if (manager.penaltyWriteBlocked) {
            this.showPenaltyStorageNotice("Không thể đọc dữ liệu đã lưu. Dữ liệu cũ được giữ để khôi phục; game vẫn có thể dùng nội dung mặc định.");
        } else {
            this.showPenaltyStorageNotice();
        }
    }

    addApprovedPenaltiesAfterOptIn() {
        const manager = window.penaltyManager;
        if (!manager || !window.confirm("Thêm những án phạt mới còn thiếu vào danh sách của bạn? Các án phạt đã sửa hoặc xóa trước đó vẫn được giữ nguyên.")) return false;
        const state = manager.getApprovedPenaltyMergeStatus();
        if (state === "conflict") {
            this.showPenaltyStorageNotice("Không thể thêm vì danh sách có mục trùng ID hoặc nội dung. Dữ liệu hiện tại không thay đổi.");
            return false;
        }
        if (state !== "available") {
            this.updateApprovedPenaltyOptInUI();
            return false;
        }
        const updated = manager.mergeApprovedPenaltiesAfterOptIn(true);
        if (updated) this.renderPenaltiesList();
        this.updateApprovedPenaltyOptInUI();
        if (!updated && manager.getApprovedPenaltyMergeStatus() === "conflict") {
            this.showPenaltyStorageNotice("Không thể thêm vì danh sách có mục trùng ID hoặc nội dung. Dữ liệu hiện tại không thay đổi.");
        }
        return updated;
    }

    resetPenaltyFiltersOnly() {
        if (!window.confirm("Khôi phục bộ lọc án phạt về mặc định? Danh sách án phạt, Wheel tùy chỉnh và lịch sử chơi vẫn được giữ nguyên.")) return false;
        const changed = window.penaltyManager.resetCategoriesOnly();
        this.syncPenaltyFilterInputs();
        return changed;
    }

    setFieldError(input, errorId, message) {
        if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
        const error = document.getElementById(errorId);
        if (!error) return;
        error.textContent = message || "";
        error.hidden = !message;
    }

    renderPenaltiesList() {
        const list = document.getElementById("penalties-editor-list");
        if (!list) return;
        list.innerHTML = "";

        const penalties = window.penaltyManager.penalties;
        const iconMap = { drink: 'drink', perform: 'perform', dare: 'truth', safe: 'safe' };
        const escapeText = (value) => window.partyAssets
            ? window.partyAssets.escape(value)
            : String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        penalties.forEach(p => {
            const item = document.createElement("div");
            item.className = "penalty-item-row";
            const safeType = Object.prototype.hasOwnProperty.call(iconMap, p.type) ? p.type : 'drink';
            const icon = window.partyAssets
                ? window.partyAssets.icon(iconMap[safeType], 'p-icon', p.badge || 'Án phạt')
                : `<span class="p-icon" aria-hidden="true">${escapeText(p.icon || '•')}</span>`;
            const badge = escapeText(p.badge || p.type);
            item.innerHTML = `
                ${icon}
                <span class="p-badge badge-${safeType}">${badge}</span>
                <span class="p-text"></span>
                <button class="delete-slice-btn" onclick="window.app.deletePenalty(${p.id})">✕</button>
            `;
            const text = item.querySelector('.p-text');
            if (text) text.textContent = this.resolvePenaltyPreview(p.text);
            list.appendChild(item);
        });
    }

    resolvePenaltyPreview(value) {
        const raw = typeof value === 'string' ? value : '';
        const formatter = window.penaltyMedium && window.penaltyMedium.formatText;
        if (!raw || typeof formatter !== 'function') return raw;
        try {
            const preview = formatter.call(window.penaltyMedium, raw, { count: 1 });
            return typeof preview === 'string' ? preview : raw;
        } catch (e) {
            return raw;
        }
    }

    addNewCustomPenalty() {
        const input = document.getElementById("new-penalty-text");
        const typeSelect = document.getElementById("new-penalty-type");
        if (!input || !typeSelect) return;

        const validation = window.penaltyManager.validatePenaltyText(input.value);
        if (!validation.valid) {
            this.setFieldError(input, "new-penalty-error", validation.error);
            input.focus();
            return false;
        }

        const type = typeSelect.value;
        const iconMap = {
            drink: "🍺",
            perform: "🎤",
            dare: "🤫",
            safe: "🛡️"
        };
        const badgeMap = {
            drink: "Mức Nhẹ",
            perform: "Văn Nghệ",
            dare: "Thách Đố",
            safe: "May Mắn"
        };

        const added = window.penaltyManager.addPenalty(validation.value, type, iconMap[type] || "🎯", badgeMap[type]);
        if (!added) return false;
        input.value = "";
        this.setFieldError(input, "new-penalty-error", "");
        this.renderPenaltiesList();
        this.updateApprovedPenaltyOptInUI();
        return true;
    }

    deletePenalty(id) {
        window.penaltyManager.removePenalty(id);
        this.renderPenaltiesList();
        this.updateApprovedPenaltyOptInUI();
    }

    resetPenaltiesToDefault() {
        if (confirm("Khôi phục tất cả án phạt về danh sách mặc định?")) {
            window.penaltyManager.resetToDefault();
            this.renderPenaltiesList();
            this.updateApprovedPenaltyOptInUI();
        }
    }

    // ================= PENALTY MEDIUM ENGINE (VẬT PHẠT BÀN NHẬU) =================
    setupMediumUI() {
        this.renderMediumPresets();
        this.updateHeaderMediumBtn();

        window.addEventListener('penaltyMediumChanged', (e) => {
            this.updateHeaderMediumBtn();
            this.renderMediumPresets();

            if (window.wheelGame && window.wheelGame.setupCanvas) {
                window.wheelGame.setupCanvas();
                window.wheelGame.drawWheel();
            }
            if (window.diceGame && window.diceGame.updatePotDisplay) {
                window.diceGame.updatePotDisplay();
            }
        });
    }

    updateHeaderMediumBtn() {
        const btn = document.getElementById("medium-switcher-btn");
        if (!btn || !window.penaltyMedium) return;
        const cur = window.penaltyMedium.currentMedium;
        btn.textContent = "";
        if (cur.id === "beer") {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "ui-icon");
            svg.setAttribute("aria-hidden", "true");
            const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
            use.setAttribute("href", "assets/icons/game-icons.svg#beer");
            svg.appendChild(use);
            btn.appendChild(svg);
        } else {
            const emoji = document.createElement("span");
            emoji.className = "medium-emoji";
            emoji.setAttribute("aria-hidden", "true");
            emoji.textContent = cur.icon;
            btn.appendChild(emoji);
        }
        const label = document.createElement("span");
        label.className = "medium-label";
        label.textContent = cur.name;
        btn.appendChild(label);
        const caret = document.createElement("span");
        caret.className = "caret";
        caret.setAttribute("aria-hidden", "true");
        caret.textContent = "▼";
        btn.appendChild(caret);
        btn.setAttribute("aria-label", `Đổi vật phạt, hiện tại: ${cur.name}`);
    }

    renderMediumPresets() {
        const grid = document.getElementById("medium-presets-grid");
        if (!grid || !window.penaltyMedium) return;
        grid.innerHTML = "";

        const curId = window.penaltyMedium.currentMedium.id;
        window.penaltyMedium.presets.forEach(p => {
            const btn = document.createElement("button");
            btn.className = `medium-preset-btn ${p.id === curId ? 'active' : ''}`;
            btn.setAttribute("type", "button");

            if (p.id === 'custom') {
                btn.innerHTML = `
                    ${window.partyAssets ? window.partyAssets.icon('custom', 'm-icon') : '<span class="m-icon">✏️</span>'}
                    <span class="m-name">Tùy chỉnh</span>
                    <span class="m-unit">Nhập ở bên dưới</span>
                `;
            } else {
                const mediumIcon = window.partyAssets
                    ? window.partyAssets.icon(p.id, 'm-icon')
                    : `<span class="m-icon">${p.icon}</span>`;
                btn.innerHTML = `
                    ${mediumIcon}
                    <span class="m-name">${p.name}</span>
                    <span class="m-unit">Đơn vị: ${p.unit}</span>
                `;
            }

            let touched = false;
            const onSelect = (e) => {
                if (touched) return;
                touched = true;
                setTimeout(() => { touched = false; }, 350);

                if (p.id === 'custom') {
                    const input = document.getElementById("custom-medium-name");
                    if (input) input.focus();
                    return;
                }

                window.penaltyMedium.setMedium(p.id);
                this.closeModal("medium-modal");
            };

            btn.addEventListener("pointerdown", onSelect);
            btn.addEventListener("click", onSelect);
            grid.appendChild(btn);
        });
    }

    applyCustomMedium() {
        const nameInput = document.getElementById("custom-medium-name");
        const unitInput = document.getElementById("custom-medium-unit");
        if (!nameInput || !unitInput) return;

        const validation = window.penaltyMedium.validateCustomMedium(nameInput.value, unitInput.value);
        this.setFieldError(nameInput, "custom-medium-error", "");
        this.setFieldError(unitInput, "custom-medium-error", "");
        if (!validation.valid) {
            const field = validation.field === "unit" ? unitInput : nameInput;
            this.setFieldError(field, "custom-medium-error", validation.error);
            field.focus();
            return false;
        }

        const changed = window.penaltyMedium.setCustomMedium(validation.name, validation.unit, "🎯");
        if (!changed) {
            this.closeModal("medium-modal");
            return false;
        }
        nameInput.value = "";
        unitInput.value = "";
        this.closeModal("medium-modal");
        return true;
    }
    // ================= PARTY SESSION PRESETS (KIỂU BÀN NHẬU) =================
    setupPresetSelector() {
        this.presetGroup = document.getElementById("party-preset-group");
        this.presetLiveRegion = document.getElementById("party-preset-live");
        this.presetAnnouncement = null;
        this.presetAnnounceReady = false;
        if (this.presetGroup) {
            this.presetGroup.addEventListener("click", (event) => {
                const chip = event.target.closest(".preset-chip");
                if (chip && chip.dataset.preset) this.applyPartyPreset(chip.dataset.preset);
            });
            this.presetGroup.addEventListener("keydown", (event) => this.handlePresetGroupKeydown(event));
        }
        // One sync per real state change; the SPA keeps a single Home for the
        // whole lifetime, so these listeners are registered exactly once.
        window.addEventListener("partySessionChanged", () => this.syncPresetSelector());
        window.addEventListener("penaltyMediumChanged", () => this.syncPresetSelector());
        window.addEventListener("penaltyCategoriesChanged", () => this.syncPresetSelector());
        this.syncPresetSelector();
    }

    // Radiogroup keyboard pattern: arrows move focus between chips, the
    // activation itself stays on Enter/Space/click so browsing presets never
    // applies one by accident.
    handlePresetGroupKeydown(event) {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        const chips = Array.from(this.presetGroup.querySelectorAll(".preset-chip")).filter((chip) => !chip.hidden);
        if (!chips.length) return;
        event.preventDefault();
        const step = (event.key === "ArrowRight" || event.key === "ArrowDown") ? 1 : -1;
        const currentIndex = chips.indexOf(document.activeElement);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + step + chips.length) % chips.length;
        chips[nextIndex].focus();
    }

    applyPartyPreset(presetId) {
        const session = window.partySession;
        const medium = window.penaltyMedium;
        const manager = window.penaltyManager;
        if (!session) return;
        const preset = session.getBuiltInPreset(presetId);
        if (!preset) return;

        const needsMedium = Boolean(medium) && medium.currentMediumId !== preset.mediumId;
        const needsCategories = Boolean(manager) && !this.categoriesMatchIntent(manager.categories, preset.categories);

        // D4: never mutate medium/categories/preset while a Wheel result is pending.
        // Changing medium no longer writes into the custom Wheel snapshot.
        if (window.wheelGame && (window.wheelGame.isSpinning
            || window.wheelGame.resultTimeout !== null)) return;

        // Side effects first, session last: the final partySessionChanged sync
        // then resolves against an already-matching medium/categories, so the
        // row never flashes "Tùy Chỉnh" for the preset being applied.
        if (needsMedium) medium.setMedium(preset.mediumId);
        if (needsCategories) manager.setCategories(preset.categories);
        session.applyPreset(presetId, "ui");
    }

    categoriesMatchIntent(current, intent) {
        return ["drink", "perform", "dare", "safe"].every(
            (key) => Boolean(current && current[key]) === Boolean(intent[key])
        );
    }

    syncPresetSelector() {
        const session = window.partySession;
        if (!session || !this.presetGroup) return;
        const active = session.resolveActiveState();

        this.presetGroup.querySelectorAll(".preset-chip").forEach((chip) => {
            const isCustomChip = !chip.dataset.preset;
            if (isCustomChip) {
                chip.hidden = !active.isCustom;
                chip.setAttribute("aria-checked", active.isCustom ? "true" : "false");
            } else {
                const checked = !active.isCustom && chip.dataset.preset === active.presetId;
                chip.classList.toggle("active", checked);
                chip.setAttribute("aria-checked", checked ? "true" : "false");
            }
        });

        // Home reflects the session game set; the category filter chips keep
        // filtering inside it, so the two hidden classes compose with AND.
        const allowed = new Set(active.games);
        document.querySelectorAll(".game-card").forEach((card) => {
            card.classList.toggle("is-preset-hidden", !allowed.has(card.dataset.game));
        });

        const visibleCount = document.querySelectorAll(".game-card:not(.is-preset-hidden):not(.is-filtered-out)").length;
        const countEl = document.getElementById("game-count");
        if (countEl) countEl.textContent = `${visibleCount} trò`;
        const emptyState = document.getElementById("games-empty-state");
        if (emptyState) emptyState.hidden = visibleCount !== 0;

        // Announce only real transitions; re-renders with the same state stay
        // silent, and the first sync after boot never talks over the app.
        const stateKey = active.isCustom ? "custom" : active.presetId;
        if (this.presetAnnounceReady && this.presetLiveRegion && this.presetAnnouncement !== stateKey) {
            this.presetLiveRegion.textContent = active.isCustom
                ? `Kiểu bàn nhậu hiện tại: Tùy chỉnh, ${active.games.length} trò`
                : `Đã chọn kiểu bàn nhậu: ${active.label}, ${active.games.length} trò`;
        }
        this.presetAnnouncement = stateKey;
        this.presetAnnounceReady = true;
    }
}

// G17 generated Hosted PWA: the verified guard owns the single app start.
window.__g17StartApp = function () {
    if (window.__g17AppStarted) return window.app || null;
    window.__g17AppStarted = true;
    window.app = new PartyApp();
    return window.app;
};
