/**
 * Haptic adapter for Web + Android WebView.
 * Uses a native bridge when the APK provides one, then falls back to Vibration API.
 */
class PartyHaptics {
    constructor() {
        this.enabled = true;
        this.patterns = {
            light: [12],
            medium: [24],
            success: [16, 35, 16],
            danger: [32, 35, 70],
            impact: [45, 30, 90, 40, 120]
        };
    }

    setEnabled(value) {
        this.enabled = Boolean(value);
        return this.enabled;
    }

    toggle() {
        return this.setEnabled(!this.enabled);
    }

    play(kind = 'light') {
        if (!this.enabled) return false;
        const isCustomPattern = Array.isArray(kind) || typeof kind === 'number';
        const pattern = isCustomPattern
            ? kind
            : (this.patterns[kind] || this.patterns.light);

        // Optional bridge exposed by the Android WebView wrapper.
        try {
            if (window.Android && typeof window.Android.performHaptic === 'function') {
                let handled;
                if (isCustomPattern && typeof window.Android.vibratePattern === 'function') {
                    const parts = (Array.isArray(pattern) ? pattern : [pattern])
                        .slice(0, 16)
                        .map((value) => Math.max(0, Math.min(1000, Math.round(Number(value) || 0))));
                    handled = window.Android.vibratePattern(parts.join(','));
                } else {
                    handled = window.Android.performHaptic(typeof kind === 'string' ? kind : 'light');
                }
                if (handled !== false) return true;
            }
        } catch (e) {}

        try {
            if (navigator && typeof navigator.vibrate === 'function') {
                navigator.vibrate(pattern);
                return true;
            }
        } catch (e) {}
        return false;
    }
}

window.partyHaptics = new PartyHaptics();
