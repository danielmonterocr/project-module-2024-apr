#include "EmonLib.h"
#include <SoftwareSerial.h>

#define RX 10
#define TX 11
#define CURRENT_CALIBRATION 16.66
#define NUM_SAMPLES 1480
#define VOLTAGE 118.0

EnergyMonitor emon1, emon2;                  // Create an instance
SoftwareSerial ArduinoLeoSoftSerial(RX, TX); // RX, TX

void setup()
{
  Serial.begin(9600);

  ArduinoLeoSoftSerial.begin(9600);

  emon1.current(0, CURRENT_CALIBRATION); // Current: input pin, calibration.
  emon2.current(1, CURRENT_CALIBRATION); // Current: input pin, calibration.
}

void loop()
{
  double Irms1 = emon1.calcIrms(NUM_SAMPLES); // Calculate Irms only
  double Irms2 = emon2.calcIrms(NUM_SAMPLES); // Calculate Irms only

  double realPower1 = Irms1 * VOLTAGE; // Calculate real power
  double realPower2 = Irms2 * VOLTAGE; // Calculate real power

  Serial.print(realPower1); // Apparent power
  Serial.print(" ");
  Serial.print(Irms1); // Irms
  Serial.print(" ");

  Serial.print(realPower2); // Apparent power
  Serial.print(" ");
  Serial.println(Irms2); // Irms

  // Send data to ESP32 trough serial ports
  ArduinoLeoSoftSerial.print(realPower1);
  ArduinoLeoSoftSerial.print(" ");
  ArduinoLeoSoftSerial.print(realPower2);
  ArduinoLeoSoftSerial.print("\n");

  delay(200);
}