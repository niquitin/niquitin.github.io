/**
 * Spin The Bottle Game 3D (Xoay Chai Bật Nắp)
 * Interactive party bottle spinner with realistic physics, inertial deceleration,
 * multiple bottle skins (Beer, Whisky, Soju, Wine), and Single / Duel modes.
 */

class SpinBottleGame {
    // Cap is first in the flex-column graphic: 0deg points up (12 o'clock).
    // CSS origin is 50% 50%; positive rotate() is clockwise; no base rotation.
    static HEAD_ORIENTATION_OFFSET_DEG = 0;

    static seatForVisualAngle(visualAngle, seatCount) {
        if (!Number.isFinite(visualAngle) || !Number.isInteger(seatCount) || seatCount < 2 || seatCount > 12) return null;
        const headDirection = ((visualAngle + SpinBottleGame.HEAD_ORIENTATION_OFFSET_DEG) % 360 + 360) % 360;
        // Half-open sectors: an exact boundary belongs to its clockwise seat.
        // Round only floating-point noise at a boundary, not nearby angles.
        const sector = headDirection * seatCount / 360 + 0.5;
        const nearest = Math.round(sector);
        const stableSector = Math.abs(sector - nearest) <= Number.EPSILON * 32 ? nearest : sector;
        return (Math.floor(stableSector) % seatCount) + 1;
    }

    constructor() {
        this.bottleType = 'beer'; // beer, whisky, soju, wine
        this.mode = 'single';     // single, duel
        this.angle = 0;           // current rotation in degrees
        this.angularVelocity = 0; // speed of rotation
        this.isSpinning = false;
        this.runId = 0;
        this.animId = null;
        this.seatCount = 4; // memory-only; a fresh runtime always starts at four
        this.activeTurn = null;
        this.dragTouchId = null;

        // Touch swipe tracking
        this.isDragging = false;
        this.lastPointerAngle = 0;
        this.pointerVelocity = 0;

        this.initDOM();
    }

    initDOM() {
        this.screen = document.getElementById('screen-bottle');
        if (!this.screen) return;

        this.bottleWrapper = document.getElementById('bottle-wrapper');
        this.bottleEl = document.getElementById('bottle-3d');
        this.spinBtn = document.getElementById('bottle-spin-btn');
        this.typeSelect = document.getElementById('bottle-type-select');
        this.modeSelect = document.getElementById('bottle-mode-select');
        this.seatSelect = document.getElementById('bottle-seat-count');
        this.seatRing = document.getElementById('bottle-seats');
        this.resultBanner = document.getElementById('bottle-result-banner');
        this.statusText = document.getElementById('bottle-status');

        if (this.spinBtn) {
            this.spinBtn.addEventListener('click', () => this.spin());
        }

        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', (e) => {
                this.setBottleType(e.target.value);
            });
        }

        if (this.modeSelect) {
            this.modeSelect.addEventListener('change', (e) => {
                this.setMode(e.target.value);
            });
        }
        if (this.seatSelect) this.seatSelect.addEventListener('change', (e) => this.setSeatCount(Number(e.target.value)));

        this.renderSeats();
        this.setupTouchDrag();
    }

    setupTouchDrag() {
        if (!this.bottleWrapper) return;

        const getAngleFromEvent = (e) => {
            const rect = this.bottleWrapper.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const pointer = e.touches ? Array.from(e.touches).find((touch) => touch.identifier === this.dragTouchId) : e;
            if (!pointer) return null;
            const clientX = pointer.clientX;
            const clientY = pointer.clientY;
            return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
        };

        const onStart = (e) => {
            if (this.activeTurn || (e.button !== undefined && e.button !== 0)) return;
            this.dragTouchId = e.touches ? e.touches[0].identifier : null;
            if (!this.beginTurn()) return;
            this.isDragging = true;
            this.lastPointerAngle = getAngleFromEvent(e);
            this.pointerVelocity = 0;
        };

        const onMove = (e) => {
            if (!this.isDragging || this.isSpinning) return;
            const currentAngle = getAngleFromEvent(e);
            if (currentAngle === null) return;
            let diff = currentAngle - this.lastPointerAngle;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            this.angle += diff;
            this.pointerVelocity = diff;
            this.lastPointerAngle = currentAngle;
            this.applyRotation(this.angle);
        };

        const onEnd = (e) => {
            if (!this.isDragging) return;
            if (e.changedTouches && !Array.from(e.changedTouches).some((touch) => touch.identifier === this.dragTouchId)) return;
            if (!e.changedTouches && this.dragTouchId !== null) return;
            this.isDragging = false;
            this.dragTouchId = null;
            // If swiped with noticeable speed, trigger spin with flick velocity
            if (Math.abs(this.pointerVelocity) > 4) {
                const boost = Math.sign(this.pointerVelocity) * (Math.abs(this.pointerVelocity) * 2.5 + 25);
                this.spinWithVelocity(boost);
            } else {
                this.stop();
                this.updateModeHint();
            }
        };

        this.bottleWrapper.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);

        this.bottleWrapper.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', () => {
            if (!this.isDragging) return;
            this.stop();
            this.updateModeHint();
        });
    }

    start() {
        this.stop();
        this.setBottleType(this.bottleType);
        this.updateModeHint();
        this.renderSeats();
        if (this.resultBanner) {
            this.resultBanner.style.display = 'none';
        }
    }

    setBottleType(type) {
        if (this.activeTurn || !['beer', 'whisky', 'soju', 'wine'].includes(type)) {
            this.syncSetup();
            return false;
        }
        this.bottleType = type;
        if (this.bottleEl) this.bottleEl.className = `bottle-3d bottle-${type}`;
        this.syncSetup();
        return true;
    }

    setMode(mode) {
        if (this.activeTurn || !['single', 'duel'].includes(mode)) {
            this.syncSetup();
            return false;
        }
        this.mode = mode;
        this.clearResult();
        this.syncSetup();
        this.updateModeHint();
        return true;
    }

    setSeatCount(count) {
        if (this.activeTurn || !Number.isInteger(count) || count < 2 || count > 12) {
            this.syncSetup();
            return false;
        }
        this.seatCount = count;
        this.clearResult();
        this.renderSeats();
        this.syncSetup();
        this.updateModeHint();
        return true;
    }

    syncSetup() {
        const setup = this.activeTurn || this;
        [[this.typeSelect, setup.bottleType], [this.modeSelect, setup.mode], [this.seatSelect, setup.seatCount]].forEach(([control, value]) => {
            if (!control) return;
            control.value = String(value);
            control.disabled = Boolean(this.activeTurn);
        });
        if (this.spinBtn) this.spinBtn.disabled = Boolean(this.activeTurn);
    }

    clearResult() {
        if (this.resultBanner) this.resultBanner.style.display = 'none';
        this.renderSeats();
    }

    renderSeats(result = null) {
        if (!this.seatRing) return;
        const count = result ? result.seatCount : (this.activeTurn || this).seatCount;
        this.seatRing.replaceChildren();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('aria-hidden', 'true');
        svg.classList.add('bottle-sector-map');
        for (let index = 0; index < count; index += 1) {
            const seat = index + 1;
            const angle = index * 360 / count;
            const point = (degrees, radius) => {
                const rad = degrees * Math.PI / 180;
                return [50 + Math.sin(rad) * radius, 50 - Math.cos(rad) * radius];
            };
            const from = point(angle - 180 / count, 49);
            const to = point(angle + 180 / count, 49);
            const selected = Boolean(result && (seat === result.headSeat || seat === result.tailSeat));
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M50 50 L${from.join(' ')} A49 49 0 0 1 ${to.join(' ')} Z`);
            if (selected) path.classList.add('is-selected');
            svg.appendChild(path);
            const label = document.createElement('span');
            label.className = `bottle-seat${selected ? ' is-selected' : ''}`;
            label.dataset.seat = String(seat);
            label.textContent = String(seat);
            label.setAttribute('aria-label', `Người số ${seat}${selected ? ', được chọn' : ''}`);
            const position = point(angle, 43);
            label.style.left = `${position[0]}%`;
            label.style.top = `${position[1]}%`;
            this.seatRing.appendChild(label);
        }
        this.seatRing.prepend(svg);
    }

    beginTurn() {
        if (this.activeTurn) return null;
        const runId = ++this.runId;
        this.activeTurn = Object.freeze({ runId, seatCount: this.seatCount, mode: this.mode, bottleType: this.bottleType });
        this.clearResult();
        this.syncSetup();
        if (this.bottleEl) this.bottleEl.style.transition = '';
        return this.activeTurn;
    }

    updateModeHint() {
        if (!this.statusText) return;
        if (this.mode === 'duel') {
            this.statusText.textContent = this.seatCount === 2
                ? 'ĐỐI ĐẦU: cả hai người đều được chọn.'
                : 'ĐỐI ĐẦU: đầu và đuôi chai chọn hai số trên vòng.';
        } else {
            this.statusText.textContent = 'Ghế 1 ở 12 giờ; đánh số theo chiều kim đồng hồ. Vuốt hoặc bấm XOAY CHAI.';
        }
    }

    spin() {
        if (this.activeTurn) return;
        // Existing RNG: 40..65 deg/frame, random clockwise/counter direction.
        const dir = Math.random() > 0.5 ? 1 : -1;
        const vel = (Math.random() * 25 + 40) * dir;
        this.spinWithVelocity(vel);
    }

    spinWithVelocity(initialVelocity) {
        if (this.isSpinning) return;
        const turn = this.activeTurn || this.beginTurn();
        const runId = turn.runId;
        this.isSpinning = true;
        this.angularVelocity = initialVelocity;

        if (this.spinBtn) this.spinBtn.disabled = true;
        if (this.resultBanner) this.resultBanner.style.display = 'none';

        if (window.soundEngine) {
            window.soundEngine.playBottleSpin();
        }

        let friction = 0.982; // damping factor per frame

        const animate = () => {
            this.animId = null;
            if (runId !== this.runId) return;
            this.angle += this.angularVelocity;
            this.angularVelocity *= friction;

            this.applyRotation(this.angle);

            if (Math.abs(this.angularVelocity) > 0.15) {
                this.animId = requestAnimationFrame(animate);
            } else {
                this.angularVelocity = 0;
                // Remove the 50ms CSS interpolation at the SAME final angle.
                // Flush its final style; publish only on the next guarded frame.
                if (this.bottleEl) {
                    this.bottleEl.style.transition = 'none';
                    this.applyRotation(this.angle);
                    void this.bottleEl.offsetWidth;
                }
                this.animId = requestAnimationFrame(() => {
                    this.animId = null;
                    if (runId !== this.runId) return;
                    this.onSpinComplete(runId);
                });
            }
        };

        this.animId = requestAnimationFrame(animate);
    }

    stop() {
        this.runId += 1;
        if (this.animId !== null) cancelAnimationFrame(this.animId);
        this.animId = null;
        this.isSpinning = false;
        this.isDragging = false;
        this.angularVelocity = 0;
        this.pointerVelocity = 0;
        this.dragTouchId = null;
        this.activeTurn = null;
        this.syncSetup();
        this.clearResult();
    }

    applyRotation(deg) {
        if (!this.bottleEl) return;
        this.bottleEl.style.transform = `rotate(${deg}deg)`;
    }

    onSpinComplete(runId = this.runId) {
        if (runId !== this.runId) return;
        const turn = this.activeTurn;
        if (!turn || turn.runId !== runId || !this.isSpinning || this.angularVelocity !== 0) return;
        const headSeat = SpinBottleGame.seatForVisualAngle(this.angle, turn.seatCount);
        const tailSeat = turn.mode === 'duel' ? SpinBottleGame.seatForVisualAngle(this.angle + 180, turn.seatCount) : undefined;
        const result = { ...turn, headSeat, ...(tailSeat === undefined ? {} : { tailSeat }) };
        this.isSpinning = false;
        this.activeTurn = null; // consume before History dispatch can re-enter
        this.seatCount = turn.seatCount;
        this.mode = turn.mode;
        this.bottleType = turn.bottleType;
        this.syncSetup();
        this.renderSeats(result);
        if (window.soundEngine) {
            window.soundEngine.playBottlePop();
        }

        let penaltyText = 'thực hiện một án phạt nhẹ';
        if (window.penaltyMedium) {
            penaltyText = window.penaltyMedium.formatText('{verb} {unit_light}');
        }
        const safePenaltyText = window.partyAssets
            ? window.partyAssets.escape(penaltyText)
            : String(penaltyText).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        if (this.resultBanner) {
            if (turn.mode === 'duel') {
                this.resultBanner.innerHTML = `
                    <div class="bottle-epic-pill duel">
                        ${window.partyAssets ? window.partyAssets.icon('bolt', 'pill-icon') : '<span class="pill-icon">+</span>'}
                        <div class="pill-content">
                            <strong>Người số ${headSeat} và ${tailSeat}</strong>
                            <p>${turn.seatCount === 2 ? 'Cả hai người đều được chọn. ' : 'Đầu và đuôi chai đã chọn. '}Có thể cùng ${safePenaltyText} hoặc bỏ qua.</p>
                        </div>
                    </div>
                `;
            } else {
                this.resultBanner.innerHTML = `
                    <div class="bottle-epic-pill">
                        ${window.partyAssets ? window.partyAssets.icon('target', 'pill-icon') : '<span class="pill-icon">+</span>'}
                        <div class="pill-content">
                            <strong>Người số ${headSeat}</strong>
                            <p>Đầu chai đã chọn. Có thể ${safePenaltyText} hoặc bỏ qua.</p>
                        </div>
                    </div>
                `;
            }
            this.resultBanner.style.display = 'block';
        }

        if (this.statusText) {
            this.statusText.textContent = 'Chai đã dừng. Có thể quay lượt mới hoặc đổi số người.';
        }

        const historyLabel = turn.mode === 'duel'
            ? `Người số ${headSeat} và ${tailSeat}: có thể cùng ${penaltyText} hoặc bỏ qua.`
            : `Người số ${headSeat}: có thể ${penaltyText} hoặc bỏ qua.`;
        this.recordHistory({
            type: 'penalty',
            gameId: 'bottle',
            label: historyLabel,
            detail: { mode: turn.mode, bottleType: turn.bottleType, seatCount: turn.seatCount, headSeat, ...(tailSeat === undefined ? {} : { tailSeat }) }
        }, `bottle:${runId}:result`);
    }

    recordHistory(event, dedupeKey) {
        if (!window.sessionHistory || typeof window.sessionHistory.record !== 'function') return;
        try {
            window.sessionHistory.record(event, { dedupeKey });
        } catch (e) {
            // History is observational; a store failure must not break Bottle.
        }
    }
}

// Global instance
window.bottleGame = new SpinBottleGame();
