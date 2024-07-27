#include <WiFi.h>
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>

#define SERIAL_DEBUG_BAUD 115200

#define WIFI_AP_NAME "Nour"
#define WIFI_PASSWORD "tinyfootprint"

#define TOKEN "oi9rzh234DsN4HjaWYqB"
#define THINGSBOARD_SERVER "34.122.121.12"

#define SENSOR 27

WiFiClient espClient;
const char *hostname = "Water flow node";
volatile int wifiCnt = 0;

Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient);
volatile int mqttCnt = 0;

long currentMillis = 0;
long previousMillis = 0;
int senseInterval = 1000;
boolean ledState = LOW;
float calibrationFactor = 4.5;
volatile byte pulseCount;
byte pulse1Sec = 0;
float flowRate;
unsigned int flowMilliLitres;
unsigned long totalMilliLitres;

uint32_t interval = 60 * 1000;
long strt = 0L;
TaskHandle_t xHandle = NULL;

void sendWaterFlow(void *pvParameters);

void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  // Initialize serial for debugging
  Serial.begin(SERIAL_DEBUG_BAUD);
  delay(10);

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(SENSOR, INPUT_PULLUP);

  // Connect to WiFi network
  // WiFi.mode(WIFI_STA);
  // WiFi.setHostname(hostname);
  //WiFi.config(local_IP, gateway, subnet);
  int status = WL_IDLE_STATUS;
  // attempt to connect to Wifi network:
  WiFi.disconnect();
  WiFi.waitForConnectResult();
  while (status != WL_CONNECTED) {
    Serial.print("Attempting to connect to network, SSID: ");
    Serial.println(WIFI_AP_NAME);
    WiFi.begin(WIFI_AP_NAME, WIFI_PASSWORD);
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

  pulseCount = 0;
  flowRate = 0.0;
  flowMilliLitres = 0;
  totalMilliLitres = 0;
  previousMillis = 0;

  attachInterrupt(digitalPinToInterrupt(SENSOR), pulseCounter, FALLING);

  // Setup thread
  Serial.println("Create sendWaterFlow thread");
  xTaskCreatePinnedToCore(
    sendWaterFlow,
    "sendWaterFlow",
    2048,
    NULL,
    6,         // Priority
    &xHandle,  // Task Handle
    1);        // Run on Core 1 for best sampling?
  configASSERT(xHandle);
}

void loop() {}

void sendWaterFlow(void *pvParameters) {
  Serial.println("Inside send_water_flow");

  for (;;) {
    static uint32_t nextTime;
    vTaskDelay(1);
    strt = xTaskGetTickCount();

    if (millis() - previousMillis > senseInterval) {
      Serial.println("Sense water flow");
      blinkSense();

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

    if ((flowRate == 0 && totalMilliLitres != 0) || (flowRate == 0 && totalMilliLitres == 0 && (millis() - nextTime >= interval))) {
      Serial.println("Send water flow");
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

void blinkSense() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(100);
  digitalWrite(LED_BUILTIN, LOW);
  delay(100);
}

void blinkSend() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(10);
  digitalWrite(LED_BUILTIN, LOW);
  delay(10);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(10);
  digitalWrite(LED_BUILTIN, LOW);
  delay(10);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(10);
  digitalWrite(LED_BUILTIN, LOW);
  delay(10);
}

