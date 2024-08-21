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

extern double temperature1;
extern double temperature2;

/**
 * @brief Setup temperature sensors.
 */
void setupTemperatureSensors() {
  int numberOfDevices;
  // Initialize temperature sensors
  sensors.begin();
  // Grab a count of devices on the wire
  numberOfDevices = sensors.getDeviceCount();
  // Locate devices on the bus
  Serial.println("Locating devices...");
  Serial.print("Found ");
  Serial.print(numberOfDevices);
  Serial.println(" devices");
}

/**
 * @brief Measure temperature 1.
 * 
 * @return Temperature in Celsius.
 */
float measureTemperature1() {
  sensors.requestTemperatures();  // Send the command to get temperatures
  float temp = 0;

  // Get temperature from first sensor
  if (sensors.getAddress(tempDeviceAddress, 0)) {
    // Output the device ID
    // Serial.print("Temperature for device: ");
    // Serial.println(0, DEC);
    // Print the data
    temp = sensors.getTempC(tempDeviceAddress);
    serial_print("Temp C: ");
    serial_println(temp);
    return temp;
  }

  serial_println("Temp sensor1 not found");
  return temp;
}

/**
 * @brief Measure temperature 2.
 * 
 * @return Temperature in Celsius.
 */
float measureTemperature2() {
  sensors.requestTemperatures();  // Send the command to get temperatures
  float temp = 0;

  // Get temperature from second sensor
  if (sensors.getAddress(tempDeviceAddress, 1)) {
    // Output the device ID
    // Serial.print("Temperature for device: ");
    // Serial.println(1, DEC);
    // Print the data
    temp = sensors.getTempC(tempDeviceAddress);
    serial_print("Temp C: ");
    serial_println(temp);
    return temp;
  }

  serial_println("Temp sensor2 not found");
  return 0;
}

/**
 * @brief Measure temperature task.
 * 
 * @param pvParameters Parameters for the task.
 */
void measureTemperatureTask(void *pvParameters) {
  uint8_t i = 1;
  for(;;) {
    serial_println("Measure temperature");
    serial_print("Iteration: ");
    serial_println(i);

    unsigned long start = millis();

    temperature1 += measureTemperature1();
    temperature2 += measureTemperature2();
    blinkLED(BUILTIN_LED, 1, 500); // Blink once with 500ms delay

    if (i++ % NUM_MEASUREMENTS == 0) {
      /*
       * Calculate average temperature for time elapsed
       */
      temperature1 /= NUM_MEASUREMENTS;
      temperature2 /= NUM_MEASUREMENTS;
      serial_print("Average temp1: ");
      serial_println(temperature1);
      serial_print("Average temp2: ");
      serial_println(temperature2);

      xTaskCreate(
        sendDataToThingsboard,
        "sendDataToThingsboard",
        10000,
        NULL,
        5,
        NULL);

        i = 0;
        temperature1 = 0;
        temperature2 = 0;
    }

    unsigned long end = millis();

    // Delay to keep the task running every 2 seconds,
    // deduct the time taken to measure power
    vTaskDelay((MQTT_PUBLISH_INTERVAL_MS - (end - start)) / portTICK_PERIOD_MS);
  }
}

#endif
