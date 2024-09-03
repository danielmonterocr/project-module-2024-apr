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
extern double totalPower1;
extern double totalPower2;

/**
 * @brief Get value from a string.
 *        Taken from : https://arduino.stackexchange.com/questions/1013/how-do-i-split-an-incoming-string
 * 
 * @param data String to extract value from.
 * @param separator Separator character.
 * @param index Index of the value to extract.
 * 
 * @return String Extracted value.
 */
String getValue(String data, char separator, int index) {
    int found = 0;
    int strIndex[] = { 0, -1 };
    int maxIndex = data.length() - 1;

    for (int i = 0; i <= maxIndex && found <= index; i++) {
        if (data.charAt(i) == separator || i == maxIndex) {
            found++;
            strIndex[0] = strIndex[1] + 1;
            strIndex[1] = (i == maxIndex) ? i+1 : i;
        }
    }
    return found > index ? data.substring(strIndex[0], strIndex[1]) : "";
}

/**
 * @brief Setup power sensors.
 */
void setupCurrentSensors() {
  // Initialize ADCs
  // adc1_config_channel_atten(ADC1_CHANNEL_5, ADC_ATTEN_DB_12);
  // adc1_config_channel_atten(ADC1_CHANNEL_6, ADC_ATTEN_DB_12);
  // analogReadResolution(ADC_BITS);
  // pinMode(ADC_INPUT_1, INPUT);
  // pinMode(ADC_INPUT_2, INPUT);

  // Initialize current sensors
  // emon1.current(ADC_INPUT_1, CT_CALIBRATION); // Current: input pin, calibration
  // emon2.current(ADC_INPUT_2, CT_CALIBRATION); // Current: input pin, calibration

  Serial2.begin(9600, SERIAL_8N1, 16, 17);
}

/**
 * @brief Measure power.
 * 
 * @return double Power.
 */
void measurePower(double *power1, double *power2) {
  uint8_t i = 0;

  // Read the message from Arduino Leonardo
  Serial2.flush();
  while(!Serial2.available() && i++ < 5);

  if (Serial2.available() == 0) {
    serial_println("No message received from Arduino Leonardo");
    return;
  } else {
    String receivedMessage = Serial2.readStringUntil('\n');
    Serial.print("Received message: ");
    Serial.println(receivedMessage);

    *power1 = getValue(receivedMessage, ' ', 0).toDouble();
    *power2 = getValue(receivedMessage, ' ', 1).toDouble();
  }
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

    measurePower(&power1, &power2);

    serial_print("Power 1: ");
    serial_print(power1);
    serial_println("W");
    serial_print("Power 2: ");
    serial_print(power2);
    serial_println("W");

    totalPower1 += power1;
    totalPower2 += power2;

    if (i++ % NUM_MEASUREMENTS == 0) {
      serial_print("Avg power1: ");
      serial_print(totalPower1 / NUM_MEASUREMENTS);
      serial_println("W");
      serial_print("Avg power2: ");
      serial_print(totalPower2 / NUM_MEASUREMENTS);
      serial_println("W");

      totalPower1 = 0;
      totalPower2 = 0;

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