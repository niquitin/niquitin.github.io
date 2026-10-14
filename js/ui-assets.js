/** Shared SVG asset helpers for the Phase 2/3 visual system. */
(function () {
    const SPRITE = 'assets/icons/game-icons.svg';
    const aliases = {
        beer: 'beer', liquor: 'shot', ear_flick: 'ear', softdrink: 'soda', spicy: 'pepper',
        money: 'money', fitness: 'muscle', custom: 'pencil', trash: 'trash',
        drink: 'penalty-drink', truth: 'penalty-dare', dare: 'penalty-perform',
        king: 'crown', safe: 'penalty-safe', target: 'target', shuffle: 'shuffle',
        refresh: 'refresh', bolt: 'bolt', skull: 'skull', question: 'question', cup: 'cup'
    };

    window.partyAssets = {
        sprite: SPRITE,
        escape(value) {
            return String(value ?? '').replace(/[&<>"']/g, character => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[character]));
        },
        icon(name, className = '', label = '') {
            const symbol = aliases[name] || name;
            const hidden = label ? '' : ' aria-hidden="true"';
            const labelled = label ? ` role="img" aria-label="${this.escape(label)}"` : '';
            return `<svg class="party-icon ${className}"${hidden}${labelled} focusable="false"><use href="${SPRITE}#${symbol}"></use></svg>`;
        }
    };
})();
