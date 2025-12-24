# Smart EduBuddy - IoT Educational System

## 📚 Project Overview

Smart EduBuddy is an IoT-based interactive learning device designed for early childhood education. It helps young learners recognize shapes and colors through hands-on RFID card interactions with real-time feedback displayed on a classroom screen.

### Key Features
- ✅ RFID card-based answer input
- ✅ Large screen display for classroom visibility
- ✅ Real-time audio and visual feedback
- ✅ Teacher control via web interface
- ✅ MQTT-based IoT communication
- ✅ Low-cost hardware design
- ✅ Easy to setup and use

---

## 🎯 System Architecture

### Hardware Components
1. **Student Interaction Station**
   - NodeMCU ESP8266 (WiFi microcontroller)
   - MFRC522 RFID Reader Module
   - Optional: Status LED

2. **Classroom Display**
   - Laptop or TV/Monitor
   - Web browser (Chrome, Firefox, Edge)
   - Speakers for audio feedback

3. **Teacher Control**
   - Any device with web browser (laptop, tablet, phone)

### Software Components
1. **NodeMCU Firmware** (Arduino C++)
   - RFID card reading
   - MQTT communication
   - WiFi connectivity

2. **Web Dashboard** (HTML/CSS/JavaScript)
   - Display questions to students
   - Show visual feedback (green/red screen)
   - Play audio feedback
   - Track scores

3. **Teacher Control Panel** (HTML/CSS/JavaScript)
   - Create and send questions
   - Quick preset questions
   - Game control

---

## 🔧 Hardware Setup

### NodeMCU ESP8266 Wiring

#### MFRC522 RFID Reader Connection
```
MFRC522 Pin  →  NodeMCU Pin
---------------------------------
SDA (SS)     →  D4 (GPIO 2)
SCK          →  D5 (GPIO 14)
MOSI         →  D7 (GPIO 13)
MISO         →  D6 (GPIO 12)
IRQ          →  Not connected
GND          →  GND
RST          →  D3 (GPIO 0)
3.3V         →  3.3V
```

#### Optional Status LED
```
LED Pin      →  NodeMCU Pin
---------------------------------
Anode (+)    →  D0 (GPIO 16) via 220Ω resistor
Cathode (-)  →  GND
```

### RFID Card Preparation

You need to prepare RFID cards for each shape and color:

**Color Cards:**
- Red card → ID: 01RED
- Blue card → ID: 02BLUE
- Green card → ID: 03GREEN
- Yellow card → ID: 04YELLOW
- Orange card → ID: 05ORANGE
- Purple card → ID: 06PURPLE

**Shape Cards:**
- Circle → ID: 07CIRCLE
- Square → ID: 08SQUARE
- Triangle → ID: 09TRIANGLE
- Rectangle → ID: 10RECTANGLE
- Star → ID: 11STAR
- Heart → ID: 12HEART

**Note:** The actual UID of your RFID cards will be different. You need to:
1. Read each card's UID using the Arduino code
2. Update the `cardDatabase` in `dashboard.js` with actual UIDs
3. Label each physical card accordingly

---

## 💻 Software Installation

### Step 1: Setup Arduino IDE

1. Download and install [Arduino IDE](https://www.arduino.cc/en/software)

2. Install ESP8266 Board Support:
   - Go to **File → Preferences**
   - Add to "Additional Board Manager URLs":
     ```
     http://arduino.esp8266.com/stable/package_esp8266com_index.json
     ```
   - Go to **Tools → Board → Boards Manager**
   - Search "ESP8266" and install

3. Install Required Libraries:
   - Go to **Sketch → Include Library → Manage Libraries**
   - Install these libraries:
     - `MFRC522` by GithubCommunity
     - `PubSubClient` by Nick O'Leary

### Step 2: Upload NodeMCU Code

1. Open `nodemcu/smart_edubuddy.ino` in Arduino IDE

2. Configure WiFi settings (lines 10-11):
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

3. Select board and port:
   - **Tools → Board → ESP8266 Boards → NodeMCU 1.0**
   - **Tools → Port → [Select your COM port]**

4. Click **Upload** button

5. Open **Serial Monitor** (115200 baud) to verify connection

### Step 3: Setup Web Dashboard

1. The web dashboard runs directly in a web browser - no installation needed!

2. Simply open these files in your browser:
   - `web-dashboard/index.html` → Student Display Dashboard
   - `web-dashboard/teacher-panel.html` → Teacher Control Panel

3. For best experience, use modern browsers:
   - Google Chrome (recommended)
   - Mozilla Firefox
   - Microsoft Edge

**Important:** Both dashboard and teacher panel can run on different devices!

---

## 🚀 How to Use

### Initial Setup

1. **Power on the NodeMCU**
   - Connect via USB to power source
   - Check Serial Monitor to verify WiFi connection
   - Device will connect to MQTT broker automatically

2. **Open Student Dashboard on TV/Projector**
   - Open `web-dashboard/index.html` in browser
   - Go fullscreen (F11)
   - Check MQTT status shows "Connected"
   - Check Device status shows "Online"

3. **Open Teacher Panel on Your Device**
   - Open `web-dashboard/teacher-panel.html` in browser
   - Verify MQTT and Device status are "Online"

### Playing a Game

#### Method 1: Quick Start (Recommended)
1. On Teacher Panel, click any preset button (e.g., "🔴 Color Red")
2. Question appears on student dashboard
3. Student taps the Red RFID card
4. Screen shows green with "Correct!" + sound
5. Click next preset question to continue

#### Method 2: Custom Question
1. Select correct answer from dropdown
2. Type custom question text
3. Click "Send Question to Students"
4. Question appears on dashboard
5. Students answer with RFID card

### During Gameplay

**Student Dashboard shows:**
- Current question in large text
- Green screen + checkmark for correct answers
- Red screen + X for wrong answers
- Audio feedback ("Correct!" or "Try again!")
- Score tracking (Correct / Total / Wrong)

**Teacher Panel allows:**
- Send new questions
- Clear current question
- Reset scores
- Monitor connection status

---

## 🎮 Game Examples

### Example 1: Color Recognition
1. Teacher clicks "🔴 Color Red" preset
2. Dashboard shows: **"Find the Color RED"**
3. Student taps Red card
4. ✅ Green screen: "Correct! Great Job!"

### Example 2: Shape Recognition
1. Teacher clicks "⭕ Circle" preset
2. Dashboard shows: **"Find the CIRCLE"**
3. Student taps Circle card
4. ✅ Green screen: "Correct! Great Job!"

### Example 3: Custom Question
1. Teacher selects "08SQUARE" as answer
2. Types: "Can you find the shape with 4 equal sides?"
3. Sends question
4. Student taps Square card
5. ✅ Correct!

---

## 🔧 Troubleshooting

### NodeMCU Issues

**Problem:** NodeMCU won't connect to WiFi
- Check SSID and password are correct
- Ensure 2.4GHz WiFi (ESP8266 doesn't support 5GHz)
- Check router allows new device connections

**Problem:** RFID reader not detecting cards
- Verify wiring connections
- Check 3.3V power supply (not 5V!)
- Try different RFID cards
- Check SPI pins are correct

**Problem:** MQTT connection fails
- Check internet connection
- Try different MQTT broker
- Verify firewall isn't blocking port 1883

### Dashboard Issues

**Problem:** Dashboard shows "Disconnected"
- Check internet connection
- Try refreshing the page
- Check browser console for errors
- Ensure MQTT broker is accessible

**Problem:** No audio feedback
- Check speaker volume
- Click anywhere on page first (browsers block auto-play)
- Add audio files to `assets/audio/` folder
- Check browser audio permissions

**Problem:** Questions not appearing
- Verify MQTT connection is "Connected"
- Check teacher panel sent the question
- Refresh dashboard page
- Check browser console for errors

---

## 📁 Project Structure

```
smart-edubuddy/
│
├── nodemcu/
│   └── smart_edubuddy.ino          # Arduino code for ESP8266
│
├── web-dashboard/
│   ├── index.html                   # Student display dashboard
│   ├── dashboard.js                 # Dashboard JavaScript
│   ├── teacher-panel.html           # Teacher control interface
│   └── teacher-panel.js             # Teacher panel JavaScript
│
├── assets/
│   ├── audio/
│   │   ├── correct.mp3             # "Correct!" sound
│   │   └── wrong.mp3               # "Try again!" sound
│   └── images/
│       └── (optional images)
│
├── documentation/
│   ├── README.md                    # This file
│   ├── HARDWARE_GUIDE.md           # Detailed hardware setup
│   ├── SOFTWARE_GUIDE.md           # Software configuration
│   └── USER_MANUAL.md              # User guide for teachers
│
└── mqtt-config/
    └── broker-info.txt             # MQTT broker details
```

---

## 🌐 MQTT Configuration

### Default Broker (Free Public)
```
Broker: broker.hivemq.com
Port: 1883 (TCP) / 8884 (WebSocket)
Topics:
  - edubuddy/question  (Teacher → Dashboard)
  - edubuddy/answer    (NodeMCU → Dashboard)
  - edubuddy/status    (NodeMCU → All)
  - edubuddy/control   (Teacher → All)
```

### Using Your Own Broker

For production use, consider setting up your own MQTT broker:

**Option 1: Cloud MQTT Service**
- [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/)
- [CloudMQTT](https://www.cloudmqtt.com/)
- [AWS IoT Core](https://aws.amazon.com/iot-core/)

**Option 2: Self-hosted Mosquitto**
- Install on Raspberry Pi or local server
- Configure authentication and SSL

To change broker:
1. Update `mqtt_server` in `smart_edubuddy.ino`
2. Update `MQTT_BROKER` in `dashboard.js`
3. Update `MQTT_BROKER` in `teacher-panel.js`

---

## 🎨 Customization

### Adding New Questions

Edit `teacher-panel.html` to add preset buttons:
```html
<button class="preset-btn" onclick="loadPreset('CARD_ID', 'Your Question')">
    🎨 Custom Question
</button>
```

### Changing Colors/Sounds

**Visual Feedback:**
- Edit CSS in `index.html` (`.feedback-overlay.correct` and `.wrong`)

**Audio Files:**
- Replace `assets/audio/correct.mp3` with your sound
- Replace `assets/audio/wrong.mp3` with your sound
- Supported: MP3, WAV, OGG

### Card Database

Update `cardDatabase` in `dashboard.js`:
```javascript
const cardDatabase = {
    'YOUR_CARD_UID': { 
        type: 'color', 
        name: 'Purple', 
        display: 'Color Purple' 
    },
    // ... more cards
};
```

---

## 📊 Future Enhancements

Potential improvements for the system:

- [ ] Multiple choice questions (tap 2-3 cards in sequence)
- [ ] Progress tracking and analytics
- [ ] Student profiles and individual scoring
- [ ] Multiple RFID stations for group play
- [ ] Mobile app for Android/iOS
- [ ] Offline mode with local server
- [ ] More game types (math, alphabet, etc.)
- [ ] Cloud database for question storage
- [ ] Multi-language support
- [ ] Parent reports and progress emails

---

## 🛠️ Technical Specifications

### Hardware Requirements
- **Microcontroller:** NodeMCU ESP8266 (or ESP32)
- **RFID Reader:** MFRC522 (13.56MHz)
- **RFID Cards:** ISO14443A (Mifare Classic/Ultralight)
- **Power:** 5V USB (500mA minimum)
- **WiFi:** 2.4GHz network required

### Software Requirements
- **Arduino IDE:** Version 1.8.13 or higher
- **ESP8266 Core:** Version 3.0.0 or higher
- **Web Browser:** Chrome 90+, Firefox 88+, Edge 90+
- **Internet:** Required for MQTT communication

### Network Requirements
- **WiFi:** 2.4GHz WPA/WPA2
- **Bandwidth:** Minimal (< 1 KB/s)
- **Ports:** 1883 (MQTT), 8884 (WebSocket)
- **Firewall:** Allow outbound MQTT connections

---

## 📞 Support & Contact

### Getting Help
- Check troubleshooting section above
- Review code comments in `.ino` and `.js` files
- Test each component individually
- Use Serial Monitor for debugging

### Documentation Files
- `HARDWARE_GUIDE.md` - Detailed wiring diagrams
- `SOFTWARE_GUIDE.md` - Advanced configuration
- `USER_MANUAL.md` - Teacher's guide

### Contributing
This is an educational project. Feel free to:
- Fork and modify for your needs
- Share improvements
- Report issues
- Add new features

---

## 📜 License

This project is created for educational purposes.
Free to use, modify, and distribute.

---

## 🙏 Acknowledgments

**Libraries Used:**
- MFRC522 by GithubCommunity
- PubSubClient by Nick O'Leary
- MQTT.js by MQTT.js Team

**Inspired by:**
- Interactive learning methodologies
- IoT for education initiatives
- Maker education movement

---

## 📝 Version History

**v1.0.0** (Current)
- Initial release
- Basic RFID functionality
- Web dashboard with feedback
- Teacher control panel
- MQTT integration

---

**Made with ❤️ for Early Childhood Education**

*Empowering young minds through interactive technology!*
