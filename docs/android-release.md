# ATSRS Android release operations

## Architecture

ATSRS Android is a Capacitor application with locally packaged, versioned web assets. Existing ATSRS HTTPS APIs and Supabase policies remain the source of business data. Google OAuth opens in the Android system browser and returns only through `com.atsrs.app://login-callback`.

## Signing material

Production signing material is stored outside the repository under `C:\Users\user\.atsrs\android-signing`. Access is restricted to the current Windows user and SYSTEM. The Gradle release build reads the path from `ATSRS_SIGNING_PROPERTIES`; secrets and keystores are ignored by Git and must never be copied into the repository.

Back up the complete signing directory to an owner-controlled encrypted offline location. Losing the keystore or its password prevents in-place upgrades. The DPAPI password copy is tied to this Windows account and machine context; it is not a substitute for an encrypted disaster-recovery backup.

## Build

Set `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `ATSRS_SIGNING_PROPERTIES`, then run from `apps/android`:

```powershell
npm ci
npm run android:test
npm run android:release
```

Verify the exact APK with Android SDK `apksigner verify --verbose --print-certs`, then calculate SHA-256 from that same file.

## Distribution

- Page: `https://atsrs.com/download/android/`
- Immutable APK: `https://atsrs.com/downloads/atsrs-android-1.0.0.apk`
- Manifest: `https://atsrs.com/download/android/android-version.json`

Never replace a versioned APK. Increment both `versionCode` and `versionName`, build with the same keystore, add a new immutable filename, and update the manifest only after signature and checksum verification.

## Rollback

Revert the website release commit to remove the public download entry and manifest. Keep the already published immutable APK available until installed clients have a safe upgrade path. A binary rollback requires a newly signed APK with a higher `versionCode`; Android will not install a lower version as an update.
