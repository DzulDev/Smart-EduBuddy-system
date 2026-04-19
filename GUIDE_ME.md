# Smart EduBuddy — How To Use

A simple guide for teachers and students. No technical knowledge needed!

---

## What Is Smart EduBuddy?

Smart EduBuddy is a fun quiz game for young learners (ages 3–7).
Students answer questions across 4 categories: **Color, Alphabet, Shape, and Number**.

---

## Two Pages You Need

| Page | Who Uses It | Link |
|---|---|---|
| Student Display | Shown on classroom TV | `https://smart-edubuddy-system.pages.dev/` |
| Teacher Panel | Teacher's phone or laptop | `https://smart-edubuddy-system.pages.dev/teacher-panel.html` |

> Tip: Bookmark both links!

---

## How To Start A Session (Teacher)

1. Open the **Teacher Panel** on your phone or laptop
2. Type the student's name
3. Pick a starting category (Color, Alphabet, Shape, or Number)
4. Click **Start Session**
5. The student display will show a 3-2-1-GO countdown automatically

---

## How Students Answer

### MCQ Questions (4 choices)
Student presses one of the **4 buttons** on the controller:

| Button | Choice |
|---|---|
| A | First option |
| B | Second option |
| C | Third option |
| D | Fourth option |

### True / False Questions (2 RFID cards)
Student taps one of the **2 cards** on the RFID reader:

| Card | Choice |
|---|---|
| Blue Card (A) | First option (e.g. True) |
| Red Card (B) | Second option (e.g. False) |

---

## During The Game

- 5 questions per category × 4 categories = **20 questions total**
- After each category, a **mini leaderboard** shows all student scores
- After all 4 categories, the **final leaderboard** shows overall rankings
- Top 3 are highlighted with 🥇🥈🥉

---

## Ending A Session (Teacher)

- Click **End Session** on the Teacher Panel to go back to the waiting screen
- Click **Reset Leaderboard** to wipe all scores and start fresh

---

## Testing Without Hardware (Keyboard Simulator)

No ESP32? No problem — use your keyboard to simulate answers:

| Key | Action |
|---|---|
| `A` `B` `C` `D` | Simulate button press (MCQ) |
| `1` | Simulate Card A tap (TF) |
| `2` | Simulate Card B tap (TF) |

A blue hint bar will appear at the bottom of the screen to remind you.

---

## First Time Setup (One-Time Only)

### RFID Card Enrollment
1. Flash the firmware to your ESP32
2. Open Arduino IDE Serial Monitor (115200 baud)
3. Tap each card on the reader — copy the printed UID
4. Paste the UIDs into `dashboard.js` under `TF_CARD_MAP`:
```js
const TF_CARD_MAP = {
    'YOUR_BLUE_CARD_UID': 'A',
    'YOUR_RED_CARD_UID':  'B'
};
```

### WiFi Setup (Firmware)
Open `firmware/smart_edubuddy/smart_edubuddy.ino` and edit:
```cpp
const char* ssid     = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```
Then re-upload to the ESP32.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Student display shows "Waiting..." | Start a session from Teacher Panel |
| MQTT dot is red | Check internet connection |
| Device dot is red | ESP32 not connected to WiFi or MQTT |
| Card tap not recognized | Check UIDs in `TF_CARD_MAP` in dashboard.js |
| No sound | Click anywhere on the page first to unlock audio |

---

## Sound Effects

| Moment | Sound |
|---|---|
| Countdown 3-2-1 | Punchy beep |
| GO! | Arcade power-up |
| Correct answer | Triumphant fanfare |
| Wrong answer | Dramatic buzzer |
| Category leaderboard | Podium fanfare |
| Final leaderboard | Drumroll + grand fanfare |

---

*Built with love for early childhood education. Have fun! 🎓*
