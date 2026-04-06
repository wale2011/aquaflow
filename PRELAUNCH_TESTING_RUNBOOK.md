# AquaFlow Pre-Launch Testing Runbook

This runbook lets you:
- ship installable test apps to friends
- keep adding features during testing via OTA updates
- prepare for App Store / Play Store launch cleanly

## 1) Current setup status

- EAS project linked in [`mobile/app.json`](mobile/app.json)
- EAS Build profiles configured in [`mobile/eas.json`](mobile/eas.json)
- EAS Update configured (`updates.url` + `runtimeVersion`) in [`mobile/app.json`](mobile/app.json)
- iOS export compliance key configured (`ITSAppUsesNonExemptEncryption: false`) in [`mobile/app.json`](mobile/app.json)

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
eas build --platform ios --profile ios_preview
```

- iOS preview uses a store-distribution build profile for TestFlight delivery.
- First iOS build must be run interactively so EAS can create/select Apple credentials.
- Distribute through TestFlight (required for external iOS testers).

#### iOS first-time credential setup (one-time)

From [`mobile`](mobile):

```bash
eas build --platform ios --profile ios_preview
```

During prompts:
- Sign in to Apple Developer account.
- Let EAS generate/manage distribution certificate and provisioning profile.
- Continue with build submission to EAS.

If you run in non-interactive mode before credentials exist, you will get:
- "Couldn't find any credentials suitable for ..."

## 2.1) iOS tester prerequisites

- Apple Developer Program membership is required for TestFlight distribution.
- Testers install through Apple TestFlight app on iPhone/iPad.
- Windows can start cloud iOS builds with EAS, but cannot run iOS Simulator locally.

## 2.2) iOS build troubleshooting (common blockers)

- If you see "Run this command inside a project directory", run builds from [`aquaflow/mobile`](aquaflow/mobile) and not from your home folder.
- If you see "You are not registered as an Apple Developer" or "You have no team associated with your Apple account", your Apple ID is not enrolled in the paid Apple Developer Program or has no team access.
- If Apple login works but build still fails at credentials, verify Apple agreements are accepted in App Store Connect and the Apple Developer portal.

Use this command from [`aquaflow/mobile`](aquaflow/mobile):

```bash
npx eas-cli build --platform ios --profile ios_preview
```

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
