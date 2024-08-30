#ifndef MQTT_CONNECTION
#define MQTT_CONNECTION

#include "config.h"
#include "utils.h"

#include <WiFi.h>
#include "Update.h"
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>

WiFiClient espClient;
Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);

extern double power1;
extern double power2;

/**
 * @brief Task to keep MQTT connection alive.
 * 
 * @param pvParameters Parameters for the task.
 */
void keepMqttConnectionAliveTask(void* pvParameters) {
  for(;;) {
    // If connected delay and check again
    if (tb.connected()) {
      tb.loop();
      vTaskDelay(MQTT_CHECK_INTERVAL_MS / portTICK_PERIOD_MS);
      continue;
    }

    if (!WiFi.isConnected()) {
      vTaskDelay(MQTT_WIFI_CHECK_INTERVAL_MS / portTICK_PERIOD_MS);
      continue;
    }

    long startAttemptTime = millis();

    serial_println("Connecting to MQTT server...");
    while(!tb.connect(THINGSBOARD_SERVER, THINGSBOARD_TOKEN) && 
          millis() - startAttemptTime < MQTT_RECONNECT_TIMEOUT_MS);

    if(!tb.connected()) {
      serial_println("Failed to connect to MQTT server. Wait and retry...");
      vTaskDelay(MQTT_RECONNECT_TIMEOUT_MS / portTICK_PERIOD_MS);
      continue;
    }

    serial_println("Connected to MQTT server");
  }
}

/**
 * @brief Task to send data to ThingsBoard.
 * 
 * @param pvParameters Parameters for the task.
 */
void sendDataToThingsboard(void* pvParams) {
  if (!WiFi.isConnected() || !tb.connected()) {
    serial_println("WiFi or MQTT not connected. Exiting sendDataToThingsboard task...");
    vTaskDelete(NULL);
  }

  serial_println("Sending data...");
  // Uploads new telemetry to ThingsBoard using MQTT.
  // See https://thingsboard.io/docs/reference/mqtt-api/#telemetry-upload-api
  // for more details
  tb.sendTelemetryData("power1", power1);
  tb.sendTelemetryData("power2", power2);
  blinkLED(BUILTIN_LED, 3, 200); // Blink three times with 200ms delay

  vTaskDelete(NULL);
}

#endif