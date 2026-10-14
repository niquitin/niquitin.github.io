/**
 * Session attribution sidecar foundation (Phase 7B2, target 5.15.0).
 *
 * History events remain immutable facts. This module owns only the editable
 * association between retained events and stable player IDs.
 *
 * Ownership rules:
 * - vbn_event_attribution_v1 is the only persisted key owned here.
 * - Session identity is startedAt + seq; eventAt is an integrity witness.
 * - Player Store remains the single writer for vbn_players_v1. This module
 *   only reads playerRoster and never purges or mutates roster records.
 * - Statistics are derived from retained History and valid sidecar entries.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'vbn_event_attribution_v1';
    const SCHEMA_VERSION = 1;
    const RUNTIME_SLOT = Symbol.for('vbn.sessionAttribution.runtime');
    const RUNTIME_OWNER = 'vbn.session-attribution';
    const RUNTIME_VERSION = 1;

    const requiredMethods = [
        'getState',
        'getPolicyForEvent',
        'getForEvent',
        'getAll',
        'setParticipants',
        'clearForEvent',
        'derivePlayerStats'
    ];

    const existingRuntime = window[RUNTIME_SLOT];
    let compatibleRuntime = false;
    try {
        compatibleRuntime = Boolean(existingRuntime
            && existingRuntime.owner === RUNTIME_OWNER
            && existingRuntime.version === RUNTIME_VERSION
            && typeof existingRuntime.isActive === 'function'
            && existingRuntime.isActive()
            && typeof existingRuntime.dispose === 'function'
            && existingRuntime.api
            && existingRuntime.api.STORAGE_KEY === STORAGE_KEY
            && existingRuntime.api.SCHEMA_VERSION === SCHEMA_VERSION
            && requiredMethods.every((name) => typeof existingRuntime.api[name] === 'function'));
    } catch (e) {
        compatibleRuntime = false;
    }

    if (compatibleRuntime) {
        window.sessionAttribution = existingRuntime.api;
        return;
    }

    if (existingRuntime
        && existingRuntime.owner === RUNTIME_OWNER
        && typeof existingRuntime.dispose === 'function') {
        try {
            existingRuntime.dispose();
        } catch (e) {}
    }

    let sessionStartedAt = null;
    let assignments = [];

    const isPlainObject = (value) =>
        value && typeof value === 'object' && !Array.isArray(value);

    const deepClone = (value) => {
        if (value === undefined) return undefined;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return undefined;
        }
    };

    const deepFreeze = (value) => {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            Object.freeze(value);
            Object.getOwnPropertyNames(value).forEach((name) => deepFreeze(value[name]));
        }
        return value;
    };

    const isPositiveFiniteInteger = (value) =>
        typeof value === 'number'
        && Number.isInteger(value)
        && Number.isSafeInteger(value)
        && value > 0;

    const isFiniteEpoch = (value) =>
        typeof value === 'number' && Number.isFinite(value) && value > 0;

    const currentHistory = () => {
        try {
            const history = window.sessionHistory;
            if (!history
                || typeof history.getSessionStartedAt !== 'function'
                || typeof history.getEvents !== 'function') {
                return { available: false, startedAt: null, events: [] };
            }
            return {
                available: true,
                startedAt: history.getSessionStartedAt(),
                events: history.getEvents()
            };
        } catch (e) {
            return { available: false, startedAt: null, events: [] };
        }
    };

    const getPlayer = (playerId) => {
        try {
            const roster = window.playerRoster;
            if (!roster) return null;
            if (typeof roster.getPlayer === 'function') {
                return roster.getPlayer(playerId) || null;
            }
            if (typeof roster.getPlayers === 'function') {
                return roster.getPlayers().find((player) => player.id === playerId) || null;
            }
        } catch (e) {}
        return null;
    };

    const getRosterPlayers = () => {
        try {
            if (window.playerRoster && typeof window.playerRoster.getPlayers === 'function') {
                return window.playerRoster.getPlayers();
            }
        } catch (e) {}
        return [];
    };

    // This is deliberately a narrow policy map. It never parses display text.
    const getPolicy = (event) => {
        if (!isPlainObject(event)) return null;

        if (event.type === 'penalty') {
            if (event.gameId === null) {
                return { role: 'recipient', maxParticipants: 1 };
            }
            if (['wheel', 'finger', 'bomb', 'crocodile', 'numberbomb'].includes(event.gameId)) {
                return { role: 'recipient', maxParticipants: 1 };
            }
            if (event.gameId === 'pirate'
                && isPlainObject(event.detail)
                && event.detail.outcome === 'trap') {
                return { role: 'recipient', maxParticipants: 1 };
            }
            if (event.gameId === 'bottle' && isPlainObject(event.detail)) {
                if (event.detail.mode === 'single') {
                    return { role: 'recipient', maxParticipants: 1 };
                }
                if (event.detail.mode === 'duel') {
                    return { role: 'recipient', maxParticipants: 2 };
                }
            }
        }

        if (event.type === 'game_result' && ['dice', 'cards'].includes(event.gameId)) {
            return { role: 'actor', maxParticipants: 1 };
        }

        return null;
    };

    const snapshotParticipant = (participant) => Object.freeze({
        playerId: participant.playerId,
        role: participant.role
    });

    const snapshotAssignment = (assignment) => Object.freeze({
        seq: assignment.seq,
        eventAt: assignment.eventAt,
        participants: Object.freeze(assignment.participants.map(snapshotParticipant))
    });

    const snapshotAssignments = () => Object.freeze(assignments.map(snapshotAssignment));

    const snapshotState = () => Object.freeze({
        version: SCHEMA_VERSION,
        sessionStartedAt,
        assignments: snapshotAssignments()
    });

    const storageRemove = () => {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (e) {
            return false;
        }
    };

    const persist = () => {
        if (assignments.length === 0) return storageRemove();
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                version: SCHEMA_VERSION,
                sessionStartedAt,
                assignments
            }));
            return true;
        } catch (e) {
            return false;
        }
    };

    const emitChanged = (action, assignment) => {
        try {
            window.dispatchEvent(new CustomEvent('sessionAttributionChanged', {
                detail: deepFreeze({
                    action,
                    assignment: assignment ? snapshotAssignment(assignment) : undefined,
                    state: snapshotState()
                })
            }));
        } catch (e) {}
    };

    const findEvent = (history, seq) => history.events.find((event) => event.seq === seq) || null;

    const validateCurrentIdentity = (identity, requireWitness) => {
        if (!isPlainObject(identity)
            || !isFiniteEpoch(identity.sessionStartedAt)
            || !isPositiveFiniteInteger(identity.seq)) {
            return { ok: false, reason: 'invalid-identity' };
        }

        const history = currentHistory();
        if (!history.available) return { ok: false, reason: 'history-unavailable' };
        if (history.startedAt !== identity.sessionStartedAt) {
            return { ok: false, reason: 'session-mismatch' };
        }

        const event = findEvent(history, identity.seq);
        if (!event) return { ok: false, reason: 'event-not-retained' };
        if (requireWitness && (!isFiniteEpoch(identity.eventAt) || identity.eventAt !== event.at)) {
            return { ok: false, reason: 'event-witness-mismatch' };
        }
        return { ok: true, history, event };
    };

    const participantKey = (participant) => `${participant.role}\u0000${participant.playerId}`;

    const sortParticipants = (list) => list.slice().sort((left, right) => {
        const leftKey = participantKey(left);
        const rightKey = participantKey(right);
        return leftKey < rightKey ? -1 : (leftKey > rightKey ? 1 : 0);
    });

    const sameParticipants = (left, right) => {
        const a = sortParticipants(left);
        const b = sortParticipants(right);
        return a.length === b.length && a.every((participant, index) =>
            participantKey(participant) === participantKey(b[index]));
    };

    const normalizeParticipants = (event, participants, requireActive) => {
        const policy = getPolicy(event);
        if (!policy) return { ok: false, reason: 'event-ineligible' };
        if (!Array.isArray(participants) || participants.length === 0) {
            return { ok: false, reason: 'invalid-participants' };
        }
        if (participants.length > policy.maxParticipants) {
            return { ok: false, reason: 'cardinality-exceeded' };
        }

        const normalized = [];
        const seen = new Set();
        for (const participant of participants) {
            if (!isPlainObject(participant)
                || typeof participant.playerId !== 'string'
                || participant.playerId.length === 0
                || participant.role !== policy.role) {
                return { ok: false, reason: 'invalid-participant' };
            }
            if (seen.has(participant.playerId)) {
                return { ok: false, reason: 'duplicate-player' };
            }
            const player = getPlayer(participant.playerId);
            if (!player) return { ok: false, reason: 'unknown-player' };
            if (requireActive && player.active !== true) {
                return { ok: false, reason: 'player-inactive' };
            }
            seen.add(participant.playerId);
            normalized.push({ playerId: participant.playerId, role: participant.role });
        }

        return { ok: true, participants: sortParticipants(normalized) };
    };

    const normalizeStoredAssignment = (raw, history) => {
        if (!isPlainObject(raw)
            || !isPositiveFiniteInteger(raw.seq)
            || !isFiniteEpoch(raw.eventAt)
            || !Array.isArray(raw.participants)) {
            return { ok: false, repaired: true };
        }

        const event = findEvent(history, raw.seq);
        if (!event || event.at !== raw.eventAt) {
            return { ok: false, repaired: true };
        }

        const policy = getPolicy(event);
        if (!policy) return { ok: false, repaired: true };

        const safe = [];
        let repaired = false;
        const seen = new Set();
        raw.participants.forEach((candidate) => {
            if (!isPlainObject(candidate)
                || typeof candidate.playerId !== 'string'
                || candidate.playerId.length === 0
                || candidate.role !== policy.role
                || seen.has(candidate.playerId)) {
                repaired = true;
                return;
            }
            const player = getPlayer(candidate.playerId);
            if (!player) {
                repaired = true;
                return;
            }
            seen.add(candidate.playerId);
            safe.push({ playerId: candidate.playerId, role: candidate.role });
        });

        const normalized = sortParticipants(safe).slice(0, policy.maxParticipants);
        if (normalized.length === 0) return { ok: false, repaired: true };
        if (normalized.length !== safe.length || JSON.stringify(raw) !== JSON.stringify({
            seq: raw.seq,
            eventAt: raw.eventAt,
            participants: normalized
        })) {
            repaired = true;
        }
        return {
            ok: true,
            repaired,
            assignment: {
                seq: raw.seq,
                eventAt: raw.eventAt,
                participants: normalized
            }
        };
    };

    const init = () => {
        let rawString = null;
        try {
            rawString = window.localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return;
        }
        if (rawString === null) return;

        const history = currentHistory();
        let repaired = false;
        let stored = null;
        try {
            stored = JSON.parse(rawString);
        } catch (e) {
            repaired = true;
        }

        if (!history.available
            || !isPlainObject(stored)
            || stored.version !== SCHEMA_VERSION
            || !isFiniteEpoch(stored.sessionStartedAt)
            || stored.sessionStartedAt !== history.startedAt
            || !Array.isArray(stored.assignments)) {
            repaired = true;
        } else {
            const normalized = [];
            const seenSeq = new Set();
            stored.assignments.forEach((candidate) => {
                const result = normalizeStoredAssignment(candidate, history);
                if (!result.ok) {
                    repaired = true;
                    return;
                }
                if (seenSeq.has(result.assignment.seq)) {
                    repaired = true;
                    return;
                }
                seenSeq.add(result.assignment.seq);
                normalized.push(result.assignment);
                if (result.repaired) repaired = true;
            });
            normalized.sort((left, right) => left.seq - right.seq);
            assignments = normalized;
            sessionStartedAt = history.startedAt;
        }

        if (repaired) {
            if (assignments.length === 0) {
                storageRemove();
            } else {
                persist();
            }
        }
    };

    const clearForHistoryReset = () => {
        const changed = assignments.length > 0 || sessionStartedAt !== null;
        assignments = [];
        sessionStartedAt = null;
        const persisted = storageRemove();
        if (changed) emitChanged('reset');
        return persisted;
    };

    const pruneAgainstHistory = () => {
        if (assignments.length === 0) return null;
        const history = currentHistory();
        if (!history.available || history.startedAt !== sessionStartedAt) {
            clearForHistoryReset();
            return null;
        }
        const retained = assignments.filter((assignment) => {
            const event = findEvent(history, assignment.seq);
            return event && event.at === assignment.eventAt;
        });
        if (retained.length === assignments.length) return null;
        assignments = retained;
        persist();
        return true;
    };

    const onHistoryChanged = (event) => {
        const action = event && event.detail && event.detail.action;
        if (action === 'reset') {
            clearForHistoryReset();
            return;
        }
        if (action === 'record' && pruneAgainstHistory()) {
            emitChanged('prune');
        }
    };

    const getForEvent = (identity) => {
        const validation = validateCurrentIdentity(identity, false);
        if (!validation.ok) return null;
        const assignment = assignments.find((candidate) => candidate.seq === identity.seq);
        return assignment ? snapshotAssignment(assignment) : null;
    };

    const getPolicyForEvent = (identity) => {
        const validation = validateCurrentIdentity(identity, true);
        if (!validation.ok) return null;
        const policy = getPolicy(validation.event);
        return policy
            ? Object.freeze({
                eligible: true,
                role: policy.role,
                maxParticipants: policy.maxParticipants
            })
            : Object.freeze({
                eligible: false,
                role: null,
                maxParticipants: 0
            });
    };

    const getAll = () => snapshotAssignments();

    const setParticipants = (identity, participants) => {
        const validation = validateCurrentIdentity(identity, true);
        if (!validation.ok) return { ok: false, reason: validation.reason };
        const normalized = normalizeParticipants(validation.event, participants, true);
        if (!normalized.ok) return normalized;

        if (sessionStartedAt !== validation.history.startedAt) {
            sessionStartedAt = validation.history.startedAt;
        }
        const existingIndex = assignments.findIndex((candidate) => candidate.seq === identity.seq);
        const existing = existingIndex >= 0 ? assignments[existingIndex] : null;
        if (existing && sameParticipants(existing.participants, normalized.participants)) {
            return { ok: true, changed: false, assignment: snapshotAssignment(existing) };
        }

        const next = {
            seq: identity.seq,
            eventAt: validation.event.at,
            participants: normalized.participants
        };
        if (existingIndex >= 0) assignments[existingIndex] = next;
        else assignments.push(next);
        assignments.sort((left, right) => left.seq - right.seq);
        const persisted = persist();
        emitChanged(existing ? 'replace' : 'assign', next);
        return {
            ok: true,
            changed: true,
            persisted,
            assignment: snapshotAssignment(next)
        };
    };

    const clearForEvent = (identity) => {
        const validation = validateCurrentIdentity(identity, true);
        if (!validation.ok) return { ok: false, reason: validation.reason };
        const index = assignments.findIndex((candidate) => candidate.seq === identity.seq);
        if (index < 0) return { ok: true, changed: false };
        assignments.splice(index, 1);
        const persisted = persist();
        emitChanged('clear');
        return { ok: true, changed: true, persisted };
    };

    const derivePlayerStats = () => {
        const history = currentHistory();
        const eventsBySeq = new Map(history.events.map((event) => [event.seq, event]));
        const referenced = new Set();
        const counts = new Map();

        assignments.forEach((assignment) => {
            const event = eventsBySeq.get(assignment.seq);
            if (!event || event.at !== assignment.eventAt) return;
            const playersInEvent = new Set();
            assignment.participants.forEach((participant) => {
                referenced.add(participant.playerId);
                playersInEvent.add(participant.playerId);
                if (!counts.has(participant.playerId)) {
                    counts.set(participant.playerId, {
                        penaltyCount: 0,
                        resultCount: 0,
                        attributedCount: 0
                    });
                }
                const count = counts.get(participant.playerId);
                if (event.type === 'penalty' && participant.role === 'recipient') count.penaltyCount += 1;
                if (event.type === 'game_result') count.resultCount += 1;
            });
            playersInEvent.forEach((playerId) => {
                counts.get(playerId).attributedCount += 1;
            });
        });

        const stats = [];
        getRosterPlayers().forEach((player) => {
            if (!player.active && !referenced.has(player.id)) return;
            const count = counts.get(player.id) || {
                penaltyCount: 0,
                resultCount: 0,
                attributedCount: 0
            };
            stats.push(Object.freeze({
                playerId: player.id,
                name: player.name,
                active: player.active,
                penaltyCount: count.penaltyCount,
                resultCount: count.resultCount,
                attributedCount: count.attributedCount
            }));
        });
        return Object.freeze(stats);
    };

    const api = Object.freeze({
        STORAGE_KEY,
        SCHEMA_VERSION,
        getState: () => snapshotState(),
        getPolicyForEvent,
        getForEvent,
        getAll,
        setParticipants,
        clearForEvent,
        derivePlayerStats
    });

    init();
    window.addEventListener('sessionHistoryChanged', onHistoryChanged);

    let disposed = false;
    const runtime = Object.freeze({
        owner: RUNTIME_OWNER,
        version: RUNTIME_VERSION,
        api,
        isActive: () => !disposed,
        dispose: () => {
            if (disposed) return;
            disposed = true;
            try {
                window.removeEventListener('sessionHistoryChanged', onHistoryChanged);
            } catch (e) {}
        }
    });

    Object.defineProperty(window, RUNTIME_SLOT, {
        value: runtime,
        writable: true,
        configurable: true
    });
    window.sessionAttribution = api;
})();
