#ifndef MEASURE_WATER_FLOW
#define MEASURE_WATER_FLOW

#include "config.h"
#include "utils.h"
#include "mqtt-connection.h"

#include <Arduino.h>

volatile byte pulseCount;
float tempTotalLiters;
extern float flowRate;
extern float totalLiters;

/**
 * @brief Interrupt service routine for the water flow sensor.
 */
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

/**
 * @brief Setup water flow sensors.
 */
void setupWaterFlowSensors() {
  // Initialize water flow sensor
  pulseCount = 0;
  flowRate = 0.0;
  totalLiters = 0.0;

  pinMode(WATER_FLOW_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(WATER_FLOW_SENSOR), pulseCounter, FALLING);
}

/**
 * @brief Measure water flow.
 * 
 * @return float Water flow rate in L/min.
 */
float measureWaterFlow() {
  int pulse1Sec = pulseCount;
  pulseCount = 0;
  int flowRate = (1000.0 / SENSE_INTERVAL_MS) * pulse1Sec / CALIBRATION_FACTOR; // L/min

  // Divide the flow rate in litres/minute by 60 to determine how many litres have
  // passed through the sensor in this 1 second interval
  return flowRate / 60.0;
}

/**
 * @brief Task to measure water flow.
 * 
 * @param pvParameters Parameters for the task.
 */
void measureWaterFlowTask(void *pvParameters) {
  uint8_t i = 1;
  for (;;) {
    unsigned long start = millis();
    // serial_println("Measure power");
    // serial_print("Iteration: ");
    serial_println(i);

    if (i++ % NUM_MEASUREMENTS == 0) {
      totalLiters = tempTotalLiters;
      serial_print("Total liters: ");
      serial_println(totalLiters);

      tempTotalLiters = 0;

      xTaskCreate(
        sendDataToThingsboard,
        "sendDataToThingsboard",
        10000,
        NULL,
        5,
        NULL);

      i = 1;
    }

    unsigned long end = millis();
  
    // Delay to keep the task running every 1 second,
    // deduct the time taken to measure power
    vTaskDelay((SENSE_INTERVAL_MS - (end - start)) / portTICK_PERIOD_MS);

    // Right after this point 1 second have passed, calculate water flow
    flowRate = measureWaterFlow();
    tempTotalLiters += flowRate;

    serial_print("Flow rate: ");
    serial_println(flowRate);
    serial_print("Total liters: ");
    serial_println(tempTotalLiters);
  }
}

#endif