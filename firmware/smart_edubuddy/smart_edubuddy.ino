/*
 * Smart EduBuddy - ESP32 RFID + 4-Button Station
 * Hardware: ESP32 dev board + MFRC522 RFID reader + 4 push buttons
 *
 * Publishes raw input events to MQTT. The web dashboard owns all
 * game logic, scoring, and question state — this firmware only
 * reports what the student physically did.
 *
 * MQTT publishes on edubuddy/answer:
 *   - "BTN_A" / "BTN_B" / "BTN_C" / "BTN_D" on button press
 *   - "<UPPERCASE_HEX_UID>" on RFID scan (e.g. "DEADBEEF")
 *
 * Pin map (ESP32):
 *   RFID SDA/SS  -> GPIO 5
 *   RFID SCK     -> GPIO 18
 *   RFID MOSI    -> GPIO 23
 *   RFID MISO    -> GPIO 19
 *   RFID RST     -> GPIO 22
 *   RFID 3.3V    -> 3V3
 *   RFID GND     -> GND
 *   Button A     -> GPIO 25  (other leg to GND)
 *   Button B     -> GPIO 26  (other leg to GND)
 *   Button C     -> GPIO 27  (other leg to GND)
 *   Button D     -> GPIO 32  (other leg to GND)
 *   Status LED   -> GPIO 2   (built-in on most ESP32 dev boards)
 *
 * Pin map (NodeMCU ESP8266 fallback — only 2 buttons fit alongside RFID):
 *   See #ifdef branches below. Use the ESP32 build for the full feature set.
 */

#ifdef ESP32
#include <WiFi.h>
#else
#include <ESP8266WiFi.h>
#endif
#include <MFRC522.h>
#include <PubSubClient.h>
#include <SPI.h>

// ----- WiFi Configuration -----
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// ----- MQTT Configuration -----
const char *mqtt_server = "broker.hivemq.com"; // Public broker (replace with your own for privacy)
const int mqtt_port = 1883;
const char *mqtt_client_id = "EduBuddy_Station_01";

// ----- MQTT Topics -----
const char *topic_answer = "edubuddy/answer"; // Publish: button presses + card UIDs
const char *topic_status = "edubuddy/status"; // Publish: device online/offline

// ----- Pin Configuration -----
#ifdef ESP32
// RFID pins
#define RST_PIN 22
#define SS_PIN 5
// Button pins (active-low, INPUT_PULLUP)
#define BTN_A_PIN 25
#define BTN_B_PIN 26
#define BTN_C_PIN 27
#define BTN_D_PIN 32
// Status LED (built-in on most ESP32 dev boards)
#define LED_PIN 2
#define LED_ACTIVE_HIGH true // ESP32 built-in LED is active HIGH on most boards
#else
// NodeMCU ESP8266 fallback (only 2 buttons fit cleanly with RFID)
#define RST_PIN D3
#define SS_PIN D4
#define BTN_A_PIN D1
#define BTN_B_PIN D2
#define BTN_C_PIN -1 // Not wired on NodeMCU build
#define BTN_D_PIN -1 // Not wired on NodeMCU build
#define LED_PIN D0
#define LED_ACTIVE_HIGH false // NodeMCU built-in LED is active LOW
#endif

// ----- Hardware -----
MFRC522 mfrc522(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient client(espClient);

// ----- Timing / debounce -----
unsigned long lastCardReadTime = 0;
const unsigned long cardReadDelay = 1500; // ms between RFID reads

unsigned long lastButtonTime = 0;
const unsigned long buttonDebounce = 250; // ms global debounce across all buttons

// ----- LED helpers (handle both polarities) -----
inline void ledOn()  { digitalWrite(LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW); }
inline void ledOff() { digitalWrite(LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH); }

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    ledOn();
    delay(delayMs);
    ledOff();
    delay(delayMs);
  }
}

// ----- Setup -----
void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(LED_PIN, OUTPUT);
  ledOff();

  // Buttons: active-low with internal pull-up
  pinMode(BTN_A_PIN, INPUT_PULLUP);
  pinMode(BTN_B_PIN, INPUT_PULLUP);
  if (BTN_C_PIN >= 0) pinMode(BTN_C_PIN, INPUT_PULLUP);
  if (BTN_D_PIN >= 0) pinMode(BTN_D_PIN, INPUT_PULLUP);

  // RFID
  SPI.begin();
  mfrc522.PCD_Init();

  Serial.println("\n=== Smart EduBuddy Station (ESP32 + RFID + 4 buttons) ===");
  Serial.println("Initializing...");

  setupWiFi();

  client.setServer(mqtt_server, mqtt_port);
  reconnectMQTT();

  Serial.println("System Ready! Waiting for input...");
}

// ----- Main loop -----
void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  checkButtons();
  checkRFIDCard();
}

// ----- WiFi -----
void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    blinkLED(3, 200);
  } else {
    Serial.println("\nWiFi Connection Failed!");
  }
}

// ----- MQTT -----
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");

    if (client.connect(mqtt_client_id)) {
      Serial.println("Connected!");
      client.publish(topic_status, "online", true); // retained
      blinkLED(2, 300);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void publishAnswer(const char *payload) {
  Serial.print(">> publish ");
  Serial.print(topic_answer);
  Serial.print(" : ");
  Serial.println(payload);
  client.publish(topic_answer, payload);
  blinkLED(1, 80);
}

// ----- Buttons -----
void checkButtons() {
  if (millis() - lastButtonTime < buttonDebounce) {
    return;
  }

  // Active-low: digitalRead == LOW means pressed
  if (digitalRead(BTN_A_PIN) == LOW) {
    publishAnswer("BTN_A");
    lastButtonTime = millis();
    return;
  }
  if (digitalRead(BTN_B_PIN) == LOW) {
    publishAnswer("BTN_B");
    lastButtonTime = millis();
    return;
  }
  if (BTN_C_PIN >= 0 && digitalRead(BTN_C_PIN) == LOW) {
    publishAnswer("BTN_C");
    lastButtonTime = millis();
    return;
  }
  if (BTN_D_PIN >= 0 && digitalRead(BTN_D_PIN) == LOW) {
    publishAnswer("BTN_D");
    lastButtonTime = millis();
    return;
  }
}

// ----- RFID -----
void checkRFIDCard() {
  if (millis() - lastCardReadTime < cardReadDelay) {
    return;
  }

  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  ledOn();

  String cardId = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      cardId += "0";
    }
    cardId += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();

  Serial.print("\n--- Card Detected: ");
  Serial.println(cardId);

  publishAnswer(cardId.c_str());

  lastCardReadTime = millis();
  mfrc522.PICC_HaltA();

  delay(300);
  ledOff();
}
