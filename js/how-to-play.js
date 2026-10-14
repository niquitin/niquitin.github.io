/* Vua Bàn Nhậu — compact, first-time-player guides for every mini-game. */
(function (global) {
    'use strict';

    const GUIDES = Object.freeze({
        crocodile: {
            title: 'Khám Răng Cá Sấu',
            steps: [
                'Mỗi người lần lượt chạm 1 chiếc răng bất kỳ ở hàm trên hoặc hàm dưới.',
                'Răng sâu được giấu ngẫu nhiên; lượt kết thúc khi người chơi chạm trúng răng đó.',
                'Người chạm trúng nhận kết quả; chọn “Cài đặt” để đổi số răng sâu hoặc cách tiếp tục.'
            ]
        },
        wheel: {
            title: 'Vòng Quay May Mắn',
            steps: [
                'Chạm nút QUAY ở tâm bánh xe hoặc nút QUAY NGAY bên dưới.',
                'Chờ bánh xe dừng; ô nằm dưới kim chỉ là kết quả của lượt này.',
                'Đọc kết quả trên ô; người chơi có thể thực hiện hoặc bỏ qua. Mở “Tùy chỉnh” để sửa ô.'
            ]
        },
        finger: {
            title: 'Chạm Ngón Tay',
            steps: [
                'Khuyến nghị 2–4 người: mỗi người đặt một ngón tay vào vùng sáng. Nhóm đông hơn nên dùng Xoay Chai Chọn Người.',
                'Từ 2 ngón trở lên bắt đầu đếm 3 giây; giữ ngón tới kết quả. Ngón mới có thể tham gia khi đang đếm; còn dưới 2 ngón thì dừng đếm.',
                'Ngón được chọn có viền đôi và dấu ✓; đọc kết quả rồi có thể chơi lượt mới.'
            ]
        },
        bomb: {
            title: 'Quả Bom Hẹn Giờ',
            steps: [
                'Bấm BẮT ĐẦU CHÂM NGÒI và đọc chủ đề đang hiện trên màn hình.',
                'Nói một đáp án hợp lệ, bấm NÓI XONG — CHUYỀN MÁY rồi đưa điện thoại cho người kế tiếp.',
                'Bom nổ bất ngờ và kết thúc lượt; người đang cầm máy lúc đó nhận kết quả.'
            ]
        },
        pirate: {
            title: 'Thùng Hải Tặc',
            steps: [
                'Mỗi người chọn một khe trên thùng và chạm vào khe đó để đâm kiếm.',
                'Nếu hải tặc bật lên, lượt kết thúc và người vừa đâm nhận kết quả.',
                'Bấm LƯỢT MỚI để dựng lại thùng và chia bẫy mới.'
            ]
        },
        dice: {
            title: 'Xí Ngầu Bàn Tiệc',
            steps: [
                'Chọn luật 7–8–9 (2 viên) hoặc Tài Xỉu / Đua Điểm (3 viên), rồi bấm LẮC XÍ NGẦU.',
                'Luật 7–8–9: tổng 7 tăng mức chung, tổng 8 nhận mức nhẹ, tổng 9 chốt mức chung; ra đôi được mời một người cùng chơi.',
                'Ở Tài Xỉu: tổng 4–10 là Xỉu, 11–17 là Tài; ba viên giống nhau là Bão và cả bàn cùng tham gia.'
            ]
        },
        cards: {
            title: 'Rút Thẻ Thách Đấu',
            steps: [
                'Bấm RÚT THẺ KẾ TIẾP để lật một thẻ.',
                'Đọc nội dung và chọn thực hiện hoặc bỏ qua: Án phạt, Nói thật, Thách đấu hoặc Luật vua.',
                'Xong lượt thì bấm tiếp để rút thẻ mới; dùng bộ lọc để tìm đúng nhóm thẻ.'
            ]
        },
        bottle: {
            title: 'Xoay Chai Chọn Người',
            steps: [
                'Chọn số người, ngồi vòng tròn: ghế 1 ở 12 giờ trên màn hình, đánh số theo chiều kim đồng hồ.',
                'Vuốt chai hoặc bấm XOAY CHAI NGAY; số được highlight khi chai dừng là người được chọn.',
                'Đối đầu dùng đầu và đuôi chai để chọn hai số; với 2 người, cả hai được chọn. Có thể thực hiện hoặc bỏ qua.'
            ]
        },
        numberbomb: {
            title: 'Bom Số Bí Mật',
            steps: [
                'Nhập một số trong khoảng đang hiển thị bằng bàn phím số rồi bấm GỬI SỐ ĐOÁN.',
                'Mỗi lượt đoán sẽ thu hẹp khoảng an toàn; chuyền điện thoại cho người kế tiếp.',
                'Ai đoán trúng số bí mật thì bom nổ, lượt kết thúc và người đó nhận kết quả.'
            ]
        },
        neverhave: {
            title: 'Tôi Chưa Từng...',
            steps: [
                'Đọc lớn câu “Tôi chưa từng...” đang hiện cho cả bàn.',
                'Chọn “Đã từng” hoặc “Chưa từng”; mỗi lựa chọn sẽ chuyển sang câu mới.',
                'Nếu không muốn trả lời, chọn “Bỏ qua”; dùng bộ lọc để đổi chủ đề.'
            ]
        }
    });

    function makeGuide(id, guide) {
        const details = document.createElement('details');
        details.className = 'how-to-play';
        details.dataset.howToPlay = id;
        details.addEventListener('toggle', () => {
            const screen = details.closest('.game-screen');
            if (screen) screen.classList.toggle('guide-open', details.open);
        });
        details.innerHTML = `
            <summary${id === 'crocodile' ? ` aria-label="Cách chơi ${guide.title}"` : ''}>
                <span class="how-to-play-icon" aria-hidden="true">?</span>
                <span class="how-to-play-label">CÁCH CHƠI</span>
                <span class="how-to-play-game">${guide.title}</span>
                <span class="how-to-play-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div class="how-to-play-body">
                <ol>${guide.steps.map((step) => `<li>${step}</li>`).join('')}</ol>
            </div>
        `;
        return details;
    }

    function decorateScreen(id, guide) {
        const screen = document.getElementById(`screen-${id}`);
        if (!screen || screen.querySelector(`[data-how-to-play="${id}"]`)) return;
        const anchor = screen.querySelector('.game-top-bar, .game-header');
        if (!anchor || !anchor.parentNode) return;
        const crocSlot = id === 'crocodile' && anchor.querySelector('.croc-guide-slot');
        if (crocSlot) crocSlot.appendChild(makeGuide(id, guide));
        else anchor.parentNode.insertBefore(makeGuide(id, guide), anchor.nextSibling);
    }

    function decorateAll() {
        Object.keys(GUIDES).forEach((id) => decorateScreen(id, GUIDES[id]));
    }

    global.gameGuides = GUIDES;
    global.addEventListener('DOMContentLoaded', decorateAll, { once: true });
    decorateAll();

    // Dynamic game templates can be rebuilt after settings changes.
    if (global.MutationObserver) {
        const observer = new MutationObserver(() => decorateAll());
        observer.observe(document.body, { childList: true, subtree: true });
    }
})(window);
