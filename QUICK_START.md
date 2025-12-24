# Quick Start Guide - Smart EduBuddy

## ⚡ Get Started in 15 Minutes!

This guide gets you from zero to working system fast. Detailed guides available in documentation folder.

---

## ✅ Pre-Flight Checklist

Do you have:
- [ ] NodeMCU ESP8266
- [ ] MFRC522 RFID Reader
- [ ] 7 jumper wires (Female-to-Female)
- [ ] USB cable
- [ ] 12+ RFID cards
- [ ] Computer with Arduino IDE
- [ ] WiFi network (2.4GHz)
- [ ] Laptop/TV for display

**Missing something?** See `HARDWARE_GUIDE.md` for shopping list.

---

## 🔧 Step 1: Wire Hardware (5 minutes)

### Connect RFID Reader to NodeMCU:

```
MFRC522 Pin  →  NodeMCU Pin  →  Wire Color
─────────────────────────────────────────────
SDA          →  D4           →  Blue
SCK          →  D5           →  Yellow  
MOSI         →  D7           →  Orange
MISO         →  D6           →  Green
GND          →  GND          →  Black
RST          →  D3           →  Purple
3.3V         →  3.3V         →  Red
```

**⚠️ IMPORTANT:** Use 3.3V, NOT 5V!

**Check:** All 7 wires connected? ✓

---

## 💻 Step 2: Setup Software (5 minutes)

### A. Install Arduino IDE

**Windows/Mac/Linux:**
1. Download from: https://www.arduino.cc/en/software
2. Install and open Arduino IDE

### B. Add ESP8266 Board

1. **File → Preferences**
2. Add to "Additional Board Manager URLs":
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
3. **Tools → Board → Boards Manager**
4. Search "esp8266" and install

### C. Install Libraries

1. **Sketch → Include Library → Manage Libraries**
2. Search and install:
   - `MFRC522` by GithubCommunity
   - `PubSubClient` by Nick O'Leary

**Check:** Libraries installed? ✓

---

## 📝 Step 3: Configure & Upload (3 minutes)

### A. Open Arduino Code

1. Open `nodemcu/smart_edubuddy.ino`

### B. Edit WiFi Settings

Find lines 10-11 and change:
```cpp
const char* ssid = "YOUR_WIFI_NAME";      // Change this
const char* password = "YOUR_PASSWORD";    // Change this
```

### C. Select Board & Port

1. **Tools → Board → NodeMCU 1.0**
2. **Tools → Port → COM3** (or your port)

### D. Upload

1. Click **Upload** button (→)
2. Wait for "Done uploading"

### E. Verify Connection

1. Open **Serial Monitor** (magnifying glass icon)
2. Set to **115200 baud**
3. Should see:
   ```
   WiFi Connected!
   MQTT Connected!
   System Ready!
   ```

**Check:** See "System Ready!"? ✓

---

## 🖥️ Step 4: Open Dashboards (2 minutes)

### A. Student Display (on TV/Projector laptop)

1. Open Chrome browser
2. Open file: `web-dashboard/index.html`
3. Press **F11** for fullscreen
4. Check status shows "Online" ✓

### B. Teacher Control Panel (on your device)

1. Open Chrome browser
2. Open file: `web-dashboard/teacher-panel.html`
3. Check both status dots are **green** ✓

**Check:** Both dashboards show "Online"? ✓

---

## 🎮 Step 5: Play First Game! (1 minute)

### Test the System:

1. **On Teacher Panel:** Click "🔴 Color Red" button

2. **On Student Display:** Should show:
   ```
   Find the Color RED
   ```

3. **Place Red RFID card on reader**

4. **Student Display:** Should show:
   - Big green screen ✓
   - "Correct! Great Job!"
   - Score: 1 correct

**🎉 It works!**

---

## 📋 Read Card UIDs (Important!)

### Get Your Card IDs:

1. **Serial Monitor is still open**
2. **Place first card on reader**
3. **Note the UID shown** (example: "A1B2C3D4")
4. **Write UID on back of card with marker**
5. **Repeat for all 12 cards**

### Update Card Database:

1. **Edit `web-dashboard/dashboard.js`**
2. **Find `cardDatabase` (around line 20)**
3. **Replace example UIDs with your real ones:**

```javascript
const cardDatabase = {
    'A1B2C3D4': { type: 'color', name: 'Red', display: 'Color Red' },
    'E5F6A7B8': { type: 'color', name: 'Blue', display: 'Color Blue' },
    // ... add all 12 cards with their real UIDs
};
```

4. **Save file**
5. **Refresh dashboard (Ctrl + F5)**

**Check:** Cards work with real feedback? ✓

---

## 🎨 Label Your Cards

### Make Cards Recognizable:

**Method 1: Stickers**
- Print color/shape stickers
- Stick on cards
- Laminate if possible

**Method 2: Markers**
- Draw shapes/colors with permanent marker
- Cover with clear tape

**Method 3: Labels**
- Print labels with card names
- Stick on cards

**Card Set:**
```
Colors (6):        Shapes (6):
🔴 Red            ⭕ Circle
🔵 Blue           🟦 Square
🟢 Green          🔺 Triangle
🟡 Yellow         ▭ Rectangle
🟠 Orange         ⭐ Star
🟣 Purple         ❤️ Heart
```

---

## ✨ You're Ready!

### Start Teaching:

**Quick Games:**
1. Click any preset button on teacher panel
2. Students tap correct card
3. Watch instant feedback!
4. Move to next question

**Custom Questions:**
1. Select answer from dropdown
2. Type your question
3. Click "Send Question"

**Game Controls:**
- Clear Question: Removes current question
- Reset Scores: Starts fresh session

---

## 🎓 Next Steps

### Learn More:

**For Teachers:**
- Read `USER_MANUAL.md` for lesson plans
- See sample activities
- Learn classroom strategies

**For Technical Details:**
- Read `HARDWARE_GUIDE.md` for wiring diagrams
- Read `SOFTWARE_GUIDE.md` for configuration
- Check `PROJECT_INFO.md` for full documentation

### Customize:

- Add audio files to `assets/audio/`
- Change colors/sounds in HTML files
- Create more preset questions
- Design project box enclosure

### Troubleshooting:

**Common Issues:**
1. **Not connecting:** Check WiFi password
2. **Cards not reading:** Check wiring, use 3.3V
3. **Dashboard offline:** Refresh page, check internet
4. **No sound:** Add audio files, check volume

**Full troubleshooting:** See `USER_MANUAL.md`

---

## 📊 Success Checklist

After Quick Start, you should have:

- [✓] Hardware assembled and connected
- [✓] Arduino code uploaded successfully
- [✓] NodeMCU connected to WiFi
- [✓] NodeMCU connected to MQTT
- [✓] Student dashboard showing "Online"
- [✓] Teacher panel showing "Online"
- [✓] Test question successfully sent
- [✓] RFID card successfully read
- [✓] Feedback displayed (green/red screen)
- [✓] All 12 cards labeled and working

**All checked?** You're ready for classroom use! 🎉

**Some not checked?** See documentation folder for help.

---

## 💡 Quick Tips

### For Best Results:

**Hardware:**
- Keep wires neat and secure
- Mount reader at child height
- Use project box for protection
- Label all components

**Software:**
- Keep browser tabs organized
- Bookmark dashboard pages
- Take screenshot of working setup
- Document your settings

**Classroom:**
- Test before class starts
- Have backup power ready
- Keep spare cards available
- Practice transitions

### Common Mistakes to Avoid:

❌ Using 5V instead of 3.3V (damages RFID reader!)  
❌ Forgetting to update WiFi password  
❌ Not mapping card UIDs to database  
❌ Closing Serial Monitor too soon  
❌ Using 5GHz WiFi (ESP8266 needs 2.4GHz)  

---

## 📞 Need Help?

### Resources:

**Documentation:**
```
documentation/
├── README.md              ← Overview & features
├── HARDWARE_GUIDE.md      ← Detailed wiring
├── SOFTWARE_GUIDE.md      ← Configuration help
└── USER_MANUAL.md         ← Teacher's guide
```

**Quick Answers:**
- Arduino won't upload? → Check USB cable and port
- WiFi won't connect? → Check password and 2.4GHz
- Cards not reading? → Check 3.3V and SPI wires
- Dashboard offline? → Refresh page and check internet

### Get Support:
1. Check documentation folder
2. Review troubleshooting sections
3. Verify all connections
4. Test each component individually

---

## 🎯 Final Checklist

Before using in classroom:

**Hardware:**
- [ ] All wires secure
- [ ] RFID reader clean
- [ ] Cards labeled clearly
- [ ] Power source reliable
- [ ] Box/enclosure (optional)

**Software:**
- [ ] WiFi password correct
- [ ] Card UIDs mapped
- [ ] Dashboards bookmarked
- [ ] Settings documented
- [ ] Backup configuration saved

**Testing:**
- [ ] All cards work
- [ ] Feedback displays correctly
- [ ] Sound works (if added)
- [ ] Scores update properly
- [ ] Teacher panel connects

**Preparation:**
- [ ] Test questions prepared
- [ ] Lesson plan ready
- [ ] Students briefed
- [ ] Backup plan in place

---

**Ready to Transform Your Classroom! 🚀**

*Enjoy teaching with Smart EduBuddy!*

---

**Time Saved:** ~15 minutes to working system  
**Cost Saved:** Compared to commercial solutions  
**Fun Added:** Unlimited! 🎉
