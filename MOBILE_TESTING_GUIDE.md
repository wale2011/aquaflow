# 📱 How to Test AquaFlow on Your Phone — Beginner Guide

No experience needed! Follow these steps and you'll have the app running on your phone in ~5 minutes.

---

## Step 1 — Install "Expo Go" on Your Phone

**Expo Go** is a free app that lets you run React Native apps during development — no App Store submission needed yet.

- **iPhone (iOS):** https://apps.apple.com/app/expo-go/id982107779
- **Android:** https://play.google.com/store/apps/details?id=host.exp.exponent

Install it now, then come back here.

---

## Step 2 — Open Port 80 on AWS (One-Time Setup)

Your API is running on the server but port 80 is blocked. Fix it:

1. Open this link: https://us-east-2.console.aws.amazon.com/ec2/home?region=us-east-2#SecurityGroups:
2. Click **`launch-wizard-1`**
3. Click the **"Inbound rules"** tab
4. Click **"Edit inbound rules"**
5. Click **"Add rule"** and set:
   - Type: **HTTP**
   - Port: **80**
   - Source: **Anywhere-IPv4** (0.0.0.0/0)
6. Click **"Add rule"** again and set:
   - Type: **HTTPS**
   - Port: **443**
   - Source: **Anywhere-IPv4** (0.0.0.0/0)
7. Click **"Save rules"**

Test it worked: open http://3.131.201.220/api/health in your browser. You should see JSON.

---

## Step 3 — Start the Expo Development Server

Open a **new terminal** in VS Code (Terminal → New Terminal) and run:

```bash
cd aquaflow/mobile
npx expo start
```

After 10-15 seconds you'll see:
- A **QR code** printed in the terminal
- Something like: `Metro waiting on exp://192.168.x.x:8081`

---

## Step 4 — Open the App on Your Phone

**On iPhone:**
1. Open the iPhone **Camera app**
2. Point it at the QR code in your terminal
3. Tap the yellow banner that appears
4. Expo Go opens and loads AquaFlow ✅

**On Android:**
1. Open the **Expo Go** app
2. Tap **"Scan QR Code"**
3. Scan the QR code in your terminal
4. AquaFlow loads ✅

---

## Step 5 — Log In and Test

Use these test accounts:

| Role | Email | Password |
|------|-------|----------|
| 🧑 Client | amara@test.com | password123 |
| 🚛 Driver | chukwudi@test.com | password123 |

**Try as a Client:**
1. Login → Home dashboard
2. Tap "Find Drivers" → see 3 drivers in Lagos
3. Tap a driver → "Book Now"
4. Fill in address, date, time → confirm booking

**Try as a Driver:**
1. Login → Driver dashboard
2. See pending bookings
3. Tap "Accept" on a booking
4. Update status → "On My Way" → "Mark Delivered"

---

## ⚠️ Common Issues

**App can't connect to server:**
- Make sure port 80 is open in AWS (Step 2)
- Check http://3.131.201.220/api/health in your browser first

**QR code not scanning:**
- Make sure your phone and computer are on the same WiFi
- Or press `w` in the Expo terminal to try in a web browser instead

**App crashes on startup:**
- Run `npx expo start --clear` to clear cache

---

## 🌐 Alternative — Test in Browser

If you just want to quickly see the app in a browser (limited mobile features):

```bash
cd aquaflow/mobile
npx expo start --web
```

Then open http://localhost:19006 in Chrome.

---

## 📲 When Ready for Real App Store Publishing

When you're happy with the app and want to publish to Google Play Store and Apple App Store:

1. Create a free account at https://expo.dev
2. Install EAS CLI: `npm install -g eas-cli`
3. Run: `eas build --platform android` (for Google Play)
4. Run: `eas build --platform ios` (for Apple App Store)

This creates the actual `.apk` / `.ipa` files for submission.

---

*AquaFlow — Water Delivery App for Lagos, Nigeria 🇳🇬*
