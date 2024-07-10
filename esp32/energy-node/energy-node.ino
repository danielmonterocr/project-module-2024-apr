// EmonLibrary examples openenergymonitor.org, Licence GNU GPL V3

#include "EmonLib.h"                   // Include Emon Library
EnergyMonitor emon1;                   // Create an instance
EnergyMonitor emon2;                   // Create an instance

void setup()
{  
  Serial.begin(9600);
  
  emon1.current(33, 111.1);             // Current: input pin, calibration.
  emon2.current(34, 111.1);             // Current: input pin, calibration.
}

void loop()
{
  double irms1 = emon1.calcIrms(1480);  // Calculate Irms only
  double irms2 = emon2.calcIrms(1480);  // Calculate Irms only
  
  Serial.print(irms1 * 110.0);	        // Apparent power
  Serial.print(" ");
  Serial.print(irms1);		              // Irms

  Serial.print(" ");
  Serial.print(irms2 * 110.0);	        // Apparent power
  Serial.print(" ");
  Serial.println(irms2);		            // Irms
}
