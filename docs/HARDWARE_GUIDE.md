# Hardware Guide - Smart EduBuddy

## Required Components

| Component | Qty | Approx. Cost (RM) |
|---|---|---|
| ESP32 Dev Module | 1 | 15–20 |
| MFRC522 RFID Reader | 1 | 5–8 |
| Push Buttons (momentary) | 4 | 2–4 |
| RFID Cards (13.56MHz, ISO14443A) | 7+ | 5–10 |
| USB Micro/Type-C Cable | 1 | 3–5 |
| Jumper Wires (F-F / M-F) | 15+ | 3–5 |
| **Total** | | **~RM 33–52** |

### Optional
| Component | Purpose | Cost (RM) |
|---|---|---|
| Breadboard | Prototyping | 5–8 |
| Project box | Enclosure | 10–15 |
| Power bank | Portable power | 20–30 |

> **Use ESP32, not ESP8266.** The system needs 4 buttons + RFID simultaneously. ESP8266 can only support 2 buttons alongside RFID.

---

## ESP32 Pin Wiring

### MFRC522 RFID Reader

| MFRC522 Pin | ESP32 GPIO | Notes |
|---|---|---|
| SDA (SS) | GPIO 5 | SPI chip select |
| SCK | GPIO 18 | SPI clock |
| MOSI | GPIO 23 | SPI data out |
| MISO | GPIO 19 | SPI data in |
| RST | GPIO 22 | Reset |
| 3.3V | 3V3 | **NOT 5V** — MFRC522 is 3.3V only! |
| GND | GND | |
| IRQ | — | Not used |

### 4 Push Buttons (MCQ)

| Button | ESP32 GPIO | Wiring |
|---|---|---|
| Button A | GPIO 25 | One leg → GPIO 25, other leg → GND |
| Button B | GPIO 26 | One leg → GPIO 26, other leg → GND |
| Button C | GPIO 27 | One leg → GPIO 27, other leg → GND |
| Button D | GPIO 32 | One leg → GPIO 32, other leg → GND |

All buttons use `INPUT_PULLUP` — no resistors needed.

### Status LED

| LED | ESP32 GPIO |
|---|---|
| Built-in LED | GPIO 2 (most ESP32 dev boards) |

---

## Wiring Diagram

```
ESP32 Dev Module
┌──────────────────────────────────────────────┐
│                                              │
│  3V3 ──── Red ──────────────── MFRC522 3.3V │
│  GND ──── Black ────────────── MFRC522 GND  │
│  GPIO 5  ──── Blue  ────────── MFRC522 SDA  │
│  GPIO 18 ──── Yellow ────────── MFRC522 SCK  │
│  GPIO 23 ──── Orange ────────── MFRC522 MOSI │
│  GPIO 19 ──── Green  ────────── MFRC522 MISO │
│  GPIO 22 ──── Purple ────────── MFRC522 RST  │
│                                              │
│  GPIO 25 ──┐  Button A                      │
│  GPIO 26 ──┤  Button B  (other leg → GND)   │
│  GPIO 27 ──┤  Button C                      │
│  GPIO 32 ──┘  Button D                      │
│                                              │
└──────────────────────────────────────────────┘
```

---

## ⚠️ Important Warnings

```
❌ DO NOT connect MFRC522 to 5V — it will be damaged!
✅ ALWAYS use 3.3V

❌ AVOID these ESP32 GPIO pins:
   GPIO 0, 2, 12, 15  → boot strap pins (can prevent boot)
   GPIO 6–11          → internal flash (do not use)
   GPIO 34–39         → input-only, no internal pull-up

✅ Buttons use INPUT_PULLUP — no external resistors needed
```

---

## Assembly Steps

1. **Ground first** — MFRC522 GND → ESP32 GND
2. **Power** — MFRC522 3.3V → ESP32 3V3
3. **SPI lines** — SCK, MOSI, MISO, SDA, RST
4. **4 buttons** — one leg each to GPIO 25/26/27/32, other leg to GND
5. Verify all connections before powering on

---

## RFID Cards

### Cards Needed

| Purpose | Count | Description |
|---|---|---|
| TF questions | 2 | Two differently-coloured blank cards (e.g. blue + red) |
| Card Hunt questions | Up to 5 | Any blank cards, labelled by teacher (optional) |

### How to Label Cards

- Stick printed pictures on blank white RFID cards
- Use permanent markers and cover with clear tape
- For Card Hunt: label physically on the card itself (e.g. picture of an apple, banana, etc.) — the TV doesn't show options

### Enrolling Card UIDs (One-Time Setup)

1. Flash `firmware/smart_edubuddy/smart_edubuddy.ino`
2. Open Serial Monitor (115200 baud)
3. Tap each card → copy the printed UID (uppercase hex, no spaces)

**TF Cards — paste into `dashboard.js`:**
```js
const TF_CARD_MAP = {
    'YOUR_CARD_A_UID': 'A',   // e.g. 'AB12CD34'
    'YOUR_CARD_B_UID': 'B',
    ...
}
```

**Card Hunt Cards — same file:**
```js
    'YOUR_HUNT_CARD_1_UID': 'CARD1',
    'YOUR_HUNT_CARD_2_UID': 'CARD2',
    'YOUR_HUNT_CARD_3_UID': 'CARD3',
    'YOUR_HUNT_CARD_4_UID': 'CARD4',
    'YOUR_HUNT_CARD_5_UID': 'CARD5',
```

---

## Firmware Upload

```
1. Open firmware/smart_edubuddy/smart_edubuddy.ino in Arduino IDE
2. Tools → Board → ESP32 Dev Module
3. Tools → Port → [select your COM port]
4. Edit WiFi credentials (~line 36–37):
       const char* ssid     = "YOUR_WIFI_NAME";
       const char* password = "YOUR_WIFI_PASSWORD";
5. (Optional) Change MQTT broker (~line 40) if using private broker
6. Click Upload
```

Required Arduino libraries: `MFRC522`, `PubSubClient`, ESP32 board package.

---

## Hardware Testing

### Test 1 — Power
- Connect ESP32 via USB
- Both ESP32 and MFRC522 power LEDs should light up

### Test 2 — RFID Reader
- Upload firmware
- Open Serial Monitor (115200 baud)
- Tap a card → should print "Card detected" and UID

### Test 3 — Buttons
- Use the `button_test.ino` sketch in `firmware/button_test/`
- Press each button → Serial Monitor prints which button was pressed

### Test 4 — Full System
- Open dashboard (`index.html`) via Live Server
- Open teacher panel (`teacher-panel.html`)
- Start a Learning session — device dot should turn green
- Press buttons A/B/C/D → answers should register on TV

---

## Troubleshooting

| Problem | Fix |
|---|---|
| RFID not reading | Check 3.3V (not 5V), verify SPI wiring |
| Button not responding | Check GPIO pin and GND connection |
| WiFi not connecting | Use 2.4GHz network, check SSID/password |
| Card UID not recognised | Re-enrol card, paste correct UID into `TF_CARD_MAP` |
| Device dot red on dashboard | ESP32 not publishing `online` status — check MQTT connection |

---

## Power

```
USB 5V (phone charger or power bank)
       │
       ▼
  ESP32 module  (converts 5V → 3.3V internally)
       │
       │ 3.3V
       ▼
  MFRC522 RFID reader

Total draw:
  Idle:  ~80mA  (0.4W)
  Active: ~150mA (0.75W)
```

Minimum power source: 5V, 500mA. A standard phone charger or power bank works fine.

---

## Physical Setup in Classroom

```
┌─────────────────────────────────────┐
│         [TV / PROJECTOR]            │
└──────────────┬──────────────────────┘
               │ HDMI
        ┌──────┴──────┐
        │   Laptop    │  ← index.html + question-builder.html
        └─────────────┘

          Students in semi-circle

          ┌─────────────────┐
          │  ESP32 Box      │  ← students approach one at a time
          │  [RFID reader]  │
          │  [A][B][C][D]   │  ← 4 buttons
          └─────────────────┘

                        ┌────────────┐
                        │  Teacher   │
                        │  Phone     │  ← teacher-panel.html
                        └────────────┘
```

---

*Hardware cost ~RM 33–52. Designed for Malaysian primary school classrooms.*
