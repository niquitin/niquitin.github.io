/**
 * Optional local player roster foundation (Phase 7B1, target 5.15.0).
 *
 * This module deliberately has no DOM, game, Party Session, or Session
 * History dependency. It owns only the local roster and its allocator.
 * Attribution/tombstone purge belongs to a later phase when that owner exists.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'vbn_players_v1';
    const SCHEMA_VERSION = 1;
    const MAX_ACTIVE_PLAYERS = 24;
    const MIN_NAME_CODE_POINTS = 1;
    const MAX_NAME_CODE_POINTS = 32;
    const PLAYER_ID_PATTERN = /^p[1-9]\d*$/;

    let nextPlayerNumber = 1;
    let players = [];

    const isPlainObject = (value) =>
        value !== null && typeof value === 'object' && !Array.isArray(value);

    const deepFreeze = (value) => {
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            Object.freeze(value);
            Object.getOwnPropertyNames(value).forEach((name) => deepFreeze(value[name]));
        }
        return value;
    };

    const cloneJson = (value) => {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return undefined;
        }
    };

    const isPositiveSafeInteger = (value) =>
        Number.isSafeInteger(value) && value > 0;

    const playerNumberFromId = (id) => {
        if (typeof id !== 'string' || !PLAYER_ID_PATTERN.test(id)) return null;
        const number = Number(id.slice(1));
        return isPositiveSafeInteger(number) ? number : null;
    };

    const normalizeName = (value) => {
        if (typeof value !== 'string') return null;
        let normalized;
        try {
            normalized = value.normalize('NFC');
        } catch (e) {
            return null;
        }
        normalized = normalized.trim().replace(/\s+/gu, ' ');
        return normalized;
    };

    const nameCodePointCount = (name) => Array.from(name).length;

    const comparisonName = (name) => {
        try {
            return name.toLocaleLowerCase('vi-VN');
        } catch (e) {
            return name.toLowerCase();
        }
    };

    const nameKey = (name) => comparisonName(name.normalize('NFC'));

    const emptyState = () => ({
        version: SCHEMA_VERSION,
        nextPlayerNumber: 1,
        players: []
    });

    const stateForStorage = () => ({
        version: SCHEMA_VERSION,
        nextPlayerNumber,
        players: players.map((player) => ({
            id: player.id,
            name: player.name,
            active: player.active
        }))
    });

    const snapshotPlayer = (player) => {
        if (!player) return null;
        return Object.freeze({
            id: player.id,
            name: player.name,
            active: player.active
        });
    };

    const snapshotPlayers = (list) => Object.freeze(list.map(snapshotPlayer));

    const snapshotState = () => Object.freeze({
        version: SCHEMA_VERSION,
        nextPlayerNumber,
        players: snapshotPlayers(players)
    });

    const saveState = () => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateForStorage()));
            return true;
        } catch (e) {
            // Keep the in-memory roster usable when storage is unavailable or
            // quota-limited. There is no retry loop; the next user mutation
            // gets one normal persistence attempt.
            return false;
        }
    };

    const emitChanged = (action, player) => {
        try {
            const detail = deepFreeze({
                action,
                player: player ? snapshotPlayer(player) : undefined,
                state: snapshotState()
            });
            window.dispatchEvent(new CustomEvent('playerRosterChanged', { detail }));
        } catch (e) {}
    };

    const parseJson = (raw) => {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    };

    const validateNameValue = (value) => {
        const name = normalizeName(value);
        if (name === null || nameCodePointCount(name) < MIN_NAME_CODE_POINTS) {
            return { ok: false, reason: 'invalid_name' };
        }
        if (nameCodePointCount(name) > MAX_NAME_CODE_POINTS) {
            return { ok: false, reason: 'invalid_name' };
        }
        return { ok: true, name };
    };

    const normalizeStored = (raw) => {
        if (!isPlainObject(raw) || raw.version !== SCHEMA_VERSION || !Array.isArray(raw.players)) {
            return { state: emptyState(), repaired: true };
        }

        const seenIds = new Set();
        const seenNames = new Set();
        const retained = [];
        let repaired = false;
        let maxPlayerNumber = 0;

        raw.players.forEach((candidate) => {
            if (!isPlainObject(candidate)
                || typeof candidate.id !== 'string'
                || typeof candidate.name !== 'string'
                || typeof candidate.active !== 'boolean') {
                repaired = true;
                return;
            }

            const playerNumber = playerNumberFromId(candidate.id);
            const validated = validateNameValue(candidate.name);
            if (playerNumber === null
                || !validated.ok
                || seenIds.has(candidate.id)
                || seenNames.has(nameKey(validated.name))) {
                repaired = true;
                return;
            }

            const player = {
                id: candidate.id,
                name: validated.name,
                active: candidate.active
            };
            if (candidate.name !== player.name) repaired = true;
            if (JSON.stringify(candidate) !== JSON.stringify(player)) repaired = true;
            seenIds.add(player.id);
            seenNames.add(nameKey(player.name));
            retained.push(player);
            maxPlayerNumber = Math.max(maxPlayerNumber, playerNumber);
        });

        let allocator = raw.nextPlayerNumber;
        if (!isPositiveSafeInteger(allocator)) {
            allocator = maxPlayerNumber + 1;
            repaired = true;
        }
        if (allocator <= maxPlayerNumber) {
            allocator = maxPlayerNumber + 1;
            repaired = true;
        }

        const state = {
            version: SCHEMA_VERSION,
            nextPlayerNumber: allocator,
            players: retained
        };
        if (raw.nextPlayerNumber !== allocator || raw.players.length !== retained.length) {
            repaired = true;
        }
        return { state, repaired };
    };

    const init = () => {
        let rawString = null;
        try {
            rawString = window.localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            // Storage read failure is the same safe runtime state as an absent
            // key. Do not create a key or emit an event during boot.
            return;
        }

        if (rawString === null) return;
        const normalized = normalizeStored(parseJson(rawString));
        nextPlayerNumber = normalized.state.nextPlayerNumber;
        players = normalized.state.players;
        if (normalized.repaired) saveState();
    };

    const validateName = (value, excludedId) => {
        const result = validateNameValue(value);
        if (!result.ok) return result;
        const candidateKey = nameKey(result.name);
        const duplicate = players.some((player) =>
            player.id !== excludedId && nameKey(player.name) === candidateKey);
        if (duplicate) return { ok: false, reason: 'duplicate_name' };
        return result;
    };

    const mutationResult = (player) => ({
        ok: true,
        player: snapshotPlayer(player),
        persisted: saveState()
    });

    const addPlayer = (value) => {
        const validation = validateName(value);
        if (!validation.ok) return validation;
        const activeCount = players.reduce((count, player) => count + (player.active ? 1 : 0), 0);
        if (activeCount >= MAX_ACTIVE_PLAYERS) return { ok: false, reason: 'active_limit' };
        if (!isPositiveSafeInteger(nextPlayerNumber)) return { ok: false, reason: 'id_exhausted' };

        const player = {
            id: `p${nextPlayerNumber}`,
            name: validation.name,
            active: true
        };
        nextPlayerNumber += 1;
        players.push(player);
        const result = mutationResult(player);
        emitChanged('add', player);
        return result;
    };

    const renamePlayer = (id, value) => {
        const player = players.find((candidate) => candidate.id === id);
        if (!player) return { ok: false, reason: 'player_not_found' };
        if (!player.active) return { ok: false, reason: 'player_inactive' };
        const validation = validateName(value, id);
        if (!validation.ok) return validation;
        if (validation.name === player.name) return { ok: false, reason: 'no_change' };

        player.name = validation.name;
        const result = mutationResult(player);
        emitChanged('rename', player);
        return result;
    };

    const deactivatePlayer = (id) => {
        const player = players.find((candidate) => candidate.id === id);
        if (!player) return { ok: false, reason: 'player_not_found' };
        if (!player.active) return { ok: false, reason: 'player_inactive' };

        player.active = false;
        const result = mutationResult(player);
        emitChanged('deactivate', player);
        return result;
    };

    init();

    window.playerRoster = Object.freeze({
        STORAGE_KEY,
        SCHEMA_VERSION,
        MAX_ACTIVE_PLAYERS,
        MAX_NAME_CODE_POINTS,

        getState: () => snapshotState(),
        getPlayers: () => snapshotPlayers(players),
        getActivePlayers: () => snapshotPlayers(players.filter((player) => player.active)),
        getPlayer: (id) => snapshotPlayer(players.find((player) => player.id === id)),
        getActiveCount: () => players.reduce((count, player) => count + (player.active ? 1 : 0), 0),
        normalizeName,
        validateName: (value) => validateName(value),
        addPlayer,
        renamePlayer,
        deactivatePlayer
    });
})();
