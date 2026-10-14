/**
 * Drinking Cards Game (Rút Thẻ Bài Thách Đấu / Vua Bàn Nhậu)
 * Interactive deck with 57 approved Vietnamese party cards across 4 categories:
 * - DRINK (Án phạt nhẹ)
 * - TRUTH (Chia sẻ tự nguyện)
 * - DARE (Thử thách vui)
 * - KING (Luật bàn tiệc)
 */

class DrinkingCardsGame {
    constructor() {
        this.category = 'all';
        this.deck = [];
        this.drawnHistory = [];
        this.currentCard = null;
        this.isFlipping = false;
        this.generationId = 0;
        this.drawId = 0;
        this.pendingTimeouts = new Set();

        this.rawCards = [
            // --- DRINK (Án phạt nhẹ) ---
            { id: 1, type: 'drink', title: 'Mức Nhẹ', desc: 'Người bốc thẻ chọn thực hiện án phạt nhẹ hoặc bỏ qua.', count: 1 },
            { id: 2, type: 'drink', title: 'Bạn Bên Trái', desc: 'Mời người bên trái cùng thực hiện án phạt nhẹ; họ có thể từ chối.', count: 1 },
            { id: 3, type: 'drink', title: 'Bạn Bên Phải', desc: 'Mời người bên phải cùng thực hiện án phạt nhẹ; họ có thể từ chối.', count: 1 },
            { id: 4, type: 'drink', title: 'Tháng Chẵn', desc: 'Ai sinh vào tháng chẵn có thể cùng thực hiện án phạt nhẹ.', count: 1 },
            { id: 5, type: 'drink', title: 'Cùng Màu Áo', desc: 'Ai đang mặc màu áo giống bạn có thể cùng tham gia án phạt nhẹ.', count: 1 },
            { id: 6, type: 'drink', title: 'Câu Hỏi Hoàng Gia', desc: 'Mời một người trả lời câu hỏi vui; người đó có thể từ chối.', count: 2 },
            { id: 7, type: 'drink', title: 'Bạn Đối Diện', desc: 'Mời người đối diện cùng thực hiện án phạt nhẹ nếu họ đồng ý.', count: 1 },
            { id: 8, type: 'drink', title: 'Tấm Khiên', desc: 'Giữ thẻ này để bỏ qua một án phạt trong buổi chơi.', count: 0 },
            { id: 9, type: 'drink', title: 'Cả Bàn Cụng Ly', desc: 'Cả bàn cùng cụng ly; mỗi người tự chọn có nhấp một ngụm hay không.', count: 1 },
            { id: 10, type: 'drink', title: 'Hội Độc Thân', desc: 'Ai đang độc thân có thể chia sẻ một điều vui gần đây.', count: 1 },
            { id: 11, type: 'drink', title: 'Tháng Lẻ', desc: 'Ai sinh vào tháng lẻ có thể cùng thực hiện án phạt nhẹ.', count: 1 },
            { id: 12, type: 'drink', title: 'Cùng Đồng Ý', desc: 'Mời một người bắt tay hoặc cụng ly; chỉ thực hiện khi cả hai đồng ý.', count: 1 },
            { id: 13, type: 'drink', title: 'Thần May Mắn', desc: 'Bạn được bỏ qua lượt này. Không ai nhận án phạt.', count: 0 },
            { id: 14, type: 'drink', title: 'Đố Nhanh', desc: 'Trả lời một câu đố vui trong 10 giây, hoặc chọn bỏ qua.', count: 2 },
            { id: 15, type: 'drink', title: 'Hai Bên Cùng Vui', desc: 'Mời hai người ngồi cạnh cùng tham gia án phạt nhẹ nếu họ đồng ý.', count: 1 },

            // --- TRUTH (Chia sẻ tự nguyện) ---
            { id: 16, type: 'truth', title: 'Kỷ Niệm Vui', desc: 'Kể một kỷ niệm vui về chuyện hẹn hò, hoặc chọn bỏ qua.', count: 2 },
            { id: 17, type: 'truth', title: 'Điều Đáng Tự Hào', desc: 'Kể một điều khiến bạn tự hào trong tuần này, hoặc chọn bỏ qua.', count: 2 },
            { id: 18, type: 'truth', title: 'Ấn Tượng Đầu Tiên', desc: 'Bạn ấn tượng điều gì ở một người đang chơi? Có thể chọn bỏ qua.', count: 1 },
            { id: 19, type: 'truth', title: 'Món Đồ Vui Nhất', desc: 'Món đồ thú vị nhất bạn từng mua là gì? Có thể chọn bỏ qua.', count: 1 },
            { id: 20, type: 'truth', title: 'Xử Lý Bất Ngờ', desc: 'Kể một lần bạn xử lý tình huống bất ngờ theo cách vui vẻ.', count: 2 },
            { id: 21, type: 'truth', title: 'Chủ Đề Tò Mò', desc: 'Kể một chủ đề bạn muốn tìm hiểu gần đây.', count: 2 },
            { id: 22, type: 'truth', title: 'Hiểu Lầm Vui', desc: 'Kể một lần hiểu lầm khiến bạn bật cười, hoặc chọn bỏ qua.', count: 1 },
            { id: 23, type: 'truth', title: 'Bài Hát Gần Đây', desc: 'Kể tên một bài hát bạn nghe gần đây.', count: 2 },

            // --- DARE (Thử thách vui) ---
            { id: 24, type: 'dare', title: 'Nốt Nhạc Vui', desc: 'Hát một điệp khúc hoặc rap một đoạn ngắn; có thể chọn bỏ qua.', count: 2 },
            { id: 25, type: 'dare', title: 'Vũ Điệu Tại Chỗ', desc: 'Nhún nhảy tại chỗ trong 15 giây; có thể chọn bỏ qua.', count: 2 },
            { id: 26, type: 'dare', title: 'Diễn Viên Vui Tính', desc: 'Giả giọng một con vật và gửi lời chào tới cả bàn.', count: 2 },
            { id: 27, type: 'dare', title: 'Ba Dáng Tay', desc: 'Tạo ba dáng tay khác nhau trong 10 giây.', count: 2 },
            { id: 28, type: 'dare', title: 'Thử Thách Nhìn Nhau', desc: 'Nếu cả hai đồng ý, nhìn nhau trong 10 giây; ai cũng có thể dừng.', count: 1 },
            { id: 29, type: 'dare', title: 'Vẽ Bằng Tay Không Thuận', desc: 'Dùng tay không thuận vẽ một hình đơn giản trong không khí.', count: 1 },
            { id: 30, type: 'dare', title: 'Chọn Chủ Đề', desc: 'Mời người bên cạnh chọn một chủ đề vui nếu họ đồng ý.', count: 1 },
            { id: 31, type: 'dare', title: 'Lời Khen Chân Thành', desc: 'Nói một lời khen chân thành với một người đang chơi.', count: 1 },

            // --- KING (Luật bàn tiệc) ---
            { id: 32, type: 'king', title: 'Luật Không Chỉ Tay', desc: 'Trong 3 vòng, ai lỡ chỉ tay sẽ nói một lời khen.', count: 1 },
            { id: 33, type: 'king', title: 'Luật Không Gọi Tên', desc: 'Trong 2 vòng, ai lỡ gọi tên thật sẽ vẫy tay chào cả bàn.', count: 1 },
            { id: 34, type: 'king', title: 'Luật Cụng Ly Hai Tay', desc: 'Trong 2 vòng, ai quên dùng hai tay chỉ cần mỉm cười thật tươi.', count: 1 },
            { id: 35, type: 'king', title: 'Vua Đặt Luật', desc: 'Đặt một luật vui, an toàn; cả bàn đồng ý trước và ai cũng có thể bỏ qua.', count: 0 },
            { id: 36, type: 'king', title: 'Vua Đồng Hành', desc: 'Trong 2 lượt tới, người nhận án phạt có thể mời bạn cùng tham gia; bạn có thể từ chối.', count: 1 },
            { id: 37, type: 'king', title: 'Luật Tượng Sáp', desc: 'Khi bạn hô “TƯỢNG”, người động đậy đầu tiên chọn một hành động vui hoặc bỏ qua.', count: 1 },

            // G5.3 approved additions
            { id: 38, type: 'dare', title: "Nghệ Danh Đêm Nay", desc: "Hãy nghĩ ra một nghệ danh hư cấu cho tiết mục karaoke tối nay. Không cần dùng tên thật; có thể chọn bỏ qua.", count: 1 },
            { id: 39, type: 'dare', title: "Song Ca Hai Nốt", desc: "Nếu cả hai cùng muốn, bạn và một người chơi tự nguyện ngân hai nốt bất kỳ theo kiểu gọi–đáp; không cần hát lời. Có thể bỏ qua.", count: 1 },
            { id: 40, type: 'dare', title: "Nhịp Bàn Bốn Phách", desc: "Vỗ tay nhẹ một nhịp bốn phách; ai muốn có thể lặp lại nhịp đó. Không gõ vào ly, bát hay đồ vật. Có thể bỏ qua.", count: 1 },
            { id: 41, type: 'dare', title: "Khẩu Hiệu Mở Màn", desc: "Đặt một khẩu hiệu hư cấu dài 3–5 từ cho chương trình karaoke của cả bàn. Ai thích có thể đọc cùng; có thể bỏ qua.", count: 1 },
            { id: 42, type: 'dare', title: "Tựa Hát Sắc Màu", desc: "Chọn một màu bạn nhìn thấy trong quán và nghĩ ra tên một bài hát hư cấu có màu đó. Không cần nhắc hay hướng vào khách khác; có thể bỏ qua.", count: 1 },
            { id: 43, type: 'dare', title: "Nốt Nhạc Kế Tiếp", desc: "Đố vui: Trong thang âm, nốt nào đứng ngay sau Mi? Có thể bỏ qua.", count: 1 },
            { id: 44, type: 'dare', title: "MC Giới Thiệu Ban Nhạc", desc: "Hãy giới thiệu một ban nhạc tưởng tượng bằng một câu như MC sân khấu. Dùng tên hư cấu, không kể chuyện riêng của ai; có thể bỏ qua.", count: 1 },
            { id: 45, type: 'dare', title: "Bình Luận Món Ngon", desc: "Chọn một món đang có trên bàn và bình luận vui tối đa 5 giây như đang dẫn chương trình ẩm thực. Không cần nếm hay chạm vào món; có thể bỏ qua.", count: 1 },
            { id: 46, type: 'truth', title: "Playlist Cả Bàn", desc: "Cả bàn có thể cùng đề xuất tối đa ba tên bài hát cho một playlist karaoke vui. Chỉ cần nêu tên bài, không phải giải thích lý do; có thể bỏ qua.", count: 1 },
            { id: 47, type: 'dare', title: "Đoán Tên Bài Qua Ba Gợi Ý", desc: "Nghĩ tới một bài hát quen thuộc rồi đưa ra ba gợi ý không dùng lời bài hát; ai muốn có thể đoán tên. Có thể bỏ qua.", count: 1 },
            { id: 48, type: 'dare', title: "Chào Sân Đồng Bộ", desc: "Nếu cả hai cùng đồng ý, bạn và một người chơi tự nguyện làm một động tác chào sân khấu tại chỗ, như vẫy tay; không cần chạm nhau. Có thể bỏ qua.", count: 1 },
            { id: 49, type: 'dare', title: "Nối Vần Món Quen", desc: "Chọn tên một món ăn rồi nói một từ tiếng Việt có vần gần với tiếng cuối của tên món. Không cần có đáp án hoàn hảo; có thể bỏ qua.", count: 1 },
            { id: 50, type: 'dare', title: "Đoán Món Qua Ba Từ", desc: "Nghĩ tới một món đang có trên bàn và mô tả bằng ba từ gợi ý, không nói tên món; ai muốn có thể đoán. Không cần nếm món; có thể bỏ qua.", count: 1 },
            { id: 51, type: 'truth', title: "Một Điểm Vui Ở Quán", desc: "Nêu một chi tiết vui bạn nhận thấy ở không khí quán, như âm nhạc, ánh đèn hoặc cách bày món. Không cần nói về bản thân hay người khác; có thể bỏ qua.", count: 1 },
            { id: 52, type: 'dare', title: "Chọn Nhạc Cho Cảnh Tưởng Tượng", desc: "Chọn một cảnh hư cấu trong buổi tiệc — mở màn, trao giải hoặc kết thúc — rồi chọn thể loại nhạc hợp với cảnh đó. Có thể bỏ qua.", count: 1 },
            { id: 53, type: 'dare', title: "Hiệu Ứng Âm Thanh Mở Màn", desc: "Tạo một hiệu ứng âm thanh ngắn bằng miệng cho phần mở màn của tiết mục tưởng tượng; không cần bắt chước người thật hay con vật. Có thể bỏ qua.", count: 1 },
            { id: 54, type: 'dare', title: "Ban Nhạc Một Từ", desc: "Cả bàn có thể tự nguyện mỗi người góp một từ để ghép thành tên ban nhạc tưởng tượng; dừng sau tối đa ba từ. Có thể bỏ qua.", count: 1 },
            { id: 55, type: 'dare', title: "Trao Giải Món Ăn", desc: "Trao một danh hiệu vui, hư cấu cho một món trên bàn, như ‘ngôi sao trình bày’. Không cần nếm hoặc chạm vào món; có thể bỏ qua.", count: 1 },
            { id: 56, type: 'dare', title: "Thể Loại Cho Món Ăn", desc: "Chọn một món trên bàn và tưởng tượng món đó là nhân vật trong phim; chọn một thể loại nhạc làm nhạc nền cho nhân vật ấy. Không cần nếm món; có thể bỏ qua.", count: 1 },
            { id: 57, type: 'dare', title: "Đếm Ngược Mở Tiết Mục", desc: "Mời tối đa hai người tự nguyện cùng đếm ‘3–2–1’ để mở màn một tiết mục tưởng tượng. Không phát sinh luật cho lượt sau; ai cũng có thể bỏ qua.", count: 1 }
        ];

        this.initDOM();
        this.buildDeck();
    }

    initDOM() {
        this.screen = document.getElementById('screen-cards');
        if (!this.screen) return;

        this.cardBox = document.getElementById('card-3d-box');
        this.drawBtn = document.getElementById('card-draw-btn');
        this.shuffleBtn = document.getElementById('card-shuffle-btn');
        this.filterPills = document.querySelectorAll('.card-filter-pill');
        this.deckCounter = document.getElementById('cards-left-counter');
        this.cardTypeBadge = document.getElementById('card-type-badge');
        this.cardTitle = document.getElementById('card-front-title');
        this.cardBody = document.getElementById('card-front-desc');
        this.cardIcon = document.getElementById('card-front-icon');

        if (this.drawBtn) {
            this.drawBtn.addEventListener('click', () => this.drawNextCard());
        }

        if (this.cardBox) {
            this.cardBox.addEventListener('click', () => this.drawNextCard());
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
        if (this.deck.length === 0) {
            this.buildDeck();
        }
    }

    buildDeck() {
        this.clearPendingCallbacks();
        this.generationId += 1;
        this.isFlipping = false;
        let pool = [...this.rawCards];
        if (this.category !== 'all') {
            pool = pool.filter(c => c.type === this.category);
        }

        // Shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        this.deck = pool;
        this.drawnHistory = [];
        this.updateCounter();

        // Reset card face to back
        if (this.cardBox) {
            this.cardBox.classList.remove('is-flipped');
        }
    }

    drawNextCard() {
        if (this.isFlipping) return;
        if (this.deck.length === 0) {
            this.buildDeck();
        }

        this.isFlipping = true;
        const generationId = this.generationId;
        const drawId = ++this.drawId;
        const card = this.deck.pop();
        this.currentCard = card;
        this.drawnHistory.push(card);

        if (window.soundEngine) {
            window.soundEngine.playCardFlip();
        }

        if (this.cardBox) {
            // First unflip if flipped
            this.cardBox.classList.remove('is-flipped');

            this.schedule(() => {
                if (generationId !== this.generationId || drawId !== this.drawId || !this.isFlipping) return;
                this.renderCardContent(card);
                this.cardBox.classList.add('is-flipped');
                this.updateCounter();
                this.recordHistory(card, generationId, drawId);

                this.schedule(() => {
                    if (generationId !== this.generationId || drawId !== this.drawId) return;
                    this.isFlipping = false;
                }, 400);
            }, 250);
        }
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
        this.generationId += 1;
        this.isFlipping = false;
    }

    recordHistory(card, generationId, drawId) {
        if (!card || !window.sessionHistory || typeof window.sessionHistory.record !== 'function') return;
        try {
            window.sessionHistory.record({
                type: 'game_result',
                gameId: 'cards',
                label: card.title,
                detail: { cardId: card.id, category: card.type }
            }, { dedupeKey: `cards:${generationId}:draw:${drawId}:result` });
        } catch (e) {
            // History is observational; a store failure must not break Cards.
        }
    }

    renderCardContent(card) {
        if (!card) return;

        const icons = {
            drink: 'penalty-drink',
            truth: 'penalty-dare',
            dare: 'penalty-perform',
            king: 'crown'
        };

        const typeNames = {
            drink: 'ÁN PHẠT NHẸ',
            truth: 'SỰ THẬT',
            dare: 'THÁCH ĐẤU',
            king: 'LUẬT VUA'
        };

        if (this.cardTypeBadge) {
            this.cardTypeBadge.textContent = typeNames[card.type] || 'THẺ BÀI';
            this.cardTypeBadge.className = `card-badge badge-${card.type}`;
        }

        if (this.cardIcon) {
            const use = this.cardIcon.querySelector('use');
            if (use) use.setAttribute('href', `assets/icons/game-icons.svg#${icons[card.type] || 'question'}`);
        }

        if (this.cardTitle) {
            this.cardTitle.textContent = card.title;
        }

        if (this.cardBody) {
            let formattedDesc = card.desc;
            if (window.penaltyMedium) {
                formattedDesc = window.penaltyMedium.formatText(card.desc, { count: card.count || 1 });
            } else {
                formattedDesc = formattedDesc.replace('{count}', card.count || 1).replace('{unit}', 'ly');
            }
            this.cardBody.textContent = formattedDesc;
        }
    }

    updateCounter() {
        if (this.deckCounter) {
            this.deckCounter.textContent = `Còn lại: ${this.deck.length} thẻ`;
        }
    }
}

// Global instance
window.cardsGame = new DrinkingCardsGame();
