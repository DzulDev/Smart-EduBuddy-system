/*
 * Smart EduBuddy - Button Test Station
 * Hardware: NodeMCU ESP8266 + 2 Push Buttons
 * Purpose: Test MQTT connection and button inputs independently of RFID.
 */

#ifdef ESP32
#include <WiFi.h>
#else
#include <ESP8266WiFi.h>
#endif
#include <PubSubClient.h>

// WiFi Configuration
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char *mqtt_server =
    "broker.hivemq.com"; // Free public broker (replace with your own)
const int mqtt_port = 1883;
const char *mqtt_client_id = "EduBuddy_Test_Station";

// MQTT Topics
const char *topic_answer = "edubuddy/answer"; // Publish: Send student answers
const char *topic_status = "edubuddy/status"; // Publish: Device status

// Button Pin Configuration
#ifdef ESP32
#define BUTTON1_PIN 26 // GPIO 26
#define BUTTON2_PIN 27 // GPIO 27
#define LED_PIN 2      // GPIO 2 (Built-in LED)
#else
#define BUTTON1_PIN D1
#define BUTTON2_PIN D2
#define LED_PIN D0 // GPIO 16
#endif

// Initialize WiFi and MQTT clients
WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  delay(100);

  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // LED off initially

  // Initialize Buttons
  pinMode(BUTTON1_PIN, INPUT_PULLUP);
  pinMode(BUTTON2_PIN, INPUT_PULLUP);

  Serial.println("\n=== Smart EduBuddy Button Test ===");
  Serial.println("Initializing...");

  // Connect to WiFi
  setupWiFi();

  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);

  // Connect to MQTT
  reconnectMQTT();

  Serial.println("System Ready!");
  Serial.println("Waiting for Button Press...");
}

void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Check buttons
  checkButtons();
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
      client.publish(topic_status, "online");
      blinkLED(2, 300);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void checkButtons() {
  // Button 1 Test (Sends Red Card ID)
  if (digitalRead(BUTTON1_PIN) == LOW) {
    Serial.println("\n--- Button 1 Pressed ---");
    Serial.println("Sending: 01RED");
    // Simulate Card ID: 01RED
    client.publish(topic_answer, "01RED");
    blinkLED(1, 100);
    delay(500); // Debounce
  }

  // Button 2 Test (Sends Blue Card ID)
  if (digitalRead(BUTTON2_PIN) == LOW) {
    Serial.println("\n--- Button 2 Pressed ---");
    Serial.println("Sending: 02BLUE");
    // Simulate Card ID: 02BLUE
    client.publish(topic_answer, "02BLUE");
    blinkLED(1, 100);
    delay(500); // Debounce
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW); // LED on
    delay(delayMs);
    digitalWrite(LED_PIN, HIGH); // LED off
    delay(delayMs);
  }
}
