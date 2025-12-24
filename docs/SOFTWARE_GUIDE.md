# Software Configuration Guide - Smart EduBuddy

## 📋 Table of Contents
1. [Arduino IDE Setup](#arduino-ide-setup)
2. [Library Installation](#library-installation)
3. [Code Configuration](#code-configuration)
4. [Web Dashboard Setup](#web-dashboard-setup)
5. [MQTT Configuration](#mqtt-configuration)
6. [Troubleshooting](#troubleshooting)

---

## Arduino IDE Setup

### Step 1: Download Arduino IDE

**Windows:**
1. Visit: https://www.arduino.cc/en/software
2. Click "Windows Win 10 and newer, 64 bits"
3. Download and run installer
4. Follow installation wizard

**Mac:**
1. Download macOS version
2. Drag to Applications folder
3. Open Arduino IDE

**Linux:**
1. Download Linux AppImage or ZIP
2. Extract and run arduino-ide

### Step 2: Add ESP8266 Board Support

**Method 1: Using Board Manager (Recommended)**

1. Open Arduino IDE
2. Go to **File → Preferences** (or Arduino IDE → Settings on Mac)
3. Find "Additional Board Manager URLs"
4. Paste this URL:
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
5. Click **OK**

6. Go to **Tools → Board → Boards Manager**
7. Search for **"esp8266"**
8. Find "esp8266 by ESP8266 Community"
9. Click **Install**
10. Wait for installation to complete

**Method 2: Manual Installation (If Board Manager fails)**

1. Download: https://github.com/esp8266/Arduino/releases
2. Extract to Arduino/hardware folder
3. Restart Arduino IDE

### Step 3: Select Board

1. Connect NodeMCU via USB
2. Go to **Tools → Board → ESP8266 Boards**
3. Select **"NodeMCU 1.0 (ESP-12E Module)"**

### Step 4: Select Port

**Windows:**
1. Go to **Tools → Port**
2. Select **COM3** (or COM4, COM5, etc.)
3. If no COM port appears, install CH340 driver:
   - Download: http://www.wch.cn/downloads/CH341SER_ZIP.html
   - Install and restart

**Mac:**
1. Go to **Tools → Port**
2. Select **/dev/cu.usbserial-XXXX**

**Linux:**
1. Go to **Tools → Port**
2. Select **/dev/ttyUSB0**
3. If permission denied:
   ```bash
   sudo usermod -a -G dialout $USER
   sudo chmod 666 /dev/ttyUSB0
   ```

---

## Library Installation

### Required Libraries

You need 2 libraries:

1. **MFRC522** - For RFID reader
2. **PubSubClient** - For MQTT communication

### Installation Steps

**Method 1: Library Manager (Easiest)**

1. Open Arduino IDE
2. Go to **Sketch → Include Library → Manage Libraries**
3. Search "MFRC522"
4. Find "MFRC522 by GithubCommunity"
5. Click **Install**

6. Search "PubSubClient"
7. Find "PubSubClient by Nick O'Leary"
8. Click **Install**

**Method 2: Manual Installation**

If Library Manager doesn't work:

1. Download MFRC522:
   - https://github.com/miguelbalboa/rfid/archive/master.zip
   
2. Download PubSubClient:
   - https://github.com/knolleary/pubsubclient/archive/master.zip

3. Extract both ZIP files

4. Copy folders to Arduino libraries:
   - **Windows:** `Documents/Arduino/libraries/`
   - **Mac:** `~/Documents/Arduino/libraries/`
   - **Linux:** `~/Arduino/libraries/`

5. Restart Arduino IDE

### Verify Installation

1. Go to **Sketch → Include Library**
2. Check if you see:
   - MFRC522
   - PubSubClient
3. If yes, installation successful!

---

## Code Configuration

### Step 1: Open Arduino Code

1. Navigate to project folder
2. Open `nodemcu/smart_edubuddy.ino`
3. Code should load in Arduino IDE

### Step 2: Configure WiFi Settings

**Find these lines (around line 10-11):**
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

**Change to your WiFi details:**
```cpp
const char* ssid = "SchoolWiFi";           // Your WiFi name
const char* password = "school123456";      // Your WiFi password
```

**Important Notes:**
- WiFi name is case-sensitive
- Use 2.4GHz network (ESP8266 doesn't support 5GHz)
- Avoid special characters in WiFi name if possible
- Password must be exact

### Step 3: Configure MQTT Broker (Optional)

**Using default public broker (HiveMQ):**
- No changes needed!
- Already configured in code

**Using your own broker:**

Find these lines (around line 13-15):
```cpp
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
```

Change to:
```cpp
const char* mqtt_server = "192.168.1.100";  // Your broker IP
const int mqtt_port = 1883;
```

### Step 4: Configure RFID Pins (Optional)

**Default pins work for most setups:**
```cpp
#define RST_PIN D3    // GPIO 0
#define SS_PIN D4     // GPIO 2
```

**Only change if you wired differently!**

### Step 5: Upload Code

1. Click **Verify** button (✓) to check for errors
2. If no errors, click **Upload** button (→)
3. Wait for "Done uploading" message
4. Open **Serial Monitor** (magnifying glass icon)
5. Set baud rate to **115200**

**Expected Output:**
```
=== Smart EduBuddy RFID Station ===
Initializing...
Connecting to WiFi: SchoolWiFi
.....
WiFi Connected!
IP Address: 192.168.1.50
Connecting to MQTT broker...Connected!
System Ready!
Waiting for RFID cards...
```

### Common Upload Errors

**Error: "espcomm_open failed"**
- Check USB cable is connected
- Check correct COM port selected
- Try different USB cable
- Press and hold FLASH button during upload

**Error: "Board not found"**
- Install CH340 driver
- Try different USB port
- Check Device Manager (Windows)

**Error: Compilation errors**
- Check libraries installed correctly
- Verify code copied completely
- Check for syntax errors

---

## Web Dashboard Setup

### No Installation Required!

The web dashboard runs directly in browser - no server needed!

### Step 1: Prepare Files

Files should be in:
```
web-dashboard/
├── index.html           (Student display)
├── dashboard.js         (Dashboard logic)
├── teacher-panel.html   (Teacher control)
└── teacher-panel.js     (Control logic)
```

### Step 2: Configure MQTT in JavaScript

**Only needed if using your own broker:**

**Edit dashboard.js:**
```javascript
// Find line 5-6:
const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';

// Change to:
const MQTT_BROKER = 'ws://192.168.1.100:8884/mqtt';
```

**Edit teacher-panel.js:**
```javascript
// Same change as above
const MQTT_BROKER = 'ws://192.168.1.100:8884/mqtt';
```

**Important:**
- Use `ws://` for non-SSL
- Use `wss://` for SSL
- Include `/mqtt` at the end
- Port 8884 is for WebSocket (not 1883!)

### Step 3: Update Card Database

**Get your card UIDs first:**

1. Upload Arduino code
2. Open Serial Monitor
3. Scan each card
4. Note the UID (example: "A1B2C3D4")

**Edit dashboard.js:**

Find `cardDatabase` (around line 20):
```javascript
const cardDatabase = {
    // Replace these UIDs with your actual card UIDs!
    'A1B2C3D4': { type: 'color', name: 'Red', display: 'Color Red' },
    'E5F6A7B8': { type: 'color', name: 'Blue', display: 'Color Blue' },
    // ... add all your cards
};
```

**Create a mapping table:**
```
Physical Card → Scan UID → Database Entry
-------------------------------------------------
Red card      → A1B2C3D4 → '01RED' or actual UID
Blue card     → E5F6A7B8 → '02BLUE' or actual UID
Circle card   → F9A0B1C2 → '07CIRCLE' or actual UID
```

### Step 4: Opening Dashboard

**Student Display (TV/Projector):**
1. Open web browser (Chrome recommended)
2. Press **Ctrl+O** (or File → Open)
3. Navigate to `web-dashboard/index.html`
4. Press **F11** for fullscreen

**Teacher Panel (Your Device):**
1. Open web browser
2. Press **Ctrl+O**
3. Navigate to `web-dashboard/teacher-panel.html`

**Alternative (Local Server):**

If opening files directly doesn't work:

**Python 2:**
```bash
cd web-dashboard
python -m SimpleHTTPServer 8000
```

**Python 3:**
```bash
cd web-dashboard
python -m http.server 8000
```

Then visit: `http://localhost:8000/`

---

## MQTT Configuration

### Using Public Broker (Default)

**No configuration needed!**

System uses: `broker.hivemq.com`

**Pros:**
- Free
- No setup
- Works immediately

**Cons:**
- Requires internet
- Public (anyone can subscribe)
- May have delays

### Setting Up Private Broker

**See:** `mqtt-config/broker-info.txt` for detailed instructions

**Quick Setup (Raspberry Pi):**

```bash
# Install Mosquitto
sudo apt update
sudo apt install mosquitto mosquitto-clients -y

# Configure
sudo nano /etc/mosquitto/mosquitto.conf

# Add:
listener 1883
listener 8884
protocol websockets
allow_anonymous true

# Restart
sudo systemctl restart mosquitto

# Find IP
hostname -I
```

**Update code with Pi's IP address**

---

## Browser Compatibility

### Recommended Browsers:

**✅ Best:**
- Google Chrome (latest)
- Microsoft Edge (latest)

**✅ Good:**
- Mozilla Firefox (latest)
- Safari (macOS)

**❌ Not Supported:**
- Internet Explorer
- Very old browser versions

### Browser Settings:

**Allow Audio Autoplay:**
1. Click padlock/info icon in address bar
2. Site settings → Sound → Allow

**Allow WebSocket:**
- Usually enabled by default
- If blocked, check firewall settings

---

## File Permissions (Linux/Mac)

If you get permission errors:

```bash
# Make files readable
chmod -R 755 smart-edubuddy/

# For Python server
chmod +x web-dashboard/*.html
```

---

## Testing Configuration

### Test Checklist:

**1. NodeMCU Test:**
- [ ] Uploads without errors
- [ ] Connects to WiFi (check Serial Monitor)
- [ ] Connects to MQTT (check Serial Monitor)
- [ ] Reads RFID cards (check Serial Monitor)

**2. Dashboard Test:**
- [ ] Opens in browser
- [ ] Shows "Connected" status
- [ ] MQTT status is green
- [ ] Device status shows "Online"

**3. Teacher Panel Test:**
- [ ] Opens in browser
- [ ] Both status dots are green
- [ ] Can send test question
- [ ] Question appears on dashboard

**4. Integration Test:**
- [ ] Send question from teacher panel
- [ ] Question appears on dashboard
- [ ] Scan RFID card on reader
- [ ] Dashboard shows green/red feedback
- [ ] Audio plays (if files added)
- [ ] Scores update

---

## Backup & Version Control

### Save Your Configuration

**Create backup folder:**
```
smart-edubuddy-backup/
├── config.txt (your WiFi & MQTT settings)
├── smart_edubuddy.ino (configured Arduino code)
├── dashboard.js (with your card UIDs)
└── notes.txt (your observations)
```

**Config Template (config.txt):**
```
WiFi SSID: SchoolWiFi
WiFi Password: school123456
MQTT Broker: broker.hivemq.com
MQTT Port: 1883
Last Updated: 2024-12-24
Updated By: Teacher Ahmad
```

---

## Security Best Practices

### WiFi Security:
- ✅ Use WPA2 encryption
- ✅ Change default router password
- ✅ Use guest network for IoT devices
- ❌ Don't use open WiFi

### MQTT Security:
- ✅ Use private broker if possible
- ✅ Enable username/password
- ✅ Use SSL/TLS for production
- ✅ Change topic names from defaults

### Code Security:
- ❌ Don't commit passwords to GitHub
- ✅ Use environment variables
- ✅ Limit broker access by IP
- ✅ Monitor for unauthorized connections

---

## Performance Optimization

### WiFi:
- Place NodeMCU close to router
- Avoid metal obstacles
- Use 2.4GHz (better range than 5GHz)
- Reduce WiFi interference

### MQTT:
- Use QoS 0 for speed (already default)
- Keep messages small
- Use local broker for best performance
- Reduce keepalive time if needed

### Browser:
- Close unnecessary tabs
- Use hardware acceleration
- Update to latest version
- Clear cache periodically

---

## Updating Software

### Update Arduino Code:

1. Make changes in Arduino IDE
2. Click **Verify** to check
3. Click **Upload**
4. Monitor Serial for errors

### Update Dashboard:

1. Edit HTML/JS files
2. Save changes
3. Refresh browser (Ctrl+F5 for hard refresh)
4. Test functionality

**Hot Tip:** Keep browser developer console open (F12) to see errors!

---

## Getting Help

### Debug Process:

1. **Check Serial Monitor**
   - Shows WiFi connection status
   - Shows MQTT connection status
   - Shows RFID read events
   - Shows error messages

2. **Check Browser Console**
   - Press F12
   - Click "Console" tab
   - Look for error messages
   - Check network tab for MQTT

3. **Systematic Testing**
   - Test hardware (LED blinks?)
   - Test WiFi (connected?)
   - Test MQTT (green status?)
   - Test RFID (cards detected?)
   - Test dashboard (questions show?)

### Common Issues Solved:

See **Troubleshooting** section in main README.md

---

**Configuration Complete! 🎉**

*Now you're ready to start using Smart EduBuddy!*
