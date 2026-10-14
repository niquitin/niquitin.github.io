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

    // G17 verified root bootstrap exclusively owns Hosted PWA registration.
}());
