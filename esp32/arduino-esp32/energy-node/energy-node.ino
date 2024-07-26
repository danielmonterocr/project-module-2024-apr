#include <WiFi.h>
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>
#include "EmonLib.h"


#define SERIAL_DEBUG_BAUD 115200

#define WIFI_AP_NAME "Nour"
#define WIFI_PASSWORD "tinyfootprint"

#define TOKEN "kyq1jaj7y5u6bnmt7njm"
#define THINGSBOARD_SERVER "34.122.121.12"

#define CURRENT_SENSOR1 33
#define CURRENT_SENSOR2 34

WiFiClient espClient;
const char *hostname = "Power monitor";
volatile int wifi_cnt = 0;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);
volatile int mqtt_cnt = 0;

EnergyMonitor emon1;
EnergyMonitor emon2;

double power1, power2;

uint32_t interval = 60 * 1000;
long strt = 0L;
TaskHandle_t xHandle = NULL;

void send_power(void *pvParameters);

void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);
  delay(10);

  // Connect to WiFi network
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(hostname);
  //WiFi.config(local_IP, gateway, subnet);
  WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    wifi_cnt++;
    Serial.println("Connecting to WiFi...");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Connected to the WiFi network");
    Serial.print("IP address: ");
    Serial.print(WiFi.localIP());
    Serial.printf(" after %d tries\n", wifi_cnt);
  } else {
    Serial.println(" Not connected to the WiFi network");
    // Serial.println("Restart ESP32");
    // esp_restart();
  }

  // Initialize current sensors
  emon1.current(CURRENT_SENSOR1, 111.1);  // Current: input pin, calibration
  emon2.current(CURRENT_SENSOR2, 111.1);  // Current: input pin, calibration

  // Setup thread
  Serial.println("Create send_power thread");
  xTaskCreatePinnedToCore(
    send_power,
    "send_power",
    2048,
    NULL,
    6,         // Priority
    &xHandle,  // Task Handle
    1);        // Run on Core 1 for best sampling?
  configASSERT(xHandle);
}

void loop() {}

void send_power(void *pvParameters) {
  Serial.println("Inside send_power");

  for (;;) {
    static uint32_t nextTime;
    vTaskDelay(1);
    strt = xTaskGetTickCount();

    // Check if it is a time to send data
    if (millis() - nextTime >= interval) {
      Serial.println("Send power");
      mqtt_cnt = 0;

      while (!tb.connected() && mqtt_cnt < 5) {
        Serial.print("Connecting to: ");
        Serial.print(THINGSBOARD_SERVER);
        Serial.print(" with token ");
        Serial.println(TOKEN);
        if (tb.connect(THINGSBOARD_SERVER, TOKEN)) {
          Serial.println("Read power");

          double irms1 = emon1.calcIrms(1480);  // Calculate Irms only
          double irms2 = emon2.calcIrms(1480);  // Calculate Irms only

          power1 = irms1 * 110.0;
          Serial.print(irms1 * 110.0);  // Apparent power
          Serial.print(" ");
          Serial.print(irms1);  // Irms

          power2 = irms2 * 110.0;
          Serial.print(" ");
          Serial.print(irms2 * 110.0);  // Apparent power
          Serial.print(" ");
          Serial.println(irms2);  // Irms

          Serial.println("Sending data...");

          // Uploads new telemetry to ThingsBoard using MQTT.
          // See https://thingsboard.io/docs/reference/mqtt-api/#telemetry-upload-api
          // for more details
          tb.sendTelemetryData("power1", power1);
          tb.sendTelemetryData("power2", power2);
          // Process messages
          if (tb.loop()) {
            Serial.println("Message sent successfully!");
          }

          Serial.print("Free heap: ");
          Serial.println(ESP.getFreeHeap());
        } else {
          Serial.print("Failed to connect to MQTT with WiFi state: ");
          Serial.println(WiFi.status());
          delay(1000);
          mqtt_cnt++;
        }
        if (mqtt_cnt >= 5) {
          Serial.println(" Not connected to MQTT server");
          Serial.println("Restart ESP32");
          esp_restart();
        }
      }

      Serial.println("Disconnect form MQTT server");
      tb.disconnect();

      Serial.println("Increase next time by interval");
      nextTime += interval;
    }
  }
}
