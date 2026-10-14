/**
 * Number Bomb Game (Bom Số Bí Mật 1 - 100)
 * Classic Vietnamese drinking party game where players narrow down a mystery number range.
 * Guessing the exact secret number detonates the bomb!
 */

class NumberBombGame {
    constructor() {
        this.maxLimit = 100;
        this.minVal = 1;
        this.maxVal = 100;
        this.secretNumber = 50;
        this.turns = 0;
        this.currentInput = '';
        this.isGameOver = false;
        this.shakeTimeout = null;
        this.roundId = 0;

        this.initDOM();
    }

    initDOM() {
        this.screen = document.getElementById('screen-numberbomb');
        if (!this.screen) return;

        this.minDisplay = document.getElementById('nbomb-min');
        this.maxDisplay = document.getElementById('nbomb-max');
        this.inputDisplay = document.getElementById('nbomb-input');
        this.bombIcon = document.getElementById('nbomb-icon');
        this.turnBadge = document.getElementById('nbomb-turn-badge');
        this.rangeSelect = document.getElementById('nbomb-range-select');
        this.resultBanner = document.getElementById('nbomb-result-banner');
        this.dangerBar = document.getElementById('nbomb-danger-bar');
        this.statusText = document.getElementById('nbomb-status');
        this.resetBtn = document.getElementById('nbomb-reset-btn');

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                this.reset();
            });
        }

        if (this.rangeSelect) {
            this.rangeSelect.addEventListener('change', (e) => {
                this.maxLimit = parseInt(e.target.value, 10) || 100;
                this.reset();
            });
        }

        // Setup Virtual Numpad
        const numpad = document.getElementById('nbomb-numpad');
        if (numpad) {
            numpad.addEventListener('click', (e) => {
                const btn = e.target.closest('.numpad-btn');
                if (!btn) return;
                const val = btn.dataset.key;
                this.handleKey(val);
            });
        }
    }

    start() {
        this.reset();
    }

    reset() {
        this.stop();
        this.roundId += 1;
        this.isGameOver = false;
        this.minVal = 1;
        this.maxVal = this.maxLimit;
        this.turns = 1;
        this.currentInput = '';

        // Generate mystery number strictly inside (minVal, maxVal)
        this.secretNumber = Math.floor(Math.random() * (this.maxLimit - 2)) + 2;

        if (this.bombIcon) {
            this.bombIcon.classList.remove('bomb-exploding', 'bomb-heartbeat-fast', 'bomb-heartbeat-extreme');
            this.bombIcon.querySelector('use')?.setAttribute('href', 'assets/icons/game-icons.svg#bomb');
        }

        if (this.resultBanner) {
            this.resultBanner.style.display = 'none';
            this.resultBanner.innerHTML = '';
        }

        this.updateDisplay();
        if (this.statusText) {
            this.statusText.textContent = `Nhập số trong khoảng từ ${this.minVal} đến ${this.maxVal}:`;
        }
    }

    handleKey(key) {
        if (this.isGameOver) return;

        if (key === 'clear') {
            this.currentInput = '';
            if (window.soundEngine) window.soundEngine.playClick();
        } else if (key === 'back') {
            this.currentInput = this.currentInput.slice(0, -1);
            if (window.soundEngine) window.soundEngine.playClick();
        } else if (key === 'enter') {
            this.submitGuess();
            return;
        } else if (!isNaN(parseInt(key, 10))) {
            if (this.currentInput.length < 4) {
                this.currentInput += key;
                if (window.soundEngine) window.soundEngine.playClick();
            }
        }

        this.updateInputDisplay();
    }

    updateInputDisplay() {
        if (this.inputDisplay) {
            this.inputDisplay.textContent = this.currentInput || '—';
        }
    }

    submitGuess() {
        if (!this.currentInput) return;
        const guess = parseInt(this.currentInput, 10);
        this.currentInput = '';
        this.updateInputDisplay();

        if (isNaN(guess) || guess <= this.minVal || guess >= this.maxVal) {
            if (window.soundEngine) window.soundEngine.playClick();
            if (this.inputDisplay) {
                this.inputDisplay.classList.add('input-shake');
                this.shakeTimeout = setTimeout(() => {
                    this.shakeTimeout = null;
                    this.inputDisplay.classList.remove('input-shake');
                }, 300);
            }
            if (this.statusText) {
                this.statusText.innerHTML = `<span class="danger-text">Vui lòng đoán số TRONG KHOẢNG (${this.minVal} - ${this.maxVal})!</span>`;
            }
            return;
        }

        if (guess === this.secretNumber) {
            // EXPLOSION!
            this.triggerExplosion(guess);
        } else {
            // SAFE! Narrow down
            if (guess < this.secretNumber) {
                this.minVal = guess;
            } else {
                this.maxVal = guess;
            }

            this.turns++;
            if (window.soundEngine) {
                window.soundEngine.playNumberSafe();
            }

            this.updateDisplay();
            this.checkTensionLevel();
        }
    }

    checkTensionLevel() {
        const remaining = this.maxVal - this.minVal;
        if (!this.bombIcon) return;

        this.bombIcon.classList.remove('bomb-heartbeat-fast', 'bomb-heartbeat-extreme');

        if (remaining <= 6) {
            this.bombIcon.classList.add('bomb-heartbeat-extreme');
            if (window.soundEngine) window.soundEngine.playHeartbeat(1.8);
            if (this.statusText) {
                this.statusText.innerHTML = `<span class="danger-text">SẮP TÌM THẤY! Chỉ còn ${remaining - 1} số có thể chọn.</span>`;
            }
        } else if (remaining <= 15) {
            this.bombIcon.classList.add('bomb-heartbeat-fast');
            if (window.soundEngine) window.soundEngine.playHeartbeat(1.3);
            if (this.statusText) {
                this.statusText.innerHTML = `<span class="warn-text">Khoảng số đã thu hẹp. Mời người tiếp theo đoán.</span>`;
            }
        } else {
            if (window.soundEngine) window.soundEngine.playHeartbeat(0.9);
            if (this.statusText) {
                this.statusText.textContent = `Lượt ${this.turns}: Tiếp tục chuyền máy cho người kế tiếp!`;
            }
        }
    }

    stop() {
        if (this.shakeTimeout !== null) {
            clearTimeout(this.shakeTimeout);
            this.shakeTimeout = null;
        }
        if (this.inputDisplay) this.inputDisplay.classList.remove('input-shake');
    }

    updateDisplay() {
        if (this.minDisplay) this.minDisplay.textContent = this.minVal;
        if (this.maxDisplay) this.maxDisplay.textContent = this.maxVal;
        if (this.turnBadge) this.turnBadge.textContent = `Lượt: ${this.turns}`;

        // Update visual danger bar width
        if (this.dangerBar) {
            const pct = Math.max(5, Math.min(100, ((this.maxVal - this.minVal) / this.maxLimit) * 100));
            this.dangerBar.style.width = `${pct}%`;
            if (pct < 15) {
                this.dangerBar.style.background = 'linear-gradient(90deg, #ff0055, #ff3838)';
            } else if (pct < 40) {
                this.dangerBar.style.background = 'linear-gradient(90deg, #ffae00, #ff5500)';
            } else {
                this.dangerBar.style.background = 'linear-gradient(90deg, #00f0ff, #7158e2)';
            }
        }
    }

    triggerExplosion(guess) {
        this.isGameOver = true;
        if (window.soundEngine) {
            window.soundEngine.playExplosion();
        }

        if (this.bombIcon) {
            this.bombIcon.querySelector('use')?.setAttribute('href', 'assets/icons/game-icons.svg#bolt');
            this.bombIcon.classList.add('bomb-exploding');
        }

        let penaltyText = 'thực hiện một án phạt nhẹ';
        if (window.penaltyMedium) {
            penaltyText = window.penaltyMedium.formatText('{verb} {unit_light}');
        }
        const safePenaltyText = window.partyAssets
            ? window.partyAssets.escape(penaltyText)
            : String(penaltyText).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        if (this.resultBanner) {
            this.resultBanner.innerHTML = `
                <div class="nbomb-epic-pill">
                    ${window.partyAssets ? window.partyAssets.icon('bolt', 'pill-icon') : '<span class="pill-icon">!</span>'}
                    <div class="pill-content">
                        <strong>BÙM! TRÚNG SỐ BÍ MẬT [${guess}]</strong>
                        <p>Người đoán số ${guess} nhận kết quả: <strong>${safePenaltyText}</strong> hoặc bỏ qua.</p>
                    </div>
                    <button class="btn-primary mini-retry" onclick="window.numberBombGame.reset()">CHƠI LẠI</button>
                </div>
            `;
            this.resultBanner.style.display = 'block';
        }

        if (this.statusText) {
            this.statusText.innerHTML = `<span class="danger-text">BOM ĐÃ NỔ TẠI SỐ ${guess}. Lượt chơi kết thúc.</span>`;
        }

        this.recordHistory({
            type: 'penalty',
            gameId: 'numberbomb',
            label: `Trúng số bí mật [${guess}]: ${penaltyText}`,
            detail: { guess, turns: this.turns },
        }, `numberbomb:${this.roundId}:result`);
    }

    recordHistory(event, dedupeKey) {
        if (!window.sessionHistory || typeof window.sessionHistory.record !== 'function') return;
        try {
            window.sessionHistory.record(event, { dedupeKey });
        } catch (error) {
            // History is observational; a store failure must not break Number Bomb.
        }
    }
}

// Global instance
window.numberBombGame = new NumberBombGame();
