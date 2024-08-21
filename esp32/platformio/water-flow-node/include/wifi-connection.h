#ifndef WIFI_CONNECTION
#define WIFI_CONNECTION

#include "config.h"

#include <WiFi.h>

/**
 * @brief Task to monitor WiFi connection.
 * 
 * @param pvParameters Parameters for the task.
 */
void keepWifiAliveTask(void* pvParameters) {
  for (;;) {
    // If connected delay and check again
    if (WiFi.status() == WL_CONNECTED) {
      serial_println("WiFi still connected");
      vTaskDelay(WIFI_CHECK_INTERVAL_MS / portTICK_PERIOD_MS);
      continue;
    }

    serial_println("WiFi disconnected, connecting...");
    WiFi.mode(WIFI_STA);
    WiFi.setHostname(DEVICE_NAME);
    WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);

    unsigned long startAttemptTime = millis();

    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_TIMEOUT_MS);

    // If not connected, delay and try again
    if (WiFi.status() != WL_CONNECTED) {
      serial_println("WiFi failed to connect");
      vTaskDelay(WIFI_RECONNECT_TIMEOUT_MS / portTICK_PERIOD_MS);
      continue;
    }

    serial_println("WiFi reconnected: " + WiFi.localIP().toString());
  }
}

#endif