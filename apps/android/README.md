# ATSRS Android

Official Capacitor-based Android shell for ATSRS. The application packages a versioned copy of the existing static frontend and connects to the existing ATSRS HTTPS backend. It does not load the production website as its main application content.

## Development

Requirements: Node.js 22 or newer, Android Studio, Android SDK API 36, and Java 21 or newer.

The APK supports Android 7 (API 24) and newer. ATSRS also requires Android System WebView or Chrome 100 or newer; devices with an older rendering engine receive a native update notice instead of a broken or blank application screen.

```powershell
npm install
npm run android:debug
```

The debug APK is written under `android/app/build/outputs/apk/debug/`.

`npm run android:test` synchronizes the packaged web assets and runs Android unit tests plus Android lint.

## Security boundaries

- Application ID: `com.atsrs.app`
- Cleartext HTTP and mixed content are disabled.
- External HTTPS links open outside the ATSRS WebView.
- Production signing credentials and keystores must never be stored in this repository.
- The current APK is debug-signed and must not be distributed as the production ATSRS release.
- Google OAuth/deep-link support is a separate Phase 2 gate and is not considered complete in the Phase 1 shell.
