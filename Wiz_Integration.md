Great choice! WiZ lights (including Havells WiZ) use a **local UDP protocol** on port 38899 — no cloud, no bridge, no API keys needed. Just the bulb's IP address on your LAN. Let me build the provider.

Created wiz.provider.ts

Now register it in the registry:

Edited registry.ts

Let me verify it compiles:

Ran command: `npx tsc --noEmit`

Clean compile. Now here's how to connect your Havells WiZ light:

---

## 🔌 Connecting Your Havells WiZ Light

### Step 1 — Find the bulb's IP address

You need the **local IP** of your WiZ bulb. Two ways to find it:

**Option A: WiZ App**
1. Open the WiZ app → tap your bulb → Settings (gear icon) → **About**
2. The IP address will be listed there (e.g., `192.168.1.105`)

**Option B: Router**
1. Log into your router admin panel (usually `192.168.1.1`)
2. Look at the DHCP client list / connected devices
3. Find the entry for the WiZ bulb

### Step 2 — Start the backend
```bash
cd backend
npm run dev
```

### Step 3 — Create the action

Once you have the IP, login and create the action:

```bash
# Login first
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@rfidauth.local", "password": "admin123"}'

# Create the action (replace <JWT> and <BULB_IP>)
curl -X POST http://localhost:3001/api/actions \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Toggle Havells WiZ Light",
    "cardUID": "A7BB9731",
    "trigger": "on_authorized",
    "provider": "wiz",
    "action": "toggle",
    "config": { "deviceIp": "<BULB_IP>" }
  }'
```

### Step 4 — Test it!

```bash
# Test-fire without card tap
curl -X POST http://localhost:3001/api/actions/<ACTION_ID>/test \
  -H "Authorization: Bearer <JWT>"
```

Your light should toggle! Then tap your RFID card and it'll work automatically. 💡

### Other cool things you can do:

| Action | Config |
|--------|--------|
| Toggle on/off | `"action": "toggle"` |
| Turn on at 50% brightness | `"action": "turn_on", "config": { "deviceIp": "...", "brightness": 50 }` |
| Warm white (2700K) | `"action": "set_color_temp", "config": { "deviceIp": "...", "colorTemp": 2700 }` |
| Set to red | `"action": "set_color", "config": { "deviceIp": "...", "r": 255, "g": 0, "b": 0 }` |
| Cozy scene | `"action": "set_scene", "config": { "deviceIp": "...", "sceneId": 6 }` |
| Night light scene | `"action": "set_scene", "config": { "deviceIp": "...", "sceneId": 14 }` |

The WiZ provider uses **local UDP** (port 38899) — no cloud, no latency, works even without internet! 🚀