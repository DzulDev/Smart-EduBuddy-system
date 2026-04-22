# Smart EduBuddy - System Architecture

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SMART EDUBUDDY SYSTEM                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│   TEACHER DEVICE         │         │  CLASSROOM DISPLAY       │
│   (Phone / Laptop)       │         │  (Laptop → HDMI → TV)    │
│                          │         │                          │
│ ┌──────────────────────┐ │         │ ┌──────────────────────┐ │
│ │  teacher-panel.html  │ │         │ │     index.html       │ │
│ │                      │ │         │ │                      │ │
│ │  • Choose mode       │ │         │ │  • Show questions    │ │
│ │  • Enter name        │ │         │ │  • Countdown         │ │
│ │  • Start session     │ │         │ │  • Feedback overlay  │ │
│ │  • Next Category btn │ │         │ │  • Category scores   │ │
│ │  • End / Reset       │ │         │ │  • Final score       │ │
│ └──────────┬───────────┘ │         │ └──────────┬───────────┘ │
│            │             │         │            │             │
│ ┌──────────────────────┐ │         └────────────┼─────────────┘
│ │ question-builder.html│ │                      │
│ │  (laptop only)       │ │                      │
│ │  • Add categories    │ │                      │
│ │  • Add/edit questions│ │                      │
│ │  • Upload images     │ │                      │
│ │  → saves localStorage│ │                      │
│ └──────────────────────┘ │                      │
└──────────┬───────────────┘                      │
           │ WiFi (WebSocket)                     │ WiFi (WebSocket)
           │                                      │
           └─────────────────┬────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │      MQTT BROKER         │
              │  broker.hivemq.com:8884  │
              │  (public cloud broker)   │
              └──────────────┬───────────┘
                             │
                             │ WiFi (TCP port 1883)
                             ▼
              ┌──────────────────────────┐
              │    ESP32 FIRMWARE        │
              │  smart_edubuddy.ino      │
              │                          │
              │  Reads:                  │
              │  • 4 push buttons A-D    │
              │  • MFRC522 RFID reader   │
              │                          │
              │  Publishes raw events:   │
              │  BTN_A/B/C/D or card UID │
              └──────────────────────────┘
```

---

## Access Links (Cloudflare Pages)

| Page | Who Uses It | URL |
|---|---|---|
| Student Display | Open on laptop → plug HDMI cable to TV | https://smart-edubuddy-system.pages.dev/ |
| Teacher Panel | Teacher's phone or laptop | https://smart-edubuddy-system.pages.dev/teacher-panel.html |
| Question Builder | Laptop only (same device as Student Display) | https://smart-edubuddy-system.pages.dev/question-builder.html |

---

## MQTT Topics

| Topic | Direction | Payload |
|---|---|---|
| `edubuddy/answer` | ESP32 → dashboard | `BTN_A`…`BTN_D` or uppercase hex card UID |
| `edubuddy/status` | ESP32 → dashboard | `online` (retained) |
| `edubuddy/session/start` | teacher → dashboard | JSON: `{"name":"Ali","startCategory":"color","mode":"test"}` |
| `edubuddy/session/end` | teacher → dashboard | any — force-ends session |
| `edubuddy/control/next_category` | teacher → dashboard | any — advances to next category |
| `edubuddy/control/reset_leaderboard` | teacher → dashboard | any — wipes leaderboard |

---

## Session Flow

```
Teacher Panel                  Dashboard (TV)               ESP32

[Pick mode + category]
[Click Start]
      │
      ├── publish session/start ──────────────►
                                      │
                              [Load question bank]
                              [Build category list]
                              [Show countdown 3-2-1-GO]
                              [Show question on TV]
                                      │
                                      │◄── BTN_A/B/C/D or card UID ──── [Student answers]
                                      │
                              [Show feedback ✓/✗]
                              [Next question or...]
                              [Category scoreboard]
                                      │
[Click Next Category]
      │
      ├── publish next_category ───────────────►
                                      │
                              [Countdown for next cat]
                              [... repeat ...]
                              [Final score screen]
```

---

## Question Types

| Type | Input Device | TV Shows | Use For |
|---|---|---|---|
| MCQ | 4 buttons (A/B/C/D) | Question + 4 options | Multiple choice |
| TF | 2 RFID cards (A/B) | Question + 2 card labels | True/False, Yes/No |
| Card Hunt | Up to 5 RFID cards | Question only (no options) | Find the right card |

---

## Two Game Modes

| Feature | Learning Mode | Test Mode |
|---|---|---|
| Student name | Not required | Required |
| Top 3 leaderboard | Hidden | Shown |
| Final score | Shown | Shown |
| Category advance | Manual (teacher) | Manual (teacher) |

---

## Custom Question Bank

```
question-builder.html          localStorage           dashboard.js
  (on laptop)                 (laptop only)

[Add category] ─────────────► [save JSON] ◄────── [load on session start]
[Add questions]
[Upload images]
[Save All]
```

The question builder saves to `localStorage` on the laptop. The dashboard reads from `localStorage` on every session start. If no custom questions are found, it falls back to `questions.json`.

---

## Hardware Connection (ESP32)

```
ESP32 Dev Module
┌──────────────────────────────────────────┐
│                                          │
│  GPIO 5  (SDA/SS) ──────── MFRC522 SDA  │
│  GPIO 18 (SCK)    ──────── MFRC522 SCK  │
│  GPIO 23 (MOSI)   ──────── MFRC522 MOSI │
│  GPIO 19 (MISO)   ──────── MFRC522 MISO │
│  GPIO 22 (RST)    ──────── MFRC522 RST  │
│  3V3              ──────── MFRC522 3.3V │
│  GND              ──────── MFRC522 GND  │
│                                          │
│  GPIO 25 ── Button A (→ GND)            │
│  GPIO 26 ── Button B (→ GND)            │
│  GPIO 27 ── Button C (→ GND)            │
│  GPIO 32 ── Button D (→ GND)            │
│  GPIO 2  ── Built-in LED (status)       │
│                                          │
└──────────────────────────────────────────┘
```

---

## Physical Classroom Layout

```
┌─────────────────────────────────────┐
│         [TV / PROJECTOR]            │
│     Shows student questions         │
└──────────────┬──────────────────────┘
               │ HDMI
        ┌──────┴──────┐
        │   Laptop    │  Runs index.html + question-builder.html
        └─────────────┘

  ╔══════════════════════════════════╗
  ║   Students in semi-circle        ║
  ║         facing screen            ║
  ╚══════════════════════════════════╝
                   │
          ┌────────┴────────┐
          │  ESP32 Station  │  ← Students approach one at a time
          │  RFID reader    │
          │  4 buttons      │
          └─────────────────┘

                              ┌────────────┐
                              │  Teacher   │
                              │   Phone    │  Runs teacher-panel.html
                              └────────────┘
```

---

## Software Stack

```
Browser (Dashboard / Teacher Panel / Builder)
├── Vanilla HTML + CSS + JavaScript (no framework, no build step)
├── mqtt.js (CDN) — WebSocket MQTT client
└── Web Audio API — synthesized sound effects

ESP32 Firmware
├── Arduino C++
├── MFRC522 library — RFID card reading
└── PubSubClient library — MQTT over TCP

Cloud
└── JSONBin.io — leaderboard persistence (Test mode only)
```

---

*Designed for simplicity and reliability in low-resource classrooms. ~RM 60 total hardware cost.*
