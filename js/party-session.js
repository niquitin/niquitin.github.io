/**
 * Party Session Presets — session foundation (Phase 5B1, target 5.13.0).
 * Single source of truth for the canonical game registry, the built-in
 * preset definitions and the persisted party session state.
 *
 * Ownership rules (PARTY_PRESETS_5.13.0.md):
 * - Preset definitions are immutable blueprints and are never mutated.
 * - The session stores only { presetId, games }. Penalty medium and penalty
 *   categories stay owned by penalty_medium.js / penalties.js and are never
 *   duplicated into the session key.
 * - "Tùy Chỉnh" is a derived read-time state, not a stored sixth preset.
 * - Phase 5B1 scope: state + API only. Applying a preset does not touch
 *   medium/categories yet; selector UI and apply side effects land in 5B2.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'vbn_party_session_v1';
    const DEFAULT_PRESET_ID = 'default';
    const CATEGORY_KEYS = ['drink', 'perform', 'dare', 'safe'];

    // Canonical registry of the 10 games. Order matches the Home grid and
    // card ids map to `screen-<id>` sections and `.game-card` onclicks.
    const PARTY_GAMES = [
        { id: 'crocodile', tags: ['quick', 'party'] },
        { id: 'wheel', tags: ['quick', 'party'] },
        { id: 'finger', tags: ['quick', 'party'] },
        { id: 'bomb', tags: ['quick', 'party'] },
        { id: 'pirate', tags: ['3d', 'party'] },
        { id: 'dice', tags: ['3d', 'party'] },
        { id: 'cards', tags: ['party'] },
        { id: 'bottle', tags: ['3d', 'quick', 'party'] },
        { id: 'numberbomb', tags: ['quick', 'party'] },
        { id: 'neverhave', tags: ['party'] }
    ];

    const ALL_GAME_IDS = PARTY_GAMES.map((game) => game.id);

    // Built-in blueprints. Machine ids are stable data keys; labels are the
    // visible Vietnamese names. Games arrays use preset display priority.
    const BUILT_IN_PRESETS = [
        {
            id: 'default',
            label: 'Mặc Định',
            icon: '🎯',
            description: 'Đủ 10 trò, vật phạt có lựa chọn không cồn và bốn thể loại án phạt.',
            games: ALL_GAME_IDS,
            mediumId: 'beer',
            categories: { drink: true, perform: true, dare: true, safe: true }
        },
        {
            id: 'quick',
            label: 'Chơi Nhanh',
            icon: '⚡',
            description: 'Các lượt ngắn, dễ bắt đầu và phù hợp khi muốn chơi nhanh.',
            games: ['finger', 'bottle', 'wheel', 'numberbomb', 'crocodile'],
            mediumId: 'beer',
            categories: { drink: true, perform: true, dare: true, safe: true }
        },
        {
            id: 'classic',
            label: 'Kinh Điển',
            icon: '🎲',
            description: 'Xí ngầu, thẻ bài, cá sấu và vòng quay; không có mục văn nghệ.',
            games: ['dice', 'cards', 'crocodile', 'wheel'],
            mediumId: 'beer',
            categories: { drink: true, perform: false, dare: true, safe: false }
        },
        {
            id: 'lively',
            label: 'Náo Nhiệt',
            icon: '🔥',
            description: 'Đủ 10 trò với nhịp chơi liên tục; người chơi vẫn có thể bỏ qua.',
            games: ALL_GAME_IDS,
            mediumId: 'beer',
            categories: { drink: true, perform: true, dare: true, safe: false }
        },
        {
            id: 'light',
            label: 'Nhẹ Nhàng',
            icon: '🌿',
            description: 'Đồ uống không cồn, thử thách nhẹ và không yêu cầu thông tin riêng tư.',
            games: ['crocodile', 'wheel', 'finger', 'bomb', 'pirate', 'dice', 'bottle', 'numberbomb'],
            mediumId: 'softdrink',
            categories: { drink: true, perform: true, dare: false, safe: true }
        }
    ];

    const deepFreeze = (value) => {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            Object.freeze(value);
            Object.getOwnPropertyNames(value).forEach((name) => deepFreeze(value[name]));
        }
        return value;
    };
    deepFreeze(PARTY_GAMES);
    deepFreeze(BUILT_IN_PRESETS);

    const GAME_ID_SET = new Set(ALL_GAME_IDS);
    const PRESET_BY_ID = new Map(BUILT_IN_PRESETS.map((preset) => [preset.id, preset]));

    // Current session: { presetId, games: [ordered ids] }. Validated at load;
    // never exposed directly — getters hand out copies.
    let session = null;

    const defaultSession = () => ({ presetId: DEFAULT_PRESET_ID, games: ALL_GAME_IDS.slice() });

    const parseJson = (raw) => {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    };

    // Keep only known ids, first occurrence wins (dedupe), order preserved.
    const normalizeGameList = (raw) => {
        if (!Array.isArray(raw)) return [];
        const seen = new Set();
        const games = [];
        raw.forEach((id) => {
            if (typeof id !== 'string' || !GAME_ID_SET.has(id) || seen.has(id)) return;
            seen.add(id);
            games.push(id);
        });
        return games;
    };

    // Returns a valid session or null. Unknown presetId or an empty game
    // list is untrustworthy as a whole, so callers fall back to defaults.
    const normalizeSession = (raw) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        const preset = typeof raw.presetId === 'string' ? PRESET_BY_ID.get(raw.presetId) : undefined;
        if (!preset) return null;
        const games = normalizeGameList(raw.games);
        if (!games.length) return null;
        return { presetId: preset.id, games };
    };

    // Frozen copy: every getter hands out safe data that callers cannot
    // mutate and cannot use to reach the internal session object.
    const snapshotSession = () => Object.freeze({
        presetId: session.presetId,
        games: Object.freeze(session.games.slice())
    });

    const sameGames = (left, right) =>
        Array.isArray(left) && Array.isArray(right)
            && left.length === right.length
            && left.every((id, index) => id === right[index]);

    const sameCategories = (current, intent) =>
        CATEGORY_KEYS.every((key) => Boolean(current[key]) === Boolean(intent[key]));

    const saveSession = () => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            return true;
        } catch (e) {
            // Storage unavailable (quota, privacy mode): keep running with
            // the in-memory session; persistence resumes when possible.
            return false;
        }
    };

    const emitSessionChanged = (previous, current, source) => {
        try {
            window.dispatchEvent(new CustomEvent('partySessionChanged', {
                detail: Object.freeze({
                    previous: Object.freeze(previous),
                    current: Object.freeze(current),
                    source: source || 'programmatic'
                })
            }));
        } catch (e) {}
    };

    const copyPreset = (preset) => Object.freeze({
        id: preset.id,
        label: preset.label,
        icon: preset.icon,
        description: preset.description,
        games: preset.games.slice(),
        mediumId: preset.mediumId,
        categories: Object.freeze(Object.assign({}, preset.categories))
    });

    const initSession = () => {
        let stored = null;
        let needsHeal = false;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw != null) {
                stored = normalizeSession(parseJson(raw));
                needsHeal = !stored;
            }
        } catch (e) {
            // Storage read failed: run on defaults without attempting writes.
        }
        session = stored || defaultSession();
        if (needsHeal) saveSession();
    };

    const isDetached = () => {
        const preset = PRESET_BY_ID.get(session.presetId);
        if (!preset) return true;
        if (!sameGames(session.games, preset.games)) return true;
        try {
            if (window.penaltyMedium && window.penaltyMedium.currentMediumId !== preset.mediumId) return true;
        } catch (e) {}
        try {
            const categories = window.penaltyManager && window.penaltyManager.categories;
            if (categories && !sameCategories(categories, preset.categories)) return true;
        } catch (e) {}
        return false;
    };

    // Sets the session to a built-in blueprint. 5B1 scope: session state
    // only — medium/category side effects are wired in 5B2 on purpose.
    const applyPreset = (presetId, source) => {
        const preset = typeof presetId === 'string' ? PRESET_BY_ID.get(presetId) : undefined;
        if (!preset) return false;
        const previous = snapshotSession();
        const current = { presetId: preset.id, games: preset.games.slice() };
        if (previous.presetId === current.presetId && sameGames(previous.games, current.games)) {
            return true;
        }
        session = current;
        saveSession();
        emitSessionChanged(previous, snapshotSession(), source);
        return true;
    };

    window.partySession = Object.freeze({
        STORAGE_KEY,

        getDefaultPresetId: () => DEFAULT_PRESET_ID,

        getGameIds: () => ALL_GAME_IDS.slice(),

        getBuiltInPresets: () => BUILT_IN_PRESETS.map(copyPreset),

        getBuiltInPreset: (presetId) => {
            const preset = typeof presetId === 'string' ? PRESET_BY_ID.get(presetId) : undefined;
            return preset ? copyPreset(preset) : null;
        },

        getSession: () => snapshotSession(),

        getActiveGames: () => session.games.slice(),

        // Pure validator for external/raw data; no read or write side effects.
        normalizeSession: (raw) => {
            const normalized = normalizeSession(raw);
            return normalized ? Object.freeze({ presetId: normalized.presetId, games: Object.freeze(normalized.games) }) : null;
        },

        // True when the session no longer matches its stored preset
        // blueprint (games order, current medium or penalty categories).
        isDetached,

        resolveActiveState: () => {
            const preset = PRESET_BY_ID.get(session.presetId) || PRESET_BY_ID.get(DEFAULT_PRESET_ID);
            return Object.freeze({
                presetId: session.presetId,
                label: preset.label,
                icon: preset.icon,
                games: session.games.slice(),
                isCustom: isDetached()
            });
        },

        // Sets the session to a built-in blueprint. 5B1 scope: session state
        // only — medium/category side effects are wired in 5B2 on purpose.
        applyPreset,

        resetToDefault: (source) => applyPreset(DEFAULT_PRESET_ID, source || 'reset')
    });

    initSession();
})();
