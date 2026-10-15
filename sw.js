/* Vua Bàn Nhậu — versioned offline app shell */
// Keep the web release version in one place. Every versioned shell URL below
// is derived from this value so a new deploy cannot mix old query keys with a
// new cache namespace.
const APP_VERSION = '5.18.6-wheel-r1';
const CACHE_NAME = `vbn-shell-${APP_VERSION}`;
const asset = (path) => `${path}?v=${APP_VERSION}`;
const SHELL = [
    './index.html',
    './privacy.html',
    './terms.html',
    './third-party-notices.html',
    asset('./css/style.css'),
    asset('./css/components.css'),
    asset('./css/phase2.css'),
    asset('./js/ui-assets.js'),
    asset('./js/haptics.js'),
    asset('./js/pwa.js'),
    asset('./js/audio.js'),
    asset('./js/penalty_medium.js'),
    asset('./js/penalties.js'),
    asset('./js/party-session.js'),
    asset('./js/player-roster.js'),
    asset('./js/session-history.js'),
    asset('./js/session-attribution.js'),
    asset('./js/session-history-ui.js'),
    asset('./js/games/crocodile.js'),
    asset('./js/games/wheel.js'),
    asset('./js/games/finger.js'),
    asset('./js/games/bomb.js'),
    asset('./js/games/pirate.js'),
    asset('./js/vendor/three.min.js'),
    asset('./js/visuals/dice-model.js'),
    asset('./js/visuals/dice-card-preview.js'),
    asset('./js/games/dice-3d-renderer.js'),
    asset('./js/games/dice.js'),
    asset('./js/games/cards.js'),
    asset('./js/games/bottle.js'),
    asset('./js/games/numberbomb.js'),
    asset('./js/games/neverhave.js'),
    asset('./js/how-to-play.js'),
    asset('./js/app.js'),
    './assets/art/dice-3d.webp',
    './assets/art/dice-game-3d.webp',
    './assets/art/pirate-barrel-3d.webp',
    './assets/art/crocodile-roulette-3d.webp',
    './assets/art/crocodile-game/manifest.json',
    './assets/art/crocodile-game/01-upper-head.webp',
    './assets/art/crocodile-game/02-mouth-cavity.webp',
    './assets/art/crocodile-game/03-tongue.webp',
    './assets/art/crocodile-game/04-upper-gum.webp',
    './assets/art/crocodile-game/05-lower-gum.webp',
    './assets/art/crocodile-game/06-lower-jaw-body.webp',
    './assets/art/crocodile-game/07-paws.webp',
    './assets/art/lucky-wheel-3d.webp',
    './assets/art/finger-touch-3d.webp',
    './assets/art/time-bomb-3d.webp',
    './assets/art/drinking-cards-3d.webp',
    './assets/art/spin-bottle-3d.webp',
    './assets/art/bottle-game/01-green.webp',
    './assets/art/bottle-game/02-amber.webp',
    './assets/art/bottle-game/03-clear.webp',
    './assets/art/bottle-game/04-wine.webp',
    './assets/art/pirate-game/barrel-back.webp',
    './assets/art/pirate-game/pirate-mascot.webp',
    './assets/art/pirate-game/pirate-mascot-trap.webp',
    './assets/art/pirate-game/sword-neutral.webp',
    './assets/art/pirate-game/sword-cutlass.webp',
    './assets/art/pirate-game/barrel-front-lip.webp',
    './assets/art/number-bomb-3d.webp',
    './assets/art/never-have-i-ever-3d.webp',
    './assets/icons/game-icons.svg',
    './assets/icons/app-icon.svg',
    './assets/icons/app-icon-maskable.svg',
    './assets/icons/app-icon-192.png',
    './assets/icons/app-icon-512.png',
    './assets/icons/app-icon-maskable-192.png',
    './assets/icons/app-icon-maskable-512.png',
    './assets/fonts/be-vietnam-pro/BeVietnamPro-Regular.ttf',
    './assets/fonts/be-vietnam-pro/BeVietnamPro-SemiBold.ttf',
    './assets/fonts/be-vietnam-pro/BeVietnamPro-Bold.ttf',
    './assets/fonts/be-vietnam-pro/BeVietnamPro-ExtraBold.ttf',
    './assets/fonts/be-vietnam-pro/BeVietnamPro-Black.ttf',
    './assets/fonts/be-vietnam-pro/OFL.txt',
    asset('./manifest.json')
];

self.addEventListener('install', (event) => {
    let cacheCreatedForInstall = false;
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                cacheCreatedForInstall = !keys.includes(CACHE_NAME);
                return caches.open(CACHE_NAME);
            })
            .then((cache) => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
            .catch(async (error) => {
                // A failed precache must not leave a partially created version
                // namespace behind; the previously active worker stays intact.
                // Do not destroy the active shell if an update reuses the same
                // version namespace (e.g. a failed same-version patch).
                if (cacheCreatedForInstall) {
                    try { await caches.delete(CACHE_NAME); } catch (ignored) {}
                }
                throw error;
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith('vbn-shell-') && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Keep navigation resilient: a fresh page is preferred, but the cached
    // app shell keeps the party playable when the venue has no signal.
    if (request.mode === 'navigate') {
        const filename = url.pathname.split('/').pop();
        const offlinePage = ['privacy.html', 'terms.html', 'third-party-notices.html'].includes(filename)
            ? './' + filename : './index.html';
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(offlinePage, copy));
                    return response;
                })
                .catch(() => caches.match(offlinePage).then((match) => match || caches.match('./index.html')))
        );
        return;
    }

    // Cache-first for local assets, with a background refresh when online.
    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
