#include <WiFi.h>
#include "Update.h"
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>


#define NODE_NAME "Water flow node"

#define SERIAL_DEBUG_BAUD 9600

#define WIFI_AP_NAME "Nour"
#define WIFI_PASSWORD "tinyfootprint"
#define WIFI_TIMEOUT_MS 20000

#define TOKEN "fxnucc349cdzy1885hkg"
#define THINGSBOARD_SERVER "34.66.170.15"

#define WATER_FLOW_SENSOR 27

WiFiClient espClient;
volatile int wifiCnt = 0;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);
volatile int mqttCnt = 0;

long currentMillis = 0;
long previousMillis = 0;
int senseInterval = 1000;
float calibrationFactor = 4.5;
volatile byte pulseCount;
byte pulse1Sec = 0;
float flowRate;
unsigned int flowMilliLitres;
unsigned long totalMilliLitres;

uint32_t interval = 60 * 1000;
long strt = 0L;
TaskHandle_t xHandle = NULL;

void connectToWiFi(const char* ssid, const char* password, const char* hostname);
void setupWaterFlowSensors();
void keepWifiAliveTask(void* pvParameters);
void monitorTask(void* pvParameters);
void measureWaterFlow();
void blinkLED(int blinks, int delayTime);

/**
 * @brief Setup function to initialize the ESP32.
 */
void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);
  delay(10);

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(WATER_FLOW_SENSOR, INPUT_PULLUP);

  connectToWiFi(WIFI_AP_NAME, WIFI_PASSWORD, NODE_NAME);

  setupWaterFlowSensors();

  // Setup tasks
  Serial.println("Create keepWifiAliveTask task");
  xTaskCreatePinnedToCore(
    keepWifiAliveTask,
    "keepWifiAliveTask",
    5000,
    NULL,
    1,
    NULL,
    0);
  Serial.println("Create monitorTask task");
  xTaskCreatePinnedToCore(
    monitorTask,
    "monitorTask",
    2048,
    NULL,
    1,
    NULL,
    1);
}

/**
 * @brief Main loop function. Empty as tasks are handled by FreeRTOS.
 */
void loop() {}

/**
 * @brief Task to monitor WiFi connection.
 * 
 * @param pvParameters Parameters for the task.
 */
void keepWifiAliveTask(void* pvParameters) {
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("WiFi still connected");
      vTaskDelay(10000 / portTICK_PERIOD_MS);
      continue;
    }

    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);

    unsigned long startAttemptTime = millis();

    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_TIMEOUT_MS);

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi failed to connect");
      vTaskDelay(20000 / portTICK_PERIOD_MS);
      continue;
    }

    Serial.println("WiFi reconnected: " + WiFi.localIP().toString());
  }
}

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

    if (millis() - previousMillis > senseInterval) {
      measureWaterFlow();
    }

    // Check if it is a time to send data
    if ((flowRate == 0 && totalMilliLitres != 0) || (flowRate == 0 && totalMilliLitres == 0 && (millis() - nextTime >= interval))) {
      mqttCnt = 0;

      while (!tb.connected() && mqttCnt < 5) {
        Serial.print("Connecting to: ");
        Serial.print(THINGSBOARD_SERVER);
        Serial.print(" with token ");
        Serial.println(TOKEN);

        if (tb.connect(THINGSBOARD_SERVER, TOKEN)) {
          Serial.println("Sending data...");

          // Uploads new telemetry to ThingsBoard using MQTT.
          // See https://thingsboard.io/docs/reference/mqtt-api/#telemetry-upload-api
          // for more details
          tb.sendTelemetryData("totalMilliLitres", totalMilliLitres);
          // Process messages
          if (tb.loop()) {
            Serial.println("Message sent successfully!");
            blinkLED(3, 200);  // Blink three times with 200ms delay
          }

          Serial.print("Free heap: ");
          Serial.println(ESP.getFreeHeap());

          Serial.println("Reset total");
          totalMilliLitres = 0;
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

      Serial.println("Disconnect form MQTT server");
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
 * @brief Interrupt service routine for the water flow sensor.
 */
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

/**
 * @brief Setup power sensors.
 */
void setupWaterFlowSensors() {
  // Initialize water flow sensor
  pulseCount = 0;
  flowRate = 0.0;
  flowMilliLitres = 0;
  totalMilliLitres = 0;
  previousMillis = 0;

  attachInterrupt(digitalPinToInterrupt(WATER_FLOW_SENSOR), pulseCounter, FALLING);
}

/**
 * @brief Measure water flow from the sensors.
 */
void measureWaterFlow() {
  pulse1Sec = pulseCount;
  pulseCount = 0;

  // Because this loop may not complete in exactly 1 second intervals we calculate
  // the number of milliseconds that have passed since the last execution and use
  // that to scale the output. We also apply the calibrationFactor to scale the output
  // based on the number of pulses per second per units of measure (litres/minute in
  // this case) coming from the sensor.
  flowRate = ((1000.0 / (millis() - previousMillis)) * pulse1Sec) / calibrationFactor;
  previousMillis = millis();

  // Divide the flow rate in litres/minute by 60 to determine how many litres have
  // passed through the sensor in this 1 second interval, then multiply by 1000 to
  // convert to millilitres.
  flowMilliLitres = (flowRate / 60) * 1000;

  // Add the millilitres passed in this second to the cumulative total
  totalMilliLitres += flowMilliLitres;

  // Print the flow rate for this second in litres / minute
  Serial.print("Flow rate: ");
  Serial.print(int(flowRate));  // Print the integer part of the variable
  Serial.print("L/min");
  Serial.print("\t");  // Print tab space

  // Print the cumulative total of litres flowed since starting
  Serial.print("Output Liquid Quantity: ");
  Serial.print(totalMilliLitres);
  Serial.print("mL / ");
  Serial.print(totalMilliLitres / 1000);
  Serial.println("L");
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
