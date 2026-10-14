/*
 * Party Session UI (Phase 6B4 History + Phase 7B3 roster + Phase 7B5 stats).
 *
 * Session History, Player Store, and attribution remain separate data owners.
 * This module owns only the shared BUỔI NHẬU dialog DOM and uses their public
 * APIs. It never reads or writes persistence directly.
 */
(function () {
    'use strict';

    const TYPE_LABELS = Object.freeze({
        penalty: 'ÁN PHẠT',
        game_result: 'KẾT QUẢ'
    });
    const VIEW_IDS = Object.freeze({
        history: Object.freeze({ tab: 'session-history-tab', panel: 'session-history-panel' }),
        players: Object.freeze({ tab: 'session-players-tab', panel: 'session-players-panel' })
    });

    let initialized = false;
    let activeView = 'history';
    let editingPlayerId = null;
    let editingDraft = null;
    let attributionEditor = null;
    let attributionMutationInProgress = false;

    const getElement = (id) => document.getElementById(id);

    const makeElement = (tagName, className, value) => {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (value !== undefined) element.textContent = String(value);
        return element;
    };

    const makeButton = (label, className, accessibleName) => {
        const button = makeElement('button', className, label);
        button.type = 'button';
        if (accessibleName) button.setAttribute('aria-label', accessibleName);
        return button;
    };

    const clearChildren = (element) => {
        if (!element) return;
        while (element.firstChild) element.removeChild(element.firstChild);
    };

    const focusElement = (element) => {
        if (!element || typeof element.focus !== 'function') return;
        try {
            element.focus({ preventScroll: true });
        } catch (e) {
            element.focus();
        }
    };

    const isConnectedToDocument = (element) => {
        if (!element) return false;
        if (typeof element.isConnected === 'boolean') return element.isConnected;
        let current = element;
        while (current) {
            if (current === document.body
                || current === document.documentElement
                || current.tagName === 'BODY') return true;
            current = current.parentElement || current.parentNode;
        }
        return false;
    };

    const isUsableFocusTarget = (element, modal) => {
        if (!element
            || typeof element.focus !== 'function'
            || element.tagName === 'BODY'
            || element.disabled === true
            || !isConnectedToDocument(element)) return false;
        if (typeof element.getAttribute === 'function'
            && element.getAttribute('aria-disabled') === 'true') return false;
        if (modal) {
            if (!modal.classList || !modal.classList.contains('active')) return false;
            if (typeof modal.contains === 'function' && !modal.contains(element)) return false;
        }
        let current = element;
        while (current) {
            if (current.hidden === true) return false;
            if (typeof current.getAttribute === 'function'
                && current.getAttribute('aria-hidden') === 'true') return false;
            if (current === modal) break;
            current = current.parentElement || current.parentNode;
        }
        return true;
    };

    const announce = (message) => {
        const status = getElement('session-dialog-status');
        if (!status) return;
        status.textContent = '';
        status.textContent = message || '';
    };

    const formatRelativeTime = (timestamp) => {
        if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return '';
        const elapsed = Math.max(0, Date.now() - timestamp);
        const minutes = Math.floor(elapsed / 60000);
        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    const formatStartedAt = (timestamp) => {
        if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) return '';
        try {
            return `Bắt đầu lúc ${new Date(timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } catch (e) {
            return '';
        }
    };

    const resolveGameName = (gameId) => {
        if (gameId === null || gameId === undefined) return 'Bốc án phạt tức thì';
        const cards = document.querySelectorAll('.game-card');
        for (const card of cards) {
            if (!card || !card.dataset || card.dataset.game !== gameId) continue;
            const heading = card.querySelector('h3');
            if (heading && heading.textContent.trim()) return heading.textContent.trim();
        }
        return 'Trò chơi';
    };

    const eventIdentity = (event) => {
        const history = window.sessionHistory;
        if (!history || typeof history.getSessionStartedAt !== 'function') return null;
        return {
            sessionStartedAt: history.getSessionStartedAt(),
            seq: event.seq,
            eventAt: event.at
        };
    };

    const sameIdentity = (left, right) => Boolean(left && right
        && left.sessionStartedAt === right.sessionStartedAt
        && left.seq === right.seq
        && left.eventAt === right.eventAt);

    const getAttributionPolicy = (identity) => {
        try {
            const attribution = window.sessionAttribution;
            if (!identity || !attribution || typeof attribution.getPolicyForEvent !== 'function') return null;
            return attribution.getPolicyForEvent(identity);
        } catch (e) {
            return null;
        }
    };

    const getAssignment = (identity) => {
        try {
            const attribution = window.sessionAttribution;
            if (!identity || !attribution || typeof attribution.getForEvent !== 'function') return null;
            return attribution.getForEvent(identity);
        } catch (e) {
            return null;
        }
    };

    const getRosterPlayer = (playerId) => {
        try {
            const roster = window.playerRoster;
            if (!roster || typeof roster.getPlayer !== 'function') return null;
            return roster.getPlayer(playerId) || null;
        } catch (e) {
            return null;
        }
    };

    const attributionRoleLabel = (event, role) => {
        if (role === 'actor' && event.gameId === 'dice') return 'Người lắc';
        if (role === 'actor' && event.gameId === 'cards') return 'Người rút';
        return 'Người nhận';
    };

    const attributionFailureMessage = (reason) => {
        if (['session-mismatch', 'event-not-retained', 'event-witness-mismatch', 'invalid-identity'].includes(reason)) {
            return 'Lượt này không còn khả dụng hoặc đã thay đổi.';
        }
        if (reason === 'player-inactive' || reason === 'unknown-player') {
            return 'Danh sách người chơi đã thay đổi. Hãy chọn lại.';
        }
        if (reason === 'cardinality-exceeded' || reason === 'duplicate-player' || reason === 'invalid-participants') {
            return 'Hãy chọn đúng số người cho lượt này.';
        }
        return 'Không thể cập nhật người được gán cho lượt này.';
    };

    const isStaleAttributionReason = (reason) =>
        ['session-mismatch', 'event-not-retained', 'event-witness-mismatch', 'invalid-identity'].includes(reason);

    const clearAttributionEditor = () => {
        attributionEditor = null;
    };

    const renderAssignmentNames = (container, assignment, event) => {
        const label = attributionRoleLabel(event,
            assignment.participants[0] && assignment.participants[0].role);
        container.appendChild(makeElement('span', 'session-attribution-role', `${label}:`));
        assignment.participants.forEach((participant, index) => {
            if (index > 0) container.appendChild(makeElement('span', 'session-attribution-separator', ','));
            const player = getRosterPlayer(participant.playerId);
            const name = makeElement('span', 'session-attribution-name', player ? player.name : 'Người chơi');
            container.appendChild(name);
            if (player && player.active === false) {
                container.appendChild(makeElement('span', 'session-attribution-inactive', '(đã rời danh sách)'));
            }
        });
    };

    const openAttributionEditor = (identity, policy, assignment) => {
        const activeIds = new Set(getActivePlayers().map((player) => player.id));
        const selectedPlayerIds = new Set();
        if (assignment && Array.isArray(assignment.participants)) {
            assignment.participants.forEach((participant) => {
                if (activeIds.has(participant.playerId)) selectedPlayerIds.add(participant.playerId);
            });
        }
        attributionEditor = {
            identity: Object.freeze(Object.assign({}, identity)),
            role: policy.role,
            maxParticipants: policy.maxParticipants,
            selectedPlayerIds
        };
        renderHistory({ seq: identity.seq, target: 'picker' });
    };

    const finishAttributionMutation = (result, identity, successMessage, focusTarget) => {
        if (!result || result.ok !== true) {
            const reason = result && result.reason;
            const message = attributionFailureMessage(reason);
            if (isStaleAttributionReason(reason)) {
                clearAttributionEditor();
                renderHistory({ seq: identity.seq, target: 'action' });
            } else {
                renderHistory({ seq: identity.seq, target: 'picker' });
            }
            announce(message);
            return;
        }

        clearAttributionEditor();
        renderHistory({ seq: identity.seq, target: focusTarget });
        if (result.changed === true) announce(successMessage);
    };

    const saveAttribution = (identity) => {
        const editor = attributionEditor;
        if (!editor || !sameIdentity(editor.identity, identity)) return;
        const selected = Array.from(editor.selectedPlayerIds);
        if (selected.length === 0 || selected.length > editor.maxParticipants) {
            announce('Hãy chọn đúng số người cho lượt này.');
            renderHistory({ seq: identity.seq, target: 'picker' });
            return;
        }
        const attribution = window.sessionAttribution;
        if (!attribution || typeof attribution.setParticipants !== 'function') return;
        const hadAssignment = Boolean(getAssignment(identity));
        let result;
        attributionMutationInProgress = true;
        try {
            result = attribution.setParticipants(identity, selected.map((playerId) => ({
                playerId,
                role: editor.role
            })));
        } catch (e) {
            result = { ok: false, reason: 'unavailable' };
        } finally {
            attributionMutationInProgress = false;
        }
        finishAttributionMutation(result, identity,
            hadAssignment ? 'Đã đổi người được gán.' : 'Đã gán người.', 'action');
    };

    const clearAttribution = (identity) => {
        const attribution = window.sessionAttribution;
        if (!attribution || typeof attribution.clearForEvent !== 'function') return;
        let result;
        attributionMutationInProgress = true;
        try {
            result = attribution.clearForEvent(identity);
        } catch (e) {
            result = { ok: false, reason: 'unavailable' };
        } finally {
            attributionMutationInProgress = false;
        }
        finishAttributionMutation(result, identity, 'Đã bỏ gán người.', 'assign');
    };

    const renderAttributionPicker = (row, event, policy, focusRequest) => {
        const editor = attributionEditor;
        const players = getActivePlayers();
        const picker = makeElement('fieldset', 'session-attribution-picker');
        const legend = makeElement('legend', 'session-attribution-picker-title',
            `Chọn ${attributionRoleLabel(event, policy.role).toLocaleLowerCase('vi-VN')} cho ${event.label}`);
        const options = makeElement('div', 'session-attribution-options');
        const inputType = policy.maxParticipants === 1 ? 'radio' : 'checkbox';
        const inputName = `session-attribution-${event.seq}`;
        const optionInputs = [];
        let focusTarget = null;

        picker.appendChild(legend);
        players.forEach((player) => {
            const label = makeElement('label', 'session-attribution-option');
            const input = makeElement('input');
            input.type = inputType;
            input.name = inputName;
            input.value = player.id;
            input.checked = editor.selectedPlayerIds.has(player.id);
            input.dataset.attributionPlayerId = player.id;
            input.setAttribute('aria-label', player.name);
            const name = makeElement('span', '', player.name);
            label.appendChild(input);
            label.appendChild(name);
            options.appendChild(label);
            optionInputs.push(input);
            if (focusRequest && focusRequest.playerId === player.id) focusTarget = input;

            input.addEventListener('change', () => {
                if (!attributionEditor || !sameIdentity(attributionEditor.identity, editor.identity)) return;
                if (inputType === 'radio') {
                    attributionEditor.selectedPlayerIds.clear();
                    if (input.checked) attributionEditor.selectedPlayerIds.add(player.id);
                    optionInputs.forEach((candidate) => {
                        if (candidate !== input) candidate.checked = false;
                    });
                } else if (input.checked) {
                    if (attributionEditor.selectedPlayerIds.size >= policy.maxParticipants) {
                        input.checked = false;
                        announce(`Chỉ được chọn tối đa ${policy.maxParticipants} người.`);
                    } else {
                        attributionEditor.selectedPlayerIds.add(player.id);
                    }
                } else {
                    attributionEditor.selectedPlayerIds.delete(player.id);
                }
                const atLimit = attributionEditor.selectedPlayerIds.size >= policy.maxParticipants;
                optionInputs.forEach((candidate) => {
                    candidate.disabled = inputType === 'checkbox'
                        && atLimit
                        && !attributionEditor.selectedPlayerIds.has(candidate.value);
                });
                save.disabled = attributionEditor.selectedPlayerIds.size === 0;
            });
        });

        const actions = makeElement('div', 'session-attribution-picker-actions');
        const save = makeButton('LƯU', '', `Lưu người được gán cho lượt ${event.seq}`);
        const cancel = makeButton('HỦY', '', `Hủy chọn người cho lượt ${event.seq}`);
        save.disabled = editor.selectedPlayerIds.size === 0;
        const atLimit = editor.selectedPlayerIds.size >= policy.maxParticipants;
        optionInputs.forEach((input) => {
            input.disabled = inputType === 'checkbox' && atLimit && !editor.selectedPlayerIds.has(input.value);
        });
        save.addEventListener('click', () => saveAttribution(editor.identity));
        cancel.addEventListener('click', () => {
            clearAttributionEditor();
            renderHistory({ seq: event.seq, target: 'action' });
        });
        actions.appendChild(save);
        actions.appendChild(cancel);
        picker.appendChild(options);
        picker.appendChild(actions);
        row.appendChild(picker);

        if (focusRequest && focusRequest.target === 'picker' && !focusTarget) {
            focusTarget = optionInputs.find((input) => input.checked) || optionInputs[0] || cancel;
        }
        return focusTarget;
    };

    const renderEvent = (event, focusRequest) => {
        const row = makeElement('article', 'session-history-row');
        row.dataset.eventSeq = String(event.seq);
        const label = makeElement('strong', 'session-history-row-label',
            typeof event.label === 'string' && event.label.trim() ? event.label : 'Kết quả buổi nhậu');
        const meta = makeElement('div', 'session-history-row-meta');
        const type = makeElement('span', 'session-history-row-type', TYPE_LABELS[event.type] || 'SỰ KIỆN');
        const source = makeElement('span', '', resolveGameName(event.gameId));
        const time = formatRelativeTime(event.at);

        meta.appendChild(type);
        meta.appendChild(source);
        if (time) meta.appendChild(makeElement('span', '', time));
        row.appendChild(label);
        row.appendChild(meta);
        let focusTarget = null;

        const identity = eventIdentity(event);
        const policy = getAttributionPolicy(identity);
        if (policy && policy.eligible) {
            const assignment = getAssignment(identity);
            const attributionLine = makeElement('div', 'session-attribution-line');
            const content = makeElement('div', 'session-attribution-content');
            const actions = makeElement('div', 'session-attribution-actions');
            const activePlayers = getActivePlayers();

            if (assignment && Array.isArray(assignment.participants) && assignment.participants.length > 0) {
                renderAssignmentNames(content, assignment, event);
                const edit = makeButton('ĐỔI NGƯỜI', '', `Đổi người được gán cho lượt ${event.seq}`);
                const clear = makeButton('BỎ GÁN', 'session-attribution-clear', `Bỏ gán người cho lượt ${event.seq}`);
                edit.disabled = activePlayers.length === 0;
                edit.addEventListener('click', () => openAttributionEditor(identity, policy, assignment));
                clear.addEventListener('click', () => clearAttribution(identity));
                actions.appendChild(edit);
                actions.appendChild(clear);
                if (focusRequest && focusRequest.seq === event.seq && focusRequest.target === 'action') {
                    focusTarget = edit.disabled ? clear : edit;
                }
            } else {
                content.appendChild(makeElement('span', 'session-attribution-unassigned', 'Chưa gán'));
                const assign = makeButton('GÁN NGƯỜI', '', `Gán người cho lượt ${event.seq}`);
                assign.disabled = activePlayers.length === 0;
                assign.addEventListener('click', () => openAttributionEditor(identity, policy, null));
                actions.appendChild(assign);
                if (activePlayers.length === 0) {
                    content.appendChild(makeElement('span', 'session-attribution-guidance',
                        'Cần thêm người ở view NGƯỜI CHƠI.'));
                }
                if (focusRequest && focusRequest.seq === event.seq
                    && ['assign', 'action'].includes(focusRequest.target)) focusTarget = assign;
            }

            attributionLine.appendChild(content);
            attributionLine.appendChild(actions);
            row.appendChild(attributionLine);

            if (attributionEditor && sameIdentity(attributionEditor.identity, identity)) {
                focusTarget = renderAttributionPicker(row, event, policy, focusRequest) || focusTarget;
            }
        }
        return { element: row, focusTarget };
    };

    function renderHistory(focusRequest) {
        const history = window.sessionHistory;
        const list = getElement('session-history-list');
        if (!history || !list || typeof history.getEvents !== 'function') return;
        const currentFocus = focusRequest ? document.activeElement : null;

        const events = history.getEvents().slice().sort((left, right) => {
            const leftSeq = left && Number.isInteger(left.seq) ? left.seq : 0;
            const rightSeq = right && Number.isInteger(right.seq) ? right.seq : 0;
            return rightSeq - leftSeq;
        });
        const stats = typeof history.getStats === 'function' ? history.getStats() : {};
        const eventCount = typeof history.getEventCount === 'function'
            ? history.getEventCount()
            : events.length;

        const total = getElement('session-history-total');
        const penalties = getElement('session-history-penalties');
        const results = getElement('session-history-results');
        if (total) total.textContent = String(Number.isFinite(stats.totalEvents) ? stats.totalEvents : 0);
        if (penalties) penalties.textContent = String(Number.isFinite(stats.penaltyCount) ? stats.penaltyCount : 0);
        if (results) results.textContent = String(Number.isFinite(stats.gameResultCount) ? stats.gameResultCount : 0);

        const started = getElement('session-history-start');
        const startedText = typeof history.getSessionStartedAt === 'function'
            ? formatStartedAt(history.getSessionStartedAt())
            : '';
        if (started) {
            started.textContent = startedText;
            started.hidden = !startedText;
        }

        const empty = getElement('session-history-empty');
        if (empty) empty.hidden = eventCount !== 0;

        if (attributionEditor && !events.some((event) => sameIdentity(attributionEditor.identity, eventIdentity(event)))) {
            clearAttributionEditor();
        }

        clearChildren(list);
        let focusTarget = null;
        events.forEach((event) => {
            const rendered = renderEvent(event, focusRequest);
            list.appendChild(rendered.element);
            if (rendered.focusTarget) focusTarget = rendered.focusTarget;
        });
        if (!focusRequest) return;
        const modal = getElement('session-history-modal');
        if (isUsableFocusTarget(currentFocus, modal)) return;
        if (!isUsableFocusTarget(focusTarget, modal)) {
            const historyTab = getElement('session-history-tab');
            const closeButton = getElement('session-history-close');
            focusTarget = isUsableFocusTarget(historyTab, modal) ? historyTab : closeButton;
        }
        if (isUsableFocusTarget(focusTarget, modal)) focusElement(focusTarget);
    }

    const rosterReasonMessage = (reason) => {
        if (reason === 'duplicate_name') return 'Tên này đã có trong danh sách.';
        if (reason === 'active_limit') return 'Đã đạt giới hạn 24 người chơi đang hoạt động.';
        if (reason === 'no_change') return 'Tên người chơi không thay đổi.';
        if (reason === 'player_not_found' || reason === 'player_inactive') {
            return 'Người chơi này không còn trong danh sách hoạt động.';
        }
        if (reason === 'id_exhausted') return 'Không thể tạo thêm người chơi trên thiết bị này.';
        return 'Tên phải có từ 1 đến 32 ký tự.';
    };

    const setInputError = (input, error, message) => {
        if (input) {
            if (message) input.setAttribute('aria-invalid', 'true');
            else input.removeAttribute('aria-invalid');
        }
        if (error) {
            error.textContent = message || '';
            error.hidden = !message;
        }
    };

    const showSubmittedInputError = (input, error, message) => {
        setInputError(input, error, message);
        announce(message);
    };

    const clearEditingState = () => {
        editingPlayerId = null;
        editingDraft = null;
    };

    const getActivePlayers = () => {
        try {
            const roster = window.playerRoster;
            if (!roster || typeof roster.getActivePlayers !== 'function') return [];
            const players = roster.getActivePlayers();
            return Array.isArray(players) ? players : [];
        } catch (e) {
            return [];
        }
    };

    const getActiveCount = (players) => {
        try {
            const roster = window.playerRoster;
            if (roster && typeof roster.getActiveCount === 'function') {
                const count = roster.getActiveCount();
                if (Number.isInteger(count) && count >= 0) return count;
            }
        } catch (e) {}
        return players.length;
    };

    const playerIsReferenced = (playerId) => {
        try {
            const attribution = window.sessionAttribution;
            if (!attribution || typeof attribution.getAll !== 'function') return false;
            return attribution.getAll().some((assignment) =>
                assignment && Array.isArray(assignment.participants)
                && assignment.participants.some((participant) =>
                    participant && participant.playerId === playerId));
        } catch (e) {
            return false;
        }
    };

    const getRosterStateForStats = () => {
        try {
            const roster = window.playerRoster;
            if (!roster || typeof roster.getPlayers !== 'function') {
                return { available: false, players: [] };
            }
            const players = roster.getPlayers();
            return Array.isArray(players)
                ? { available: true, players }
                : { available: false, players: [] };
        } catch (e) {
            return { available: false, players: [] };
        }
    };

    const getStatsCoverage = () => {
        const history = window.sessionHistory;
        const attribution = window.sessionAttribution;
        if (!history
            || typeof history.getEvents !== 'function'
            || typeof history.getSessionStartedAt !== 'function'
            || !attribution
            || typeof attribution.getPolicyForEvent !== 'function'
            || typeof attribution.getForEvent !== 'function') {
            return null;
        }

        try {
            const events = history.getEvents();
            const sessionStartedAt = history.getSessionStartedAt();
            if (!Array.isArray(events)) return null;
            let eligibleCount = 0;
            let assignedCount = 0;
            events.forEach((event) => {
                const identity = {
                    sessionStartedAt,
                    seq: event.seq,
                    eventAt: event.at
                };
                const policy = attribution.getPolicyForEvent(identity);
                if (!policy || policy.eligible !== true) return;
                eligibleCount += 1;
                const assignment = attribution.getForEvent(identity);
                if (assignment
                    && Array.isArray(assignment.participants)
                    && assignment.participants.length > 0) assignedCount += 1;
            });
            return { eligibleCount, assignedCount };
        } catch (e) {
            return null;
        }
    };

    const statValue = (value) => Number.isInteger(value) && value >= 0 ? value : 0;

    const renderPlayerStatCard = (stat) => {
        const card = makeElement('li', 'session-player-stat-card');
        card.dataset.playerId = stat.playerId;
        const header = makeElement('div', 'session-player-stat-card-header');
        const name = makeElement('strong', 'session-player-stat-name', stat.name);
        header.appendChild(name);
        if (stat.active === false) {
            card.classList.add('is-inactive');
            header.appendChild(makeElement('span', 'session-player-stat-inactive', 'Đã rời danh sách'));
        }
        card.appendChild(header);

        const metrics = makeElement('dl', 'session-player-stat-metrics');
        [
            ['ÁN PHẠT', statValue(stat.penaltyCount)],
            ['KẾT QUẢ', statValue(stat.resultCount)],
            ['LƯỢT ĐƯỢC GẮN', statValue(stat.attributedCount)]
        ].forEach(([label, value]) => {
            const metric = makeElement('div', 'session-player-stat-metric');
            metric.appendChild(makeElement('dt', '', label));
            metric.appendChild(makeElement('dd', '', value));
            metrics.appendChild(metric);
        });
        card.appendChild(metrics);
        return card;
    };

    function renderPlayerStats() {
        const list = getElement('session-player-stats-list');
        const coverageState = getElement('session-player-stats-coverage');
        const empty = getElement('session-player-stats-empty');
        const unavailable = getElement('session-player-stats-unavailable');
        if (!list || !coverageState || !empty || !unavailable) return;

        clearChildren(list);
        list.hidden = true;
        coverageState.textContent = '';
        coverageState.hidden = true;
        empty.hidden = true;
        unavailable.hidden = true;

        const rosterState = getRosterStateForStats();
        const attribution = window.sessionAttribution;
        if (!rosterState.available
            || !attribution
            || typeof attribution.derivePlayerStats !== 'function') {
            unavailable.hidden = false;
            return;
        }

        let stats;
        try {
            stats = attribution.derivePlayerStats();
        } catch (e) {
            unavailable.hidden = false;
            return;
        }
        const coverage = getStatsCoverage();
        if (!Array.isArray(stats) || !coverage) {
            unavailable.hidden = false;
            return;
        }

        if (coverage.eligibleCount > 0 && coverage.assignedCount === 0) {
            coverageState.textContent = 'Chưa có lượt nào được gán người. Các lượt chưa gán chưa được tính cho từng người.';
            coverageState.hidden = false;
        } else if (coverage.assignedCount > 0 && coverage.assignedCount < coverage.eligibleCount) {
            coverageState.textContent = 'Chỉ tính các lượt đã gán người.';
            coverageState.hidden = false;
        }

        empty.hidden = rosterState.players.length !== 0;
        stats.forEach((stat) => list.appendChild(renderPlayerStatCard(stat)));
        list.hidden = stats.length === 0;
    }

    const finishRosterMutation = (result, successMessage) => {
        if (result && result.persisted === false) {
            announce(`${successMessage} Thay đổi đang được giữ trong bộ nhớ vì chưa thể lưu trên thiết bị.`);
            return;
        }
        announce(successMessage);
    };

    const saveRename = (player, input, error) => {
        const roster = window.playerRoster;
        if (!roster || typeof roster.renamePlayer !== 'function') return;
        if (editingPlayerId === player.id) editingDraft = input.value;
        const result = roster.renamePlayer(player.id, input.value);
        if (!result || result.ok !== true) {
            showSubmittedInputError(input, error, rosterReasonMessage(result && result.reason));
            focusElement(input);
            return;
        }
        clearEditingState();
        renderPlayers(player.id);
        finishRosterMutation(result, `Đã đổi tên thành ${result.player.name}.`);
    };

    const deactivatePlayer = (player) => {
        const roster = window.playerRoster;
        if (!roster || typeof roster.deactivatePlayer !== 'function') return;
        if (playerIsReferenced(player.id)) {
            const accepted = typeof window.confirm === 'function'
                && window.confirm(`Xóa ${player.name} khỏi danh sách? Các lượt đã gán vẫn giữ tên này.`);
            if (!accepted) return;
        }
        const result = roster.deactivatePlayer(player.id);
        if (!result || result.ok !== true) {
            announce(rosterReasonMessage(result && result.reason));
            return;
        }
        if (editingPlayerId === player.id) clearEditingState();
        renderPlayers();
        finishRosterMutation(result, `Đã xóa ${player.name} khỏi danh sách hoạt động.`);
    };

    const renderPlayerRow = (player, focusPlayerId) => {
        const row = makeElement('article', 'session-player-row');
        row.dataset.playerId = player.id;

        if (editingPlayerId === player.id) {
            const inputId = `session-player-rename-${player.id}`;
            const errorId = `session-player-rename-error-${player.id}`;
            const label = makeElement('label', 'session-player-rename-label', `Đổi tên ${player.name}`);
            label.setAttribute('for', inputId);
            const renameRow = makeElement('div', 'session-player-rename-row');
            const input = makeElement('input', 'session-player-input');
            input.id = inputId;
            input.type = 'text';
            input.value = typeof editingDraft === 'string' ? editingDraft : player.name;
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('aria-describedby', errorId);
            const error = makeElement('p', 'session-player-error');
            error.id = errorId;
            error.hidden = true;
            const actions = makeElement('div', 'session-player-rename-actions');
            const save = makeButton('LƯU', '', `Lưu tên mới cho ${player.name}`);
            const cancel = makeButton('HỦY', '', `Hủy đổi tên ${player.name}`);

            save.addEventListener('click', () => saveRename(player, input, error));
            cancel.addEventListener('click', () => {
                clearEditingState();
                renderPlayers(player.id);
            });
            input.addEventListener('input', () => {
                if (editingPlayerId === player.id) editingDraft = input.value;
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    saveRename(player, input, error);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    clearEditingState();
                    renderPlayers(player.id);
                }
            });

            renameRow.appendChild(input);
            actions.appendChild(save);
            actions.appendChild(cancel);
            row.appendChild(label);
            row.appendChild(renameRow);
            row.appendChild(error);
            row.appendChild(actions);
            return {
                element: row,
                focusTarget: focusPlayerId === player.id ? input : null
            };
        }

        const main = makeElement('div', 'session-player-row-main');
        const name = makeElement('strong', 'session-player-name', player.name);
        const actions = makeElement('div', 'session-player-row-actions');
        const rename = makeButton('ĐỔI TÊN', '', `Đổi tên ${player.name}`);
        const remove = makeButton('XÓA', 'session-player-remove-btn', `Xóa ${player.name} khỏi danh sách`);

        rename.addEventListener('click', () => {
            editingPlayerId = player.id;
            editingDraft = player.name;
            renderPlayers(player.id);
        });
        remove.addEventListener('click', () => deactivatePlayer(player));
        actions.appendChild(rename);
        actions.appendChild(remove);
        main.appendChild(name);
        main.appendChild(actions);
        row.appendChild(main);
        return {
            element: row,
            focusTarget: focusPlayerId === player.id ? rename : null
        };
    };

    function renderPlayers(focusPlayerId) {
        const list = getElement('session-player-list');
        if (!list) return;
        const players = getActivePlayers();
        renderPlayerStats();
        if (editingPlayerId && !players.some((player) => player.id === editingPlayerId)) {
            clearEditingState();
        }

        const empty = getElement('session-players-empty');
        if (empty) empty.hidden = players.length !== 0;

        const roster = window.playerRoster;
        const maxActive = roster && Number.isInteger(roster.MAX_ACTIVE_PLAYERS)
            ? roster.MAX_ACTIVE_PLAYERS
            : 24;
        const atLimit = getActiveCount(players) >= maxActive;
        const addButton = getElement('session-player-add');
        const limit = getElement('session-player-limit');
        if (addButton) addButton.disabled = atLimit;
        if (limit) limit.hidden = !atLimit;

        clearChildren(list);
        let focusTarget = null;
        players.forEach((player) => {
            const rendered = renderPlayerRow(player, focusPlayerId);
            list.appendChild(rendered.element);
            if (rendered.focusTarget) focusTarget = rendered.focusTarget;
        });
        focusElement(focusTarget);
    }

    const addPlayer = (event) => {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        const roster = window.playerRoster;
        const input = getElement('session-player-name');
        const error = getElement('session-player-name-error');
        if (!roster || typeof roster.addPlayer !== 'function' || !input) return;

        setInputError(input, error, '');
        const result = roster.addPlayer(input.value);
        if (!result || result.ok !== true) {
            showSubmittedInputError(input, error, rosterReasonMessage(result && result.reason));
            focusElement(input);
            return;
        }

        input.value = '';
        renderPlayers(editingPlayerId);
        if (!editingPlayerId) focusElement(input);
        finishRosterMutation(result, `Đã thêm ${result.player.name}.`);
    };

    const applyViewState = () => {
        Object.keys(VIEW_IDS).forEach((view) => {
            const selected = view === activeView;
            const tab = getElement(VIEW_IDS[view].tab);
            const panel = getElement(VIEW_IDS[view].panel);
            if (tab) {
                tab.setAttribute('aria-selected', selected ? 'true' : 'false');
                tab.setAttribute('tabindex', selected ? '0' : '-1');
                if (selected) tab.classList.add('is-active');
                else tab.classList.remove('is-active');
            }
            if (panel) {
                panel.hidden = !selected;
                panel.setAttribute('aria-hidden', selected ? 'false' : 'true');
            }
        });
    };

    const setActiveView = (view, focusTab) => {
        if (!VIEW_IDS[view]) return;
        if (view !== 'history') clearAttributionEditor();
        activeView = view;
        applyViewState();
        if (view === 'history') renderHistory();
        else renderPlayers();
        if (focusTab) focusElement(getElement(VIEW_IDS[view].tab));
    };

    const handleTabKeydown = (event) => {
        if (!event || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const target = event.key === 'ArrowLeft' || event.key === 'Home' ? 'history' : 'players';
        setActiveView(target, true);
    };

    const render = () => {
        if (activeView === 'players') renderPlayers();
        else renderHistory();
    };

    const open = () => {
        clearEditingState();
        clearAttributionEditor();
        setActiveView('history', false);
        if (window.app && typeof window.app.openModal === 'function') {
            window.app.openModal('session-history-modal');
        }
    };

    const close = () => {
        clearEditingState();
        clearAttributionEditor();
        if (window.app && typeof window.app.closeModal === 'function') {
            window.app.closeModal('session-history-modal');
        }
    };

    const startNewSession = () => {
        const history = window.sessionHistory;
        if (!history || typeof history.reset !== 'function') return;
        const message = 'Bắt đầu Phiên mới? Lịch sử và thống kê người chơi hiện tại sẽ được xóa. Danh sách người chơi vẫn được giữ.';
        if (typeof window.confirm !== 'function' || !window.confirm(message)) return;
        // reset() owns History. Attribution observes the same reset and clears
        // its sidecar; Player Store is deliberately untouched.
        history.reset();
    };

    const init = () => {
        if (initialized) return;
        initialized = true;

        const trigger = getElement('history-open-btn');
        const modal = getElement('session-history-modal');
        const closeButton = getElement('session-history-close');
        const newSessionButton = getElement('session-history-new');
        const addForm = getElement('session-player-add-form');
        const statsAddButton = getElement('session-player-stats-add');
        const historyTab = getElement('session-history-tab');
        const playersTab = getElement('session-players-tab');

        if (trigger) trigger.addEventListener('click', open);
        if (closeButton) closeButton.addEventListener('click', close);
        if (newSessionButton) newSessionButton.addEventListener('click', startNewSession);
        if (addForm) addForm.addEventListener('submit', addPlayer);
        if (statsAddButton) {
            statsAddButton.addEventListener('click', () => focusElement(getElement('session-player-name')));
        }
        if (historyTab) {
            historyTab.addEventListener('click', () => setActiveView('history', false));
            historyTab.addEventListener('keydown', handleTabKeydown);
        }
        if (playersTab) {
            playersTab.addEventListener('click', () => setActiveView('players', false));
            playersTab.addEventListener('keydown', handleTabKeydown);
        }
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) close();
            });
        }

        window.addEventListener('sessionHistoryChanged', () => {
            if (!modal || !modal.classList.contains('active')) return;
            if (activeView === 'players') {
                renderPlayerStats();
                return;
            }
            if (activeView === 'history') {
                const editedSeq = attributionEditor && attributionEditor.identity.seq;
                clearAttributionEditor();
                renderHistory(editedSeq ? { seq: editedSeq, target: 'action' } : undefined);
            }
        });
        window.addEventListener('playerRosterChanged', () => {
            if (!modal || !modal.classList.contains('active')) return;
            if (activeView === 'players') {
                const editedPlayerId = editingPlayerId;
                renderPlayers(editedPlayerId);
                if (editedPlayerId && !editingPlayerId) {
                    focusElement(getElement('session-player-name'));
                }
                return;
            }
            if (activeView === 'history') {
                let playerId = null;
                const activeElement = document.activeElement;
                if (activeElement && activeElement.dataset) {
                    playerId = activeElement.dataset.attributionPlayerId || null;
                }
                if (attributionEditor) {
                    const activeIds = new Set(getActivePlayers().map((player) => player.id));
                    attributionEditor.selectedPlayerIds = new Set(
                        Array.from(attributionEditor.selectedPlayerIds).filter((id) => activeIds.has(id))
                    );
                    renderHistory({
                        seq: attributionEditor.identity.seq,
                        target: 'picker',
                        playerId
                    });
                } else {
                    renderHistory();
                }
            }
        });
        window.addEventListener('sessionAttributionChanged', (event) => {
            if (attributionMutationInProgress
                || !modal
                || !modal.classList.contains('active')) return;
            const action = event && event.detail && event.detail.action;
            if (activeView === 'players') {
                if (action !== 'reset' && action !== 'prune') renderPlayerStats();
                return;
            }
            if (activeView !== 'history') return;
            if (action === 'reset') {
                clearAttributionEditor();
                return;
            }
            const editedSeq = attributionEditor && attributionEditor.identity.seq;
            clearAttributionEditor();
            renderHistory(editedSeq ? { seq: editedSeq, target: 'action' } : undefined);
        });

        applyViewState();
    };

    window.sessionHistoryUI = Object.freeze({
        init,
        render,
        open,
        close
    });
})();
