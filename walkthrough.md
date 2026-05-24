# RFID/NFC Smart Auth System — Build Walkthrough

## What Was Built

The entire system has been scaffolded across **3 layers** — all compiling cleanly.

---

### 🔧 Firmware (ESP32 + Arduino) — 10 files

| File | Purpose |
|------|---------|
| `rfid_auth.ino` | Main sketch — boot → WiFi → card read loop → API validate → LED feedback |
| `config.h` | All config in one place: WiFi creds, backend URL, pin definitions, timings |
| `wifi_manager.h/.cpp` | Connect with timeout, auto-reconnect in loop |
| `rfid_reader.h/.cpp` | MFRC522 init + read UID as clean hex string |
| `api_client.h/.cpp` | HTTP POST to backend with ArduinoJson, returns `ValidationResponse` struct |
| `led_buzzer.h/.cpp` | Green LED + short beep (granted), red + long beep (denied), blink (error) |

### 🖥️ Backend (Node.js + Express + TypeScript) — 17 source files

| Area | Files |
|------|-------|
| **Entry** | `src/index.ts` — Express + Socket.IO + admin seed |
| **Config** | `src/config/db.ts` — MongoDB Atlas connection |
| **Models** | `User.ts`, `AccessLog.ts`, `Device.ts` |
| **Controllers** | `card`, `user`, `log`, `device`, `auth` controllers |
| **Routes** | 5 route files with proper middleware |
| **Middleware** | JWT auth + device API key |
| **Services** | Socket.IO emitter service |
| **Utils** | Logger |

**Build:** `tsc --noEmit` passes with **0 errors**.

### 🎨 Frontend (React + Vite + TypeScript) — 14 source files

| Area | Files |
|------|-------|
| **Design** | `index.css` — 580+ line dark theme design system with glassmorphism |
| **Pages** | Login, Dashboard (live feed), Users (CRUD), Cards (register), Access Logs (paginated), Devices |
| **Components** | Sidebar with gradient branding |
| **Hooks** | `useSocket` (real-time events), `useAuth` (JWT context) |
| **Services** | `api.ts` — Axios with JWT interceptor |

**Build:** `vite build` — 121 modules, **0 errors**, 342KB JS (109KB gzipped).

---

## What You Need To Do Next

### 1. Provide MongoDB Atlas Connection String
Edit `backend/.env` and replace `<your-atlas-connection-string>` with your Atlas URI.

### 2. Start the Backend
```bash
cd backend
npm run dev
```
This will auto-seed an admin user (`admin@rfidauth.local` / `admin123`) and the `gate-01` device.

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` → login with the seeded admin credentials.

### 4. Update ESP32 Config
Edit `firmware/rfid_auth/config.h`:
- Set your WiFi SSID and password
- Set `BACKEND_URL` to your machine's local IP (e.g., `http://192.168.1.100:3001`)

### 5. Install ArduinoJson Library
In Arduino IDE: **Sketch → Include Library → Manage Libraries → Search "ArduinoJson" → Install v7.x**

### 6. Upload Firmware
Open `firmware/rfid_auth/rfid_auth.ino` in Arduino IDE → select ESP32 Dev Module → Upload.

### 7. Wire LEDs + Buzzer (Optional for Phase 5)
- Green LED → GPIO 2 (+ 220Ω resistor)
- Red LED → GPIO 4 (+ 220Ω resistor)  
- Buzzer → GPIO 15
