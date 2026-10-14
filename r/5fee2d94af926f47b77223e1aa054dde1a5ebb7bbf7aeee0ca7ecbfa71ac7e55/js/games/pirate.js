/**
 * Pirate Barrel Game (Thùng Hải Tặc Đâm Kiếm)
 * Interactive party game where players take turns inserting swords into barrel slots.
 * One or more slots trigger the spring-loaded pirate to launch into the air!
 */

class PirateGame {
    constructor() {
        // Memory-only selection: 8/12/16 physical slots, default 12 on fresh load.
        this.totalSlots = 12;
        this.trapCount = 1;
        this.traps = new Set();
        this.insertedSlots = new Set();
        this.isGameOver = false;
        this.turn = 1;
        this.roundId = 0;
        this.pendingTimeouts = new Set();

        this.swordColors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#9b59b6', '#e056fd'];

        this.initDOM();
    }

    initDOM() {
        this.screen = document.getElementById('screen-pirate');
        if (!this.screen) return;

        this.pirateChar = document.getElementById('pirate-character');
        this.barrelContainer = document.getElementById('pirate-barrel');
        this.slotsContainer = document.getElementById('pirate-slots-grid');
        this.statusEl = document.getElementById('pirate-status');
        this.turnEl = document.getElementById('pirate-turn-indicator');
        this.resetBtn = document.getElementById('pirate-reset-btn');
        this.trapSelect = document.getElementById('pirate-trap-select');
        this.slotCountSelect = document.getElementById('pirate-slot-count-select');
        this.badgeEl = document.getElementById('pirate-epic-badge');
        this.penaltyBanner = document.getElementById('pirate-penalty-banner');

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                this.reset();
            });
        }

        if (this.trapSelect) {
            this.trapSelect.addEventListener('change', (e) => {
                const next = Number(e.target.value);
                this.trapCount = [1, 2, 3].includes(next) ? next : 1;
                this.reset();
            });
        }

        if (this.slotCountSelect) {
            this.slotCountSelect.value = String(this.totalSlots);
            this.slotCountSelect.addEventListener('change', (e) => {
                const next = Number(e.target.value);
                this.totalSlots = [8, 12, 16].includes(next) ? next : 12;
                this.slotCountSelect.value = String(this.totalSlots);
                this.reset();
            });
        }
    }

    start() {
        this.reset();
    }

    reset() {
        this.clearPendingCallbacks();
        this.roundId += 1;
        this.isGameOver = false;
        this.turn = 1;
        this.insertedSlots.clear();
        this.traps.clear();

        // Randomize trap slots
        const available = [];
        for (let i = 0; i < this.totalSlots; i++) available.push(i);
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        for (let i = 0; i < Math.min(this.trapCount, this.totalSlots - 1); i++) {
            this.traps.add(available[i]);
        }

        // Reset visual elements
        if (this.pirateChar) {
            this.pirateChar.classList.remove('pirate-launched', 'pirate-wobble');
            this.pirateChar.style.transform = '';
        }
        if (this.barrelContainer) {
            this.barrelContainer.classList.remove('barrel-shaking');
        }
        if (this.badgeEl) {
            this.badgeEl.classList.remove('badge-active');
            this.badgeEl.style.display = 'none';
        }
        if (this.penaltyBanner) {
            this.penaltyBanner.style.display = 'none';
            this.penaltyBanner.innerHTML = '';
        }

        this.updateStatus();
        this.renderSlots();
    }

    renderSlots() {
        if (!this.slotsContainer) return;
        // CSS arranges the real sockets in 4 columns and 2/3/4 balanced rows.
        this.slotsContainer.dataset.slots = String(this.totalSlots);

        // High-Performance Optimization: Reuse existing slots if already created
        const existingSlots = this.slotsContainer.querySelectorAll('.pirate-slot-btn');
        if (existingSlots.length === this.totalSlots) {
            existingSlots.forEach(slot => {
                slot.classList.remove('slot-used');
                const sword = slot.querySelector('.inserted-sword');
                if (sword) sword.classList.remove('sword-inserted');
            });
            return;
        }

        this.slotsContainer.innerHTML = '';

        for (let i = 0; i < this.totalSlots; i++) {
            const slot = document.createElement('button');
            slot.className = 'pirate-slot-btn';
            slot.dataset.index = i;
            slot.setAttribute('aria-label', `Khe cắm ${i + 1}`);

            const slotHole = document.createElement('div');
            slotHole.className = 'slot-hole';

            const sword = document.createElement('div');
            sword.className = 'inserted-sword';
            sword.id = `sword-${i}`;

            slot.appendChild(slotHole);
            slot.appendChild(sword);

            // Fast tap handler
            const clickHandler = (e) => {
                if (e && e.cancelable) e.preventDefault();
                this.handleSlotClick(i, slot, sword);
            };
            slot.addEventListener('pointerdown', clickHandler);
            slot.addEventListener('click', clickHandler);

            this.slotsContainer.appendChild(slot);
        }
    }

    handleSlotClick(index, slotEl, swordEl) {
        if (index < 0 || index >= this.totalSlots || !this.slotsContainer?.contains(slotEl) || this.isGameOver || this.insertedSlots.has(index)) return;

        this.insertedSlots.add(index);
        slotEl.classList.add('slot-used');

        // Color the sword randomly with vivid party tones
        const color = this.swordColors[index % this.swordColors.length];
        swordEl.style.setProperty('--sword-color', color);
        
        // Realistic 3D stabbed sword angles
        const angles = [-14, 8, -6, 12, 15, -10, 6, -15, -8, 14, -12, 7, 11, -5, 13, -11];
        const angle = angles[index % angles.length];
        swordEl.style.setProperty('--sword-angle', `${angle}deg`);

        swordEl.classList.add('sword-inserted');

        if (this.traps.has(index)) {
            // TRIGGER TRAP!
            this.triggerExplosion(index, slotEl);
        } else {
            // SAFE INSERTION
            if (window.soundEngine) window.soundEngine.playSwordInsert();
            
            // Tiny pirate peek/reaction
            if (this.pirateChar) {
                this.pirateChar.classList.add('pirate-wobble');
                this.schedule(() => this.pirateChar.classList.remove('pirate-wobble'), 350);
            }

            this.turn++;
            this.updateStatus();

            // Check if all safe slots used
            if (this.insertedSlots.size >= this.totalSlots - this.traps.size) {
                this.handleAllSafeWon();
            }
        }
    }

    triggerExplosion(index, slotEl) {
        this.isGameOver = true;

        if (window.soundEngine) {
            window.soundEngine.playPiratePop();
        }

        // Barrel violent shake
        if (this.barrelContainer) {
            this.barrelContainer.classList.add('barrel-shaking');
        }

        // Pirate spring flight!
        if (this.pirateChar) {
            this.pirateChar.classList.remove('pirate-wobble');
            this.pirateChar.classList.add('pirate-launched');
        }

        // Comic Badge
        if (this.badgeEl) {
            this.badgeEl.style.display = 'flex';
            this.badgeEl.innerHTML = `
                <div class="badge-title">HẢI TẶC BẬT TUNG!</div>
                <div class="badge-sub">Bạn đã chọc trúng lò xo của Hải Tặc!</div>
            `;
            this.schedule(() => this.badgeEl.classList.add('badge-active'), 50);
        }

        // Penalty Banner formatted with active medium
        const count = Math.floor(Math.random() * 2) + 1; // 1 or 2
        let penaltyText = '';
        if (window.penaltyMedium) {
            penaltyText = window.penaltyMedium.formatText('{count} {unit}', { count: count });
        } else {
            penaltyText = 'Thực hiện một án phạt nhẹ';
        }
        const safePenaltyText = window.partyAssets
            ? window.partyAssets.escape(penaltyText)
            : String(penaltyText).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        if (this.penaltyBanner) {
            this.penaltyBanner.innerHTML = `
                <div class="penalty-pill-epic">
                    ${window.partyAssets ? window.partyAssets.icon('bolt', 'penalty-icon') : '<span class="penalty-icon">!</span>'}
                    <span class="penalty-main">${safePenaltyText}</span>
                    <button class="btn-primary mini-retry" onclick="window.pirateGame.reset()">CHƠI LẠI</button>
                </div>
            `;
            this.penaltyBanner.style.display = 'block';
        }

        if (this.statusEl) {
            this.statusEl.innerHTML = `<span class="danger-text">HẢI TẶC BẬT NẮP! Người đâm kiếm lượt này nhận kết quả.</span>`;
        }

        this.recordHistory({
            type: 'penalty',
            gameId: 'pirate',
            label: penaltyText,
            detail: { outcome: 'trap', unitCount: count }
        }, `pirate:${this.roundId}:result`);
    }

    schedule(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.pendingTimeouts.delete(timeoutId);
            callback();
        }, delay);
        this.pendingTimeouts.add(timeoutId);
        return timeoutId;
    }

    clearPendingCallbacks() {
        this.pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        this.pendingTimeouts.clear();
    }

    stop() {
        this.clearPendingCallbacks();
        this.pirateChar?.classList.remove('pirate-wobble');
        this.barrelContainer?.classList.remove('barrel-shaking');
        this.badgeEl?.classList.remove('badge-active');
    }

    handleAllSafeWon() {
        this.isGameOver = true;
        if (window.soundEngine) window.soundEngine.playWin();

        if (this.statusEl) {
            this.statusEl.innerHTML = `<span class="success-text">ĐÃ HẾT KHE AN TOÀN. Ván chơi kết thúc.</span>`;
        }

        let cheerText = 'Cả bàn cùng vỗ tay ba nhịp.';
        if (this.penaltyBanner) {
            if (window.penaltyMedium) {
                cheerText = window.penaltyMedium.currentMedium.allAction;
            }
            const safeCheerText = window.partyAssets
                ? window.partyAssets.escape(cheerText)
                : String(cheerText).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            this.penaltyBanner.innerHTML = `
                <div class="penalty-pill-epic win">
                    ${window.partyAssets ? window.partyAssets.icon('crown', 'penalty-icon') : '<span class="penalty-icon">★</span>'}
                    <span class="penalty-main">${safeCheerText}</span>
                    <button class="btn-primary mini-retry" onclick="window.pirateGame.reset()">LƯỢT MỚI</button>
                </div>
            `;
            this.penaltyBanner.style.display = 'block';
        }

        this.recordHistory({
            type: 'game_result',
            gameId: 'pirate',
            label: cheerText,
            detail: { outcome: 'all-safe', trapCount: this.traps.size, totalSlots: this.totalSlots }
        }, `pirate:${this.roundId}:result`);
    }

    recordHistory(event, dedupeKey) {
        if (!window.sessionHistory || typeof window.sessionHistory.record !== 'function') return;
        try {
            window.sessionHistory.record(event, { dedupeKey });
        } catch (e) {
            // History is observational; a store failure must not break Pirate.
        }
    }

    updateStatus() {
        const remainingSafe = (this.totalSlots - this.traps.size) - (this.insertedSlots.size);
        if (this.turnEl) {
            this.turnEl.textContent = `Lượt đâm: ${this.turn}`;
        }
        if (this.statusEl && !this.isGameOver) {
            this.statusEl.textContent = `Còn ${remainingSafe} khe an toàn. Chọn khe để cắm kiếm!`;
        }
    }
}

// Global instance
window.pirateGame = new PirateGame();
