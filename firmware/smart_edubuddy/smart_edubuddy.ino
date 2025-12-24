/*
 * Smart EduBuddy - NodeMCU RFID Station
 * Hardware: NodeMCU ESP8266 + MFRC522 RFID Reader
 * Purpose: Read RFID cards and send to MQTT broker
 */

#ifdef ESP32
#include <WiFi.h>
#else
#include <ESP8266WiFi.h>
#endif
#include <MFRC522.h>
#include <PubSubClient.h>
#include <SPI.h>

// WiFi Configuration
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char *mqtt_server =
    "broker.hivemq.com"; // Free public broker (replace with your own)
const int mqtt_port = 1883;
const char *mqtt_client_id = "EduBuddy_Station_01";

// MQTT Topics
const char *topic_question =
    "edubuddy/question";                      // Subscribe: Receive questions
const char *topic_answer = "edubuddy/answer"; // Publish: Send student answers
const char *topic_status = "edubuddy/status"; // Publish: Device status

// RFID Pin Configuration
#ifdef ESP32
#define RST_PIN 22 // GPIO 22
#define SS_PIN 5   // GPIO 5
                                              // Status LED
#define LED_PIN 2 // GPIO 2 (Built-in LED)
#else
                                              // NodeMCU pins
#define RST_PIN D3 // GPIO 0
#define SS_PIN D4  // GPIO 2
                                              // Status LED
#define LED_PIN D0 // GPIO 16 (built-in LED on some NodeMCU)
#endif

// Initialize RFID reader
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Initialize WiFi and MQTT clients
WiFiClient espClient;
PubSubClient client(espClient);

// Variables
String currentQuestion = "";
String correctAnswerId = "";
unsigned long lastCardReadTime = 0;
const unsigned long cardReadDelay = 2000; // Prevent multiple reads (2 seconds)

void setup() {
  Serial.begin(115200);
  delay(100);

  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // LED off initially (NodeMCU LED is active LOW)

  // Initialize SPI and RFID
  SPI.begin();
  mfrc522.PCD_Init();

  Serial.println("\n=== Smart EduBuddy RFID Station ===");
  Serial.println("Initializing...");

  // Connect to WiFi
  setupWiFi();

  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  // Connect to MQTT
  reconnectMQTT();

  Serial.println("System Ready!");
  Serial.println("Waiting for RFID cards...");
}

void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Check for RFID cards
  checkRFIDCard();
}

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

    // Blink LED to indicate WiFi connected
    blinkLED(3, 200);
  } else {
    Serial.println("\nWiFi Connection Failed!");
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");

    if (client.connect(mqtt_client_id)) {
      Serial.println("Connected!");

      // Subscribe to question topic
      client.subscribe(topic_question);

      // Publish status
      client.publish(topic_status, "online");

      // Blink LED to indicate MQTT connected
      blinkLED(2, 300);

    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void mqttCallback(char *topic, byte *payload, unsigned int length) {
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Message received on topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  Serial.println(message);

  // Parse question message (format: "QUESTION|correct_answer_id|question_text")
  if (String(topic) == topic_question) {
    int firstPipe = message.indexOf('|');
    int secondPipe = message.indexOf('|', firstPipe + 1);

    if (firstPipe > 0 && secondPipe > 0) {
      correctAnswerId = message.substring(firstPipe + 1, secondPipe);
      currentQuestion = message.substring(secondPipe + 1);

      Serial.print("New Question Set - Correct Answer ID: ");
      Serial.println(correctAnswerId);
      Serial.print("Question: ");
      Serial.println(currentQuestion);

      // Blink LED to indicate new question
      blinkLED(1, 100);
    }
  }
}

void checkRFIDCard() {
  // Check if enough time has passed since last read
  if (millis() - lastCardReadTime < cardReadDelay) {
    return;
  }

  // Look for new cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Card detected - turn on LED
  digitalWrite(LED_PIN, LOW); // LED on

  // Read card UID
  String cardId = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      cardId += "0";
    }
    cardId += String(mfrc522.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();

  Serial.println("\n--- Card Detected ---");
  Serial.print("Card ID: ");
  Serial.println(cardId);

  // Send answer to MQTT
  String answerMessage = cardId;
  client.publish(topic_answer, answerMessage.c_str());

  Serial.println("Answer sent to dashboard!");
  Serial.println("---------------------\n");

  // Update last read time
  lastCardReadTime = millis();

  // Halt PICC
  mfrc522.PICC_HaltA();

  // Turn off LED after brief delay
  delay(500);
  digitalWrite(LED_PIN, HIGH); // LED off
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW); // LED on
    delay(delayMs);
    digitalWrite(LED_PIN, HIGH); // LED off
    delay(delayMs);
  }
}
