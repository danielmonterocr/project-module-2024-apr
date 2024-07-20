#include <WiFi.h>
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>
#include "EmonLib.h"


#define SERIAL_DEBUG_BAUD   115200

#define WIFI_AP_NAME        "Nour"
#define WIFI_PASSWORD       "tinyfootprint"

#define TOKEN               "kyq1jaj7y5u6bnmt7njm"
#define THINGSBOARD_SERVER  "34.122.121.12"

#define ENERGY_SENSOR1      33
#define ENERGY_SENSOR2      34

WiFiClient espClient;

// the Wifi radio's status
int status = WL_IDLE_STATUS;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);

EnergyMonitor emon1;
EnergyMonitor emon2;

double power1, power2;

uint32_t interval = 60*1000;

// Set to true if application is subscribed for the messages
bool subscribed = false;

void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);

  // Connect to WiFi network
  WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
  initWiFi();
  
  emon1.current(ENERGY_SENSOR1, 111.1);   // Current: input pin, calibration.
  emon2.current(ENERGY_SENSOR2, 111.1);   // Current: input pin, calibration.
}

void loop() {
  static uint32_t nextTime;

  // Reconnect to WiFi, if needed
  if (WiFi.status() != WL_CONNECTED) {
    reconnect();
    return;
  }

  // Reconnect to ThingsBoard, if needed
  if (!tb.connected()) {
    subscribed = false;

    // Connect to the ThingsBoard
    Serial.print("Connecting to: ");
    Serial.print(THINGSBOARD_SERVER);
    Serial.print(" with token ");
    Serial.println(TOKEN);
    if (!tb.connect(THINGSBOARD_SERVER, TOKEN)) {
      Serial.println("Failed to connect");
      return;
    }
  }
  
  // Check if it is a time to send temperature
  if (millis() - nextTime >= interval) {
    double irms1 = emon1.calcIrms(1480);  // Calculate Irms only
    double irms2 = emon2.calcIrms(1480);  // Calculate Irms only
    
    power1 = irms1 * 110.0;
    Serial.print(irms1 * 110.0);	        // Apparent power
    Serial.print(" ");
    Serial.print(irms1);		              // Irms

    power2 = irms2 * 110.0;
    Serial.print(" ");
    Serial.print(irms2 * 110.0);	        // Apparent power
    Serial.print(" ");
    Serial.println(irms2);		            // Irms

    Serial.println("Sending data...");

    // Uploads new telemetry to ThingsBoard using MQTT. 
    // See https://thingsboard.io/docs/reference/mqtt-api/#telemetry-upload-api 
    // for more details
    tb.sendTelemetryData("power1", power1);
    tb.sendTelemetryData("power2", power2);

    nextTime += interval;
  }

  // Process messages
  tb.loop();
}

void initWiFi() {
  Serial.println("Connecting to AP ...");
  // attempt to connect to WiFi network

  WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to AP");
}

void reconnect() {
  // Loop until we're reconnected
  status = WiFi.status();
  if ( status != WL_CONNECTED) {
    WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("Connected to AP");
  }
}