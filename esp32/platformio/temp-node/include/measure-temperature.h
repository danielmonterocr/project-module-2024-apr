#ifndef MEASURE_TEMPERATURE
#define MEASURE_TEMPERATURE

#include "config.h"
#include "utils.h"
#include "mqtt-connection.h"

#include <OneWire.h>
#include <DallasTemperature.h>

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
DeviceAddress tempDeviceAddress;

double tempTemperature1;
double tempTemperature2;
extern double temperature1;
extern double temperature2;
extern double totalTemperature1;
extern double totalTemperature2;

/**
 * @brief Setup temperature sensors.
 */
void setupTemperatureSensors() {
  int numberOfDevices;
  // Initialize temperature sensors
  sensors.begin();
  sensors.setResolution(TEMPERATURE_PRECISION);
  // Grab a count of devices on the wire
  numberOfDevices = sensors.getDeviceCount();
  // Locate devices on the bus
  Serial.println("Locating devices...");
  Serial.print("Found ");
  Serial.print(numberOfDevices);
  Serial.println(" devices");
}

/**
 * @brief Measure temperature.
 * 
 * @return Temperature in Celsius.
 */
float measureTemperature(uint8_t deviceIndex) {
  float temp = 0;
  sensors.requestTemperatures();
  while (!sensors.isConversionComplete());

  // Get temperature from first sensor
  temp = sensors.getTempCByIndex(deviceIndex);

  return temp;
}

/**
 * @brief Measure temperature task.
 * 
 * @param pvParameters Parameters for the task.
 */
void measureTemperatureTask(void *pvParameters) {
  uint8_t i = 1;
  for(;;) {
    // serial_println("Measure temperature");
    // serial_print("Iteration: ");
    serial_println(i);

    unsigned long start = millis();

    tempTemperature1 = measureTemperature(0);
    tempTemperature2 = measureTemperature(1);

    serial_print("Temp 1: ");
    serial_print(tempTemperature1);
    serial_println("C");
    serial_print("Temp 2: ");
    serial_print(tempTemperature2);
    serial_println("C");

    temperature1 += tempTemperature1;
    temperature2 += tempTemperature2;

    if (i++ % NUM_MEASUREMENTS == 0) {
      totalTemperature1 = temperature1;
      totalTemperature2 = temperature2;
      serial_print("Avg temp1: ");
      serial_print(totalTemperature1 / NUM_MEASUREMENTS);
      serial_println("C");
      serial_print("Avg temp2: ");
      serial_print(totalTemperature2 / NUM_MEASUREMENTS);
      serial_println("C");

      temperature1 = 0;
      temperature2 = 0;

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
    vTaskDelay((SENSE_INTERVAL_MS - (end - start)) / portTICK_PERIOD_MS);
  }
}

#endif