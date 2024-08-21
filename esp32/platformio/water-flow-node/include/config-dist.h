#ifndef CONFIG
#define CONFIG

#define DEBUG true

#define DEVICE_NAME "Water flow node"

#define SERIAL_DEBUG_BAUD 115200

#define WIFI_AP_NAME "Nour"
#define WIFI_PASSWORD "tinyfootprint"
#define WIFI_CHECK_INTERVAL_MS 10000
#define WIFI_TIMEOUT_MS 20000
#define WIFI_RECONNECT_TIMEOUT_MS 20000

#define THINGSBOARD_SERVER "34.66.170.15"
#define THINGSBOARD_TOKEN "fxnucc349cdzy1885hkg"
#define MQTT_CHECK_INTERVAL_MS 500
#define MQTT_WIFI_CHECK_INTERVAL_MS 1000
#define MQTT_CONNECT_DELAY_MS 200
#define MQTT_RECONNECT_TIMEOUT_MS 20000
#define MQTT_PUBLISH_INTERVAL_MS 2000

#define WATER_FLOW_SENSOR 27
#define CALIBRATION_FACTOR 7.11

#define NUM_MEASUREMENTS 120

#if DEBUG == true
  #define serial_print(x)  Serial.print(x)
  #define serial_println(x)  Serial.println(x)
#else
  #define serial_print(x)
  #define serial_println(x)
#endif

#endif