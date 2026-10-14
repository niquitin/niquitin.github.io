/**
 * Game 4: Quả Bom Hẹn Giờ Chuyền Tay (Ticking Bomb Rush)
 * Mechanics:
 * - Secret countdown timer between 15s and 40s (players don't know the exact time!)
 * - 25 reviewed Vietnamese quick-thinking topics
 * - Person holding the phone must shout a valid answer, tap 'CHUYỀN TIẾP', and pass phone
 * - Ticking sound accelerates dynamically as the hidden timer ticks away
 * - Big BOOM explosion, screen vibration & penalty modal
 */

const BOMB_TOPICS = [
    "Kể tên các loại đồ uống không cồn phổ biến",
    "Kể tên các món ăn từ hải sản",
    "Kể tên các món ăn chế biến từ thịt bò hoặc gà",
    "Kể tên những lý do lịch sự để rời một buổi tiệc sớm",
    "Kể tên các bài hát nổi tiếng của Sơn Tùng M-TP",
    "Kể tên các loại trái cây có vị chua",
    "Kể tên các nhạc cụ phổ biến",
    "Kể tên các bộ phim hoạt hình gắn liền với tuổi thơ",
    "Kể tên các tỉnh hoặc thành phố thuộc miền Tây Nam Bộ",
    "Kể tên những câu nói vui khi ai đó muốn nghỉ một lượt",
    "Kể tên các thương hiệu trà sữa hoặc cà phê nổi tiếng",
    "Kể tên các con vật có bốn chân",
    "Kể tên các siêu anh hùng Marvel hoặc DC",
    "Kể tên các trò chơi dân gian thời thơ ấu",
    "Kể tên những điểm đáng quý của bạn bè đang chơi",
    "Kể tên các món ăn sáng phổ biến ở Việt Nam",
    "Kể tên các loài hoa có màu đỏ hoặc vàng",
    "Kể tên những thứ thường để quên trước khi ra khỏi nhà",
    "Kể tên các ứng dụng thường dùng trên điện thoại",
    "Kể tên các nhân vật trong truyện Doraemon hoặc Tây Du Ký",

        // G5.4 approved additions
    "Kể tên các món ăn vặt hay gọi để nhâm nhi cùng bạn bè.",
    "Kể tên ca sĩ hoặc nhóm nhạc Việt Nam quen thuộc.",
    "Kể tên những cách nghỉ ngơi nhẹ nhàng trong một buổi tụ họp.",
    "Kể tên những vật dụng thường có trên bàn ăn ở nhà hàng.",
    "Kể tên những dịp bạn bè thường tụ họp."
];

class BombGame {
    constructor() {
        this.container = document.getElementById("bomb-game-container");
        this.topics = [...BOMB_TOPICS];
        this.currentTopicIndex = 0;
        this.isPlaying = false;
        this.bombTimer = null;
        this.tickInterval = null;
        this.totalDuration = 0;
        this.elapsed = 0;
        this.tickTimeout = null;
        this.resultTimeout = null;
        this.runId = 0;
        this.init();
    }

    init() {
        this.render();
    }

    formatTopic(topic) {
        return String(topic || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="game-header">
                <button class="back-btn" onclick="window.app.navigate('home')">
                    <svg class="ui-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#back"></use></svg> Quay lại
                </button>
                <div class="game-title-wrap">
                    <div class="game-title-kicker"><svg class="game-title-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#bomb"></use></svg><span>HOT POTATO</span></div>
                    <h2>Quả Bom Hẹn Giờ</h2>
                    <p class="game-subtitle">Trả lời nhanh - Chuyền máy trước khi nổ!</p>
                </div>
                <button class="action-btn-small" onclick="window.bombGame.resetBomb()">
                    Đặt Lại
                </button>
            </div>

            <div class="bomb-stage">
                <div class="phase-b-stage-badge bomb-hero-mark" aria-hidden="true">
                    <svg class="phase-b-stage-icon"><use href="assets/icons/game-icons.svg#bomb"></use></svg>
                    <span>NÓI NHANH · CHUYỀN MÁY · ĐỪNG ĐỂ NỔ</span>
                </div>
                <!-- Topic Display Banner -->
                <div class="bomb-topic-card">
                    <div class="topic-header-badge">
                        <svg class="topic-badge-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#target"></use></svg>
                        <span class="topic-label">CHỦ ĐỀ LƯỢT NÀY</span>
                    </div>
                    <div id="bomb-current-topic" class="topic-content" role="status" aria-live="polite">
                        Bấm "BẮT ĐẦU" để châm ngòi nổ!
                    </div>
                </div>

                <!-- Animated Bomb Graphic (Big & Balanced) -->
                <div class="bomb-box">
                    <div id="bomb-visual" class="bomb-visual">
                        <div class="bomb-fuse-wrapper">
                            <div class="fuse-line"></div>
                            <div id="fuse-spark" class="fuse-spark hidden">
                                <svg class="spark-emoji" aria-hidden="true"><use href="assets/icons/game-icons.svg#bolt"></use></svg>
                            </div>
                        </div>
                        <div class="bomb-neck"></div>
                        <div class="bomb-body">
                            <div class="bomb-highlight"></div>
                            <div class="bomb-skull-box">
                                <svg id="bomb-skull-icon" class="bomb-skull" aria-hidden="true"><use href="assets/icons/game-icons.svg#skull"></use></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Button & Pass Counter -->
                <div class="bomb-controls">
                    <button id="bomb-action-btn" class="neon-button primary-btn pulse-glow" onclick="window.bombGame.handleActionClick()">
                        <svg class="cta-icon" aria-hidden="true"><use href="assets/icons/game-icons.svg#bolt"></use></svg> BẮT ĐẦU CHÂM NGÒI
                    </button>
                    <div id="bomb-pass-counter" class="pass-info hidden">
                        Đã chuyền qua: <span id="pass-count-num" class="pass-num-badge">0</span> người
                    </div>
                </div>
            </div>
        `;
    }

    handleActionClick() {
        if (!this.isPlaying) {
            this.startBomb();
        } else {
            this.passBomb();
        }
    }

    startBomb() {
        this.stop();
        const runId = this.runId;
        this.isPlaying = true;
        this.passCount = 0;
        this.elapsed = 0;
        
        // Random bomb duration between 18 and 38 seconds
        this.totalDuration = 18 + Math.floor(Math.random() * 20);

        // Shuffle and pick new topic
        this.currentTopicIndex = Math.floor(Math.random() * this.topics.length);
        const topicEl = document.getElementById("bomb-current-topic");
        if (topicEl) topicEl.innerText = this.formatTopic(this.topics[this.currentTopicIndex]);

        // Update UI buttons
        const actionBtn = document.getElementById("bomb-action-btn");
        const passCounter = document.getElementById("bomb-pass-counter");
        const spark = document.getElementById("fuse-spark");
        const visual = document.getElementById("bomb-visual");
        const skull = document.getElementById("bomb-skull-icon");

        if (actionBtn) {
            actionBtn.innerHTML = "<svg class=\"cta-icon\" aria-hidden=\"true\"><use href=\"assets/icons/game-icons.svg#shuffle\"></use></svg> NÓI XONG — CHUYỀN MÁY";
            actionBtn.className = "neon-button pass-btn";
        }
        if (passCounter) passCounter.classList.remove("hidden");
        if (spark) spark.classList.remove("hidden");
        if (visual) visual.classList.add("ticking");
        if (skull) skull.querySelector('use')?.setAttribute('href', 'assets/icons/game-icons.svg#skull');

        this.scheduleNextTick(runId);
    }

    scheduleNextTick(runId = this.runId) {
        if (!this.isPlaying || runId !== this.runId) return;

        this.elapsed += 0.5;
        const progress = Math.min(1.0, this.elapsed / this.totalDuration);
        const urgency = progress;

        window.soundEngine.playBombTick(urgency);

        // Animate bomb throbbing faster and faster
        const visual = document.getElementById("bomb-visual");
        if (visual) {
            const scale = 1.0 + (progress * 0.28);
            visual.style.transform = `scale(${scale})`;
            if (progress > 0.65) {
                visual.classList.add("danger-throb");
                const skull = document.getElementById("bomb-skull-icon");
                if (skull && progress > 0.82) {
                    skull.querySelector('use')?.setAttribute('href', 'assets/icons/game-icons.svg#bolt');
                }
            }
        }

        if (this.elapsed >= this.totalDuration) {
            this.triggerExplosion(runId);
            return;
        }

        // Delay decreases as time progresses: starts at 1000ms, drops to 180ms!
        const nextDelay = Math.max(180, 1000 - (progress * 820));
        this.tickTimeout = setTimeout(() => {
            this.tickTimeout = null;
            this.scheduleNextTick(runId);
        }, nextDelay);
    }

    passBomb() {
        if (!this.isPlaying) return;

        this.passCount++;
        const countNum = document.getElementById("pass-count-num");
        if (countNum) countNum.innerText = this.passCount;

        // Sound feedback for successful pass
        window.soundEngine.playClick();
        window.soundEngine.vibrate([60]);

        // Next topic occasionally
        if (this.passCount % 2 === 0) {
            this.currentTopicIndex = (this.currentTopicIndex + 1) % this.topics.length;
            const topicEl = document.getElementById("bomb-current-topic");
            if (topicEl) {
                topicEl.classList.remove("fade-in");
                void topicEl.offsetWidth;
                topicEl.innerText = this.formatTopic(this.topics[this.currentTopicIndex]);
                topicEl.classList.add("fade-in");
            }
        }
    }

    triggerExplosion(runId = this.runId) {
        if (runId !== this.runId) return;
        this.isPlaying = false;
        clearTimeout(this.tickTimeout);
        this.tickTimeout = null;

        const visual = document.getElementById("bomb-visual");
        const stage = document.querySelector(".bomb-stage");
        const spark = document.getElementById("fuse-spark");

        if (spark) spark.classList.add("hidden");
        if (visual) visual.classList.add("exploded");
        if (stage) stage.classList.add("shake-screen");

        // Calculate bomb visual origin for particle blast
        let origin = {};
        if (visual) {
            const rect = visual.getBoundingClientRect();
            origin = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }

        // TRIGGER EPIC EXPLOSION FX (Nuclear flash + 150 particles + comic badge + earthquake)
        window.app.triggerEpicExplosionFX(origin);
        window.soundEngine.playExplosion();

        this.resultTimeout = setTimeout(() => {
            this.resultTimeout = null;
            if (runId !== this.runId) return;
            if (stage) stage.classList.remove("shake-screen");
            const penalty = window.penaltyManager.getRandomPenalty();
            window.app.showPenaltyModal({
                title: "Bom đã nổ",
                subtitle: "Người đang cầm điện thoại nhận kết quả:",
                penalty: penalty,
                historyEvent: {
                    type: "penalty",
                    gameId: "bomb",
                    label: penalty.text,
                    detail: { category: penalty.type || "drink" },
                    dedupeKey: `bomb:${runId}:result`
                },
                onClose: () => {
                    this.resetBomb();
                }
            });
        }, 1100);
    }

    stop() {
        this.runId += 1;
        this.isPlaying = false;
        if (this.tickTimeout !== null) {
            clearTimeout(this.tickTimeout);
            this.tickTimeout = null;
        }
        if (this.resultTimeout !== null) {
            clearTimeout(this.resultTimeout);
            this.resultTimeout = null;
        }
        document.getElementById("bomb-visual")?.classList.remove("ticking", "danger-throb", "exploded");
        document.querySelector(".bomb-stage")?.classList.remove("shake-screen");
        document.getElementById("fuse-spark")?.classList.add("hidden");
    }

    resetBomb() {
        this.stop();

        const actionBtn = document.getElementById("bomb-action-btn");
        const passCounter = document.getElementById("bomb-pass-counter");
        const spark = document.getElementById("fuse-spark");
        const visual = document.getElementById("bomb-visual");
        const topicEl = document.getElementById("bomb-current-topic");

        if (actionBtn) {
            actionBtn.innerHTML = "<svg class=\"cta-icon\" aria-hidden=\"true\"><use href=\"assets/icons/game-icons.svg#bolt\"></use></svg> BẮT ĐẦU CHÂM NGÒI";
            actionBtn.className = "neon-button primary-btn pulse-glow";
        }
        if (passCounter) passCounter.classList.add("hidden");
        if (spark) spark.classList.add("hidden");
        if (visual) {
            visual.className = "bomb-visual";
            visual.style.transform = "scale(1)";
        }
        const skull = document.getElementById("bomb-skull-icon");
        if (skull) skull.querySelector('use')?.setAttribute('href', 'assets/icons/game-icons.svg#skull');
        if (topicEl) {
            topicEl.innerText = "Bấm 'BẮT ĐẦU' để châm ngòi nổ!";
        }
    }
}
