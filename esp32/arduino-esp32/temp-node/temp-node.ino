#include <WiFi.h>
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>
#include <OneWire.h>
#include <DallasTemperature.h>


#define SERIAL_DEBUG_BAUD 115200

#define WIFI_AP_NAME "Nour"
#define WIFI_PASSWORD "tinyfootprint"

#define TOKEN "s2or2c7dx7v4vb369fpl"
#define THINGSBOARD_SERVER "34.122.121.12"

// Data wire is plugged TO GPIO 4
#define ONE_WIRE_BUS 4

WiFiClient espClient;
const char *hostname = "Temperature monitor";
volatile int wifi_cnt = 0;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);
volatile int mqtt_cnt = 0;

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

void send_temp(void *pvParameters);

void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);
  delay(10);

  // Connect to WiFi network
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(hostname);
  //WiFi.config(local_IP, gateway, subnet);
  WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    wifi_cnt++;
    Serial.println("Connecting to WiFi...");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Connected to the WiFi network");
    Serial.print("IP address: ");
    Serial.print(WiFi.localIP());
    Serial.printf(" after %d tries\n", wifi_cnt);
  } else {
    Serial.println(" Not connected to the WiFi network");
    // Serial.println("Restart ESP32");
    // esp_restart();
  }

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

  // Setup thread
  Serial.println("Create send_temp thread");
  xTaskCreatePinnedToCore(
    send_temp,
    "send_temp",
    2048,
    NULL,
    6,         // Priority
    &xHandle,  // Task Handle
    1);        // Run on Core 1 for best sampling?
  configASSERT(xHandle);
}

void loop() {}

void send_temp(void *pvParameters) {
  Serial.println("Inside send_temp");

  for (;;) {
    static uint32_t nextTime;
    vTaskDelay(1);
    strt = xTaskGetTickCount();

    // Check if it is a time to send data
    if (millis() - nextTime >= interval) {
      Serial.println("Send temperature");
      mqtt_cnt = 0;

      while (!tb.connected() && mqtt_cnt < 5) {
        Serial.print("Connecting to: ");
        Serial.print(THINGSBOARD_SERVER);
        Serial.print(" with token ");
        Serial.println(TOKEN);
        if (tb.connect(THINGSBOARD_SERVER, TOKEN)) {
          Serial.println("Read temperatures");
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

          Serial.println("Sending data...");

          // Uploads new telemetry to ThingsBoard using MQTT.
          // See https://thingsboard.io/docs/reference/mqtt-api/#telemetry-upload-api
          // for more details
          tb.sendTelemetryData("intTemp", intTemp);
          tb.sendTelemetryData("extTemp", extTemp);
          // Process messages
          if (tb.loop()) {
            Serial.println("Message sent successfully!");
          }

          Serial.print("Free heap: ");
          Serial.println(ESP.getFreeHeap());
        } else {
          Serial.print("Failed to connect to MQTT with WiFi state: ");
          Serial.println(WiFi.status());
          delay(1000);
          mqtt_cnt++;
        }
        if (mqtt_cnt >= 5) {
          Serial.println(" Not connected to MQTT server");
          Serial.println("Restart ESP32");
          esp_restart();
        }
      }

      Serial.println("Disconnect form MQTT server");
      tb.disconnect();

      Serial.println("Increase next time by interval");
      nextTime += interval;
    }
  }
}

// Function to print a device address
void printAddress(DeviceAddress deviceAddress) {
  for (uint8_t i = 0; i < 8; i++) {
    if (deviceAddress[i] < 16) Serial.print("0");
    Serial.print(deviceAddress[i], HEX);
  }
}
