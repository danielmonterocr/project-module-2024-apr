#ifndef MEASURE_POWER
#define MEASURE_POWER

#include "config.h"
#include "utils.h"
#include "mqtt-connection.h"

#include <EmonLib.h>

EnergyMonitor emon1;
EnergyMonitor emon2;

extern double power1;
extern double power2;

/**
 * @brief Setup power sensors.
 */
void setupCurrentSensors() {
  // Initialize current sensors
  emon1.current(ADC_INPUT_1, CT_CALIBRATION); // Current: input pin, calibration
  emon2.current(ADC_INPUT_2, CT_CALIBRATION); // Current: input pin, calibration
}

/**
 * @brief Measure power 1.
 * 
 * @return double Power 1.
 */
double measurePower1() {
  double irms1 = emon1.calcIrms(1480); // Calculate Irms only
  serial_print("Current 1: ");
  serial_print(irms1);
  serial_println("A");

  return irms1 * HOME_VOLTAGE;
}

/**
 * @brief Measure power 2.
 * 
 * @return double Power 2.
 */
double measurePower2() {
  double irms2 = emon2.calcIrms(1480); // Calculate Irms only
  serial_print("Current 2: ");
  serial_print(irms2);
  serial_println("A");

  return irms2 * HOME_VOLTAGE;
}

/**
 * @brief Measure power task.
 * 
 * @param pvParameters Parameters for the task.
 */
void measurePowerTask(void *pvParameters) {
  uint8_t i = 1;
  for(;;) {
    serial_println("Measure power");
    serial_print("Iteration: ");
    serial_println(i);

    unsigned long start = millis();

    power1 += measurePower1();
    power2 += measurePower2();
    blinkLED(BUILTIN_LED, 1, 500); // Blink once with 500ms delay

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

        i = 0;
        power1 = 0;
        power2 = 0;
    }

    unsigned long end = millis();

    // Delay to keep the task running every 2 seconds,
    // deduct the time taken to measure power
    vTaskDelay((MQTT_PUBLISH_INTERVAL_MS - (end - start)) / portTICK_PERIOD_MS);
  }
}

#endif