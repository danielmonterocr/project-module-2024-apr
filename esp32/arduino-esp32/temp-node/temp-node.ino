#include <WiFi.h>
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>
#include <OneWire.h>
#include <DallasTemperature.h>


#define SERIAL_DEBUG_BAUD   115200

#define WIFI_AP_NAME        "Nour"
#define WIFI_PASSWORD       "tinyfootprint"

#define TOKEN               "s2or2c7dx7v4vb369fpl"
#define THINGSBOARD_SERVER  "34.122.121.12"

// Data wire is plugged TO GPIO 4
#define ONE_WIRE_BUS        4

WiFiClient espClient;

// the Wifi radio's status
int status = WL_IDLE_STATUS;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);

// Setup a oneWire instance to communicate with any OneWire devices (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);

// Pass our oneWire reference to Dallas Temperature
DallasTemperature sensors(&oneWire);

// Number of temperature devices found
int numberOfDevices;

// We'll use this variable to store a found device address
DeviceAddress tempDeviceAddress;

float intTemp, extTemp;

uint32_t interval = 60*1000;

// Set to true if application is subscribed for the messages
bool subscribed = false;

void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);

  // Connect to WiFi network
  WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
  initWiFi();
  
  // Initialize temperature sensors
  sensors.begin();
  
  // Grab a count of devices on the wire
  numberOfDevices = sensors.getDeviceCount();
  
  // Locate devices on the bus
  Serial.print("Locating devices...");
  Serial.print("Found ");
  Serial.print(numberOfDevices, DEC);
  Serial.println(" devices.");

  // Loop through each device, print out address
  for(int i=0; i<numberOfDevices; i++){
    // Search the wire for address
    if(sensors.getAddress(tempDeviceAddress, i)){
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

void loop() {
  static uint32_t nextTime;

  // Reconnect to WiFi, if needed
  if (WiFi.status() != WL_CONNECTED) {
    reconnect();
    return;
  }

  // Reconnect to ThingsBoard, if needed
  if (!tb.connected()) {
    subscribed = false;

    // Connect to the ThingsBoard
    Serial.print("Connecting to: ");
    Serial.print(THINGSBOARD_SERVER);
    Serial.print(" with token ");
    Serial.println(TOKEN);
    if (!tb.connect(THINGSBOARD_SERVER, TOKEN)) {
      Serial.println("Failed to connect");
      return;
    }
  }
  
  // Check if it is a time to send temperature
  if (millis() - nextTime >= interval) {
    sensors.requestTemperatures(); // Send the command to get temperatures

    // Get temperature from first sensor
    if(sensors.getAddress(tempDeviceAddress, 0)) {
      // Output the device ID
      Serial.print("Temperature for device: ");
      Serial.println(0, DEC);
      // Print the data
      intTemp = sensors.getTempC(tempDeviceAddress);
      Serial.print("Temp C: ");
      Serial.println(intTemp);
    }

    // Get temperature from second sensor
    if(sensors.getAddress(tempDeviceAddress, 1)) {
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

    nextTime += interval;
  }

  // Process messages
  tb.loop();
}

void initWiFi() {
  Serial.println("Connecting to AP ...");
  // attempt to connect to WiFi network

  WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to AP");
}

void reconnect() {
  // Loop until we're reconnected
  status = WiFi.status();
  if ( status != WL_CONNECTED) {
    WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("Connected to AP");
  }
}

// Function to print a device address
void printAddress(DeviceAddress deviceAddress) {
  for (uint8_t i = 0; i < 8; i++){
    if (deviceAddress[i] < 16) Serial.print("0");
      Serial.print(deviceAddress[i], HEX);
  }
}
