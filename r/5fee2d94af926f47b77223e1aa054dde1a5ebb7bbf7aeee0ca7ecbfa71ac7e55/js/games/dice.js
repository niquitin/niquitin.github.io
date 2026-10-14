/**
 * Party Dice Game (Lắc Xí Ngầu - 7-8-9 & Đua Điểm)
 * Realistic 3D rolling dice with Vietnamese party rules (7-8-9 & Tài Xỉu/Đua Điểm).
 */

class PartyDiceGame {
    constructor() {
        this.mode = '789'; // '789' or 'battle'
        this.diceCount = 2; // 2 for 789, 3 for battle
        this.diceValues = [1, 1];
        this.isRolling = false;
        this.potStatus = 0; // 7-8-9 shared marker (0 = start, 1 = raised, 2 = maximum)
        this.rollId = 0;
        this.diceRenderer = null;
        this.debugEnabled = false;
        this.debugFaceIndex = 0;
        this.debugForcedValues = null;
        this.resultClearTimer = null;
        this.debugStartTimer = null;

        this.initDOM();
    }

    initDOM() {
        this.screen = document.getElementById('screen-dice');
        if (!this.screen) return;

        this.diceContainer = document.getElementById('dice-table');
        this.diceArena = document.querySelector('.dice-arena-wrapper');
        this.diceCanvas = document.getElementById('dice-webgl-canvas');
        this.liveResult = document.getElementById('dice-live-result');
        this.cupEl = document.getElementById('dice-shaker-cup');
        this.rollBtn = document.getElementById('dice-roll-btn');
        this.modeSelect = document.getElementById('dice-mode-select');
        this.resultBanner = document.getElementById('dice-result-banner');
        this.ruleInfo = document.getElementById('dice-rule-info');
        this.potDisplay = document.getElementById('dice-pot-display');
        try {
            this.debugEnabled = new URLSearchParams(window.location.search).get('debug') === 'dice';
            const forced = new URLSearchParams(window.location.search).get('force');
            if (this.debugEnabled && forced) {
                const values = forced.split(',').map((value) => Number(value)).filter((value) => value >= 1 && value <= 6);
                if (values.length >= 2) this.debugForcedValues = values;
            }
        } catch (e) {}

        if (this.rollBtn) {
            this.rollBtn.addEventListener('click', () => this.roll());
        }

        if (this.modeSelect) {
            this.modeSelect.addEventListener('change', (e) => {
                this.setMode(e.target.value);
            });
        }
    }

    start() {
        this.ensureRenderer();
        this.setMode(this.mode);
        this.resetDisplay();
        if (this.debugEnabled && this.debugForcedValues) {
            this.debugStartTimer = window.setTimeout(() => {
                this.debugStartTimer = null;
                this.debugRoll(this.debugForcedValues);
            }, 180);
        }
    }

    ensureRenderer() {
        if (this.diceRenderer || !window.Dice3DRenderer || !this.diceCanvas || !this.diceArena) return this.diceRenderer;
        this.diceRenderer = new window.Dice3DRenderer();
        const ready = this.diceRenderer.init({
            canvas: this.diceCanvas,
            host: this.diceArena,
            fallback: this.diceContainer
        });
        if (!ready && this.diceContainer) this.diceContainer.hidden = false;
        return this.diceRenderer;
    }

    setMode(mode) {
        const nextMode = mode === 'battle' ? 'battle' : '789';
        const nextCount = nextMode === 'battle' ? 3 : 2;
        const modeChanged = this.mode !== nextMode || this.diceCount !== nextCount;
        if (modeChanged) this.cancelActiveRoll();

        this.mode = nextMode;
        this.diceCount = nextCount;
        // Keep the idle illustration in sync with the selected mode. The
        // battle mode uses the live Three.js preview (three physical dice)
        // instead of the legacy two-dice hero artwork.
        if (this.diceArena) {
            this.diceArena.classList.toggle('dice-three-mode', nextCount === 3);
            this.diceArena.dataset.diceCount = String(nextCount);
        }
        if (nextMode === '789') {
            if (this.ruleInfo) {
                this.ruleInfo.innerHTML = `
                    <div class="dice-legend">
                        <span><strong>7</strong> Tăng mức chung</span>
                        <span><strong>8</strong> Mức nhẹ</span>
                        <span><strong>9</strong> Chốt mức chung</span>
                        <span><strong>Đôi</strong> Mời cùng chơi</span>
                    </div>
                `;
            }
            if (this.potDisplay) {
                this.potDisplay.style.display = 'flex';
                this.updatePotDisplay();
            }
        } else {
            if (this.ruleInfo) {
                this.ruleInfo.innerHTML = `
                    <div class="dice-legend">
                        <span><strong>4–10</strong> Xỉu</span>
                        <span><strong>11–17</strong> Tài</span>
                        <span><strong>Bão</strong> 3 con giống nhau · Cả bàn cùng tham gia</span>
                    </div>
                `;
            }
            if (this.potDisplay) {
                this.potDisplay.style.display = 'none';
            }
        }
        if (this.diceRenderer) this.diceRenderer.setDiceCount(this.diceCount);
        this.renderDiceElements();
        if (modeChanged) this.resetDisplay();
    }

    cancelActiveRoll() {
        this.rollId += 1;
        this.isRolling = false;
        if (this.diceRenderer && this.diceRenderer.cancelAnimation) {
            this.diceRenderer.cancelAnimation();
        }
        if (this.cupEl) this.cupEl.classList.remove('shaking-cup');
        this.setRollButtonState('idle');
    }

    stop() {
        if (this.debugStartTimer !== null) {
            clearTimeout(this.debugStartTimer);
            this.debugStartTimer = null;
        }
        this.clearResultBannerTimer();
        this.cancelActiveRoll();
    }

    updatePotDisplay() {
        if (!this.potDisplay) return;
        const stateKey = this.potStatus === 2 ? 'full' : (this.potStatus === 1 ? 'half' : 'empty');
        this.potDisplay.dataset.potState = stateKey;
        let stateText = 'Mức 0';
        if (this.potStatus === 1) stateText = 'Mức 1';
        if (this.potStatus === 2) stateText = 'Mức 2';

        this.potDisplay.innerHTML = `
            <div class="pot-pill">
                ${window.partyAssets ? window.partyAssets.icon('cup', 'pot-icon') : '<span class="pot-icon">●</span>'}
                <span class="pot-text"><span class="pot-label">Mức chung:</span> <strong>${stateText}</strong></span>
            </div>
        `;
    }

    renderDiceElements() {
        if (!this.diceContainer) return;
        if (this.diceContainer.children.length === this.diceCount) return;
        this.diceContainer.innerHTML = '';

        const pipSlots = [
            'pip-tl', 'pip-tc', 'pip-tr',
            'pip-ml', 'pip-c', 'pip-mr',
            'pip-bl', 'pip-bc', 'pip-br'
        ];
        const layouts = {
            1: ['pip-c'],
            2: ['pip-tl', 'pip-br'],
            3: ['pip-tl', 'pip-c', 'pip-br'],
            4: ['pip-tl', 'pip-tr', 'pip-bl', 'pip-br'],
            5: ['pip-tl', 'pip-tr', 'pip-c', 'pip-bl', 'pip-br'],
            6: ['pip-tl', 'pip-ml', 'pip-bl', 'pip-tr', 'pip-mr', 'pip-br']
        };

        for (let i = 0; i < this.diceCount; i++) {
            const die = document.createElement('div');
            die.className = 'die-cube dice-fallback-die';
            die.id = `die-${i}`;

            // Keep a complete six-face CSS fallback. The WebGL renderer is
            // preferred; this fallback is only used when WebGL is unavailable.
            for (let f = 1; f <= 6; f++) {
                const face = document.createElement('div');
                face.className = `die-face face-${f}`;
                face.setAttribute('aria-hidden', 'true');
                pipSlots.forEach((slot) => {
                    const pip = document.createElement('span');
                    pip.className = `pip ${slot}${layouts[f].includes(slot) ? ' is-on' : ''}`;
                    face.appendChild(pip);
                });
                die.appendChild(face);
            }

            this.diceContainer.appendChild(die);
        }
    }

    resetDisplay() {
        this.isRolling = false;
        this.clearResultBannerTimer();
        // The idle preview mirrors the approved icon composition. These are
        // illustration faces only; the next roll still owns the real result.
        const previewValues = window.DiceVisualModel
            ? window.DiceVisualModel.previewValues(this.diceCount)
            : (this.diceCount === 3 ? [5, 2, 3] : [5, 2]);
        this.diceValues = previewValues.slice();
        if (this.cupEl) this.cupEl.classList.remove('shaking-cup');
        if (this.diceArena) this.diceArena.classList.add('dice-idle');
        if (this.diceContainer) {
            this.diceContainer.querySelectorAll('.die-cube').forEach((die) => {
                die.classList.remove('rolling-dice');
                die.classList.remove('dice-settled');
                die.style.transform = '';
                this.setFallbackDieValue(die, previewValues[Number(die.id.replace('die-', ''))] || 1);
            });
        }
        if (this.diceRenderer) this.diceRenderer.showImmediate(previewValues, { preview: true });
        if (this.resultBanner) {
            this.resultBanner.classList.remove('dice-result-reveal', 'dice-result-clearing', 'dice-result-pending');
            this.resultBanner.innerHTML = `<span class="dice-hint">Bấm nút "LẮC XÍ NGẦU" để mở bát!</span>`;
        }
        if (this.liveResult) this.liveResult.textContent = '';
        this.setRollButtonState('idle');
    }

    clearResultBannerTimer() {
        if (this.resultClearTimer !== null) {
            window.clearTimeout(this.resultClearTimer);
            this.resultClearTimer = null;
        }
    }

    setRollButtonState(state) {
        if (!this.rollBtn) return;
        const nextState = state === 'rolling' ? 'rolling' : (state === 'result' ? 'result' : 'idle');
        const labels = {
            idle: { text: 'LẮC XÍ NGẦU', aria: 'Lắc xí ngầu', icon: true },
            rolling: { text: 'ĐANG LẮC...', aria: 'Đang lắc xí ngầu', icon: false },
            result: { text: 'LẮC LẠI', aria: 'Lắc lại xí ngầu', icon: true }
        };
        const label = labels[nextState];
        this.rollBtn.classList.remove('dice-cta-idle', 'dice-cta-rolling', 'dice-cta-result', 'pulse-glow');
        this.rollBtn.classList.add(`dice-cta-${nextState}`);
        if (nextState === 'idle') this.rollBtn.classList.add('pulse-glow');
        this.rollBtn.disabled = nextState === 'rolling';
        this.rollBtn.setAttribute('aria-label', label.aria);
        this.rollBtn.setAttribute('aria-busy', nextState === 'rolling' ? 'true' : 'false');
        const icon = label.icon
            ? '<svg class="cta-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#dice"></use></svg>'
            : '';
        this.rollBtn.innerHTML = `${icon}<span class="dice-cta-label">${label.text}</span>`;
    }

    formatResultTitle(total, breakdown) {
        return `<span class="d-total">Tổng ${total}</span><span class="d-breakdown">${breakdown}</span>`;
    }

    formatResultAction(action) {
        const iconMatch = String(action).match(/^\s*(<svg\b[\s\S]*?<\/svg>)\s*/i);
        const icon = iconMatch ? iconMatch[1] : '';
        const rest = iconMatch ? String(action).slice(iconMatch[0].length).trim() : String(action).trim();
        const outcomeMatch = rest.match(/^(<strong\b[\s\S]*?<\/strong>)([\s\S]*)$/i);
        const outcome = outcomeMatch ? outcomeMatch[1] : '';
        const instruction = outcomeMatch ? outcomeMatch[2].trim() : rest;
        const safeInstruction = window.partyAssets
            ? window.partyAssets.escape(instruction)
            : String(instruction).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return `${icon ? `<span class="d-action-icon">${icon}</span>` : ''}
            <span class="d-action-copy">
                ${outcome ? `<span class="d-outcome">${outcome}</span>` : ''}
                <span class="d-instruction">${safeInstruction}</span>
            </span>`;
    }

    prepareResultBannerForRoll(rollId) {
        if (!this.resultBanner) return;
        this.clearResultBannerTimer();
        const banner = this.resultBanner;
        banner.classList.remove('dice-result-reveal', 'dice-result-pending', 'dice-result-clearing');
        void banner.offsetWidth;
        banner.classList.add('dice-result-clearing');

        const prefersReducedMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const clearDuration = prefersReducedMotion ? 0 : 120;
        const showNeutralState = () => {
            this.resultClearTimer = null;
            if (rollId !== this.rollId || !this.isRolling) return;
            banner.innerHTML = '<span class="dice-rolling-hint">Đang lắc...</span>';
            banner.classList.remove('dice-result-clearing');
            banner.classList.add('dice-result-pending');
        };

        if (clearDuration === 0) {
            showNeutralState();
        } else {
            this.resultClearTimer = window.setTimeout(showNeutralState, clearDuration);
        }
    }

    roll(forcedValues) {
        if (this.isRolling) return;
        this.isRolling = true;
        const currentRollId = ++this.rollId;
        this.prepareResultBannerForRoll(currentRollId);
        if (this.diceArena) this.diceArena.classList.remove('dice-idle');

        this.setRollButtonState('rolling');

        if (window.soundEngine) {
            window.soundEngine.playDiceRoll();
        }

        // Shaker animation on table/cup
        if (this.cupEl) {
            this.cupEl.classList.add('shaking-cup');
        }

        const newValues = Array.isArray(forcedValues) && forcedValues.length
            ? forcedValues.slice(0, this.diceCount).map((value) => Math.max(1, Math.min(6, Number(value) || 1)))
            : Array.from({ length: this.diceCount }, () => Math.floor(Math.random() * 6) + 1);

        const diceEls = this.diceContainer ? this.diceContainer.querySelectorAll('.die-cube') : [];
        diceEls.forEach((die) => {
            die.classList.remove('dice-settled');
            die.classList.add('rolling-dice');
        });
        if (window.partyHaptics) window.partyHaptics.play('light');

        const renderer = this.ensureRenderer();
        const animation = renderer ? renderer.roll(newValues) : Promise.resolve({ fallback: true });

        return Promise.resolve(animation).then((animationResult) => {
            if (currentRollId !== this.rollId) return;
            if (animationResult && animationResult.cancelled) {
                this.isRolling = false;
                if (this.cupEl) this.cupEl.classList.remove('shaking-cup');
                this.setRollButtonState('idle');
                return animationResult;
            }
            if (this.cupEl) this.cupEl.classList.remove('shaking-cup');
            this.clearResultBannerTimer();
            if (this.resultBanner) {
                this.resultBanner.classList.remove('dice-result-clearing', 'dice-result-pending', 'dice-result-reveal');
            }
            diceEls.forEach((die, idx) => {
                die.classList.remove('rolling-dice');
                die.classList.add('dice-settled');
                this.setFallbackDieValue(die, newValues[idx]);
                die.setAttribute('aria-label', `Xúc xắc ${idx + 1}: ${newValues[idx]}`);
            });

            this.diceValues = newValues;
            this.isRolling = false;
            if (window.partyHaptics) window.partyHaptics.play('medium');
            const finalizedResult = this.evaluateResult();
            this.recordHistory(finalizedResult, currentRollId);
            this.setRollButtonState('result');
            if (this.resultBanner) {
                // Force a fresh animation cycle without changing result timing
                // or delaying the game state update.
                this.resultBanner.classList.remove('dice-result-reveal');
                void this.resultBanner.offsetWidth;
                this.resultBanner.classList.add('dice-result-reveal');
            }
        });
    }

    setFallbackDieValue(die, value) {
        if (!die || !value) return;
        const layouts = {
            1: 'rotateX(-14deg) rotateY(16deg) rotateZ(-2deg)',
            2: 'rotateX(-104deg) rotateY(12deg) rotateZ(2deg)',
            3: 'rotateX(-10deg) rotateY(-74deg) rotateZ(-2deg)',
            4: 'rotateX(-10deg) rotateY(106deg) rotateZ(2deg)',
            5: 'rotateX(76deg) rotateY(12deg) rotateZ(-2deg)',
            6: 'rotateX(-14deg) rotateY(196deg) rotateZ(2deg)'
        };
        die.style.transform = `${layouts[value] || layouts[1]} scale(1.02)`;
        die.querySelectorAll('.die-face').forEach((face) => {
            face.classList.toggle('is-result-face', face.classList.contains(`face-${value}`));
        });
    }

    debugRoll(values) {
        if (!this.debugEnabled) return Promise.resolve();
        const normalized = (Array.isArray(values) ? values : [values]).slice(0, this.diceCount);
        while (normalized.length < this.diceCount) normalized.push(1);
        return this.roll(normalized);
    }

    cycleDebugFaces() {
        if (!this.debugEnabled) return;
        this.debugFaceIndex = (this.debugFaceIndex % 6) + 1;
        const next = this.debugFaceIndex;
        this.debugRoll(this.diceCount === 3 ? [next, ((next + 1) % 6) + 1, ((next + 2) % 6) + 1] : [next, 7 - next]);
    }

    recordHistory(result, rollId) {
        if (!result || !window.sessionHistory || typeof window.sessionHistory.record !== 'function') return;
        try {
            window.sessionHistory.record({
                type: 'game_result',
                gameId: 'dice',
                label: result.label,
                detail: result.detail
            }, { dedupeKey: `dice:${rollId}:result` });
        } catch (e) {
            // History is observational; a store failure must not break Dice.
        }
    }

    evaluateResult() {
        if (this.mode === '789') {
            return this.evaluate789();
        } else {
            return this.evaluateBattle();
        }
    }

    evaluate789() {
        const [d1, d2] = this.diceValues;
        const sum = d1 + d2;
        const isDouble = d1 === d2;

        const title = this.formatResultTitle(sum, `(${d1} + ${d2})`);
        let action = '';
        let badgeClass = 'normal';
        let historyLabel = '';
        let outcome = 'safe';

        if (isDouble) {
            badgeClass = 'double';
            outcome = 'double';
            historyLabel = `Đôi ${d1}: mời một người cùng thực hiện án phạt nhẹ`;
            action = `${window.partyAssets ? window.partyAssets.icon('crown', 'inline-result-icon') : ''} <strong>ĐÔI ${d1}</strong> Mời một người cùng thực hiện án phạt nhẹ; họ có thể từ chối.`;
            if (window.soundEngine) window.soundEngine.playWin();
        } else if (sum === 7) {
            badgeClass = 'warn';
            outcome = 'pour';
            this.potStatus = Math.min(2, this.potStatus + 1);
            historyLabel = 'Tổng 7: mức chung tăng một bậc';
            action = `${window.partyAssets ? window.partyAssets.icon('cup', 'inline-result-icon') : ''} <strong>TĂNG MỨC CHUNG</strong> Dấu mốc tăng thêm một bậc.`;
            if (window.soundEngine) window.soundEngine.playClick();
        } else if (sum === 8) {
            badgeClass = 'danger';
            outcome = 'drink-half';
            historyLabel = 'Tổng 8: nhận án phạt nhẹ';
            action = `${window.partyAssets ? window.partyAssets.icon('question', 'inline-result-icon') : ''} <strong>MỨC NHẸ</strong> Chọn thực hiện một án phạt nhẹ hoặc bỏ qua.`;
            this.potStatus = Math.max(0, this.potStatus - 1);
            if (window.soundEngine) window.soundEngine.playChomp();
        } else if (sum === 9) {
            badgeClass = 'boom';
            outcome = 'drink-all';
            historyLabel = 'Tổng 9: chốt và đặt lại mức chung';
            action = `${window.partyAssets ? window.partyAssets.icon('bolt', 'inline-result-icon') : ''} <strong>CHỐT MỨC CHUNG</strong> Chọn một án phạt nhẹ hoặc bỏ qua, rồi đặt lại dấu mốc.`;
            this.potStatus = 0;
            if (window.soundEngine) window.soundEngine.playExplosion();
        } else {
            historyLabel = 'An toàn: chuyền xúc xắc cho người kế bên';
            action = `${window.partyAssets ? window.partyAssets.icon('safe', 'inline-result-icon') : ''} An toàn! Chuyền xúc xắc cho người kế bên.`;
            if (window.soundEngine) window.soundEngine.playTick();
        }

        this.updatePotDisplay();

        if (this.resultBanner) {
            this.resultBanner.innerHTML = `
                <div class="dice-result-card ${badgeClass}">
                    <div class="dice-result-status"><span aria-hidden="true"></span> ĐÃ CHỐT KẾT QUẢ</div>
                    <div class="d-title">${title}</div>
                    <div class="d-action">${this.formatResultAction(action)}</div>
                </div>
            `;
        }
        return {
            label: historyLabel,
            detail: { mode: '789', dice: [d1, d2], sum, outcome }
        };
    }

    evaluateBattle() {
        const sum = this.diceValues.reduce((a, b) => a + b, 0);
        const [d1, d2, d3] = this.diceValues;
        const isBao = (d1 === d2 && d2 === d3);

        const title = this.formatResultTitle(sum, `[${d1}, ${d2}, ${d3}]`);
        let action = '';
        let badgeClass = 'normal';
        let historyLabel = '';
        let outcome = 'xiu';

        if (isBao) {
            badgeClass = 'boom';
            outcome = 'bao';
            let text = 'Cả bàn cùng vỗ tay ba nhịp.';
            if (window.penaltyMedium) text = window.penaltyMedium.currentMedium.allAction;
            historyLabel = `Bão ${d1}-${d1}-${d1}: ${text}`;
            action = `${window.partyAssets ? window.partyAssets.icon('bolt', 'inline-result-icon') : ''} <strong>BÃO ${d1}-${d1}-${d1}!</strong> ${text}`;
            if (window.soundEngine) window.soundEngine.playWin();
        } else if (sum >= 11) {
            badgeClass = 'warn';
            outcome = 'tai';
            historyLabel = `Tài (${sum} điểm): phe đoán sai nhận kết quả`;
            action = `<strong class="result-danger">TÀI (${sum} điểm)</strong> Phe đoán sai nhận kết quả và có thể bỏ qua.`;
            if (window.soundEngine) window.soundEngine.playTick();
        } else {
            badgeClass = 'safe';
            historyLabel = `Xỉu (${sum} điểm): phe đoán sai nhận kết quả`;
            action = `<strong class="result-safe">XỈU (${sum} điểm)</strong> Phe đoán sai nhận kết quả và có thể bỏ qua.`;
            if (window.soundEngine) window.soundEngine.playTick();
        }

        if (this.resultBanner) {
            this.resultBanner.innerHTML = `
                <div class="dice-result-card ${badgeClass}">
                    <div class="dice-result-status"><span aria-hidden="true"></span> ĐÃ CHỐT KẾT QUẢ</div>
                    <div class="d-title">${title}</div>
                    <div class="d-action">${this.formatResultAction(action)}</div>
                </div>
            `;
        }
        return {
            label: historyLabel,
            detail: { mode: 'battle', dice: [d1, d2, d3], sum, outcome }
        };
    }
}

// Global instance
window.diceGame = new PartyDiceGame();

// Deterministic visual QA helpers. They are exposed only with ?debug=dice so
// normal players never see or depend on them.
try {
    const debugParams = new URLSearchParams(window.location.search);
    if (debugParams.get('debug') === 'dice') {
        window.diceDebug = {
            show: (values) => window.diceGame.debugRoll(values),
            cycleFaces: () => window.diceGame.cycleDebugFaces(),
            inspect: () => window.diceGame.diceRenderer && window.diceGame.diceRenderer.getDebugState
                ? window.diceGame.diceRenderer.getDebugState()
                : null
        };
    }
} catch (e) {}
