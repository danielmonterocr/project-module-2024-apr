#ifndef UTILS
#define UTILS

#include <Arduino.h>

/**
 * @brief Blink the built-in LED.
 * 
 * @param pin Pin number of the LED.
 * @param blinks Number of times to blink the LED.
 * @param delayTime Delay time in milliseconds between blinks.
 */
void blinkLED(uint8_t pin, int blinks, int delayTime) {
  for (int i = 0; i < blinks; i++) {
    digitalWrite(pin, HIGH);
    delay(delayTime);
    digitalWrite(pin, LOW);
    delay(delayTime);
  }
}

#endif