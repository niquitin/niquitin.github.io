/**
 * Never Have I Ever Game (Tôi Chưa Từng...)
 * Reviewed deck of 51 approved Vietnamese prompts across four party-friendly themes.
 */

class NeverHaveGame {
    constructor() {
        this.category = 'all';
        this.deck = [];
        this.playedCount = 0;
        this.penaltiesCount = 0;
        this.currentPrompt = null;
        this.responsePending = false;
        this.pendingTimeouts = new Set();

        this.rawPrompts = [
            // --- 🤣 CHUYỆN VUI ---
            { id: 1, cat: 'funny', text: 'Tôi chưa từng... mang hai chiếc tất khác màu mà không nhận ra.' },
            { id: 2, cat: 'funny', text: 'Tôi chưa từng... mặc áo trái cả buổi mới phát hiện.' },
            { id: 3, cat: 'funny', text: 'Tôi chưa từng... đặt đồ uống xuống rồi quên mất cốc của mình.' },
            { id: 4, cat: 'funny', text: 'Tôi chưa từng... nói xấu ai đó rồi vô tình gửi tin nhắn cho chính người đó.' },
            { id: 5, cat: 'funny', text: 'Tôi chưa từng... đi nhầm vào một phòng rồi bình thản bước ra.' },
            { id: 6, cat: 'funny', text: 'Tôi chưa từng... ăn vụng phần đồ ăn mình đã để dành.' },
            { id: 7, cat: 'funny', text: 'Tôi chưa từng... vẫy tay chào lại một người nhưng hóa ra họ đang vẫy người đứng sau lưng tôi.' },
            { id: 8, cat: 'funny', text: 'Tôi chưa từng... vấp nhẹ ở nơi đông người rồi giả vờ như không có gì.' },
            { id: 9, cat: 'funny', text: 'Tôi chưa từng... gọi nhầm tên một người rồi tiếp tục nói chuyện.' },
            { id: 10, cat: 'funny', text: 'Tôi chưa từng... ngủ quên khi xem phim và bỏ lỡ đoạn kết.' },
            { id: 11, cat: 'funny', text: 'Tôi chưa từng... ra khỏi nhà rồi mới nhớ mình quên mang ví.' },
            { id: 12, cat: 'funny', text: 'Tôi chưa từng... giả vờ đang nghe điện thoại chỉ để tránh chào một người quen trên phố.' },

            // --- 🎉 BÀN TIỆC ---
            { id: 13, cat: 'party', text: 'Tôi chưa từng... cười quá nhiều đến mức quên mình đang kể chuyện gì.' },
            { id: 14, cat: 'party', text: 'Tôi chưa từng... viện cớ để rời một buổi tiệc sớm.' },
            { id: 15, cat: 'party', text: 'Tôi chưa từng... gọi cho bạn thân để kể lại một chuyện vui sau buổi tiệc.' },
            { id: 16, cat: 'party', text: 'Tôi chưa từng... chọn nước lọc giữa buổi tiệc và thấy hoàn toàn thoải mái.' },
            { id: 17, cat: 'party', text: 'Tôi chưa từng... gửi một tin nhắn lúc khuya rồi sáng hôm sau thấy ngượng.' },
            { id: 18, cat: 'party', text: 'Tôi chưa từng... thức dậy và thấy bạn bè để lại một lời nhắn vui.' },
            { id: 19, cat: 'party', text: 'Tôi chưa từng... nói sẽ bao cả bàn rồi đổi ý khi xem lại hóa đơn.' },
            { id: 20, cat: 'party', text: 'Tôi chưa từng... cầm nhầm cốc của người khác rồi đặt xuống ngay.' },
            { id: 21, cat: 'party', text: 'Tôi chưa từng... đứng trước cửa quá lâu vì tìm chìa khóa trong túi.' },
            { id: 22, cat: 'party', text: 'Tôi chưa từng... tuyên bố sẽ đi ngủ sớm nhưng vẫn thức đến khuya.' },
            { id: 23, cat: 'party', text: 'Tôi chưa từng... quên mình đã để điện thoại ở đâu trong buổi tiệc.' },
            { id: 24, cat: 'party', text: 'Tôi chưa từng... xúc động khi nghe một bài hát cùng bạn bè.' },

            // --- 💗 HẸN HÒ & TÌNH CẢM ---
            { id: 25, cat: 'spicy', text: 'Tôi chưa từng... thử hẹn hò qua một ứng dụng.' },
            { id: 26, cat: 'spicy', text: 'Tôi chưa từng... xem lại trang cá nhân của người yêu cũ.' },
            { id: 27, cat: 'spicy', text: 'Tôi chưa từng... "thả thính" từ 2 người trở lên cùng một lúc.' },
            { id: 28, cat: 'spicy', text: 'Tôi chưa từng... gửi nhầm sticker cho người mình đang để ý.' },
            { id: 29, cat: 'spicy', text: 'Tôi chưa từng... nắm tay một người khi cả hai cùng đồng ý.' },
            { id: 30, cat: 'spicy', text: 'Tôi chưa từng... phải lòng một người bạn thân.' },
            { id: 31, cat: 'spicy', text: 'Tôi chưa từng... hôn một người ở nơi công cộng khi cả hai cùng đồng ý.' },
            { id: 32, cat: 'spicy', text: 'Tôi chưa từng... ngại nói rõ tình trạng hẹn hò của mình.' },
            { id: 33, cat: 'spicy', text: 'Tôi chưa từng... bị bắt gặp đang hát theo một bài tình ca.' },
            { id: 34, cat: 'spicy', text: 'Tôi chưa từng... tỏ ra thích một sở thích chỉ để gây ấn tượng.' },
            { id: 35, cat: 'spicy', text: 'Tôi chưa từng... đồng ý một buổi hẹn rồi đổi ý.' },
            { id: 36, cat: 'spicy', text: 'Tôi chưa từng... thấy phong cách của một người đang chơi rất cuốn hút.' },

            // --- 💼 ĐI LÀM & ĐI HỌC ---
            { id: 37, cat: 'life', text: 'Tôi chưa từng... giả vờ ốm để được nghỉ làm hoặc nghỉ học ở nhà ngủ.' },
            { id: 38, cat: 'life', text: 'Tôi chưa từng... than phiền về công việc trong nhóm chat bạn bè.' },
            { id: 39, cat: 'life', text: 'Tôi chưa từng... quên học bài trước một bài kiểm tra.' },
            { id: 40, cat: 'life', text: 'Tôi chưa từng... ngủ gật trong cuộc họp quan trọng rồi giật mình vỗ tay theo mọi người.' },
            { id: 41, cat: 'life', text: 'Tôi chưa từng... mang nhầm một cây bút ở nơi làm việc về nhà.' },
            { id: 42, cat: 'life', text: 'Tôi chưa từng... bị trừ lương hoặc phạt tiền vì đi muộn quá nhiều trong tháng.' },
            { id: 43, cat: 'life', text: 'Tôi chưa từng... lướt mạng lâu hơn dự định trong giờ nghỉ.' },
            { id: 44, cat: 'life', text: 'Tôi chưa từng... nhận lời khen cho việc mình có người khác hỗ trợ.' },

        // G5.4 approved additions
            { id: 45, cat: 'funny', text: "Tôi chưa từng... loay hoay tìm chiếc micro trong khi nó vẫn ở ngay trên tay mình." },
            { id: 46, cat: 'party', text: "Tôi chưa từng... mất nhiều thời gian chọn món đến mức cả bàn đã gọi xong trước mình." },
            { id: 47, cat: 'spicy', text: "Tôi chưa từng... thấy vui cả buổi sau một buổi hẹn vì cuộc trò chuyện hợp gu hơn mình tưởng." },
            { id: 48, cat: 'life', text: "Tôi chưa từng... chuẩn bị sẵn điều muốn nói trong cuộc họp rồi đến lượt mình lại quên mất ý." },
            { id: 49, cat: 'life', text: "Tôi chưa từng... sửa một bài làm tốt hơn nhờ góp ý của bạn học hoặc đồng nghiệp." },
            { id: 50, cat: 'spicy', text: "Tôi chưa từng... thấy vui khi một người mình quý nhớ được một sở thích nhỏ mình từng nhắc." },
            { id: 51, cat: 'life', text: "Tôi chưa từng... đặt liền mấy chiếc báo thức vì sợ ngủ quên trước một ngày học hoặc làm quan trọng." }
        ];

        this.initDOM();
        this.buildDeck({ silent: true });
    }

    initDOM() {
        this.screen = document.getElementById('screen-neverhave');
        if (!this.screen) return;

        this.promptText = document.getElementById('never-prompt-text');
        this.catBadge = document.getElementById('never-cat-badge');
        this.counterBadge = document.getElementById('never-counter-badge');
        this.cardBox = document.getElementById('never-card-box');
        this.passBtn = document.getElementById('never-pass-btn');
        this.doneBtn = document.getElementById('never-done-btn');
        this.neverBtn = document.getElementById('never-no-btn');
        this.shuffleBtn = document.getElementById('never-shuffle-btn');
        this.filterPills = document.querySelectorAll('.never-filter-pill');

        if (this.passBtn) {
            this.passBtn.addEventListener('click', () => this.handleSkip());
        }

        if (this.doneBtn) {
            this.doneBtn.addEventListener('click', () => this.handleDoneDrinking());
        }

        if (this.neverBtn) {
            this.neverBtn.addEventListener('click', () => this.handleNever());
        }

        if (this.shuffleBtn) {
            this.shuffleBtn.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playCardFlip();
                this.buildDeck();
            });
        }

        this.filterPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                this.filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.category = pill.dataset.category || 'all';
                this.buildDeck();
            });
        });
    }

    start() {
        this.buildDeck();
    }

    buildDeck(options = {}) {
        this.clearPendingCallbacks();
        let pool = [...this.rawPrompts];
        if (this.category !== 'all') {
            pool = pool.filter(p => p.cat === this.category);
        }

        // Shuffle deck
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        this.deck = pool;
        this.playedCount = 0;
        this.drawNext(options);
    }

    drawNext(options = {}) {
        if (this.deck.length === 0) {
            this.buildDeck(options);
            return;
        }

        this.responsePending = false;

        if (!options.silent && window.soundEngine) {
            window.soundEngine.playCardFlip();
        }

        this.currentPrompt = this.deck.pop();
        this.playedCount++;

        // Card animation
        if (this.cardBox) {
            this.cardBox.classList.add('card-swipe-anim');
            this.schedule(() => this.cardBox.classList.remove('card-swipe-anim'), 350);
        }

        this.renderPrompt(this.currentPrompt);
    }

    renderPrompt(prompt) {
        if (!prompt) return;

        const catNames = {
            funny: 'CHUYỆN VUI',
            party: 'BÀN TIỆC',
            spicy: 'HẸN HÒ & TÌNH CẢM',
            life: 'ĐI LÀM & ĐI HỌC'
        };

        if (this.promptText) {
            this.promptText.textContent = prompt.text;
        }

        if (this.catBadge) {
            this.catBadge.textContent = catNames[prompt.cat] || 'TÔI CHƯA TỪNG';
            this.catBadge.className = `never-badge badge-${prompt.cat}`;
        }

        if (this.counterBadge) {
            this.counterBadge.textContent = `Câu: ${this.playedCount} / Còn lại: ${this.deck.length}`;
        }
    }

    handleDoneDrinking() {
        if (this.responsePending) return false;
        this.responsePending = true;
        this.penaltiesCount++;
        if (window.soundEngine) {
            window.soundEngine.playChomp();
        }

        let penaltyUnit = '1 ly';
        if (window.penaltyMedium) {
            penaltyUnit = `1 ${window.penaltyMedium.currentMedium.unit}`;
        }

        // Quick confirmation toast
        if (this.cardBox) {
            this.cardBox.classList.add('card-glow-red');
            this.schedule(() => this.cardBox.classList.remove('card-glow-red'), 400);
        }

        // Draw next prompt after a short moment
        this.schedule(() => this.drawNext(), 500);
        return true;
    }

    handleNever() {
        if (this.responsePending) return false;
        this.drawNext();
        return true;
    }

    handleSkip() {
        if (this.responsePending) return false;
        this.drawNext();
        return true;
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
        this.responsePending = false;
        if (this.cardBox) {
            this.cardBox.classList.remove('card-swipe-anim', 'card-glow-red');
        }
    }
}

// Global instance
window.neverHaveGame = new NeverHaveGame();
