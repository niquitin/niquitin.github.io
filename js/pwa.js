/* Phase 4: lightweight PWA registration + offline status */
(function () {
    'use strict';

    const status = document.getElementById('network-status');

    function updateNetworkStatus() {
        const offline = navigator.onLine === false;
        document.documentElement.classList.toggle('is-offline', offline);

        if (!status) return;
        status.textContent = offline ? 'OFFLINE • BẢN LƯU' : '';
        status.setAttribute('aria-hidden', String(!offline));
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    // Android WebView APKs often run from file:// and do not expose a
    // service-worker scope. Registration is therefore intentionally limited
    // to the hosted web/PWA build and fails silently if unsupported.
    const isHostedWeb = /^https?:$/.test(location.protocol)
        && location.hostname !== 'appassets.androidplatform.net';
    if ('serviceWorker' in navigator && isHostedWeb) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {
                // Offline status still works even when hosting disallows SW.
            });
        });
    }
}());
