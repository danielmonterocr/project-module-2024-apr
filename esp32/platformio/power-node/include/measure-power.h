#ifndef MEASURE_POWER
#define MEASURE_POWER

#include "config.h"
#include "utils.h"
#include "mqtt-connection.h"

#include <driver/adc.h>
#include <EmonLib.h>

EnergyMonitor emon1;
EnergyMonitor emon2;

extern double power1;
extern double power2;

/**
 * @brief Setup power sensors.
 */
void setupCurrentSensors() {
  // Initialize ADCs
  adc1_config_channel_atten(ADC1_CHANNEL_0, ADC_ATTEN_DB_12);
  analogReadResolution(ADC_BITS);
  pinMode(ADC_INPUT_1, INPUT);
  pinMode(ADC_INPUT_2, INPUT);

  // Initialize current sensors
  emon1.current(ADC_INPUT_1, CT_CALIBRATION); // Current: input pin, calibration
  emon2.current(ADC_INPUT_2, CT_CALIBRATION); // Current: input pin, calibration
}

/**
 * @brief Measure power.
 * 
 * @return double Power.
 */
double measurePower(EnergyMonitor emon) {
  double irms1 = emon.calcIrms(1480); // Calculate Irms only
  serial_print("Current: ");
  serial_print(irms1);
  serial_println("A");

  return irms1 * HOME_VOLTAGE;
}

/**
 * @brief Measure power task.
 * 
 * @param pvParameters Parameters for the task.
 */
void measurePowerTask(void *pvParameters) {
  uint8_t i = 1;
  for(;;) {
    // serial_println("Measure power");
    // serial_print("Iteration: ");
    serial_println(i);

    unsigned long start = millis();

    power1 += measurePower(emon1);
    power2 += measurePower(emon2);

    serial_print("Power 1: ");
    serial_println(power1);
    serial_print("Power 2: ");
    serial_println(power2);

    if (i++ % NUM_MEASUREMENTS == 0) {
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

    // Delay to keep the task running every 2 seconds,
    // deduct the time taken to measure power
    vTaskDelay((MQTT_PUBLISH_INTERVAL_MS - (end - start)) / portTICK_PERIOD_MS);
  }
}

#endif
