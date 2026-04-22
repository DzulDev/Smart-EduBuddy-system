# Smart EduBuddy — How To Use

A complete guide for teachers. No technical knowledge needed!

---

## What Is Smart EduBuddy?

Smart EduBuddy is a fun quiz game for young learners (ages 3–7).
Teachers can create **custom categories and questions**. Students answer using physical buttons and RFID cards.

---

## Three Pages You Need

| Page | Who Uses It | Link |
|---|---|---|
| Student Display | Shown on classroom TV — open on a laptop then plug HDMI cable from laptop to TV | https://smart-edubuddy-system.pages.dev/ |
| Teacher Panel | Teacher's phone or laptop | https://smart-edubuddy-system.pages.dev/teacher-panel.html |
| Question Builder | Teacher edits questions (laptop only) | https://smart-edubuddy-system.pages.dev/question-builder.html |

> **Note:** The Question Builder must be opened on the **same laptop as the Student Display** — they share browser storage (localStorage). Opening it on a different device will not affect the classroom session.

---

## Two Game Modes

| Feature | 📖 Learning Mode | 📝 Test Mode |
|---|---|---|
| Student name | Not required | Required |
| Leaderboard (Top 3) | Not shown | Shown after each category |
| Final score | Yes | Yes |
| Category switching | Manual (teacher) | Manual (teacher) |

---

## How To Start A Session (Teacher)

1. Open the **Teacher Panel** on your phone or laptop
2. Pick a mode: **Learning** or **Test**
3. *(Test mode only)* Type the student's name
4. Pick a **Starting Category** from the dropdown
5. Click **▶️ Start Session**
6. The student display will show a 3-2-1-GO countdown

---

## During The Game

- After all questions in a category are done, the **category scoreboard** appears
- Teacher taps **▶ Next Category / Final Score** in the Teacher Panel to advance
- After all categories, the **final score screen** appears
- *(Test mode)* Top 3 leaderboard is shown after each category and at the end

---

## How Students Answer

### MCQ Questions — 4 Buttons

Student presses one of the **4 buttons** on the ESP32 controller:

| Button | Choice |
|---|---|
| A | First option |
| B | Second option |
| C | Third option |
| D | Fourth option |

Options are shuffled every session so the correct answer is in a different position each time.

### True/False Questions — 2 RFID Cards

Student taps one of the **2 cards** on the RFID reader:

| Card | Choice |
|---|---|
| Blue Card (A) | First option (e.g. True, Yes) |
| Red Card (B) | Second option (e.g. False, No) |

The TV shows both options with their card labels.

### Card Hunt Questions — Up To 5 RFID Cards

Teacher prepares up to **5 physical RFID cards** (each card = one possible answer).
The TV shows **only the question** — no options on screen.
Student finds the correct card and taps it on the reader.

---

## Ending A Session (Teacher)

- Click **⏹ End Session** to go back to the waiting screen
- Click **🗑 Reset Leaderboard** to wipe all scores and start fresh

---

## Question Builder (Teacher — Laptop Only)

Open `question-builder.html` on the **same laptop as the dashboard** (they share storage).

### Creating Categories

1. Click **+ Add** in the left panel
2. Type a category name (e.g. `animals`, `science`)
3. Click the category to select it

### Adding Questions

1. Select a category → click **+ Add Question**
2. Fill in the editor:
   - **Type:** MCQ (4 buttons), TF (2 cards), or Card Hunt (up to 5 cards, no options on TV)
   - **Question Text:** what appears on the TV
   - **Image:** optional photo (max 500KB, shown above the question)
   - **Options/Answer:** depends on type (see below)
3. Click **✓ Save Question**
4. Click **💾 Save All Questions** when done

### Question Type Details

**MCQ:**
- Fill in options A, B, C, D
- Select which one is correct

**TF:**
- Fill in Card A label and Card B label (e.g. True/False, Yes/No)
- Select which card is correct

**Card Hunt:**
- Select which card number (Card 1–5) is the correct answer
- Teacher prepares the physical cards — no labels needed on screen

### Other Buttons

| Button | Action |
|---|---|
| ↩ Reset to Default | Restore built-in questions |
| 📤 Export JSON | Download questions as a backup file |
| 📥 Import JSON | Load questions from a file |

---

## Testing Without Hardware (Keyboard Simulator)

No ESP32? Use your keyboard on the dashboard page:

| Key | Action |
|---|---|
| `A` `B` `C` `D` | Simulate button press (MCQ) |
| `Q` | Simulate Card A tap (TF) |
| `W` | Simulate Card B tap (TF) |
| `1` `2` `3` `4` `5` | Simulate Hunt Card 1–5 tap (Card Hunt) |

A blue hint bar at the bottom of the screen shows the keys during each question.

---

## First Time Setup (One-Time Only)

### WiFi Setup (Firmware)

Open `firmware/smart_edubuddy/smart_edubuddy.ino` and edit:
```cpp
const char* ssid     = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```
Then re-upload to the ESP32.

### TF Card Enrollment (2 cards)

1. Flash firmware to ESP32
2. Open Arduino IDE Serial Monitor (115200 baud)
3. Tap each card → copy the printed UID
4. Paste into `dashboard.js` under `TF_CARD_MAP`:
```js
'YOUR_BLUE_CARD_UID': 'A',   // Card A
'YOUR_RED_CARD_UID':  'B',   // Card B
```

### Card Hunt Enrollment (up to 5 cards)

Same process — tap each hunt card, copy UIDs, paste into `dashboard.js`:
```js
'YOUR_HUNT_CARD_1_UID': 'CARD1',
'YOUR_HUNT_CARD_2_UID': 'CARD2',
'YOUR_HUNT_CARD_3_UID': 'CARD3',
'YOUR_HUNT_CARD_4_UID': 'CARD4',
'YOUR_HUNT_CARD_5_UID': 'CARD5',
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Student display shows "Waiting..." | Start a session from Teacher Panel |
| MQTT dot is red | Check internet connection |
| Device dot is red | ESP32 not connected to WiFi or MQTT |
| Card tap not recognized | Check UIDs in `TF_CARD_MAP` in `dashboard.js` |
| Custom questions not showing | Open Question Builder on laptop → Save All → restart session |
| Category dropdown empty in Teacher Panel | Open Question Builder → Save All first, then refresh Teacher Panel |
| No sound | Click anywhere on the page first to unlock audio |

---

## Sound Effects

| Moment | Sound |
|---|---|
| Countdown 3-2-1 | Punchy beep |
| GO! | Arcade power-up |
| Correct answer | Triumphant fanfare |
| Wrong answer | Dramatic buzzer |
| Category scoreboard | Podium fanfare |
| Final scoreboard | Drumroll + grand fanfare |

---

*Built for early childhood education. Have fun! 🎓*
