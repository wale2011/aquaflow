# 💧 AquaFlow – Water Tanker Delivery App

> **AquaFlow** connects water tanker drivers with clients across Lagos, Nigeria. Clients can book one-time deliveries or subscribe to recurring water delivery plans. Drivers manage their schedule, accept bookings and track their earnings — all from a mobile app.

---

## 🏗️ Project Structure

```
aquaflow/
├── backend/          # Node.js + Express REST API
│   ├── routes/       # Auth, Drivers, Bookings, Subscriptions, Notifications, Users
│   ├── middleware/   # JWT Auth, Validation
│   ├── scripts/      # Database seeder
│   ├── database.js   # SQLite schema & init
│   └── server.js     # Express app entry
│
└── mobile/           # React Native (Expo) App
    ├── app/
    │   ├── (auth)/   # Welcome, Login, Register screens
    │   ├── (client)/ # Home, Drivers, Bookings, Subscriptions, Profile
    │   └── (driver)/ # Home, Bookings, Availability, Earnings, Profile
    ├── context/      # Auth context (JWT management)
    ├── services/     # Axios API client
    └── constants/    # Colors, Config, Lagos LGAs
```

---

## 🚀 Quick Start (Local Testing)

### 1. Backend Setup

```bash
cd aquaflow/backend
npm install
cp .env.example .env        # edit as needed
npm start                   # starts on port 5000
```

**Seed test data:**
```bash
node scripts/seed.js
```

**Test the API:**
```
GET http://localhost:5000/api/health
```

### 2. Mobile App Setup

```bash
cd aquaflow/mobile
npm install
npx expo start
```

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with **Expo Go** app for physical device

---

## 📱 Features

### Client App
- ✅ Register & Login (with Nigerian phone validation)
- ✅ Browse available water tanker drivers by LGA
- ✅ View driver profile, ratings, reviews & schedule
- ✅ Book a one-time delivery
- ✅ Subscribe to recurring delivery (daily/weekly/biweekly/monthly)
- ✅ Track booking status (pending → confirmed → en route → delivered)
- ✅ Rate & review drivers after delivery
- ✅ Manage subscriptions (pause/cancel/resume)
- ✅ Dashboard with stats and upcoming deliveries

### Driver App
- ✅ Register with tanker details & pricing
- ✅ Toggle availability on/off
- ✅ Set weekly schedule (hours per day, max bookings)
- ✅ Accept/decline booking requests
- ✅ Update delivery status (confirmed → en route → delivered)
- ✅ View all bookings with client contact info
- ✅ Track earnings and ratings
- ✅ Edit service areas, pricing, bio

---

## 🧪 Test Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Client | amara@test.com | password123 |
| Client | emeka@test.com | password123 |
| Driver | chukwudi@test.com | password123 |
| Driver | babatunde@test.com | password123 |
| Driver | ngozi@test.com | password123 |

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register client or driver |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/drivers` | ✅ | List available drivers (filter by LGA) |
| GET | `/api/drivers/:id` | ✅ | Driver profile + reviews + schedule |
| PUT | `/api/drivers/profile` | ✅ Driver | Update driver profile |
| POST | `/api/drivers/availability` | ✅ Driver | Set weekly schedule |
| POST | `/api/bookings` | ✅ Client | Book a delivery |
| GET | `/api/bookings` | ✅ | Get my bookings |
| PUT | `/api/bookings/:id/status` | ✅ | Update booking status |
| POST | `/api/bookings/:id/review` | ✅ Client | Rate a delivery |
| POST | `/api/subscriptions` | ✅ Client | Create subscription plan |
| GET | `/api/subscriptions` | ✅ | Get subscriptions |
| PUT | `/api/subscriptions/:id` | ✅ Client | Pause/cancel subscription |
| GET | `/api/notifications` | ✅ | Get notifications |
| GET | `/api/users/dashboard` | ✅ | Dashboard stats |

---

## 📲 Mobile Configuration

Edit [`aquaflow/mobile/constants/config.js`](mobile/constants/config.js):

```js
// For Android emulator:
export const API_BASE_URL = 'http://10.0.2.2:5000/api';

// For iOS simulator:
export const API_BASE_URL = 'http://localhost:5000/api';

// For physical device (use your machine's local IP):
export const API_BASE_URL = 'http://192.168.x.x:5000/api';
```

---

## 🏪 App Store / Play Store Deployment

### Prerequisites
- Expo account: https://expo.dev
- EAS CLI: `npm install -g eas-cli`

### Build for Android (APK/AAB)
```bash
cd aquaflow/mobile
eas build --platform android
```

### Build for iOS (IPA)
```bash
eas build --platform ios
```

### Submit to Stores
```bash
eas submit --platform android  # Google Play Store
eas submit --platform ios      # Apple App Store
```

Update `app.json` with your:
- `ios.bundleIdentifier`: e.g. `com.aquaflow.lagos`
- `android.package`: e.g. `com.aquaflow.lagos`
- `extra.eas.projectId`: from Expo dashboard

---

## 🖥️ Production Deployment (Backend)

### Option A: Railway (Recommended)
1. Push `aquaflow/backend/` to GitHub
2. Create project at https://railway.app
3. Add environment variables from `.env.example`
4. Deploy

### Option B: VPS (Ubuntu)
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Clone and install
git clone <your-repo>
cd aquaflow/backend && npm install --production

# PM2 process manager
npm install -g pm2
pm2 start server.js --name aquaflow-api
pm2 save && pm2 startup
```

### Option C: Render
- Free tier available at https://render.com
- Set build command: `npm install`
- Set start command: `node server.js`

---

## 🏘️ Lagos LGAs Supported

All 20 Lagos Local Government Areas are supported:
Agege, Ajeromi-Ifelodun, Alimosho, Amuwo-Odofin, Apapa, Badagry, Epe, Eti-Osa, Ibeju-Lekki, Ifako-Ijaiye, Ikeja, Ikorodu, Kosofe, Lagos Island, Lagos Mainland, Mushin, Ojo, Oshodi-Isolo, Shomolu, Surulere

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (jsonwebtoken) |
| Mobile | React Native (Expo SDK 51) |
| Navigation | Expo Router (file-based) |
| HTTP Client | Axios |
| Push Notifications | Expo Notifications |
| Build/Deploy | EAS Build (Expo) |

---

## 📞 Support

For production issues or feature requests:
- Email: support@aquaflow.ng
- Lagos, Nigeria 🇳🇬

---

*AquaFlow v1.0.0 — Built for Lagos, Nigeria*
