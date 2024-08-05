#include <WiFi.h>
#include "Update.h"
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>
#include <OneWire.h>
#include <DallasTemperature.h>


#define NODE_NAME "Temperature node"

#define SERIAL_DEBUG_BAUD 9600

#define WIFI_AP_NAME "Nour"
#define WIFI_PASSWORD "tinyfootprint"

#define TOKEN "lu4hhvnjdsjbjao9i0ha"
#define THINGSBOARD_SERVER "34.66.170.15"

// Data wire is plugged TO GPIO 4
#define ONE_WIRE_BUS 4

WiFiClient espClient;
volatile int wifiCnt = 0;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);
volatile int mqttCnt = 0;

// Setup a oneWire instance to communicate with any OneWire devices (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);
// Pass our oneWire reference to Dallas Temperature
DallasTemperature sensors(&oneWire);
// Number of temperature devices found
int numberOfDevices;
// We'll use this variable to store a found device address
DeviceAddress tempDeviceAddress;
float intTemp, extTemp;

uint32_t interval = 60 * 1000;
long strt = 0L;
TaskHandle_t xHandle = NULL;

void connectToWiFi(const char* ssid, const char* password, const char* hostname);
void setupTemperatureSensors();
void monitorTask(void* pvParameters);
void printAddress(DeviceAddress deviceAddress);
void measureTemperature();
void blinkLED(int blinks, int delayTime);

/**
 * @brief Setup function to initialize the ESP32.
 */
void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);
  delay(10);

  pinMode(LED_BUILTIN, OUTPUT);

  connectToWiFi(WIFI_AP_NAME, WIFI_PASSWORD, NODE_NAME);

  setupTemperatureSensors();

  // Setup thread
  Serial.println("Create monitorTask thread");
  xTaskCreatePinnedToCore(monitorTask, "monitorTask", 2048, NULL, 6, &xHandle, 1);
  configASSERT(xHandle);
}

/**
 * @brief Main loop function. Empty as tasks are handled by FreeRTOS.
 */
void loop() {}

/**
 * @brief Task to monitor data.
 * 
 * @param pvParameters Parameters for the task.
 */
void monitorTask(void* pvParameters) {
  Serial.println("Inside monitorTask");

  for (;;) {
    static uint32_t nextTime;
    vTaskDelay(1);
    strt = xTaskGetTickCount();

    // Check if it is a time to send data
    if (millis() - nextTime >= interval) {
      mqttCnt = 0;

      while (!tb.connected() && mqttCnt < 5) {
        Serial.print("Connecting to: ");
        Serial.print(THINGSBOARD_SERVER);
        Serial.print(" with token ");
        Serial.println(TOKEN);

        if (tb.connect(THINGSBOARD_SERVER, TOKEN)) {
          Serial.println("Measure temperature");
          measureTemperature();
          blinkLED(1, 500);  // Blink once with 500ms delay

          Serial.println("Sending data...");
          // Uploads new telemetry to ThingsBoard using MQTT.
          // See https://thingsboard.io/docs/reference/mqtt-api/#telemetry-upload-api
          // for more details
          tb.sendTelemetryData("intTemp", intTemp);
          tb.sendTelemetryData("extTemp", extTemp);
          // Process messages
          if (tb.loop()) {
            Serial.println("Message sent successfully!");
            blinkLED(3, 200);  // Blink three times with 200ms delay
          }

          Serial.print("Free heap: ");
          Serial.println(ESP.getFreeHeap());
        } else {
          Serial.print("Failed to connect to MQTT with WiFi state: ");
          Serial.println(WiFi.status());
          delay(1000);
          mqttCnt++;
        }
        if (mqttCnt >= 5) {
          Serial.println(" Not connected to MQTT server");
          Serial.println("Restart ESP32");
          esp_restart();
        }
      }

      Serial.println("Disconnect from MQTT server");
      tb.disconnect();

      Serial.println("Increase next time by interval");
      nextTime += interval;
    }
  }
}

/**
 * @brief Connect to a WiFi network.
 * 
 * @param ssid The SSID of the WiFi network.
 * @param password The password of the WiFi network.
 * @param hostname The hostname for the device.
 */
void connectToWiFi(const char* ssid, const char* password, const char* hostname) {
  // Connect to WiFi network
  // WiFi.mode(WIFI_STA);
  WiFi.setHostname(hostname);
  //WiFi.config(local_IP, gateway, subnet);
  int status = WL_IDLE_STATUS;
  // attempt to connect to Wifi network:
  WiFi.disconnect();
  WiFi.waitForConnectResult();

  while (status != WL_CONNECTED) {
    Serial.print("Attempting to connect to network, SSID: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    status = WiFi.waitForConnectResult();
    Serial.print("Status: ");
    Serial.println(status);
    // wait 10 seconds for connection:
    delay(10000);
    wifiCnt += 1;

    if (wifiCnt == 5) {
      Serial.println("Restart ESP32");
      esp_restart();
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Connected to the WiFi network");
    Serial.print("IP address: ");
    Serial.print(WiFi.localIP());
    Serial.printf(" after %d tries\n", wifiCnt);
  } else {
    Serial.println(" Not connected to the WiFi network");
  }
}

/**
 * @brief Setup temperature sensors.
 */
void setupTemperatureSensors() {
  // Initialize temperature sensors
  sensors.begin();
  // Grab a count of devices on the wire
  numberOfDevices = sensors.getDeviceCount();
  // Locate devices on the bus
  Serial.println("Locating devices...");
  Serial.print("Found ");
  Serial.print(numberOfDevices, DEC);
  Serial.println(" devices");

  // Loop through each device, print out address
  for (int i = 0; i < numberOfDevices; i++) {
    // Search the wire for address
    if (sensors.getAddress(tempDeviceAddress, i)) {
      Serial.print("Found device ");
      Serial.print(i, DEC);
      Serial.print(" with address: ");
      printAddress(tempDeviceAddress);
      Serial.println();
    } else {
      Serial.print("Found ghost device at ");
      Serial.print(i, DEC);
      Serial.print(" but could not detect address. Check power and cabling");
    }
  }
}

/**
 * @brief Utility function to print a device's address.
 */
void printAddress(DeviceAddress deviceAddress) {
  for (uint8_t i = 0; i < 8; i++) {
    if (deviceAddress[i] < 16) Serial.print("0");
    Serial.print(deviceAddress[i], HEX);
  }
}

/**
 * @brief Measure temperature from the sensors.
 */
void measureTemperature() {
  sensors.requestTemperatures();  // Send the command to get temperatures

  // Get temperature from first sensor
  if (sensors.getAddress(tempDeviceAddress, 0)) {
    // Output the device ID
    Serial.print("Temperature for device: ");
    Serial.println(0, DEC);
    // Print the data
    intTemp = sensors.getTempC(tempDeviceAddress);
    Serial.print("Temp C: ");
    Serial.println(intTemp);
  }

  // Get temperature from second sensor
  if (sensors.getAddress(tempDeviceAddress, 1)) {
    // Output the device ID
    Serial.print("Temperature for device: ");
    Serial.println(1, DEC);
    // Print the data
    extTemp = sensors.getTempC(tempDeviceAddress);
    Serial.print("Temp C: ");
    Serial.println(extTemp);
  }
}

/**
 * @brief Blink the built-in LED.
 * 
 * @param blinks Number of times to blink the LED.
 * @param delayTime Delay time in milliseconds between blinks.
 */
void blinkLED(int blinks, int delayTime) {
  for (int i = 0; i < blinks; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(delayTime);
    digitalWrite(LED_BUILTIN, LOW);
    delay(delayTime);
  }
}
