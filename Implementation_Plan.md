# RFID/NFC Smart Authentication System — Implementation Plan

## Project Summary

Build a complete **distributed IoT authentication platform**: an ESP32 edge device reads RFID cards, validates them against a Node.js backend over WiFi, and a React dashboard provides real-time management. Phase 1 (card UID reading) is already done.

---

## Current State

| Area | Status |
|------|--------|
| ESP32 + RC522 wiring | ✅ Working (SPI, GPIO 5/18/23/19/22) |
| Card UID reading | ✅ Working (`A7 BB 97 31` confirmed) |
| WiFi integration | ❌ Not started |
| Backend API | ❌ Not started |
| Frontend dashboard | ❌ Not started |
| Database | ❌ Not started |
| LED/Buzzer feedback | ❌ Not started |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Firmware** | C++ / Arduino IDE 1.8.19 | Already set up, ESP32 board package installed |
| **Backend** | Node.js + Express.js + TypeScript | User's primary skill set |
| **Database** | MongoDB (Mongoose ODM) | Flexible schema for IoT data, user is experienced |
| **Real-time** | Socket.IO | Live dashboard updates on card taps |
| **Frontend** | React + Vite + TypeScript | Fast dev experience, user knows React |
| **Styling** | Vanilla CSS (dark theme) | Premium look, no framework dependency |
| **Auth** | JWT (jsonwebtoken) | Dashboard admin login |
| **Device Comm** | HTTP REST (ESP32 → Backend) | Simple, reliable for ESP32 HTTPClient |

---

## Repository Folder Structure

All code lives in `c:\Users\j7654\WorkStation\Internet_of_Things\rfid_reader\`.

```
rfid_reader/
├── plan.md                    # (existing) Architecture notes
├── context.md                 # (existing) Hardware context
├── README.md                  # [NEW] Project overview + setup guide
│
├── firmware/                  # [NEW] ESP32 Arduino code
│   ├── rfid_auth/
│   │   ├── rfid_auth.ino      # Main sketch (setup + loop)
│   │   ├── config.h           # WiFi SSID/password, backend URL, pin defs
│   │   ├── wifi_manager.h     # WiFi connect/reconnect helpers
│   │   ├── wifi_manager.cpp
│   │   ├── rfid_reader.h      # MFRC522 read UID helpers
│   │   ├── rfid_reader.cpp
│   │   ├── api_client.h       # HTTP POST to backend
│   │   ├── api_client.cpp
│   │   ├── led_buzzer.h       # LED + buzzer feedback
│   │   └── led_buzzer.cpp
│   └── README.md              # Firmware setup + upload instructions
│
├── backend/                   # [NEW] Node.js Express API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.ts           # Express app bootstrap + Socket.IO
│   │   ├── config/
│   │   │   └── db.ts          # MongoDB connection
│   │   ├── models/
│   │   │   ├── User.ts        # name, email, role, cardUID, isActive
│   │   │   ├── AccessLog.ts   # uid, userId, deviceId, status, timestamp
│   │   │   └── Device.ts      # deviceId, location, status, lastSeen
│   │   ├── routes/
│   │   │   ├── card.routes.ts # /api/cards/validate, /api/cards/register
│   │   │   ├── user.routes.ts # CRUD users
│   │   │   ├── log.routes.ts  # Access log queries
│   │   │   ├── device.routes.ts # Device management
│   │   │   └── auth.routes.ts # Admin login/JWT
│   │   ├── controllers/
│   │   │   ├── card.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── log.controller.ts
│   │   │   ├── device.controller.ts
│   │   │   └── auth.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts  # JWT verification
│   │   │   └── device.middleware.ts # Device API key check
│   │   ├── services/
│   │   │   ├── card.service.ts
│   │   │   └── socket.service.ts  # Socket.IO event emitters
│   │   └── utils/
│   │       └── logger.ts
│   └── README.md
│
├── frontend/                  # [NEW] React + Vite dashboard
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css          # Global dark theme + design tokens
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx      # Live activity feed
│   │   │   ├── Cards.tsx          # Card management
│   │   │   ├── Users.tsx          # User ↔ card mapping
│   │   │   ├── AccessLogs.tsx     # History table
│   │   │   ├── Devices.tsx        # ESP32 status
│   │   │   ├── WriteCard.tsx      # Card data write UI
│   │   │   └── Login.tsx          # Admin login
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LiveFeed.tsx       # Real-time card tap events
│   │   │   ├── StatusBadge.tsx
│   │   │   └── DataTable.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts       # Socket.IO hook
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── api.ts             # Axios/fetch wrapper
│   │   └── store/
│   │       └── authStore.ts       # Simple context or zustand
│   └── README.md
│
└── docs/                      # [NEW] Wiring diagrams, API docs
    ├── wiring.md
    └── api-reference.md
```

---

## Database Schema (MongoDB)

### Users Collection

```js
{
  _id: ObjectId,
  name: String,           // "Junaid Ahmad"
  email: String,          // unique
  role: String,           // "admin" | "employee" | "visitor"
  cardUID: String,        // "A7BB9731" — unique, nullable
  isActive: Boolean,      // soft disable access
  createdAt: Date,
  updatedAt: Date
}
```

### Access Logs Collection

```js
{
  _id: ObjectId,
  uid: String,            // card UID
  userId: ObjectId | null,// linked user (null if unknown card)
  deviceId: String,       // "gate-01"
  status: String,         // "authorized" | "denied" | "unknown"
  timestamp: Date
}
```

### Devices Collection

```js
{
  _id: ObjectId,
  deviceId: String,       // "gate-01" — unique
  name: String,           // "Main Entrance"
  location: String,
  apiKey: String,         // device auth token
  status: String,         // "online" | "offline"
  lastSeen: Date
}
```

---

## API Endpoints

### Device → Backend (ESP32 calls these)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| `POST` | `/api/cards/validate` | Validate a card tap | Device API Key |

**Request:**
```json
{ "uid": "A7BB9731", "deviceId": "gate-01", "timestamp": 1748100000 }
```
**Response:**
```json
{ "authorized": true, "action": "GREEN_LED", "message": "Access Granted", "userName": "Junaid" }
```

### Dashboard → Backend (Frontend calls these)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/login` | Admin login → JWT |
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |
| `POST` | `/api/cards/register` | Assign card UID to user |
| `GET` | `/api/logs` | Get access logs (paginated) |
| `GET` | `/api/devices` | List devices |
| `PUT` | `/api/devices/:id` | Update device info |

### Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `card:tap` | Server → Client | `{ uid, status, userName, deviceId, timestamp }` |
| `device:status` | Server → Client | `{ deviceId, status }` |

---

## Hardware Setup

### Current Wiring (Already Working)

| RC522 Pin | ESP32 Pin |
|-----------|-----------|
| SDA | GPIO 5 |
| SCK | GPIO 18 |
| MOSI | GPIO 23 |
| MISO | GPIO 19 |
| RST | GPIO 22 |
| GND | GND |
| 3.3V | 3V3 |

### New Additions for Phase 5

| Component | ESP32 Pin | Purpose |
|-----------|-----------|---------|
| Green LED (+) | GPIO 2 | Access granted indicator |
| Red LED (+) | GPIO 4 | Access denied indicator |
| Buzzer (+) | GPIO 15 | Audio feedback |
| LED/Buzzer GND | GND (via 220Ω resistor for LEDs) |

> [!IMPORTANT]
> Each LED needs a **220Ω current-limiting resistor** in series. The buzzer can connect directly if it's an active buzzer (has built-in oscillator).

---

## Phased Implementation

### Phase 2 — ESP32 WiFi Integration

**Goal:** ESP32 connects to WiFi and stays connected.

**Files to create:**
- `firmware/rfid_auth/config.h` — WiFi credentials + pin definitions
- `firmware/rfid_auth/wifi_manager.h/.cpp` — connect, reconnect, status LED
- `firmware/rfid_auth/rfid_auth.ino` — updated main sketch

**What to do:**
1. Create `config.h` with `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_URL` defines
2. Write `wifi_manager` module: `connectWiFi()` blocks until connected, prints IP
3. In `setup()`: init Serial → init SPI → init MFRC522 → call `connectWiFi()`
4. In `loop()`: check WiFi status, auto-reconnect if dropped, then read cards

**Arduino Libraries:** `WiFi.h` (built into ESP32 board package)

**How to verify:** Upload sketch → open Serial Monitor at 115200 → confirm "WiFi connected, IP: 192.168.x.x" appears → tap card → UID still prints

---

### Phase 3 — ESP32 Sends UID to Backend

**Goal:** On card tap, ESP32 POSTs the UID to the backend API.

**Files to create:**
- `firmware/rfid_auth/api_client.h/.cpp` — HTTP POST with JSON body
- `firmware/rfid_auth/rfid_reader.h/.cpp` — encapsulate MFRC522 logic

**What to do:**
1. Write `api_client`: uses `HTTPClient` + `ArduinoJson` to POST `{ uid, deviceId, timestamp }` to `BACKEND_URL/api/cards/validate`
2. Parse JSON response for `authorized` and `action` fields
3. Refactor card reading into `rfid_reader` module
4. In `loop()`: read card → send to backend → print response

**Arduino Libraries:** `HTTPClient.h`, `ArduinoJson` (install via Library Manager, v7.x)

**How to verify:** Start backend (Phase 4) first, or use a mock endpoint (e.g., webhook.site). Tap card → Serial shows HTTP 200 + response JSON.

---

### Phase 4 — Backend API (Core)

**Goal:** Fully functional Node.js backend that validates cards, manages users, logs access.

**What to do:**

1. **Initialize project:**
   ```bash
   cd rfid_reader/backend
   npm init -y
   npm install express mongoose dotenv cors socket.io jsonwebtoken bcryptjs
   npm install -D typescript @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs ts-node-dev
   npx tsc --init
   ```

2. **Create MongoDB connection** (`src/config/db.ts`): connect to `mongodb://localhost:27017/rfid_auth`

3. **Create Mongoose models** (`src/models/`): User, AccessLog, Device — matching schemas above

4. **Create card validation endpoint** (`POST /api/cards/validate`):
   - Receive `{ uid, deviceId, timestamp }`
   - Verify device API key from `x-api-key` header
   - Look up `uid` in Users collection
   - If found + active → log "authorized", return `{ authorized: true, action: "GREEN_LED" }`
   - If not found → log "unknown", return `{ authorized: false, action: "RED_LED" }`
   - Emit `card:tap` Socket.IO event to dashboard

5. **Create CRUD routes** for users, devices, logs

6. **Create auth routes**: admin login → bcrypt password check → return JWT

7. **Create middleware**: JWT verify for dashboard routes, API key verify for device routes

8. **Set up Socket.IO** alongside Express on same port

9. **Create `.env.example`**:
   ```
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/rfid_auth
   JWT_SECRET=your-secret-here
   DEVICE_API_KEY=esp32-secret-key
   ```

**How to verify:** `npm run dev` → use Postman/curl to POST to `/api/cards/validate` with test UID → get proper response → check MongoDB for logged entry.

---

### Phase 5 — LED + Buzzer Response System

**Goal:** ESP32 physically responds to backend authorization result.

**Files to create:**
- `firmware/rfid_auth/led_buzzer.h/.cpp` — GPIO control for LEDs + buzzer

**Hardware to wire:**
- Green LED → GPIO 2 (+ 220Ω resistor)
- Red LED → GPIO 4 (+ 220Ω resistor)
- Buzzer → GPIO 15

**What to do:**
1. Define pin constants in `config.h`
2. Write `led_buzzer` module:
   - `initIndicators()` — set pin modes
   - `showGranted()` — green LED on, short beep, hold 2s, off
   - `showDenied()` — red LED on, long beep, hold 2s, off
   - `showError()` — both LEDs blink (WiFi/API error)
3. In `loop()`: after API response, call appropriate feedback function

**How to verify:** Tap registered card → green LED + short beep. Tap unknown card → red LED + long beep. Disconnect WiFi → error blink pattern.

---

### Phase 6 — React Dashboard (Foundation)

**Goal:** Admin dashboard with dark theme, sidebar navigation, and core pages.

**What to do:**

1. **Initialize project:**
   ```bash
   cd rfid_reader/frontend
   npx -y create-vite@latest ./ -- --template react-ts
   npm install react-router-dom socket.io-client axios
   ```

2. **Build design system** (`index.css`):
   - Dark theme with CSS custom properties
   - Color palette: deep navy background (`#0a0e1a`), electric blue accents (`#3b82f6`), emerald green for granted (`#10b981`), rose red for denied (`#ef4444`)
   - Glassmorphism cards, smooth transitions, Inter font from Google Fonts

3. **Create layout**: Sidebar (collapsible) + Header + main content area

4. **Create pages** (with routing):
   - **Login** — JWT auth form
   - **Dashboard** — summary stats cards (total users, today's scans, active devices) + live feed placeholder
   - **Cards** — table of registered cards with assign/unassign
   - **Users** — CRUD user management table
   - **Access Logs** — paginated, filterable log table
   - **Devices** — device status cards with online/offline indicators

5. **Create API service** (`services/api.ts`): Axios instance with JWT interceptor, base URL from env

6. **Create auth store**: React Context or Zustand for JWT token + user info

**How to verify:** `npm run dev` → opens at `localhost:5173` → can navigate all pages → login flow works → data loads from backend.

---

### Phase 7 — Card Registration Panel

**Goal:** Dashboard UI to register new cards and assign them to users.

**What to do:**
1. Add "Register New Card" button on Cards page
2. Create modal/form: select user from dropdown → enter card UID manually (or show "waiting for tap" if real-time tap capture is connected)
3. POST to `/api/cards/register` with `{ uid, userId }`
4. Backend associates `cardUID` on the User document
5. Show success/error toast notification

**How to verify:** Register a card UID via dashboard → tap that card on ESP32 → get green LED.

---

### Phase 8 — Real-Time Monitoring

**Goal:** Live card tap events appear instantly on the dashboard.

**What to do:**
1. **Backend**: On every card validation, emit Socket.IO event `card:tap` with full details
2. **Frontend**: Create `useSocket` hook — connects to backend Socket.IO
3. **LiveFeed component**: renders a scrolling list of card tap events with:
   - User avatar/name (or "Unknown Card")
   - Status badge (Granted / Denied / Unknown)
   - Device location
   - Timestamp
   - Smooth slide-in animation for new events
4. **Device heartbeat**: ESP32 sends periodic ping → backend updates `lastSeen` → emits `device:status`
5. **Dashboard page**: Embed LiveFeed, update stat counters in real-time

**How to verify:** Open dashboard → tap card on ESP32 → event appears on dashboard within 1 second.

---

### Phase 9 — Card Writing Support

**Goal:** Write custom data blocks to MIFARE Classic cards from the dashboard.

> [!WARNING]
> MIFARE Classic has limited memory (1KB). Only write minimal identifiers. Keep actual identity data in the backend.

**What to do:**
1. **Backend**: Add `POST /api/cards/write` endpoint that queues a write command
2. **ESP32**: Add write mode — when backend flags a pending write, ESP32 writes data to card sector
3. **Frontend**: "Write Card" page — input fields for data to write, button to trigger, progress indicator
4. Write data format: short encoded string (e.g., employee ID) into card block 4

**How to verify:** Initiate write from dashboard → tap card on ESP32 → data written → read back confirms.

---

## NPM Dependencies Summary

### Backend (`backend/package.json`)

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `mongoose` | MongoDB ODM |
| `socket.io` | Real-time events |
| `jsonwebtoken` | Dashboard auth |
| `bcryptjs` | Password hashing |
| `cors` | Cross-origin for frontend |
| `dotenv` | Environment config |
| `typescript` | Type safety (dev) |
| `ts-node-dev` | Hot reload (dev) |

### Frontend (`frontend/package.json`)

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Page routing |
| `socket.io-client` | Real-time events |
| `axios` | HTTP client |
| `react-icons` | UI icons |

---

## Arduino Libraries Summary

| Library | Install Method | Purpose |
|---------|---------------|---------|
| `WiFi.h` | Built-in (ESP32 package) | WiFi connectivity |
| `HTTPClient.h` | Built-in (ESP32 package) | HTTP requests |
| `SPI.h` | Built-in | SPI communication |
| `MFRC522` | Already installed (miguelbalboa/rfid) | RFID reader |
| `ArduinoJson` | Arduino Library Manager → v7.x | JSON serialize/deserialize |

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| UID cloning | UID is lookup key only; backend is source of truth for authorization |
| ESP32 → Backend | Device API key in `x-api-key` header; HTTPS in production |
| Dashboard access | JWT auth with bcrypt passwords; token expiry |
| MongoDB | Auth enabled in production; network-restricted |
| Card data | Minimal data on card; sensitive info stays in DB |

---

## Verification Plan

### Automated / CLI Tests
- Backend: `curl` / Postman requests to all API endpoints
- Validate card flow end-to-end: ESP32 tap → backend → response → LED

### Integration Test Sequence
1. Start MongoDB locally
2. Start backend (`npm run dev` in `backend/`)
3. Start frontend (`npm run dev` in `frontend/`)
4. Upload firmware to ESP32 via Arduino IDE
5. Register a test user + card via dashboard
6. Tap card → verify green LED + dashboard live feed update
7. Tap unregistered card → verify red LED + "unknown" log entry

### Manual Verification
- Visual check: dashboard dark theme, animations, responsive layout
- Hardware check: LED brightness, buzzer volume, WiFi reconnect behavior

---

## Open Questions

> [!IMPORTANT]
> **WiFi Network**: What SSID and password should be configured? Will the ESP32 be on the same LAN as the dev machine running the backend?

> [!IMPORTANT]
> **MongoDB**: Do you already have MongoDB installed locally, or should we use MongoDB Atlas (cloud)? 

> [!NOTE]
> **Device ID**: Should we hardcode `"gate-01"` as the device ID for now, or do you want a more dynamic device provisioning flow?

> [!NOTE]
> **Dashboard Auth**: Do you want a simple single-admin login for now, or multi-user role-based access from the start?
