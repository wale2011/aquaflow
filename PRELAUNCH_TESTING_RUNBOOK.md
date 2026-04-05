# AquaFlow Pre-Launch Testing Runbook

This runbook lets you:
- ship installable test apps to friends
- keep adding features during testing via OTA updates
- prepare for App Store / Play Store launch cleanly

## 1) Current setup status

- EAS project linked in [`mobile/app.json`](mobile/app.json)
- EAS Build profiles configured in [`mobile/eas.json`](mobile/eas.json)
- EAS Update configured (`updates.url` + `runtimeVersion`) in [`mobile/app.json`](mobile/app.json)

## 2) Build test binaries

From [`mobile`](mobile):

### Android (internal testing build)

```bash
eas build --platform android --profile preview
```

- Share generated APK/AAB link with testers.
- For broad testing, use Google Play Internal Testing track.

### iOS (internal testing build)

```bash
eas build --platform ios --profile preview
```

- Distribute through TestFlight (required for external iOS testers).

## 3) Push feature updates during testing (OTA)

When you change JS/TS/UI logic and want testers to get updates without a new binary:

```bash
eas update --branch preview --message "Feature update: <short note>"
```

Notes:
- Use `preview` for all pre-launch testing updates.
- If native dependencies/config change, create a new build instead of OTA-only.

## 4) Recommended workflow during pre-launch

1. Build and distribute preview binaries once.
2. Collect tester feedback.
3. Implement feature fixes.
4. Push OTA update to `preview` branch.
5. Rebuild binaries only for native-level changes.

## 5) Promote to production launch

When stable:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Then submit to stores:

```bash
eas submit --platform android
eas submit --platform ios
```

---

Owner account currently linked: `@aktheraja01`
