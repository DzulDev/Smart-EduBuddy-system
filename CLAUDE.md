# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Smart EduBuddy** is a low-cost (~RM 60) IoT educational system for early childhood education (ages 3–7). A student plays a quiz across custom categories using an ESP32 with 4 push buttons and RFID cards as input. The teacher controls sessions from a web panel, and the classroom display (TV) shows questions, feedback, and (in Test mode) a Top 3 leaderboard.

The system is **not** a build-tooled app — there is no `package.json`, no bundler, no npm scripts. It consists of an Arduino sketch flashed to hardware and static HTML/JS files served from a simple local web server (Live Server). Communication between hardware and browsers happens through a public MQTT broker (HiveMQ by default).

## Architecture

```
┌─────────────────────────┐         MQTT          ┌─────────────────────────┐
│  ESP32 + MFRC522 RFID   │ ────────────────────▶ │   Teacher Panel         │
│  + 4 push buttons       │                        │  teacher-panel.html     │
│  smart_edubuddy.ino     │ ◀──────────────────── │  (phone/laptop)         │
└─────────────────────────┘                        └─────────────────────────┘
            │                                                  │
            │                                                  ▼
            │                                       ┌─────────────────────────┐
            └──────────────────────────────────────▶│   Student Display       │
                                                    │  index.html             │
                                                    │  (laptop → HDMI → TV)   │
                                                    └─────────────────────────┘

                                       ┌─────────────────────────┐
                                       │   Question Builder       │
                                       │  question-builder.html   │
                                       │  saves → JSONBin (cloud) │
                                       │  + localStorage (cache)  │
                                       └─────────────────────────┘
```

**Key principle:** the firmware is *dumb*. It only publishes raw input events. The web dashboard owns all game logic (questions, scoring, state machine, leaderboard).

## Two Game Modes

| Feature | Learning Mode | Test Mode |
|---|---|---|
| Student name | Not required | Required |
| Top 3 leaderboard | Hidden | Shown after each category + final |
| Final score | Shown | Shown |
| Category advance | Manual (teacher MQTT signal) | Manual (teacher MQTT signal) |

## Session Flow

1. Teacher picks mode (Learning/Test), optionally enters student name, picks starting category in `teacher-panel.html`, clicks Start
2. Teacher panel publishes `edubuddy/session/start` with `{name, startCategory, mode}`
3. Dashboard reloads question bank from the cloud (custom, JSONBin), falling back to this device's localStorage, then `questions.json` (default)
4. Student display shows a 3-2-1-GO countdown
5. Student plays through all questions in the current category (count = `questions[cat].length`)
6. After each category, a scoreboard appears — **waits for teacher to publish `edubuddy/control/next_category`**
7. Teacher taps "Next Category" button in teacher panel → dashboard advances
8. After all categories, final score screen appears
9. Test mode only: Top 3 leaderboard shown after each category and at the end

## Question Types

- **MCQ (4 options)** — student presses one of buttons A/B/C/D. Firmware publishes `BTN_A`/`BTN_B`/`BTN_C`/`BTN_D`. Options are shuffled each session.
- **TF (2 cards)** — student taps one of 2 RFID cards. Dashboard maps UID → `'A'` or `'B'` via `TF_CARD_MAP`. Meaning of each card is defined per-question.
- **Card Hunt (up to 5 cards)** — TV shows only the question text (no options). Student finds and taps the correct physical card. Dashboard maps UID → `'CARD1'`…`'CARD5'` via `TF_CARD_MAP`. No changes needed to firmware.

## MQTT Topics

| Topic | Direction | Payload |
|---|---|---|
| `edubuddy/answer` | ESP32 → dashboard | `BTN_A`..`BTN_D` or uppercase hex card UID |
| `edubuddy/status` | ESP32 → dashboard | `online` (retained) |
| `edubuddy/session/start` | teacher → dashboard | JSON: `{"name":"Ali","startCategory":"color","mode":"test"}` |
| `edubuddy/session/end` | teacher → dashboard | any — force-ends session |
| `edubuddy/control/next_category` | teacher → dashboard | any — advances to next category |
| `edubuddy/control/reset_leaderboard` | teacher → dashboard | any — wipes leaderboard |

Input filtering by state:
- MCQ state: only `BTN_A`..`BTN_D` accepted
- TF state: only card UIDs mapping to `'A'`/`'B'` accepted
- Card Hunt state: only card UIDs mapping to `'CARD1'`..`'CARD5'` accepted
- All other states: all input ignored

## Question Bank

### Storage

Custom questions are **cloud-synced via JSONBin** (separate bin from the leaderboard, `QUESTIONS_BIN_ID`/`QUESTIONS_BIN_KEY`/`QUESTIONS_BIN_URL` constants — duplicated in `dashboard.js`, `teacher-panel.js`, and `question-builder.html` since there are no shared modules). The cloud bin is the **source of truth**: every device (Question Builder laptop, Teacher Panel laptop, Student Display TV) loads the same bank regardless of its own `localStorage`.

- **Question Builder** (`saveAll()`) writes to the cloud bin (PUT) and also caches to `localStorage['edubuddy_custom_questions']` for offline editing. On load, it fetches the cloud bank first; if the cloud is empty/unreachable it falls back to localStorage → `questions.json`, and **migrates** any local-only bank up to the cloud automatically.
- **Dashboard** (`loadQuestionBank()`, called fresh on every `session/start`) fetches the cloud bank first, then falls back to its own localStorage, then `questions.json`.
- **Teacher Panel** (`loadCategoryOptions()`) fetches the cloud bank to populate the starting-category dropdown, with the same localStorage fallback.

This means the Question Builder, Teacher Panel, and Student Display **no longer need to be on the same device** — the cloud bin keeps them in sync. `localStorage` now only matters as an offline cache/fallback if JSONBin is unreachable.

`questions.json` (the bundled default fallback) is currently `{}` (emptied in a prior cleanup) — it's the last-resort fallback only, used if the cloud is unreachable AND no device has a local cache.

### Format

Top-level keys are category names (any string, not hardcoded). Each category is an array of question objects.

**MCQ:**
```json
{
  "type": "mcq",
  "q": "What color is an apple?",
  "options": ["Blue", "Red", "Green", "Yellow"],
  "correct": "B",
  "image": "data:image/png;base64,..."
}
```
`options` is 4 strings (A/B/C/D order). `correct` is `"A"`/`"B"`/`"C"`/`"D"`. `image` is optional base64 data URL.

**TF:**
```json
{
  "type": "tf",
  "q": "The sky is blue.",
  "optionA": "True",
  "optionB": "False",
  "correctCard": "A",
  "image": null
}
```
`optionA`/`optionB` are labels shown on screen for this question. `correctCard` is `"A"` or `"B"`.

**Card Hunt:**
```json
{
  "type": "card",
  "q": "Which card shows a dog?",
  "correctCard": "CARD1",
  "image": null
}
```
`correctCard` is `"CARD1"`…`"CARD5"`. No options shown on TV.

## Directory Layout

```
.
├── firmware/
│   ├── smart_edubuddy/smart_edubuddy.ino   # Main ESP32 firmware (RFID + 4 buttons → MQTT)
│   └── button_test/button_test.ino         # Hardware diagnostic sketch
├── web-dashboard/
│   ├── index.html + dashboard.js           # Student-facing display (TV)
│   ├── teacher-panel.html + teacher-panel.js  # Teacher session manager
│   ├── question-builder.html               # Custom question editor (laptop only)
│   └── questions.json                      # Default question bank (fallback)
├── config/
│   └── broker-info.txt                     # MQTT broker setup + alternatives
├── docs/
│   ├── HARDWARE_GUIDE.md                   # ESP32 wiring, card setup
│   └── SYSTEM_DIAGRAM.md                   # Architecture diagrams
├── GUIDE_ME.md                             # User-facing how-to guide
├── .vscode/settings.json                   # Live Server → 0.0.0.0:5501 for LAN access
└── CLAUDE.md                               # This file
```

## Hardware (ESP32)

| Component | ESP32 GPIO | Notes |
|---|---|---|
| RFID SDA / SS | 5 | SPI chip select |
| RFID SCK | 18 | SPI clock |
| RFID MOSI | 23 | SPI data out |
| RFID MISO | 19 | SPI data in |
| RFID RST | 22 | Reset |
| RFID 3.3V | 3V3 | **NOT 5V** — MFRC522 is 3.3V only |
| RFID GND | GND | |
| Button A | 25 | Active-low, INPUT_PULLUP, other leg → GND |
| Button B | 26 | Active-low, INPUT_PULLUP, other leg → GND |
| Button C | 27 | Active-low, INPUT_PULLUP, other leg → GND |
| Button D | 32 | Active-low, INPUT_PULLUP, other leg → GND |
| Status LED | 2 | Built-in LED on most ESP32 dev boards |

**Pins to AVOID on ESP32:** GPIO 0, 2, 12, 15 (boot strap), 6–11 (flash), 34–39 (input-only, no internal pull-up).

## RFID Card Setup (one-time)

**TF cards (2):** enroll as `'A'` and `'B'` in `TF_CARD_MAP`.
**Card Hunt cards (up to 5):** enroll as `'CARD1'`…`'CARD5'` in `TF_CARD_MAP`.

```js
const TF_CARD_MAP = {
    'DEADBEEF': 'A',       // TF Card A (blue)
    'CAFE1234': 'B',       // TF Card B (red)
    'HUNT1UID': 'CARD1',   // Hunt Card 1
    'HUNT2UID': 'CARD2',   // Hunt Card 2
    // ...
    // Simulator (keyboard) — do not remove:
    'SIM_CARD_A': 'A', 'SIM_CARD_B': 'B',
    'SIM_CARD_1': 'CARD1', ... 'SIM_CARD_5': 'CARD5'
};
```

## Common Commands

No build/test/lint commands.

### Upload firmware
```
1. Open firmware/smart_edubuddy/smart_edubuddy.ino in Arduino IDE
2. Tools → Board → ESP32 Dev Module
3. Tools → Port → [your COM port]
4. Edit ssid / password (~line 36–37)
5. Click Upload
```
Required libraries: `MFRC522`, `PubSubClient`, ESP32 board package.

### Run the dashboards
```
VS Code: right-click web-dashboard/index.html → Open with Live Server
         (port 5501, bound to 0.0.0.0 for LAN access)

Python:  cd web-dashboard && python -m http.server 8000
```

### Switching MQTT brokers
Update **three** locations: `smart_edubuddy.ino` (TCP), `dashboard.js` (WSS), `teacher-panel.js` (WSS).

## Working on this codebase

- **Vanilla everything.** No frameworks, no build step, no TypeScript. Edit HTML/JS/INO directly and reload.
- **Four files to keep in sync** when topics or input contracts change: `.ino`, `dashboard.js`, `teacher-panel.js`, `question-builder.html`.
- **Firmware is a thin input layer.** Never add game logic to the firmware. All logic lives in `dashboard.js`.
- **Categories are dynamic.** Do not hardcode category names anywhere in `dashboard.js`. Use `getCategoryOrder()` and `getCategoryDisplay(cat)`.
- **Question bank reloads on every session start.** `loadQuestionBank()` is called inside the `session/start` handler, not just at boot.
- **Question bank is cloud-synced via JSONBin** (`QUESTIONS_BIN_*` constants — separate bin from the leaderboard, fixed 2026-06-08 so the Question Builder, Teacher Panel, and Student Display stay in sync across devices without relying on shared `localStorage`). The cloud bin is the source of truth; `localStorage` and `questions.json` are offline fallbacks only. When changing question-bank load/save logic, update all three: `dashboard.js` (`loadQuestionBank`), `teacher-panel.js` (`loadCategoryOptions`), `question-builder.html` (`init`/`saveAll`).
- **Leaderboard uses JSONBin.** Cloud-persisted (separate bin from questions — `JSONBIN_*` constants). Keys are dynamic category names + `'overall'`. Don't assume fixed keys.
- **TF_CARD_MAP placeholder UIDs** will not match any real card. Don't "fix" them — call them out if they look unset.
- **Mode affects rendering.** Always check `session.mode` before rendering leaderboard or student name. Learning mode hides both.
- **TF answer cards (`.tf-card`) are intentionally colour-neutral** (white background, black border) — don't re-add blue/red colour-coding to `card-a`/`card-b`. Color-coded answer boxes confuse kids during colour-category questions.
- **Top 3 leaderboard rows render as a 4-column table** (`renderTop3` in `dashboard.js` → `.top3-row`/`.top3-header` grid: Rank | Name | Score | Time). Keep Score and Time as separate columns/spans — don't concatenate them back into one string.
- **Public broker caveat.** Default `broker.hivemq.com` is shared. For real deployment, namespace topics (e.g. `edubuddy_school123/...`).
- **Target audience is 3–7 year olds and non-technical teachers.** Large fonts, high contrast, plain language in all user-facing strings.
