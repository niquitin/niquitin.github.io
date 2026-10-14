/**
 * Global Penalty Medium Engine (penalty_medium.js)
 * Manages customizable, opt-in penalty media across all games.
 * Machine ids remain stable for persisted preferences; the visible presets use
 * bounded drink portions or safe social actions.
 */

const PENALTY_MEDIUMS = {
    beer: {
        id: "beer",
        name: "Bia / Không Cồn",
        icon: "🍺",
        unit: "ngụm nhỏ",
        heavyUnit: "một ngụm nhỏ",
        lightUnit: "một ngụm nhỏ",
        allAction: "Cả bàn cùng cụng ly; ai muốn có thể nhấp một ngụm nhỏ.",
        actionVerb: "Uống",
        description: "Có thể dùng bia hoặc bất kỳ đồ uống không cồn nào."
    },
    liquor: {
        id: "liquor",
        name: "Rượu / Không Cồn",
        icon: "🥃",
        unit: "ngụm nhỏ",
        heavyUnit: "một ngụm nhỏ",
        lightUnit: "một ngụm nhỏ",
        allAction: "Cả bàn cùng cụng ly; ai muốn có thể nhấp một ngụm nhỏ.",
        actionVerb: "Uống",
        description: "Một ngụm nhỏ; luôn có thể đổi sang đồ uống không cồn."
    },
    ear_flick: {
        id: "ear_flick",
        name: "Búng Tay",
        icon: "🤏",
        unit: "1 nhịp",
        heavyUnit: "2 nhịp",
        lightUnit: "1 nhịp",
        allAction: "Cả bàn cùng búng tay theo hai nhịp.",
        actionVerb: "Búng",
        description: "Tự búng tay theo nhịp, không chạm vào người khác."
    },
    softdrink: {
        id: "softdrink",
        name: "Nước Không Cồn",
        icon: "🥤",
        unit: "ngụm nhỏ",
        heavyUnit: "một ngụm nhỏ",
        lightUnit: "một ngụm nhỏ",
        allAction: "Cả bàn cùng cụng ly; ai muốn có thể nhấp một ngụm nhỏ.",
        actionVerb: "Uống",
        description: "Nước suối, trà hoặc đồ uống không cồn do bạn chọn."
    },
    spicy: {
        id: "spicy",
        name: "Đố Nhanh",
        icon: "❓",
        unit: "1 câu",
        heavyUnit: "1 câu",
        lightUnit: "1 câu dễ",
        allAction: "Cả bàn cùng trả lời một câu đố vui.",
        actionVerb: "Trả lời",
        description: "Một câu hỏi ngắn, vui và không yêu cầu tiết lộ riêng tư."
    },
    money: {
        id: "money",
        name: "Lời Khen",
        icon: "💬",
        unit: "1 lời khen",
        heavyUnit: "2 lời khen",
        lightUnit: "1 lời khen ngắn",
        allAction: "Mỗi người nói một lời khen chân thành.",
        actionVerb: "Nói",
        description: "Chia sẻ lời khen tích cực với người đang tham gia."
    },
    fitness: {
        id: "fitness",
        name: "Tạo Dáng",
        icon: "💪",
        unit: "1 dáng",
        heavyUnit: "2 dáng",
        lightUnit: "1 dáng đơn giản",
        allAction: "Cả bàn cùng tạo một dáng vui tại chỗ.",
        actionVerb: "Tạo",
        description: "Tạo dáng vui tại chỗ, không cần vận động mạnh."
    },
    custom: {
        id: "custom",
        name: "Tùy chỉnh",
        icon: "✏️",
        unit: "1 lượt",
        heavyUnit: "2 lượt",
        lightUnit: "1 lượt nhẹ",
        allAction: "Cả bàn cùng tham gia nếu mọi người đồng ý.",
        actionVerb: "Thực hiện",
        description: "Tự nhập một hoạt động vui; mọi người luôn có thể bỏ qua."
    }
};

const PENALTY_MEDIUM_STORAGE_KEYS = Object.freeze({
    id: "party_penalty_medium_id",
    name: "party_penalty_custom_name",
    unit: "party_penalty_custom_unit"
});
const DEFAULT_CUSTOM_MEDIUM = Object.freeze({ name: "Thử thách vui", unit: "1 cái" });

function normalizeMediumText(value, maxCodePoints) {
    if (typeof value !== "string") return null;
    let normalized = value;
    try { normalized = normalized.normalize("NFC"); } catch (e) {}
    normalized = normalized.trim().replace(/\s+/gu, " ");
    if (!normalized || Array.from(normalized).length > maxCodePoints) return null;
    return normalized;
}

class PenaltyMediumManager {
    constructor() {
        this.currentMediumId = this.loadStoredText(
            PENALTY_MEDIUM_STORAGE_KEYS.id,
            (value) => Object.prototype.hasOwnProperty.call(PENALTY_MEDIUMS, value) ? value : null,
            "beer"
        );
        this.customName = this.loadStoredText(
            PENALTY_MEDIUM_STORAGE_KEYS.name,
            (value) => normalizeMediumText(value, 32),
            DEFAULT_CUSTOM_MEDIUM.name
        );
        this.customUnit = this.loadStoredText(
            PENALTY_MEDIUM_STORAGE_KEYS.unit,
            (value) => normalizeMediumText(value, 24),
            DEFAULT_CUSTOM_MEDIUM.unit
        );
    }

    loadStoredText(key, sanitizer, fallback) {
        let stored;
        try {
            if (typeof localStorage === "undefined") return fallback;
            stored = localStorage.getItem(key);
        } catch (e) {
            return fallback;
        }
        if (stored === null) return fallback;
        const sanitized = sanitizer(stored);
        if (!sanitized) {
            this.persistText(key, fallback);
            return fallback;
        }
        if (sanitized !== stored) this.persistText(key, sanitized);
        return sanitized;
    }

    persistText(key, value) {
        try {
            if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    get currentMedium() {
        return this.getCurrent();
    }

    get presets() {
        return Object.values(PENALTY_MEDIUMS);
    }

    getCurrent() {
        const medium = { ...PENALTY_MEDIUMS[this.currentMediumId] };
        if (this.currentMediumId === "custom") {
            medium.name = this.customName;
            medium.unit = this.customUnit;
            medium.heavyUnit = `2 ${this.customUnit.replace(/^[0-9]+\s*/, '') || 'lượt'}`;
            medium.lightUnit = `1 ${this.customUnit.replace(/^[0-9]+\s*/, '') || 'lần'}`;
            medium.allAction = `Cả bàn cùng tham gia: ${this.customName}.`;
            medium.actionVerb = "Thực hiện";
        }
        return medium;
    }

    setMedium(mediumId, customName = null, customUnit = null) {
        if (!PENALTY_MEDIUMS[mediumId]) return false;
        const activeWheel = window.wheelGame;
        if (activeWheel && (activeWheel.isSpinning || activeWheel.resultTimeout !== null)) return false;

        let nextName = this.customName;
        let nextUnit = this.customUnit;

        if (mediumId === "custom") {
            nextName = customName === null ? this.customName : normalizeMediumText(customName, 32);
            nextUnit = customUnit === null ? this.customUnit : normalizeMediumText(customUnit, 24);
            if (!nextName || !nextUnit) return false;
        }

        const changed = mediumId !== this.currentMediumId
            || (mediumId === "custom" && (nextName !== this.customName || nextUnit !== this.customUnit));
        if (!changed) return false;

        this.currentMediumId = mediumId;
        this.customName = nextName;
        this.customUnit = nextUnit;
        this.persistText(PENALTY_MEDIUM_STORAGE_KEYS.id, mediumId);
        if (mediumId === "custom") {
            this.persistText(PENALTY_MEDIUM_STORAGE_KEYS.name, this.customName);
            this.persistText(PENALTY_MEDIUM_STORAGE_KEYS.unit, this.customUnit);
        }
        this.onMediumChanged();
        return true;
    }

    setCustomMedium(name, unit, icon = "🎯") {
        const validated = this.validateCustomMedium(name, unit);
        if (!validated.valid) return false;
        if (this.currentMediumId === "custom"
            && validated.name === this.customName
            && validated.unit === this.customUnit) return false;
        const safeIcon = normalizeMediumText(icon, 16);
        if (safeIcon && PENALTY_MEDIUMS.custom) PENALTY_MEDIUMS.custom.icon = safeIcon;
        return this.setMedium("custom", validated.name, validated.unit);
    }

    validateCustomMedium(name, unit) {
        const normalizedName = normalizeMediumText(name, 32);
        const unitValue = typeof unit === "string" && unit.trim() === "" ? "cái" : unit;
        const normalizedUnit = normalizeMediumText(unitValue, 24);
        if (!normalizedName) {
            return { valid: false, name: "", unit: normalizedUnit || "cái", field: "name", error: "Nhập tên từ 1 đến 32 ký tự." };
        }
        if (!normalizedUnit) {
            return { valid: false, name: normalizedName, unit: "", field: "unit", error: "Đơn vị tối đa 24 ký tự." };
        }
        return { valid: true, name: normalizedName, unit: normalizedUnit, field: "", error: "" };
    }

    onMediumChanged() {
        const current = this.getCurrent();

        // The app owns header rendering; this manager owns persistence,
        // wheel regeneration and the single state-change event.
        if (typeof window !== "undefined" && window.penaltyManager) {
            window.penaltyManager.updateWheelSlicesForMedium(current);
            if (window.wheelGame) {
                window.wheelGame.slices = window.penaltyManager.getActiveWheelSlices();
            }
        }

        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent("penaltyMediumChanged", { detail: current }));
        }

        if (typeof window !== "undefined" && window.soundEngine && typeof window.soundEngine.playClick === "function") {
            window.soundEngine.playClick();
        }
    }

    /**
     * Replaces standard drinking templates with the current selected medium
     */
    formatText(text, params = {}) {
        if (!text) return "";
        const m = this.getCurrent();
        const count = params.count !== undefined ? params.count : 1;
        const singleUnit = /^\d/.test(m.unit) ? m.unit : `1 ${m.unit}`;

        let res = text
            .replace(/uống\s+\{count\}\s*\{unit\}/gi, count === 1 ? `${m.actionVerb.toLowerCase()} ${singleUnit}` : `${m.actionVerb.toLowerCase()} ${m.heavyUnit}`)
            .replace(/\{count\}\s*\{unit\}/gi, count === 1 ? `${m.actionVerb} ${singleUnit}` : `${m.actionVerb} ${m.heavyUnit}`)
            .replace(/\{count\}/gi, count)
            .replace(/\{verb\}/gi, m.actionVerb)
            .replace(/\{unit\}/gi, m.unit)
            .replace(/\{unit_heavy\}/gi, m.heavyUnit)
            .replace(/\{unit_light\}/gi, m.lightUnit)
            .replace(/\{all_action\}/gi, m.allAction)
            .replace(/\{icon\}/gi, m.icon)
            // Replace fixed phrases
            .replace(/uống 1 ly cạn đáy 100%|uống 1 ly cạn đáy|uống 1 ly 100%/gi, `${m.actionVerb} ${singleUnit}`)
            .replace(/uống 1 ly bia|uống 1 ly rượu|uống 1 ly|uống 1 chén/gi, `${m.actionVerb} ${singleUnit}`)
            .replace(/uống 2 ly bia|uống 2 ly rượu|uống 2 ly/gi, `${m.actionVerb} ${m.heavyUnit}`)
            .replace(/uống 3 ly bia|uống 3 ly rượu|uống 3 ly/gi, `${m.actionVerb} ${m.heavyUnit}`)
            .replace(/uống nửa ly|uống 1\/2 ly/gi, `${m.actionVerb} ${m.lightUnit}`)
            .replace(/cạn đáy 100%|cạn ly 100%/gi, `${m.actionVerb} ${singleUnit}`)
            .replace(/cả bàn cùng dô bia!|cả bàn cùng dô|cả bàn cùng zô/gi, m.allAction);

        if (m.id !== "beer") {
            res = res.replace(/\bbia\b/gi, m.name.toLowerCase());
            res = res.replace(/\brượu\b/gi, m.name.toLowerCase());
        }
        return res;
    }
}

// Global instance
if (typeof window !== "undefined") {
    window.penaltyMedium = new PenaltyMediumManager();
}
