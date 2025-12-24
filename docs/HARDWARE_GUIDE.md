# Hardware Assembly Guide - Smart EduBuddy

## 📦 Required Components

### Must Have
| Component | Quantity | Approx. Cost (RM) |
|-----------|----------|-------------------|
| NodeMCU ESP8266 | 1 | 15-20 |
| MFRC522 RFID Reader | 1 | 5-8 |
| RFID Cards (13.56MHz) | 12+ | 10-15 |
| USB Micro Cable | 1 | 3-5 |
| Jumper Wires (F-F) | 7 | 3-5 |
| **Total** | | **~RM 40-55** |

### Optional
| Component | Purpose | Cost (RM) |
|-----------|---------|-----------|
| LED (any color) | Status indicator | 0.50 |
| 220Ω Resistor | LED current limiting | 0.20 |
| Breadboard | Prototyping | 5-8 |
| Project Box | Housing | 10-15 |
| Power Bank | Portable power | 20-30 |

### Display & Audio (Existing Equipment)
- Laptop/Desktop with speakers
- TV/Monitor with HDMI (+ laptop)
- Projector (optional)

---

## 🔌 Wiring Diagram

### MFRC522 RFID Reader to NodeMCU

```
     MFRC522 RFID Reader                    NodeMCU ESP8266
    ┌──────────────────┐                   ┌─────────────────┐
    │                  │                   │                 │
    │  SDA   ──────────┼───────────────────┤ D4 (GPIO 2)     │
    │  SCK   ──────────┼───────────────────┤ D5 (GPIO 14)    │
    │  MOSI  ──────────┼───────────────────┤ D7 (GPIO 13)    │
    │  MISO  ──────────┼───────────────────┤ D6 (GPIO 12)    │
    │  IRQ   (not used)│                   │                 │
    │  GND   ──────────┼───────────────────┤ GND             │
    │  RST   ──────────┼───────────────────┤ D3 (GPIO 0)     │
    │  3.3V  ──────────┼───────────────────┤ 3.3V            │
    │                  │                   │                 │
    └──────────────────┘                   └─────────────────┘
```

### Pin Connections Table

| MFRC522 Pin | Wire Color (suggested) | NodeMCU Pin | Pin Function |
|-------------|------------------------|-------------|--------------|
| SDA (SS)    | Blue                   | D4          | Slave Select |
| SCK         | Yellow                 | D5          | Clock        |
| MOSI        | Orange                 | D7          | Data Out     |
| MISO        | Green                  | D6          | Data In      |
| IRQ         | -                      | Not Used    | Interrupt    |
| GND         | Black                  | GND         | Ground       |
| RST         | Purple                 | D3          | Reset        |
| 3.3V        | Red                    | 3.3V        | Power        |

---

## ⚠️ Important Warnings

### Power Supply
```
❌ DO NOT connect MFRC522 to 5V pin!
✅ ALWAYS use 3.3V pin

The MFRC522 is designed for 3.3V operation.
Connecting to 5V will damage the module!
```

### SPI Pins
```
✅ These specific pins MUST be used for SPI:
   - D5 (GPIO 14) = SCK
   - D6 (GPIO 12) = MISO
   - D7 (GPIO 13) = MOSI

❌ Cannot use other GPIO pins for SPI hardware communication
```

### SS and RST Pins
```
✅ These can be changed to other GPIO pins if needed:
   - SDA/SS: Currently D4, can use D1, D2, D8, etc.
   - RST: Currently D3, can use D1, D2, D8, etc.

📝 If you change pins, update the Arduino code:
   #define RST_PIN D3    // Change to your pin
   #define SS_PIN D4     // Change to your pin
```

---

## 🔧 Assembly Instructions

### Step 1: Prepare Components
1. Unpack all components
2. Identify each pin on MFRC522
3. Identify GPIO pins on NodeMCU
4. Have jumper wires ready (Female-to-Female recommended)

### Step 2: Wire the RFID Reader

**Order matters for organization:**

1. **Ground First** (Safety)
   - MFRC522 GND → NodeMCU GND (black wire)

2. **Power**
   - MFRC522 3.3V → NodeMCU 3.3V (red wire)

3. **SPI Communication**
   - MFRC522 SCK → NodeMCU D5 (yellow wire)
   - MFRC522 MOSI → NodeMCU D7 (orange wire)
   - MFRC522 MISO → NodeMCU D6 (green wire)

4. **Control Pins**
   - MFRC522 SDA → NodeMCU D4 (blue wire)
   - MFRC522 RST → NodeMCU D3 (purple wire)

5. **IRQ pin** - Leave unconnected (not used)

### Step 3: Add Optional LED (Status Indicator)

```
LED Wiring:
  LED Anode (long leg, +) → 220Ω Resistor → NodeMCU D0
  LED Cathode (short leg, -) → NodeMCU GND
```

Purpose: Blinks when card is detected

### Step 4: Verify Connections

**Before powering on, check:**
- [ ] No loose wires
- [ ] 3.3V (NOT 5V!) to MFRC522
- [ ] All 7 connections made
- [ ] No short circuits
- [ ] SPI pins correct (D5, D6, D7)

---

## 🧪 Testing Hardware

### Test 1: Power Test
1. Connect NodeMCU to USB
2. Check red power LED on NodeMCU lights up
3. Check red LED on MFRC522 lights up
4. If either doesn't light up, recheck connections

### Test 2: RFID Reader Test
1. Upload the Arduino code
2. Open Serial Monitor (115200 baud)
3. Place RFID card on reader
4. Should see "Card Detected" and UID printed

**If not working:**
- Check SPI wiring (D5, D6, D7)
- Verify 3.3V power
- Try different RFID card
- Check RST and SS connections

### Test 3: WiFi Connection Test
1. Verify WiFi credentials in code
2. Upload and monitor Serial
3. Should see "WiFi Connected" and IP address

**If not connecting:**
- Check WiFi name and password
- Ensure 2.4GHz network (not 5GHz)
- Move closer to router
- Check router allows new devices

---

## 📐 Physical Assembly Options

### Option 1: Breadboard Setup (Prototyping)

**Advantages:**
- Easy to modify
- No soldering required
- Good for testing

**Disadvantages:**
- Wires can come loose
- Not portable
- Takes up space

### Option 2: Project Box (Recommended)

**Materials Needed:**
- Small plastic project box (10x10x5 cm)
- Double-sided tape or hot glue
- Drill for USB hole (optional)

**Assembly:**
1. Mount NodeMCU inside box with tape
2. Mount RFID reader on top surface
3. Route wires neatly inside
4. Cut hole for USB cable
5. Close and secure box

**Benefits:**
- Professional appearance
- Protected from damage
- Portable
- Child-safe

### Option 3: 3D Printed Enclosure

If you have access to 3D printer:
- Design custom enclosure
- Include mounting points
- Add labeling
- Create cable management

---

## 🎨 RFID Card Preparation

### Physical Card Labeling

**Method 1: Stickers**
1. Print color/shape stickers
2. Laminate for durability
3. Apply to white RFID cards

**Method 2: Markers**
1. Use permanent markers
2. Draw shapes/colors directly on cards
3. Apply clear tape for protection

**Method 3: Printed Labels**
1. Design labels in Word/Canva
2. Print on sticker paper
3. Cut and apply to cards
4. Laminate if possible

### Card Organization

**Create a Card Set:**
```
📦 Color Cards (Red pouch/bag):
   🔴 Red
   🔵 Blue
   🟢 Green
   🟡 Yellow
   🟠 Orange
   🟣 Purple

📦 Shape Cards (Blue pouch/bag):
   ⭕ Circle
   🟦 Square
   🔺 Triangle
   ▭ Rectangle
   ⭐ Star
   ❤️ Heart
```

**Storage Tips:**
- Use small plastic bags or pouches
- Label each set clearly
- Keep with the RFID station
- Have spares for replacements

---

## 🔍 Reading Card UIDs

### Finding Your Card IDs

1. **Upload Basic RFID Test Code:**
```cpp
#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN D3
#define SS_PIN D4

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("Scan cards to get UID...");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  
  Serial.print("Card UID: ");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    Serial.print(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();
  
  mfrc522.PICC_HaltA();
  delay(2000);
}
```

2. **Scan Each Card:**
   - Place card on reader
   - Note UID from Serial Monitor
   - Write UID on card back with marker
   - Record in spreadsheet

3. **Create Card Database:**
   - Open `dashboard.js`
   - Update `cardDatabase` with actual UIDs:

```javascript
const cardDatabase = {
    'A1B2C3D4': { type: 'color', name: 'Red', display: 'Color Red' },
    'E5F6A7B8': { type: 'color', name: 'Blue', display: 'Color Blue' },
    // ... add all your cards
};
```

---

## 🧰 Maintenance & Care

### Daily Checks
- Ensure USB cable is secure
- Verify RFID reader is clean
- Check WiFi connection
- Wipe cards if dirty

### Weekly Maintenance
- Inspect wire connections
- Clean RFID reader surface with dry cloth
- Check for loose components
- Test with all cards

### Troubleshooting Tips

**RFID Reader Not Working:**
1. Check 3.3V power (measure with multimeter)
2. Verify SPI connections
3. Try different USB cable/power source
4. Test with different RFID card

**Intermittent Connection:**
1. Tighten jumper wire connections
2. Use shorter wires if possible
3. Solder connections for permanent fix
4. Check for electromagnetic interference

**Cards Not Reading:**
1. Clean card surface
2. Hold card steady for 1-2 seconds
3. Check card is 13.56MHz compatible
4. Try different cards to isolate issue

---

## 💡 Pro Tips

### For Better Performance:
1. **Power**: Use quality USB cable and power source
2. **Wires**: Use shortest possible jumper wires
3. **Placement**: Keep RFID reader away from metal surfaces
4. **Cards**: Use quality ISO14443A cards
5. **WiFi**: Position NodeMCU for strong signal

### For Classroom Use:
1. **Mounting**: Secure RFID reader at child height
2. **Marking**: Use tape to show card placement spot
3. **Spares**: Have extra NodeMCU and reader ready
4. **Backup**: Keep backup power bank charged
5. **Instructions**: Laminate setup guide for quick reference

---

## 📋 Pre-Assembly Checklist

Before starting assembly:
- [ ] All components purchased and received
- [ ] Arduino IDE installed on computer
- [ ] USB cable compatible with NodeMCU
- [ ] WiFi network name and password known
- [ ] Workspace clear and organized
- [ ] Good lighting available
- [ ] Documentation printed or accessible
- [ ] Multimeter available (optional but helpful)

---

## 🎓 Learning Outcomes

By completing this assembly, you will:
- ✅ Understand ESP8266 GPIO pins
- ✅ Learn SPI communication protocol
- ✅ Practice proper wiring techniques
- ✅ Gain IoT hardware experience
- ✅ Understand power requirements
- ✅ Develop troubleshooting skills

---

**Happy Building! 🔧**

*Take your time, double-check connections, and don't hesitate to test at each step!*
