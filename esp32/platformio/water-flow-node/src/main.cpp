#include "config.h"
#include "measure-water-flow.h"
#include "wifi-connection.h"
#include "mqtt-connection.h"

#include <Arduino.h>
#include <esp_task_wdt.h>

xTaskHandle measureWaterFlowTaskHandle = NULL;
xTaskHandle sendDataToThingsboardHandle = NULL;
float flowRate;
float totalLiters;

/**
 * @brief Setup function to initialize the ESP32.
 */
void setup() {
  // Initialize serial for debugging
#ifdef DEBUG
  Serial.begin(SERIAL_DEBUG_BAUD);
#endif
  // Initialize built-in LED
  pinMode(LED_BUILTIN, OUTPUT);

  setupWaterFlowSensors();

  esp_task_wdt_init(WDT_TIMEOUT, true);

    /**
   * Creates a new task and assigns it to a specific core.
   *
   * @param pvTaskCode A pointer to the task entry function.
   * @param pcName A descriptive name for the task.
   * @param usStackDepth The size of the task stack in words.
   * @param pvParameters A pointer to the task's parameters.
   * @param uxPriority The priority of the task.
   * @param pxCreatedTask A pointer to a variable that will receive the task handle.
   * @param xCoreID The ID of the core to which the task should be pinned (optional).
   */

  // Connect to WiFi network and connection alive
  serial_println("Create keepWifiAliveTask task");
  xTaskCreatePinnedToCore(
      keepWifiAliveTask,
      "keepWifiAliveTask",
      5000,
      NULL,
      1,
      NULL,
      ARDUINO_RUNNING_CORE);

  serial_println("Create keepMQTTConnectionAlive task");
  xTaskCreate(
      keepMqttConnectionAliveTask,
      "keepMqttConnectionAliveTask",
      5000,
      NULL,
      5,
      NULL);

  serial_println("Create monitorTask task");
  xTaskCreate(
      measureWaterFlowTask,
      "measureWaterFlowTask",
      5000,
      NULL,
      4,
      &measureWaterFlowTaskHandle);
  esp_task_wdt_add(measureWaterFlowTaskHandle);
}

/**
 * @brief Main loop function. Empty as tasks are handled by FreeRTOS.
 */
void loop() {}