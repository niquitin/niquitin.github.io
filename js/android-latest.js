/* One verified Android APK channel shared by the web homepage and guide.
 * The HTML holds a known-good fallback; this file never creates a release. */
(function () {
    'use strict';

    const manifestPath = './android-latest.json';
    const expectedPackage = 'com.partygame.vuabannhau';

    function validManifest(m) {
        if (!m || m.schemaVersion !== 1 || m.applicationId !== expectedPackage) return false;
        if (!['beta', 'stable'].includes(m.channel) || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-beta\.[0-9]+)?$/.test(m.version)) return false;
        if (!Number.isInteger(m.versionCode) || m.versionCode < 1) return false;
        if (!Number.isSafeInteger(m.sizeBytes) || m.sizeBytes < 1024 || m.sizeBytes > 50000000) return false;
        if (!/^[a-f0-9]{64}$/.test(m.sha256)) return false;
        if (typeof m.filename !== 'string' || !/^VuaBanNhau-NiQuitin-[a-zA-Z0-9._-]+-Android-signed\.apk$/.test(m.filename)) return false;
        if (typeof m.downloadUrl !== 'string' || typeof m.releasePage !== 'string') return false;
        try {
            const expected = 'https://github.com/niquitin/niquitin.github.io/releases/';
            const u = new URL(m.downloadUrl);
            const r = new URL(m.releasePage);
            if (u.href !== expected + 'download/v' + m.version + '/' + m.filename) return false;
            if (r.href !== expected + 'tag/v' + m.version) return false;
            if (u.username || u.password || u.search || u.hash || r.search || r.hash) return false;
        } catch (_) { return false; }
        return true;
    }

    function applyRelease(m) {
        document.querySelectorAll('[data-android-apk-link]').forEach(function (a) {
            a.href = m.downloadUrl;
            a.setAttribute('aria-label', 'Tải Vua Bàn Nhậu Android ' + m.version + ' từ GitHub Releases');
        });
        document.querySelectorAll('[data-android-apk-version]').forEach(function (el) {
            el.textContent = m.version;
        });
        document.querySelectorAll('[data-android-apk-sha256]').forEach(function (el) {
            el.textContent = m.sha256;
        });
        document.querySelectorAll('[data-android-apk-size]').forEach(function (el) {
            el.textContent = (m.sizeBytes / 1000000).toFixed(2).replace('.', ',') + ' MB';
        });
        document.querySelectorAll('[data-android-apk-channel]').forEach(function (el) {
            el.textContent = m.channel === 'stable' ? 'ANDROID STABLE' : 'ANDROID BETA — CHƯA PHẢI STABLE';
        });
        document.querySelectorAll('[data-android-apk-notice]').forEach(function (el) {
            el.textContent = m.notice || '';
        });
        document.documentElement.dataset.androidApkVersion = m.version;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    if (!document.querySelector('[data-android-apk-link]')) return;
    fetch(manifestPath, {cache:'no-store', credentials:'same-origin'})
        .then(function (r) {
            if (!r.ok) throw new Error('APK release manifest HTTP ' + r.status);
            return r.json();
        })
        .then(function (m) {
            if (!validManifest(m)) throw new Error('APK release manifest failed validation');
            applyRelease(m);
        })
        .catch(function () {
            // Keep the previous verified version in the HTML when offline or
            // when manifest validation fails; never guess a release URL.
        });
}());
