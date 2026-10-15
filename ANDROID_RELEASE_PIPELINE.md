# Vua Bàn Nhậu — Android APK release channel

Author: NiQuitin. The public game website and Android install page use one verified manifest: `android-latest.json`.

## Release rule (applies to every future signed Android build)

1. Preserve the previously verified public APK and links while developing. Never replace the public file with an untested/debug build.
2. Build candidate from an exact source allowlist; test wheel and all 10 games, Android offline mode, and persistence/storage regressions. Keep the source commit, asset hashes, signed APK and reports.
3. Sign the APK with the existing NiQuitin owner keystore OUTSIDE repository and cloud storage. Verify `apksigner` certificate SHA-256 and application ID; require a strictly increasing Android versionCode for updates.
4. Upload the uniquely named APK to a versioned GitHub prerelease/release first. Download anonymously from the final public URL, verify complete file SHA-256 and bytes equal original.
5. Update **only after verified release exists**: `android-latest.json` fields (channel, version, code, unique filename, download URL, release page, SHA, bytes, signer SHA, notice). Use `node tools/check-android-release.cjs <signed-apk> <apksigner.bat>` to check bytes, version metadata and signing certificate.
6. Test web channel with valid future manifest, tampered manifest and offline. Publish web files to a Cloudflare QA branch first. Verify mobile/tablet, old APK fallback, latest URL and PWA cache. Promote the tested source to GitHub Pages main and Cloudflare Pages main; smoke-test the exact public website and both old/new routes. Roll back to the last known-good site commit if failures occur.
7. Keep `https://vuabannhau.pages.dev/android.html` as the permanent install guide URL. Homepage and guide fetch the same `android-latest.json` on each online visit. Service Worker is network-first for release metadata, and cache-first for game files.
8. Record version, code, SHA, signer SHA, complete offline/device QA and URL in release report. Link the APK on the website only when both checks pass.

## Important constraints

- This is a **release workflow**, not an autonomous online build service. A verified APK must be built and uploaded before the website metadata can be updated.
- Fail closed: unknown/malicious manifest causes HTML to retain the previous signed APK URL; do not fabricate an APK URL or silently label Beta as Stable.
- Signed APKs must also be copied to the owner's approved Google Drive `apk` directory; do not copy the signing key/password.
- Android Beta 5.19.0-beta.1 currently remains downloadable while native storage durability and trusted-origin bridge are being engineered. No source changes to the canonical local Ni game working tree are necessary for this web channel.
