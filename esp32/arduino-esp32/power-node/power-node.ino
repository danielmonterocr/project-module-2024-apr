#include <WiFi.h>
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>
#include "EmonLib.h"


#define SERIAL_DEBUG_BAUD 115200

#define WIFI_AP_NAME "Nour"
#define WIFI_PASSWORD "tinyfootprint"

#define TOKEN "fxnucc349cdzy1885hkg"
#define THINGSBOARD_SERVER "34.66.170.15"

#define CURRENT_SENSOR1 33
#define CURRENT_SENSOR2 34

WiFiClient espClient;
const char *hostname = "Power node";
volatile int wifiCnt = 0;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);
volatile int mqttCnt = 0;

EnergyMonitor emon1;
EnergyMonitor emon2;

double power1, power2;

uint32_t interval = 60 * 1000;
long strt = 0L;
TaskHandle_t xHandle = NULL;

void sendPower(void *pvParameters);

void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);
  delay(10);

  pinMode(LED_BUILTIN, OUTPUT);

  // Connect to WiFi network
  // WiFi.mode(WIFI_STA);
  // WiFi.setHostname(hostname);
  //WiFi.config(local_IP, gateway, subnet);
  int status = WL_IDLE_STATUS;
  // attempt to connect to Wifi network:
  WiFi.disconnect();
  WiFi.waitForConnectResult();
  while (status != WL_CONNECTED) {
    Serial.print("Attempting to connect to network, SSID: ");
    Serial.println(WIFI_AP_NAME);
    WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
    status = WiFi.waitForConnectResult();
    Serial.print("Status: ");
    Serial.println(status);
    // wait 10 seconds for connection:
    delay(10000);
    wifiCnt += 1;
    
    if (wifiCnt == 5) {
      Serial.println("Restart ESP32");
      esp_restart();
    }
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Connected to the WiFi network");
    Serial.print("IP address: ");
    Serial.print(WiFi.localIP());
    Serial.printf(" after %d tries\n", wifiCnt);
  } else {
    Serial.println(" Not connected to the WiFi network");
  }

  // Initialize current sensors
  emon1.current(CURRENT_SENSOR1, 111.1);  // Current: input pin, calibration
  emon2.current(CURRENT_SENSOR2, 111.1);  // Current: input pin, calibration

  // Setup thread
  Serial.println("Create sendPower thread");
  xTaskCreatePinnedToCore(
    sendPower,
    "sendPower",
    2048,
    NULL,
    6,         // Priority
    &xHandle,  // Task Handle
    1);        // Run on Core 1 for best sampling?
  configASSERT(xHandle);
}

void loop() {}

void sendPower(void *pvParameters) {
  Serial.println("Inside sendPower");

  for (;;) {
    static uint32_t nextTime;
    vTaskDelay(1);
    strt = xTaskGetTickCount();

    // Check if it is a time to send data
    if (millis() - nextTime >= interval) {
      Serial.println("Sense power");
      blinkSense();
      mqttCnt = 0;

      while (!tb.connected() && mqttCnt < 5) {
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
          blinkSend();

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
          mqttCnt++;
        }
        if (mqttCnt >= 5) {
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

void blinkSense() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}

void blinkSend() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(200);
  digitalWrite(LED_BUILTIN, LOW);
  delay(200);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(200);
  digitalWrite(LED_BUILTIN, LOW);
  delay(200);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(200);
  digitalWrite(LED_BUILTIN, LOW);
  delay(200);
}
