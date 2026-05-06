# Android release workflow

## Profiles

- `preview` (`mobile/eas.json`): internal APK for tester installs.
- `production` (`mobile/eas.json`): Play Store-ready AAB with `autoIncrement`.

## Versioning policy

- Keep `expo.version` in `mobile/app.json` as semantic version (`major.minor.patch`).
- `expo.android.versionCode` must strictly increase for every production upload.
- When shipping DSP behavior changes, bump `@bateyes/acoustic-core` version and regenerate `dist/`.

## Signing strategy

- Prefer EAS-managed Android credentials for shared team access.
- If migrating to local keystore, keep the keystore outside the repository and store encrypted backups in a team password manager.
- Rotate credentials only with a documented handoff window and test install/upgrade path.

## Release checklist

1. `npm test`
2. `npm test -w mobile`
3. `npm run mobile:typecheck`
4. `npm run mobile:apk` and smoke test on a physical device.
5. `npm run mobile:eas:preview` for internal validation.
6. `npm run mobile:eas:production` for store artifact generation.
