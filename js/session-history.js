/**
 * Session History — active-session event store foundation (Phase 6B1, target 5.14.0).
 * Records lightweight result events for the current drinking session and
 * exposes derived statistics. No game integration and no UI in this phase.
 *
 * Ownership rules (SESSION_HISTORY_SCOREBOARD_5.14.0.md):
 * - The persisted event list is the single source of truth; statistics are
 *   always derived on demand and never stored.
 * - Canonical game ids come from the Party Session registry
 *   (window.partySession.getGameIds()) — never a second copy.
 * - "at" timestamps are local display context only; ordering authority is seq.
 * - Exactly-once support is explicit: callers may pass a dedupeKey; the store
 *   never guesses duplicates from event content.
 * - Lazy persistence: a fresh install (absent key) keeps an empty in-memory
 *   session and writes nothing until the first successful record/reset.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'vbn_session_history_v1';
    const SCHEMA_VERSION = 1;
    const EVENT_CAP = 200;
    const MAX_LABEL_LENGTH = 200;
    const ACCEPTED_TYPES = ['penalty', 'game_result'];
    const DEDUPE_KEY_LIMIT = 500;

    let startedAt = null;          // null until the first record or explicit reset
    let events = [];               // persisted list; newest last; seq monotonic
    const recentDedupeKeys = new Map(); // explicit dedupeKey -> true; memory only

    const gameRegistryIds = () => {
        try {
            if (window.partySession && typeof window.partySession.getGameIds === 'function') {
                return window.partySession.getGameIds();
            }
        } catch (e) {}
        return null;
    };

    const deepCloneJsonSafe = (value) => {
        if (value === undefined || value === null) return undefined;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return undefined; // cyclic / non-serializable detail is dropped, not fatal
        }
    };

    const deepFreezeData = (value) => {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            Object.freeze(value);
            Object.getOwnPropertyNames(value).forEach((name) => deepFreezeData(value[name]));
        }
        return value;
    };

    const snapshotEvent = (event) => Object.freeze({
        seq: event.seq,
        type: event.type,
        gameId: event.gameId,
        at: event.at,
        label: event.label,
        detail: deepFreezeData(deepCloneJsonSafe(event.detail))
    });

    const snapshotState = () => Object.freeze({
        startedAt,
        eventCount: events.length
    });

    const saveHistory = () => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                version: SCHEMA_VERSION,
                startedAt,
                events
            }));
            return true;
        } catch (e) {
            // Quota or storage unavailable: keep running on the in-memory
            // session; persistence resumes when storage recovers.
            return false;
        }
    };

    const emitHistoryChanged = (action, addedEvent) => {
        try {
            window.dispatchEvent(new CustomEvent('sessionHistoryChanged', {
                detail: Object.freeze({
                    action,
                    addedEvent: addedEvent ? snapshotEvent(addedEvent) : undefined,
                    state: snapshotState()
                })
            }));
        } catch (e) {}
    };

    // A stored event is kept only when every persisted field is sound; one
    // malformed event is dropped, never allowed to break the whole store.
    const isValidStoredEvent = (event) =>
        event
        && typeof event === 'object'
        && !Array.isArray(event)
        && ACCEPTED_TYPES.includes(event.type)
        && typeof event.seq === 'number'
        && Number.isInteger(event.seq)
        && event.seq > 0
        && typeof event.at === 'number'
        && Number.isFinite(event.at)
        && event.at > 0
        && typeof event.label === 'string'
        && event.label.trim().length > 0
        && (event.gameId === null || typeof event.gameId === 'string');

    // A retained history may legitimately begin above 1 after FIFO trimming.
    // Only non-increasing/duplicate seq values are rebuilt deterministically.
    const resequence = (list) => {
        let needsRebuild = false;
        for (let index = 1; index < list.length; index += 1) {
            if (list[index].seq <= list[index - 1].seq) {
                needsRebuild = true;
                break;
            }
        }
        if (needsRebuild) {
            list.forEach((event, index) => { event.seq = index + 1; });
        }
        return needsRebuild;
    };

    // Returns { startedAt, events } — both null/empty when untrustworthy.
    const normalizeStored = (raw) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        if (raw.version !== SCHEMA_VERSION) return null;
        if (raw.startedAt !== null && (typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt) || raw.startedAt <= 0)) return null;
        if (!Array.isArray(raw.events)) return null;

        const registry = gameRegistryIds();
        const registrySet = registry ? new Set(registry) : null;

        const cleaned = [];
        let repaired = false;
        raw.events.forEach((event) => {
            if (!isValidStoredEvent(event)) {
                repaired = true;
                return;
            }
            if (event.gameId !== null && (registrySet ? !registrySet.has(event.gameId) : true)) {
                repaired = true;
                return;
            }
            const safe = {
                seq: event.seq,
                type: event.type,
                gameId: event.gameId,
                at: event.at,
                label: event.label.trim().slice(0, MAX_LABEL_LENGTH),
                detail: deepCloneJsonSafe(event.detail)
            };
            if (safe.label.length === 0) {
                repaired = true;
                return;
            }
            if (JSON.stringify(event) !== JSON.stringify(safe)) repaired = true;
            cleaned.push(safe);
        });

        const retained = cleaned.slice(-EVENT_CAP);
        if (retained.length !== cleaned.length) repaired = true;
        if (resequence(retained)) repaired = true;
        return {
            startedAt: raw.startedAt,
            events: retained,
            repaired
        };
    };

    const parseJson = (rawString) => {
        try {
            return JSON.parse(rawString);
        } catch (e) {
            return null;
        }
    };

    const initHistory = () => {
        let needsHeal = false;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw != null) {
                const stored = normalizeStored(parseJson(raw));
                if (stored) {
                    startedAt = stored.startedAt;
                    events = stored.events;
                    needsHeal = stored.repaired;
                } else {
                    needsHeal = true;
                }
            }
        } catch (e) {
            // Storage read failed: run with an empty in-memory session.
        }
        if (needsHeal) saveHistory();
    };

    const truncateLabel = (label) => String(label).trim().slice(0, MAX_LABEL_LENGTH);

    const isValidGameId = (gameId) => {
        if (gameId === null) return true;
        if (typeof gameId !== 'string') return false;
        const registry = gameRegistryIds();
        if (!registry) return false; // no registry available: reject game-tagged events
        return registry.includes(gameId);
    };

    // Explicit idempotency: only a caller-provided dedupeKey suppresses a
    // repeat. The store never guesses duplicates from event content.
    const isDuplicateByDedupeKey = (dedupeKey) => recentDedupeKeys.has(dedupeKey);
    const rememberDedupeKey = (dedupeKey) => {
        recentDedupeKeys.set(dedupeKey, true);
        if (recentDedupeKeys.size > DEDUPE_KEY_LIMIT) {
            const oldest = recentDedupeKeys.keys().next().value;
            recentDedupeKeys.delete(oldest);
        }
    };

    const record = (event, options) => {
        const opts = options || {};
        if (!event || typeof event !== 'object') return { ok: false, reason: 'invalid-event' };
        if (typeof opts.dedupeKey === 'string' && opts.dedupeKey.length > 0) {
            if (isDuplicateByDedupeKey(opts.dedupeKey)) return { ok: false, reason: 'duplicate' };
        }
        if (!ACCEPTED_TYPES.includes(event.type)) return { ok: false, reason: 'invalid-type' };
        if (event.gameId !== null && event.gameId !== undefined && !isValidGameId(event.gameId)) {
            return { ok: false, reason: 'unknown-game' };
        }
        const label = typeof event.label === 'string' ? truncateLabel(event.label) : '';
        if (label.length === 0) return { ok: false, reason: 'invalid-label' };

        const stored = {
            // Next seq follows the retained tail so trimming never freezes
            // the counter at the cap; a fresh session starts at 1.
            seq: events.length === 0 ? 1 : events[events.length - 1].seq + 1,
            type: event.type,
            gameId: event.gameId === undefined ? null : event.gameId,
            at: Date.now(),
            label,
            detail: deepCloneJsonSafe(event.detail)
        };
        if (startedAt === null) startedAt = stored.at;
        events.push(stored);
        while (events.length > EVENT_CAP) events.shift(); // oldest trimmed; seq stays monotonic

        if (typeof opts.dedupeKey === 'string' && opts.dedupeKey.length > 0) {
            rememberDedupeKey(opts.dedupeKey);
        }
        saveHistory();
        emitHistoryChanged('record', stored);
        return { ok: true, event: snapshotEvent(stored) };
    };

    const reset = () => {
        const previousStartedAt = startedAt;
        startedAt = Date.now();
        if (previousStartedAt !== null && startedAt <= previousStartedAt) {
            startedAt = previousStartedAt + 1; // keep the marker strictly increasing
        }
        events = [];
        recentDedupeKeys.clear();
        saveHistory();
        emitHistoryChanged('reset', undefined);
        return { ok: true };
    };

    const getStats = () => {
        let penaltyCount = 0;
        let gameResultCount = 0;
        const countByGame = {};
        events.forEach((event) => {
            if (event.type === 'penalty') penaltyCount += 1;
            if (event.type === 'game_result') gameResultCount += 1;
            const key = event.gameId || 'other';
            countByGame[key] = (countByGame[key] || 0) + 1;
        });
        return Object.freeze({
            totalEvents: events.length,
            penaltyCount,
            gameResultCount,
            countByGame: Object.freeze(Object.assign({}, countByGame))
        });
    };

    initHistory();

    window.sessionHistory = Object.freeze({
        STORAGE_KEY,

        getState: () => snapshotState(),

        getEvents: () => Object.freeze(events.map(snapshotEvent)),

        getEventCount: () => events.length,

        getStats,

        // Session-start marker only; always display context, never history data.
        getSessionStartedAt: () => startedAt,

        record,

        reset
    });
})();
