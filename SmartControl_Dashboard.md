# Full Dashboard Configuration System — Implementation Plan

## Goal

Build a complete dashboard with **three major new sections** that let you manage your entire IoT ecosystem from the browser:

1. **🏠 Smart Home Actions** — Create, edit, test-fire, and monitor smart home actions
2. **📡 ESP32 Device Config** — View/push WiFi settings, pin config, firmware status, remote reboot
3. **💳 NFC Card Read/Write** — Real-time card detection, block-level data view, and write data to cards

All built within the existing React + Vite + TypeScript frontend, using the established dark theme design system.

---

## Current State

| Component | Status | Files |
|-----------|--------|-------|
| Frontend framework | ✅ Built | App.tsx, Sidebar, 6 pages, design system |
| Smart Home API | ✅ Built | `/api/actions/*` endpoints ready |
| ESP32 config API | ❌ Not built | Need new endpoints |
| NFC write API | ❌ Not built | Need new endpoints + firmware changes |
| Socket.IO | ✅ Partial | `card:tap` and `device:status` exist, need more events |

---

## What's Possible vs. What Needs New Backend/Firmware

### ✅ Can build NOW (backend API already exists)

| Feature | Page | Backend Endpoint |
|---------|------|-----------------|
| List/create/edit/delete smart actions | Smart Home | `GET/POST/PUT/DELETE /api/actions` |
| Dynamic provider config forms | Smart Home | `GET /api/actions/providers` returns config schemas |
| Test-fire an action | Smart Home | `POST /api/actions/:id/test` |
| Action execution logs | Smart Home | `GET /api/actions/logs` |
| Real-time action results | Smart Home | Socket.IO `action:executed` already emitting |
| Provider browser (see all providers + supported actions) | Smart Home | `GET /api/actions/providers` |

### ⚠️ Needs new backend endpoints (no firmware changes)

| Feature | Page | What's Needed |
|---------|------|---------------|
| ESP32 device config view/edit | ESP32 Config | New `DeviceConfig` model + CRUD API |
| Config push to ESP32 | ESP32 Config | New Socket.IO event `device:config-update` or HTTP long-poll on ESP32 |
| Device heartbeat details | ESP32 Config | Extend existing Device model with metadata |
| Device reboot command | ESP32 Config | New `POST /api/devices/:id/reboot` endpoint |

### ⚠️ Needs backend + firmware changes

| Feature | Page | What's Needed |
|---------|------|---------------|
| Real-time card UID capture ("Tap to register") | Cards / NFC | ESP32 → WebSocket bidirectional channel |
| NFC card block read/display | NFC Read/Write | Firmware: read all blocks → POST to backend |
| NFC card write | NFC Read/Write | Backend queues write → ESP32 polls for pending writes → executes |
| ESP32 live serial monitor | ESP32 Config | ESP32 → WebSocket log forwarding |
| OTA firmware update | ESP32 Config | ESP32 OTA library + backend file hosting |

---

## Architecture Decision

> [!IMPORTANT]
> **ESP32 ↔ Backend Communication Upgrade**
> 
> The current ESP32 only does one-way HTTP POSTs. For real-time card capture, NFC write, and config push, we need a **bidirectional channel**. Two options:
> 
> **Option A: WebSocket on ESP32** — ESP32 maintains a persistent WebSocket connection to the backend. Backend can push commands (write card, reboot, update config) instantly. ✅ Recommended — lower latency, true real-time.
> 
> **Option B: HTTP polling** — ESP32 periodically polls `GET /api/devices/gate-01/commands` for pending commands. Simpler firmware, but ~1-3s delay. Good enough for card write and config, not ideal for real-time capture.
> 
> I'll implement **Option A (WebSocket)** for the firmware, with **Option B as fallback** in case WebSocket causes memory issues on ESP32.

---

## Proposed Changes

### Phase 1: Smart Home Actions Page (Frontend Only — APIs Already Exist)

This is the biggest, most impactful page and can be built immediately.

---

#### [NEW] [SmartActions.tsx](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/pages/SmartActions.tsx)

Full-featured action management page with:

**Main View:**
- Action cards grid showing all configured actions
- Each card shows: name, provider icon/badge, trigger type, target card/user, enabled toggle, last executed time
- Filter bar: by provider, by card UID, by trigger type, enabled/disabled
- "Create Action" button → opens the create modal

**Create/Edit Modal:**
- Step 1: Select provider from grid of provider cards (with icons)
- Step 2: Select action type (dropdown filtered by provider's `supportedActions`)
- Step 3: Dynamic config form — **rendered from `getConfigSchema()`** returned by the API. Each field type (`string`, `number`, `boolean`, `select`, `json`) gets the appropriate input widget
- Step 4: Bind to card UID or user (dropdown), select trigger type, set priority/cooldown
- Step 5: Preview + save

**Action Card Actions:**
- Toggle enabled/disabled (inline PUT)
- Test fire (with loading spinner + result toast)
- Edit (opens modal pre-filled)
- Delete (with confirmation)
- View execution log (filtered to this action)

**Real-time Panel:**
- Bottom strip or side panel showing live `action:executed` Socket.IO events
- Shows: action name, provider, status (✅/❌), duration, timestamp

---

#### [NEW] [ActionLogs.tsx](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/pages/ActionLogs.tsx)

Dedicated page for action execution history (can also be a tab within SmartActions):
- Paginated table with: timestamp, action name, provider, card UID, user, status (success/failed/skipped), error message, duration
- Filters: by provider, status, card UID, date range
- Auto-refresh on new `action:executed` Socket.IO events

---

#### [MODIFY] [api.ts](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/services/api.ts)

Add `actionsAPI` section:
```typescript
export const actionsAPI = {
  getAll: (params?) => api.get('/actions', { params }),
  getById: (id) => api.get(`/actions/${id}`),
  create: (data) => api.post('/actions', data),
  update: (id, data) => api.put(`/actions/${id}`, data),
  delete: (id) => api.delete(`/actions/${id}`),
  testFire: (id) => api.post(`/actions/${id}/test`),
  getProviders: () => api.get('/actions/providers'),
  getLogs: (params?) => api.get('/actions/logs', { params }),
};
```

---

#### [MODIFY] [useSocket.ts](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/hooks/useSocket.ts)

Add `action:executed` event listener + `actionEvents` state array.

---

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/components/Sidebar.tsx)

Add nav items:
- "Smart Home" (with lightning bolt icon `HiOutlineLightningBolt`)
- "NFC Tools" (with identification icon `HiOutlineIdentification`) — Phase 3
- "ESP32 Config" (with cog icon `HiOutlineCog`) — Phase 2

---

#### [MODIFY] [App.tsx](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/App.tsx)

Add routes:
```tsx
<Route path="/smart-home" element={<SmartActions />} />
<Route path="/action-logs" element={<ActionLogs />} />
<Route path="/esp32-config" element={<Esp32Config />} />   // Phase 2
<Route path="/nfc-tools" element={<NfcTools />} />          // Phase 3
```

---

#### [NEW] [components/DynamicConfigForm.tsx](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/components/DynamicConfigForm.tsx)

Reusable component that takes a provider's `configSchema` (array of `ConfigField`) and renders the appropriate form inputs. This is the key to the pluggable architecture — when you add a new provider to the backend, the frontend automatically renders its config form without any code changes.

Field type → UI mapping:
- `string` → text input
- `number` → number input with min/max
- `boolean` → toggle switch
- `select` → dropdown
- `json` → code editor textarea with validation

---

#### [MODIFY] [index.css](file:///c:/Users/j7654/WorkStation/Internet_of_Things/rfid_reader/frontend/src/index.css)

Add CSS for:
- Provider card grid (icon + name + badge)
- Toggle switch component
- Action card with status indicator
- Toast notifications (success/error)
- Tab navigation
- Step wizard indicators
- JSON editor textarea styling

---

### Phase 2: ESP32 Device Configuration Page

> [!IMPORTANT]
> This phase requires **backend API additions** and **firmware changes** for full functionality. The dashboard UI can be built first with the read-only device info that already exists, then enhanced as backend/firmware features are added.

---

#### What the page shows:

**Device Overview Cards:**
- Device name, location, device ID
- Online/offline status with live dot
- Last seen timestamp
- WiFi signal strength (RSSI) — needs firmware reporting
- Free heap memory — needs firmware reporting
- Firmware version — needs firmware reporting
- Uptime — needs firmware reporting

**Configuration Panel (read-only initially, writable with firmware upgrade):**
- WiFi SSID (display only — can't push WiFi creds safely)
- Backend URL
- Device ID
- Pin assignments (RC522, LEDs, buzzer)
- Timing config (cooldown, LED duration, etc.)

**Device Commands:**
- Reboot device
- Flash LED (identify device)
- Request status update

---

#### Backend changes needed:

#### [NEW] `POST /api/devices/:id/command` 
Queues a command for the ESP32 to pick up. Commands: `reboot`, `identify`, `status-report`, `update-config`.

#### [MODIFY] Device model
Add fields: `firmwareVersion`, `wifiRSSI`, `freeHeap`, `uptime`, `config`.

#### [MODIFY] Card validation endpoint
Have ESP32 send device metadata (RSSI, heap, uptime) with every card validation request, stored on the Device document.

---

#### Firmware changes needed:

#### [MODIFY] `rfid_auth.ino`
- Report RSSI, heap, uptime in validation request body
- Poll for pending commands every N seconds (or via WebSocket)
- Execute reboot/identify commands

---

### Phase 3: NFC Card Read/Write Page

> [!WARNING]  
> This is the most complex phase because it requires **bidirectional real-time communication** between the dashboard and the ESP32 (via the backend as relay).

---

#### What the page does:

**Read Mode:**
1. User clicks "Start Scanning" on dashboard
2. Backend sends `scan-mode` command to ESP32 via WebSocket/polling
3. ESP32 reads card → sends full card data (UID + all readable blocks) to backend
4. Backend relays to dashboard via Socket.IO
5. Dashboard displays: UID, card type (MIFARE Classic/Ultralight), memory map, block contents (hex + ASCII)

**Write Mode:**
1. User enters data to write (text or hex) and target block number
2. Dashboard sends write request to backend API
3. Backend queues write command for ESP32
4. ESP32 picks up command, prompts "Tap card now" (LED blinks)
5. Card tapped → ESP32 writes data → reports success/failure
6. Dashboard shows result in real-time

**Card Info Display:**
- UID (hex, big font)
- Card type (MIFARE Classic 1K, 4K, Ultralight, etc.)
- SAK / ATQA values
- Sector map visualization (16 sectors × 4 blocks for MIFARE 1K)
- Block contents in hex grid with ASCII sidebar
- Highlight writable vs. read-only blocks

---

#### Backend changes needed:

#### [NEW] `POST /api/nfc/scan` — Put ESP32 into scan mode
#### [NEW] `POST /api/nfc/write` — Queue a write command
#### [NEW] `GET /api/nfc/pending/:deviceId` — ESP32 polls for pending NFC commands
#### [NEW] Socket.IO events: `nfc:card-data`, `nfc:write-result`, `nfc:scan-status`

---

#### Firmware changes needed:

#### [NEW] NFC full-read mode — read all accessible blocks, send as JSON
#### [NEW] NFC write mode — receive block + data, authenticate sector, write
#### [NEW] Command polling — check backend for pending commands periodically

---

## File Structure (All Phases)

```
frontend/src/
├── pages/
│   ├── Dashboard.tsx         (existing)
│   ├── Users.tsx             (existing)
│   ├── Cards.tsx             (existing)
│   ├── AccessLogs.tsx        (existing)
│   ├── Devices.tsx           (existing, enhanced in Phase 2)
│   ├── Login.tsx             (existing)
│   ├── SmartActions.tsx      [NEW] Phase 1 — Action management
│   ├── ActionLogs.tsx        [NEW] Phase 1 — Execution history
│   ├── Esp32Config.tsx       [NEW] Phase 2 — Device configuration
│   └── NfcTools.tsx          [NEW] Phase 3 — Card read/write
├── components/
│   ├── Sidebar.tsx           [MODIFY] — Add new nav items
│   ├── Sidebar.css           (existing)
│   ├── DynamicConfigForm.tsx [NEW] Phase 1 — Provider config renderer
│   ├── ActionCard.tsx        [NEW] Phase 1 — Action display card
│   ├── ProviderBadge.tsx     [NEW] Phase 1 — Provider icon/name badge
│   ├── Toast.tsx             [NEW] Phase 1 — Notification toasts
│   ├── ToggleSwitch.tsx      [NEW] Phase 1 — Toggle component
│   ├── NfcBlockGrid.tsx      [NEW] Phase 3 — Memory block visualizer
│   └── DeviceMetrics.tsx     [NEW] Phase 2 — Device stats display
├── hooks/
│   ├── useAuth.tsx           (existing)
│   ├── useSocket.ts          [MODIFY] — Add action + NFC events
│   └── useToast.ts           [NEW] Phase 1 — Toast notification hook
├── services/
│   └── api.ts                [MODIFY] — Add actions, device config, NFC APIs
└── index.css                 [MODIFY] — Add new component styles
```

---

## Implementation Order

> [!IMPORTANT]
> **I recommend building Phase 1 first** — it's 100% frontend-only (all APIs exist), highest impact, and demonstrates the pluggable architecture. Phases 2 and 3 require firmware + backend additions and can follow later.

### Phase 1: Smart Home Dashboard (frontend only) — ~15 files
1. Add `actionsAPI` to api.ts
2. Add `action:executed` event to useSocket.ts
3. Build Toast component + useToast hook
4. Build ToggleSwitch component
5. Build ProviderBadge component
6. Build DynamicConfigForm component
7. Build ActionCard component
8. Build SmartActions page (main page with grid + create/edit modal)
9. Build ActionLogs page
10. Update Sidebar navigation
11. Update App.tsx routes
12. Add CSS for all new components

### Phase 2: ESP32 Config (needs backend changes) — ~8 files
### Phase 3: NFC Tools (needs backend + firmware) — ~10 files

---

## Open Questions

> [!IMPORTANT]
> **Phase scope**: Should I build **only Phase 1** now (Smart Home page — all APIs ready), or do you want me to include Phase 2 and 3 stubs (pages that show "Coming Soon" placeholders with the sidebar nav already in place)?

> [!NOTE]
> **Card registration flow**: Currently the Cards page requires manually typing the UID. The "Tap to Register" feature (dashboard tells ESP32 to capture next card UID and auto-fill it) is part of Phase 3's bidirectional communication. Want to prioritize this?

> [!NOTE]
> **Toast vs. Alert**: The current app uses browser `alert()` for errors. Should I replace all existing alerts with the new Toast component while I'm at it?

---

## Verification Plan

### Phase 1 Verification
1. `cd frontend && npm run dev` → opens at localhost:5173
2. Navigate to "Smart Home" page
3. See list of available providers (Mock, Webhook, WiZ, Hue, Tuya, Kasa)
4. Create a mock action → fill dynamic config form → save
5. Test-fire the action → see result toast + live feed update
6. Toggle action enabled/disabled
7. View action execution logs
8. Verify real-time: tap card on ESP32 → action executes → dashboard shows live result

### Build Verification
```bash
cd frontend && npm run build  # Verify production build succeeds
```

---
Edited Wiz_Integration.md
Viewed Wiz_Integration.md:52-68

This is a major feature — let me first understand exactly what your frontend currently looks like, then I'll lay out what's possible and create a plan.

Listed directory src
Listed directory pages
Listed directory components
Listed directory hooks
Listed directory services
Viewed App.tsx:1-52
Viewed api.ts:1-75
Viewed useSocket.ts:1-49
Viewed Sidebar.tsx:1-56
Viewed Dashboard.tsx:1-86

Let me check the remaining pages and the CSS design system:

Viewed Devices.tsx:1-52
Viewed Cards.tsx:1-100
Viewed index.css:1-779

Now let me also check the backend for any existing ESP32 config or NFC write endpoints:

Viewed useAuth.tsx:1-62
Viewed package.json:1-24

Now I have a complete picture. Let me create a thorough implementation plan.

Edited implementation_plan.md

Here's the summary of what I found and proposed:

## 📊 Three Dashboard Phases

| Phase | What | APIs Ready? | Firmware Change? |
|-------|------|-------------|-----------------|
| **Phase 1: Smart Home** | Action CRUD, dynamic config forms, test-fire, live execution feed | ✅ All exist | ❌ None needed |
| **Phase 2: ESP32 Config** | Device metrics (RSSI, heap, uptime), remote reboot, pin config | ⚠️ Needs new endpoints | ⚠️ Minor firmware additions |
| **Phase 3: NFC Read/Write** | Real-time card scanning, block-level data view, write to card | ⚠️ Needs new endpoints | ⚠️ Significant firmware work |

**The key architectural piece** is the `DynamicConfigForm` component — it reads the config schema from each provider's `getConfigSchema()` API and auto-renders the right form fields. So when you add a new provider to the backend, the dashboard immediately supports it with zero frontend code changes.

The plan is in the artifact — please review and let me know how you'd like to proceed. I recommend starting with **Phase 1** since all APIs are already built and it gives you the most immediate value.