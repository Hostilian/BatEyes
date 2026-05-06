# BatEyes

Experimental React Native (Expo) app plus a small TypeScript DSP library for phone-based chirp sonar prototyping.

## Layout

- [`packages/acoustic-core`](packages/acoustic-core) — analysis, chirp generation, codecs (`@bateyes/acoustic-core`).
- [`mobile`](mobile) — Expo app UI, sensors, polar scan export/import, and the [`bateyes-audio`](mobile/modules/bateyes-audio) native module for synchronized chirp playback and recording.

## Prerequisites

- Node.js 20+ recommended.
- For device builds: Android Studio / Xcode per Expo [development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## Install

From the repo root:

```bash
npm install
```

The `@bateyes/acoustic-core` package runs `prepare` to compile `dist/` for consumers that resolve the published `main` entry.

## Commands

| Command | Description |
|--------|-------------|
| `npm test` | Runs `acoustic-core` unit tests. |
| `npm run test:all` | Runs `acoustic-core` and mobile test suites. |
| `npm run mobile:typecheck` | Typechecks the Expo app (`tsc` in `mobile`). |
| `npm test -w mobile` | Jest tests for mobile helpers (`scanImport`, `toneDataUri`). |
| `npm run test:core:ci` | Runs `acoustic-core` tests in deterministic CI mode. |
| `npm run secret:scan` | Scans tracked files for likely committed secrets/tokens. |
| `npm run secret:scan:test` | Runs unit tests for secret scanning guard logic. |
| `npm run verify:security` | Runs secret scan plus high-severity npm audit checks. |
| `npm run verify:build` | Runs CI install-stage build and typecheck gates. |
| `npm run verify:ci` | Runs the same test/integrity/secret gates as the CI test stage. |
| `npm run verify` | Full local quality gate (`core build/dist check`, mobile typecheck, all tests). |
| `npm run mobile:apk` | Builds a debug APK (expects generated `mobile/android` from prebuild and a configured Android SDK: `ANDROID_HOME` or `mobile/android/local.properties` with `sdk.dir`). |
| `npm run mobile:apk:preflight` | Verifies Android prerequisites (`java` 17, `adb`, SDK path, Gradle wrapper). |
| `npm run mobile:apk:clean` | Runs prebuild + Gradle clean + debug APK build for stale-cache recovery. |

## Mobile dev

```bash
cd mobile
npx expo start
```

Native pulse capture lives in the `bateyes-audio` workspace package (`file:./modules/bateyes-audio` in `mobile/package.json`, `requireNativeModule('BateyesAudio')`). After changing native code, run prebuild again for that platform.

```bash
cd mobile
npx expo prebuild --platform android
npx expo prebuild --platform ios
```

Gradle uses [`mobile/app.plugin.js`](mobile/app.plugin.js) for heap and optional Aliyun mirrors when `BATEYES_USE_ALIYUN_MAVEN=1`.

### Android debug APK flow

From the repository root:

```bash
npm install
npm run mobile:apk:preflight
npm run mobile:apk
```

If dependencies or Gradle caches get out of sync:

```bash
npm run mobile:apk:clean
```

### Android Studio demo runbook

Use this when you want a reliable live demo directly from Android Studio.

1. From repo root, run:

```bash
npm install
npm run mobile:apk:preflight
npm run prebuild:android -w mobile
```

2. Open Android Studio and select `mobile/android`.
3. Let Gradle sync complete, then pick the `app` run configuration.
4. Start an emulator (or connect a device with USB debugging), then click **Run**.
5. If Metro is not running yet, start it in a terminal:

```bash
cd mobile
npx expo start --dev-client
```

Demo-ready quick check:
- Launch app and grant microphone permission.
- Trigger **Pulse** once and verify values update.
- Open **Polar**, record a short sweep, then test **Export** and **Import**.

One-command options from repo root:

```bash
npm run demo:ready
```

Builds/verifies everything needed for a stable demo and produces debug APK.

```bash
npm run demo:android:install
```

Installs the debug APK to the currently connected emulator/device and launches `BatEyes`.

Mirror-friendly prebuild path (for network-constrained environments):

```bash
npm run prebuild:android:mirror -w mobile
```

Use the default prebuild path otherwise:

```bash
npm run prebuild:android -w mobile
```

### Android troubleshooting

- `android/ not found`: run `npm run prebuild:android -w mobile` first because generated native folders are gitignored.
- Java version error in preflight: make sure JDK 17 is installed and selected on `PATH` / `JAVA_HOME`.
- Missing SDK path: set `ANDROID_HOME` or `ANDROID_SDK_ROOT`, or add `sdk.dir=...` to `mobile/android/local.properties`.
- `adb` not found: install Android platform-tools and add them to `PATH`.
- Build succeeds but app cannot record audio: verify microphone permission is granted on device.

## Manual smoke checklist

- Grant microphone; run **Pulse** and confirm readouts update.
- **Calibrate** away from strong reflectors; repeat if correlation looks noisy.
- Enable **Polar**, pulse while rotating; **Export** JSON and **Import** it back.
- Toggle **Sonify** and confirm short ping on nearby echoes.
- If gyroscope is unavailable, verify the app still supports non-Polar pulse mode.

## CI

GitHub Actions workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs staged checks (workspace install, build/typecheck, tests, secret scanner unit tests, secret scanning, integrity checks, security verification, and dependency freshness).

## Local pre-commit hook (optional)

This repository includes a hook script at [`.githooks/pre-commit`](.githooks/pre-commit) that runs typecheck, tests, and secret scanning before commits.

Enable it locally:

```bash
git config core.hooksPath .githooks
```

If scanner false positives are intentional in a fixture, add an inline marker in that file:
- `secret-scan: allow <rule name in lowercase>` to suppress a single rule.
- `secret-scan: allow all` only for exceptional test fixtures.
- Files larger than 1 MB are skipped by scanner heuristics to keep CI/runtime fast.

## Release checklist (internal)

- Choose EAS profile from [`mobile/eas.json`](mobile/eas.json): `preview` (APK) or `production` (AAB).
- Verify `expo.version` and `expo.android.versionCode` in [`mobile/app.json`](mobile/app.json) before build.
- Run: `npm test`, `npm test -w mobile`, `npm run mobile:typecheck`.
- Smoke test on a physical Android device: Pulse, Polar, Export/Import, Sonify, permission prompts.
- Archive build artifact with commit SHA and profile name for traceability.
