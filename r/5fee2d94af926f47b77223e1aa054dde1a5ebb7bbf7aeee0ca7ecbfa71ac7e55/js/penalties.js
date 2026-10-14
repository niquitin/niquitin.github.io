/**
 * Penalty & Challenge Database
 * Stores default and custom penalties for party games
 * Supports categories: 'drink', 'perform', 'dare', 'safe'
 */

const DEFAULT_PENALTIES = [
    // 🍺 ĐỒ UỐNG & TƯƠNG TÁC NHẸ (Drinking)
    { id: 1, text: "{verb} {unit_light} nếu bạn muốn", type: "drink", icon: "🍺", badge: "Mức Nhẹ" },
    { id: 2, text: "Mời một người cùng thực hiện án phạt nhẹ; người đó có thể từ chối", type: "drink", icon: "🍻", badge: "Cùng Tham Gia" },
    { id: 3, text: "{verb} {unit_light} theo nhịp riêng của bạn", type: "drink", icon: "🍷", badge: "Nhẹ Nhàng" },
    { id: 4, text: "Bạn và người bên trái cùng thực hiện án phạt nhẹ nếu cả hai đồng ý", type: "drink", icon: "🤝", badge: "Cùng Đồng Ý" },
    { id: 5, text: "Mời một người đang chơi nhận án phạt nhẹ; người đó có thể bỏ qua", type: "drink", icon: "👑", badge: "Lời Mời" },
    { id: 6, text: "{all_action}", type: "drink", icon: "🥳", badge: "Cả Bàn" },
    { id: 7, text: "Oẳn tù tì với người đối diện; người thua chọn án phạt nhẹ hoặc bỏ qua", type: "drink", icon: "✌️", badge: "Oẳn Tù Tì" },
    { id: 8, text: "Hai người bên cạnh cùng thực hiện án phạt nhẹ nếu đều đồng ý", type: "drink", icon: "👥", badge: "Hai Bên" },
    { id: 9, text: "Kể tên ba món ăn có màu đỏ trong 10 giây", type: "drink", icon: "⏱️", badge: "Kể Nhanh" },
    { id: 10, text: "Ai mặc màu giống bạn cùng vỗ tay ba nhịp", type: "drink", icon: "👕", badge: "Cùng Màu" },
    { id: 11, text: "Người có sinh nhật gần nhất chọn một bài hát cho cả bàn", type: "drink", icon: "👶", badge: "Sinh Nhật Gần Nhất" },
    { id: 12, text: "Chọn một người và nói một lời khen chân thành", type: "drink", icon: "✨", badge: "Lời Khen" },

    // 🎤 VĂN NGHỆ & VŨ ĐẠO (Perform: Hát, Nhảy)
    { id: 13, text: "Hát 1 đoạn điệp khúc bài hát theo phong cách Cải lương", type: "perform", icon: "🎤", badge: "Hát Cải Lương" },
    { id: 14, text: "Hát 1 bài rap hoặc hát bài thiếu nhi với giọng Rock", type: "perform", icon: "🎸", badge: "Hát Giọng Rock" },
    { id: 15, text: "Đứng dậy nhảy 1 điệu nhảy TikTok vui nhộn trong 15 giây", type: "perform", icon: "💃", badge: "Nhảy TikTok" },
    { id: 16, text: "Bật nhạc sàn và múa quạt lắc lư nhiệt tình trong 20 giây", type: "perform", icon: "🕺", badge: "Múa Quạt Quầy Bar" },
    { id: 17, text: "Bắt chước tiếng kêu và điệu bộ của 3 con vật khác nhau", type: "perform", icon: "🐱", badge: "Nhái Tiếng Thú" },
    { id: 18, text: "Kể một câu chuyện cười ngắn cho cả bàn", type: "perform", icon: "🤣", badge: "Chuyện Cười" },
    { id: 19, text: "Nói như một MC và giới thiệu một người chơi trong 20 giây", type: "perform", icon: "🗣️", badge: "MC Bàn Tiệc" },
    { id: 20, text: "Làm động tác quay chậm (Slow Motion) khi gắp mồi/uống nước lượt này", type: "perform", icon: "🦥", badge: "Slow Motion" },
    { id: 21, text: "Tạo ba dáng siêu mẫu; cả bàn chọn dáng vui nhất", type: "perform", icon: "📸", badge: "Tạo Dáng" },

    // 🤫 THÁCH ĐỐ & NÓI THẬT (Dare & Truth)
    { id: 22, text: "Kể một kỷ niệm vui về lần tỏ tình, hoặc chọn bỏ qua", type: "dare", icon: "🤫", badge: "Chuyện Vui" },
    { id: 23, text: "Kể tên ba món ăn bạn thích gần đây", type: "dare", icon: "📱", badge: "Món Yêu Thích" },
    { id: 24, text: "Nói một câu chúc vui cho cả bàn", type: "dare", icon: "💬", badge: "Lời Chúc" },
    { id: 25, text: "Tạo một biểu cảm hài hước trong 5 giây", type: "dare", icon: "🤪", badge: "Biểu Cảm Vui" },
    { id: 26, text: "Khen ngợi người ngồi đối diện 3 câu thật lòng và tình cảm nhất", type: "dare", icon: "💖", badge: "Lời Khen Có Cánh" },
    { id: 27, text: "Chọn một người đang chơi và cùng nói một câu thật nhanh", type: "dare", icon: "📞", badge: "Nói Đồng Thanh" },
    { id: 28, text: "Nếu cả hai đồng ý, mời người bên cạnh chọn một món cho bạn", type: "dare", icon: "🥢", badge: "Chọn Món" },
    { id: 29, text: "Kể một điều nhỏ khiến bạn vui hôm nay", type: "dare", icon: "🗝️", badge: "Niềm Vui Nhỏ" },

    // 🛡️ AN TOÀN & MAY MẮN (Safe)
    { id: 30, text: "Bạn được bỏ qua lượt này; không chuyển án phạt cho người khác", type: "safe", icon: "🛡️", badge: "Bỏ Qua" },
    { id: 31, text: "Nhấp một ngụm nước nếu bạn muốn", type: "safe", icon: "💧", badge: "Nghỉ Nhẹ" },
    { id: 32, text: "Bạn được bỏ qua lượt này", type: "safe", icon: "🍀", badge: "Đại Xá" },

    // 5.19 G5.1: approved Penalties P-ADD-01..06.
    { id: 33, text: "Mời một người tự nguyện nhảy đối đáp hai động tác theo nhạc trong 10 giây; cả hai có thể bỏ qua.", type: "perform", icon: "💃", badge: "Nhảy Đối Đáp" },
    { id: 34, text: "Diễn chậm một động tác chào vui trong 5 giây; có thể bỏ qua.", type: "perform", icon: "🎭", badge: "Chào Quay Chậm" },
    { id: 35, text: "Bịa một câu tỏ tình vui cho nhân vật trong một bài hát, hoặc bỏ qua.", type: "dare", icon: "🎵", badge: "Tỏ Tình Bài Hát" },
    { id: 36, text: "Đặt biệt danh hài hước cho một món ăn trên bàn; có thể bỏ qua.", type: "dare", icon: "🍜", badge: "Tên Món Vui" },
    { id: 37, text: "Nói một lời khen vui về cả bàn; không cần gọi tên ai, có thể bỏ qua.", type: "dare", icon: "✨", badge: "Khen Cả Bàn" },
    { id: 38, text: "Chọn một từ vui, mời một người nói đồng thanh; nếu họ không muốn thì bỏ qua.", type: "dare", icon: "🗣️", badge: "Nói Đồng Thanh" }
];

// Default Wheel Slices (12 segments)
const DEFAULT_WHEEL_SLICES = [
    { text: "Án phạt nhẹ", type: "drink", color: "#FF3366", icon: "🍺" },
    { text: "Bên trái chọn mức nhẹ", type: "drink", color: "#FF9900", icon: "👈" },
    { text: "Hát 1 bài", type: "perform", color: "#9900FF", icon: "🎤" },
    { text: "Tạo một biểu cảm vui", type: "drink", color: "#CC0033", icon: "🍻" },
    { text: "Bỏ qua lượt này", type: "safe", color: "#00CC66", icon: "🛡️" },
    { text: "Nhảy 1 điệu", type: "perform", color: "#00CCCC", icon: "💃" },
    { text: "Bên phải chọn mức nhẹ", type: "drink", color: "#FF6600", icon: "👉" },
    { text: "Cả bàn cùng tham gia", type: "drink", color: "#FFCC00", icon: "🥳" },
    { text: "Chia sẻ một điều vui", type: "dare", color: "#9933FF", icon: "🤫" },
    { text: "Chọn án phạt nhẹ", type: "drink", color: "#3366FF", icon: "🍷" },
    { text: "Mời 1 người cùng chơi", type: "drink", color: "#FF0099", icon: "👑" },
    { text: "Cùng 1 người tự nguyện", type: "drink", color: "#00FF99", icon: "🤝" }
];

// 5.19 G5.2: immutable approved Wheel additions; original 12 stay untouched.
const WHEEL_519_ADDITIONS = Object.freeze([
    { text: "Nhấp một ngụm đồ uống bạn chọn nếu muốn; bỏ qua cũng được.", type: "drink", color: "#C2185B", icon: "🥤" },
    { text: "Ngân nga một đoạn nhạc karaoke trong 5 giây, hoặc bỏ qua.", type: "perform", color: "#6A1B9A", icon: "🎤" },
    { text: "Bịa tên một loại nước giải khát tưởng tượng, hoặc bỏ qua.", type: "dare", color: "#4A148C", icon: "💡" },
    { text: "Cả bàn cùng nâng cốc theo nhạc nếu muốn; ai cũng có thể bỏ qua.", type: "drink", color: "#1565C0", icon: "🥂" },
    { text: "Hô một câu khẩu hiệu vui cho bàn nhậu; có thể bỏ qua.", type: "dare", color: "#AD1457", icon: "📣" },
    { text: "Đặt tên vui cho bàn nhậu bằng ba từ, hoặc bỏ qua.", type: "dare", color: "#283593", icon: "🎲" }
]);
const WHEEL_519_MODE_KEY = "party_wheel_mode_v1";
const WHEEL_519_MODES = ["base12", "expanded12", "all18", "custom"];

const PENALTY_STORAGE_KEYS = Object.freeze({
    penalties: "party_penalties_data_v1",
    wheel: "party_wheel_slices_v1",
    categories: "party_penalties_filter"
});
const PENALTY_TYPES = Object.freeze(["drink", "perform", "dare", "safe"]);

function normalizePartyText(value, maxCodePoints) {
    if (typeof value !== "string") return null;
    let normalized = value;
    try { normalized = normalized.normalize("NFC"); } catch (e) {}
    normalized = normalized.trim().replace(/\s+/gu, " ");
    if (!normalized || Array.from(normalized).length > maxCodePoints) return null;
    return normalized;
}

function cloneRecords(records) {
    return records.map((record) => ({ ...record }));
}

function sanitizePenaltyRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    const text = normalizePartyText(record.text, 160);
    const icon = normalizePartyText(record.icon, 16);
    const badge = normalizePartyText(record.badge, 48);
    if (!Number.isFinite(record.id) || !text || !icon || !badge || !PENALTY_TYPES.includes(record.type)) return null;
    return { id: record.id, text, type: record.type, icon, badge };
}

function sanitizePenaltyList(value) {
    if (!Array.isArray(value)) return null;
    const records = value.map(sanitizePenaltyRecord).filter(Boolean);
    return records.length ? records : null;
}

function sanitizeWheelSlice(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    const text = normalizePartyText(record.text, 80);
    const icon = normalizePartyText(record.icon, 16);
    const color = typeof record.color === "string" && /^#[0-9a-f]{6}$/iu.test(record.color)
        ? record.color.toUpperCase()
        : null;
    if (!text || !icon || !color || !PENALTY_TYPES.includes(record.type)) return null;
    return { text, type: record.type, color, icon };
}

function sanitizeWheelList(value) {
    if (!Array.isArray(value)) return null;
    const records = value.map(sanitizeWheelSlice).filter(Boolean);
    return records.length >= 3 ? records : null;
}

function sanitizeCategories(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const categories = {};
    for (const key of PENALTY_TYPES) {
        if (typeof value[key] !== "boolean") return null;
        categories[key] = value[key];
    }
    return categories;
}

// G5.1 migration is deliberately limited to the Penalties store, never Wheel/filters.
const PENALTY_519_BACKUP_KEY = "party_penalties_backup_519_v1";
const PENALTY_ORIGINAL_COUNT = 32;
const PENALTY_RECORD_FIELDS = ["id", "text", "type", "icon", "badge"];

function isExactPenaltyRecord(record, canonical) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const keys = Object.keys(record);
    return keys.length === PENALTY_RECORD_FIELDS.length
        && PENALTY_RECORD_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(record, field) && record[field] === canonical[field]);
}

function isUnmodifiedPenaltyBaseline(records) {
    return Array.isArray(records)
        && records.length === PENALTY_ORIGINAL_COUNT
        && records.every((record, index) => isExactPenaltyRecord(record, DEFAULT_PENALTIES[index]));
}

class PenaltyManager {
    constructor() {
        this.storageKey = PENALTY_STORAGE_KEYS.penalties;
        this.wheelKey = PENALTY_STORAGE_KEYS.wheel;
        this.categories = {
            drink: true,
            perform: true,
            dare: true,
            safe: true
        };
        this.penaltyWriteBlocked = false;
        this.penaltyStorageRaw = null;
        this.loadData();
    }

    loadData() {
        this.penalties = this.loadPenaltiesForUpgrade();
        this.wheelSlices = this.readLegacyWheel();
        this.wheelMode = this.loadWheelMode();
        this.categories = this.loadStoredValue(
            PENALTY_STORAGE_KEYS.categories,
            sanitizeCategories,
            () => ({ drink: true, perform: true, dare: true, safe: true })
        );
    }

    // G5.1: only a field-exact pristine 32-item snapshot may be upgraded.
    // Invalid/partial snapshots must not be rewritten by the loader.
    loadPenaltiesForUpgrade() {
        const fresh = () => cloneRecords(DEFAULT_PENALTIES);
        let raw;
        try {
            raw = localStorage.getItem(this.storageKey);
        } catch (e) {
            this.penaltyWriteBlocked = true;
            return fresh();
        }
        this.penaltyStorageRaw = raw;
        if (raw === null) return fresh();

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            this.penaltyWriteBlocked = true;
            return fresh();
        }
        const sanitized = sanitizePenaltyList(parsed);
        if (!Array.isArray(parsed) || !sanitized || sanitized.length !== parsed.length
            || !parsed.every((record, index) => isExactPenaltyRecord(record, sanitized[index]))) {
            this.penaltyWriteBlocked = true;
            return sanitized || fresh();
        }
        if (!isUnmodifiedPenaltyBaseline(parsed)) return sanitized;

        const upgraded = cloneRecords(DEFAULT_PENALTIES);
        const serialized = JSON.stringify(upgraded);
        try {
            const existingBackup = localStorage.getItem(PENALTY_519_BACKUP_KEY);
            // An existing unrelated backup must never be overwritten.
            if (existingBackup !== null && existingBackup !== raw) return sanitized;
            if (existingBackup === null) localStorage.setItem(PENALTY_519_BACKUP_KEY, raw);
            if (localStorage.getItem(PENALTY_519_BACKUP_KEY) !== raw) return sanitized;
            // A second tab might have edited Penalties during preparation.
            if (localStorage.getItem(this.storageKey) !== raw) return sanitized;
            localStorage.setItem(this.storageKey, serialized);
            if (localStorage.getItem(this.storageKey) !== serialized) {
                this.restorePenaltyRaw(raw);
                return sanitized;
            }
            this.penaltyStorageRaw = serialized;
            return upgraded;
        } catch (e) {
            // Best effort rollback: localStorage has no multi-key transaction.
            this.restorePenaltyRaw(raw);
            return sanitized;
        }
    }

    restorePenaltyRaw(raw) {
        try {
            // Restore only our own tentative write, never a concurrent edit.
            if (localStorage.getItem(this.storageKey) === JSON.stringify(DEFAULT_PENALTIES)) {
                localStorage.setItem(this.storageKey, raw);
            }
        } catch (e) {
            // Preserve the backup for recovery; never erase the legacy key.
        }
    }

    // Legacy Wheel snapshots are never overwritten by mode initialization.
    readLegacyWheel() {
        this.wheelStorageBlocked = false;
        try {
            const raw = localStorage.getItem(this.wheelKey);
            if (raw === null) return cloneRecords(DEFAULT_WHEEL_SLICES);
            const parsed = JSON.parse(raw);
            const validated = sanitizeWheelList(parsed);
            if (!validated || validated.length !== parsed.length) {
                this.wheelStorageBlocked = true;
                return cloneRecords(DEFAULT_WHEEL_SLICES);
            }
            return validated;
        } catch (e) {
            this.wheelStorageBlocked = true;
            return cloneRecords(DEFAULT_WHEEL_SLICES);
        }
    }

    loadWheelMode() {
        try {
            const stored = localStorage.getItem(WHEEL_519_MODE_KEY);
            if (WHEEL_519_MODES.includes(stored)) return stored;
            if (stored !== null) return "base12";
        } catch (e) {
            return "base12";
        }
        return this.isWheelCustom() ? "custom" : "base12";
    }

    getActiveWheelSlices(medium = window.penaltyMedium && window.penaltyMedium.getCurrent()) {
        if (this.wheelMode === "custom") return cloneRecords(this.wheelSlices);
        const base = this.buildWheelSlicesForMedium(medium) || cloneRecords(DEFAULT_WHEEL_SLICES);
        const G = (n) => ({ ...base[n - 1] });
        const W = (n) => ({ ...WHEEL_519_ADDITIONS[n - 1] });
        if (this.wheelMode === "expanded12") {
            return [W(1), G(2), W(2), W(3), G(5), G(6), G(7), W(4), G(9), W(5), G(11), W(6)];
        }
        if (this.wheelMode === "all18") {
            return [G(1), G(2), W(1), G(3), G(4), W(2), G(5), G(6), W(3),
                G(7), G(8), W(4), G(9), G(10), W(5), G(11), G(12), W(6)];
        }
        return cloneRecords(base);
    }

    chooseWheelMode(mode) {
        if (!WHEEL_519_MODES.includes(mode) || this.wheelMode === mode) return false;
        if (mode === "custom" && this.wheelStorageBlocked) return false;
        const game = window.wheelGame;
        if (game && (game.isSpinning || game.resultTimeout !== null)) return false;
        try {
            localStorage.setItem(WHEEL_519_MODE_KEY, mode);
            if (localStorage.getItem(WHEEL_519_MODE_KEY) !== mode) return false;
        } catch (e) {
            return false;
        }
        this.wheelMode = mode;
        if (game) {
            game.slices = this.getActiveWheelSlices();
            if (game.drawWheel) game.drawWheel();
            if (game.renderWheelModeUI) game.renderWheelModeUI();
        }
        return true;
    }

    loadStoredValue(key, sanitizer, fallbackFactory) {
        let raw;
        try {
            raw = localStorage.getItem(key);
        } catch (e) {
            return fallbackFactory();
        }
        if (raw === null) return fallbackFactory();

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            const fallback = fallbackFactory();
            this.writeStoredValue(key, fallback);
            return fallback;
        }

        const sanitized = sanitizer(parsed);
        if (!sanitized) {
            const fallback = fallbackFactory();
            this.writeStoredValue(key, fallback);
            return fallback;
        }
        if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) {
            this.writeStoredValue(key, sanitized);
        }
        return sanitized;
    }

    writeStoredValue(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    saveData() {
        if (this.penaltyWriteBlocked) return false;
        const raw = JSON.stringify(this.penalties);
        try {
            if (localStorage.getItem(this.storageKey) !== this.penaltyStorageRaw) return false;
            localStorage.setItem(this.storageKey, raw);
            if (localStorage.getItem(this.storageKey) !== raw) return false;
            this.penaltyStorageRaw = raw;
            return true;
        } catch (e) { return false; }
    }

    resetPenaltiesOnly() {
        const next = cloneRecords(DEFAULT_PENALTIES);
        const raw = JSON.stringify(next);
        try {
            localStorage.setItem(this.storageKey, raw);
            if (localStorage.getItem(this.storageKey) !== raw) return false;
            this.penalties = next;
            this.penaltyStorageRaw = raw;
            this.penaltyWriteBlocked = false;
            return true;
        } catch (e) { return false; }
    }

    resetToDefault() {
        return this.resetPenaltiesOnly();
    }

    resetWheelToBase() {
        return this.chooseWheelMode("base12");
    }

    resetCategoriesOnly() {
        const next = { drink: true, perform: true, dare: true, safe: true };
        if (JSON.stringify(this.categories) === JSON.stringify(next)) return false;
        const key = PENALTY_STORAGE_KEYS.categories;
        const raw = JSON.stringify(next);
        let previousRaw;
        let attemptedWrite = false;
        try {
            previousRaw = localStorage.getItem(key);
            if (previousRaw !== null) {
                const stored = JSON.parse(previousRaw);
                // Do not overwrite another tab's newer filter choices.
                if (!stored || Object.keys(next).some((name) => stored[name] !== this.categories[name])) return false;
            }
            attemptedWrite = true;
            localStorage.setItem(key, raw);
            if (localStorage.getItem(key) !== raw) throw Error("filter write verification failed");
        } catch (e) {
            // Best-effort rollback if a successful write was not verified.
            if (attemptedWrite) {
                try {
                    if (localStorage.getItem(key) === raw) {
                        if (previousRaw === null) localStorage.removeItem(key);
                        else localStorage.setItem(key, previousRaw);
                    }
                } catch (ignored) {}
            }
            return false;
        }
        this.categories = next;
        this.emitCategoriesChanged();
        return true;
    }

    deleteCustomWheel(confirmed = false) {
        if (confirmed !== true) return false;
        const game = window.wheelGame;
        if (game && (game.isSpinning || game.resultTimeout !== null)) return false;
        const previousMode = this.wheelMode;
        let previousRaw;
        try {
            previousRaw = localStorage.getItem(this.wheelKey);
            if (previousMode === "custom") {
                localStorage.setItem(WHEEL_519_MODE_KEY, "base12");
                if (localStorage.getItem(WHEEL_519_MODE_KEY) !== "base12") throw Error("mode write failed");
            }
            localStorage.removeItem(this.wheelKey);
            if (localStorage.getItem(this.wheelKey) !== null) throw Error("custom delete failed");
        } catch (e) {
            // localStorage cannot atomically update the two keys. Best-effort
            // rollback restores the original custom data and active mode.
            try {
                if (previousRaw !== null && previousRaw !== undefined
                    && localStorage.getItem(this.wheelKey) === null) {
                    localStorage.setItem(this.wheelKey, previousRaw);
                }
                if (previousMode === "custom") {
                    localStorage.setItem(WHEEL_519_MODE_KEY, "custom");
                }
            } catch (ignored) {}
            return false;
        }
        this.wheelMode = previousMode === "custom" ? "base12" : previousMode;
        this.wheelSlices = cloneRecords(DEFAULT_WHEEL_SLICES);
        this.wheelStorageBlocked = false;
        if (game) {
            game.slices = this.getActiveWheelSlices();
            if (game.drawWheel) game.drawWheel();
            if (game.renderWheelModeUI) game.renderWheelModeUI();
        }
        return true;
    }
    // Get active penalties filtered by category
    getActivePenalties() {
        const active = this.penalties.filter(p => this.categories[p.type] !== false);
        return active.length > 0 ? active : this.penalties;
    }

    // Random a penalty when someone loses in Crocodile, Finger, Bomb, Pirate, or Dice game
    getRandomPenalty() {
        const list = this.getActivePenalties();
        const index = Math.floor(Math.random() * list.length);
        const p = { ...list[index] };

        // Format dynamically based on active Penalty Medium
        if (window.penaltyMedium) {
            p.text = window.penaltyMedium.formatText(p.text);
            if (p.type === "drink") {
                const cur = window.penaltyMedium.getCurrent();
                p.icon = cur.icon;
                p.badge = cur.name;
            }
        }
        return p;
    }

    // Template generator for a medium; the current wheel is regenerated from
    // this whenever the medium changes (existing behavior).
    buildWheelSlicesForMedium(medium) {
        if (!medium) return null;
        return [
            { text: `${medium.actionVerb} ${medium.lightUnit}`, type: "drink", color: "#FF3366", icon: medium.icon },
            { text: "Bên trái chọn mức nhẹ", type: "drink", color: "#FF9900", icon: "👈" },
            { text: "Hát 1 bài", type: "perform", color: "#9900FF", icon: "🎤" },
            { text: "Tạo một biểu cảm vui", type: "drink", color: "#CC0033", icon: medium.icon },
            { text: "Bỏ qua lượt này", type: "safe", color: "#00CC66", icon: "🛡️" },
            { text: "Nhảy 1 điệu", type: "perform", color: "#00CCCC", icon: "💃" },
            { text: "Bên phải chọn mức nhẹ", type: "drink", color: "#FF6600", icon: "👉" },
            { text: medium.allAction || "Cả bàn cùng tham gia nếu mọi người đồng ý", type: "drink", color: "#FFCC00", icon: "🥳" },
            { text: "Chia sẻ một điều vui", type: "dare", color: "#9933FF", icon: "🤫" },
            { text: `Mức nhẹ: ${medium.lightUnit}`, type: "drink", color: "#3366FF", icon: medium.icon },
            { text: "Mời 1 người cùng chơi", type: "drink", color: "#FF0099", icon: "👑" },
            { text: "Cùng 1 người tự nguyện", type: "drink", color: "#00FF99", icon: "🤝" }
        ];
    }

    // Update wheel slices dynamically based on selected medium
    updateWheelSlicesForMedium(medium) {
        if (!medium) return false;
        // Built-in Wheel modes use in-memory templates; custom storage is untouched.
        if (this.wheelMode === "custom") return false;
        if (window.wheelGame) {
            window.wheelGame.slices = this.getActiveWheelSlices(medium);
            if (window.wheelGame.drawWheel) window.wheelGame.drawWheel();
            if (window.wheelGame.renderWheelModeUI) window.wheelGame.renderWheelModeUI();
        }
        return true;
    }

    // Read-only detection: true when the stored wheel no longer matches the
    // template of the current medium nor the factory defaults, i.e. the user
    // has hand-edited slices that a medium change would silently regenerate.
    isWheelCustom() {
        const medium = window.penaltyMedium ? window.penaltyMedium.getCurrent() : null;
        const template = this.buildWheelSlicesForMedium(medium);
        if (template && JSON.stringify(this.wheelSlices) === JSON.stringify(template)) return false;
        return JSON.stringify(this.wheelSlices) !== JSON.stringify(DEFAULT_WHEEL_SLICES);
    }

    // Read-only UI gate: distinguish an actual ID/text collision from no-op
    // or inaccessible data before displaying the owner-approved warning.
    getApprovedPenaltyMergeStatus() {
        if (this.penaltyWriteBlocked || this.penaltyStorageRaw === null) return "unavailable";
        const additions = DEFAULT_PENALTIES.slice(PENALTY_ORIGINAL_COUNT);
        const ids = new Set(this.penalties.map((item) => item.id));
        const texts = new Set(this.penalties.map((item) => item.text));
        if (ids.size !== this.penalties.length || texts.size !== this.penalties.length
            || additions.some((item) => this.penalties.some((existing) =>
                (existing.id === item.id || existing.text === item.text)
                && !isExactPenaltyRecord(existing, item)))) return "conflict";
        return additions.some((item) => !ids.has(item.id)) ? "available" : "complete";
    }

    // Only the explicitly confirmed G5.6 UI action may opt custom data in.
    mergeApprovedPenaltiesAfterOptIn(confirmed = false) {
        if (confirmed !== true || this.penaltyWriteBlocked || this.penaltyStorageRaw === null) return false;
        try {
            if (localStorage.getItem(this.storageKey) !== this.penaltyStorageRaw) return false;
        } catch (e) {
            return false;
        }
        const additions = DEFAULT_PENALTIES.slice(PENALTY_ORIGINAL_COUNT);
        const ids = new Set(this.penalties.map((item) => item.id));
        const texts = new Set(this.penalties.map((item) => item.text));
        // Fail closed on duplicate custom records or conflicting new IDs/text.
        // Matching a new ID and text alone is insufficient when metadata differs.
        if (ids.size !== this.penalties.length || texts.size !== this.penalties.length) return false;
        if (additions.some((item) => this.penalties.some((existing) =>
            (existing.id === item.id || existing.text === item.text)
            && !isExactPenaltyRecord(existing, item)
        ))) return false;

        const missing = additions.filter((item) => !ids.has(item.id));
        if (!missing.length) return false;
        const next = this.penalties.concat(cloneRecords(missing));
        const serialized = JSON.stringify(next);
        const oldRaw = this.penaltyStorageRaw;
        try {
            if (localStorage.getItem(this.storageKey) !== oldRaw) return false;
            localStorage.setItem(this.storageKey, serialized);
            if (localStorage.getItem(this.storageKey) !== serialized) return false;
            this.penalties = next;
            this.penaltyStorageRaw = serialized;
            return true;
        } catch (e) {
            try {
                if (localStorage.getItem(this.storageKey) === serialized) {
                    localStorage.setItem(this.storageKey, oldRaw);
                }
            } catch (ignored) {}
            return false;
        }
    }

    // Add a new custom penalty
    addPenalty(text, type = "drink", icon = "🍺", badge = "Tự Chọn") {
        if (this.penaltyWriteBlocked) return null;
        const normalizedText = normalizePartyText(text, 160);
        if (!normalizedText || !PENALTY_TYPES.includes(type)) return null;
        const newPenalty = {
            id: Date.now(),
            text: normalizedText,
            type,
            icon: normalizePartyText(icon, 16) || "🎯",
            badge: normalizePartyText(badge, 48) || "Tự Chọn"
        };
        const next = [newPenalty, ...this.penalties];
        const serialized = JSON.stringify(next);
        try {
            if (localStorage.getItem(this.storageKey) !== this.penaltyStorageRaw) return null;
            localStorage.setItem(this.storageKey, serialized);
            if (localStorage.getItem(this.storageKey) !== serialized) return null;
        } catch (e) { return null; }
        this.penalties = next;
        this.penaltyStorageRaw = serialized;
        return newPenalty;
    }

    // Delete a penalty
    removePenalty(id) {
        if (this.penaltyWriteBlocked) return false;
        const next = this.penalties.filter(p => p.id !== id);
        if (next.length === this.penalties.length || !next.length) return false;
        const serialized = JSON.stringify(next);
        try {
            if (localStorage.getItem(this.storageKey) !== this.penaltyStorageRaw) return false;
            localStorage.setItem(this.storageKey, serialized);
            if (localStorage.getItem(this.storageKey) !== serialized) return false;
        } catch (e) { return false; }
        this.penalties = next;
        this.penaltyStorageRaw = serialized;
        return true;
    }

    // Update wheel slices
    saveWheelSlices(slices) {
        if (this.wheelMode !== "custom" || this.wheelStorageBlocked) return false;
        const game = window.wheelGame;
        if (game && (game.isSpinning || game.resultTimeout !== null)) return false;
        const sanitized = sanitizeWheelList(slices);
        if (!sanitized) return false;
        if (JSON.stringify(sanitized) === JSON.stringify(this.wheelSlices)) return false;
        try {
            const raw = JSON.stringify(sanitized);
            localStorage.setItem(this.wheelKey, raw);
            if (localStorage.getItem(this.wheelKey) !== raw) return false;
        } catch (e) { return false; }
        this.wheelSlices = sanitized;
        return true;
    }
    validatePenaltyText(text) {
        const value = normalizePartyText(text, 160);
        return value
            ? { valid: true, value, error: "" }
            : { valid: false, value: "", error: "Nhập từ 1 đến 160 ký tự." };
    }

    validateWheelText(text) {
        const value = normalizePartyText(text, 80);
        return value
            ? { valid: true, value, error: "" }
            : { valid: false, value: "", error: "Nhập từ 1 đến 80 ký tự." };
    }

    persistCategories(next) {
        const key = PENALTY_STORAGE_KEYS.categories;
        const current = sanitizeCategories(this.categories);
        const keys = PENALTY_TYPES;
        const hasExactShape = (value) => value
            && typeof value === "object"
            && !Array.isArray(value)
            && Object.keys(value).length === keys.length
            && keys.every((name) => Object.prototype.hasOwnProperty.call(value, name));
        const sameCategories = (left, right) => keys.every((name) => left[name] === right[name]);
        const defaults = { drink: true, perform: true, dare: true, safe: true };

        if (!hasExactShape(current) || !hasExactShape(this.categories)) return false;

        let previousRaw;
        let attemptedWrite = false;
        const nextRaw = JSON.stringify(next);
        try {
            previousRaw = localStorage.getItem(key);
            if (previousRaw === null) {
                // A missing key is the untouched default state, not permission
                // to replace categories that another tab changed in memory.
                if (!sameCategories(current, defaults)) return false;
            } else {
                let stored;
                try {
                    stored = JSON.parse(previousRaw);
                } catch (e) {
                    return false;
                }
                const sanitized = sanitizeCategories(stored);
                if (!hasExactShape(stored) || !sanitized || !sameCategories(sanitized, current)) return false;
            }

            // Re-read immediately before writing so a cross-tab update observed
            // after the first read is never silently replaced.
            if (localStorage.getItem(key) !== previousRaw) return false;

            attemptedWrite = true;
            localStorage.setItem(key, nextRaw);
            if (localStorage.getItem(key) !== nextRaw) throw Error("category write verification failed");
        } catch (e) {
            // Roll back only if the value still equals this mutation's write;
            // never replace a newer value written by another tab.
            if (attemptedWrite) {
                try {
                    if (localStorage.getItem(key) === nextRaw) {
                        if (previousRaw === null) localStorage.removeItem(key);
                        else localStorage.setItem(key, previousRaw);
                    }
                } catch (ignored) {}
            }
            return false;
        }

        this.categories = next;
        this.emitCategoriesChanged();
        return true;
    }

    toggleCategory(category) {
        if (!Object.prototype.hasOwnProperty.call(this.categories, category)) return false;
        const next = { ...this.categories, [category]: !this.categories[category] };
        return this.persistCategories(next);
    }

    // Bulk setter used by the party preset apply flow; unknown keys fall
    // back to enabled so the filter semantics keep matching `getActivePenalties`.
    setCategories(categories) {
        const next = {};
        ["drink", "perform", "dare", "safe"].forEach((key) => {
            next[key] = categories ? categories[key] !== false : true;
        });
        if (JSON.stringify(next) === JSON.stringify(this.categories)) return false;
        return this.persistCategories(next);
    }

    emitCategoriesChanged() {
        try {
            window.dispatchEvent(new CustomEvent("penaltyCategoriesChanged", {
                detail: { ...this.categories }
            }));
        } catch (e) {}
    }
}

window.penaltyManager = new PenaltyManager();

