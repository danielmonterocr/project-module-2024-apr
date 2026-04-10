"""
Simulated sensor node classes that mimic ESP32 hardware behaviour.

Each node connects to ThingsBoard via MQTT using its device access token
and publishes telemetry at the same cadence as the real firmware.
"""

import json
import math
import random
import threading
import time
import logging
from datetime import datetime

import paho.mqtt.client as mqtt

logger = logging.getLogger("simulator.nodes")

TELEMETRY_TOPIC = "v1/devices/me/telemetry"


class BaseNode(threading.Thread):
    """Common MQTT connection logic shared by all node types."""

    def __init__(self, name, device_token, broker, port, interval_multiplier=1.0):
        super().__init__(daemon=True)
        self.node_name = name
        self.device_token = device_token
        self.broker = broker
        self.port = port
        self.interval_multiplier = interval_multiplier
        self._stop_event = threading.Event()
        self._client = None

    # ── MQTT helpers ──────────────────────────────────────────────────────

    def _connect_mqtt(self):
        """Create and connect an MQTT client using the ThingsBoard token."""
        client = mqtt.Client(client_id=self.node_name)
        # ThingsBoard uses the access token as the username, no password
        client.username_pw_set(self.device_token)

        def on_connect(c, userdata, flags, rc):
            if rc == 0:
                logger.info("[%s] Connected to MQTT broker %s:%s",
                            self.node_name, self.broker, self.port)
            else:
                logger.error("[%s] MQTT connection failed (rc=%d)",
                             self.node_name, rc)

        def on_disconnect(c, userdata, rc):
            if rc != 0:
                logger.warning("[%s] Unexpected MQTT disconnect (rc=%d), will retry...",
                               self.node_name, rc)

        client.on_connect = on_connect
        client.on_disconnect = on_disconnect
        client.reconnect_delay_set(min_delay=1, max_delay=30)

        while not self._stop_event.is_set():
            try:
                client.connect(self.broker, self.port, keepalive=60)
                client.loop_start()
                self._client = client
                return
            except Exception as exc:
                logger.error("[%s] MQTT connect error: %s – retrying in 5s",
                             self.node_name, exc)
                self._stop_event.wait(5)

    def _publish(self, payload: dict):
        """Publish a telemetry payload to ThingsBoard."""
        if self._client is None:
            return
        msg = json.dumps(payload)
        result = self._client.publish(TELEMETRY_TOPIC, msg, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info("[%s] Published: %s", self.node_name, msg)
        else:
            logger.warning("[%s] Publish failed (rc=%d)", self.node_name, result.rc)

    def stop(self):
        self._stop_event.set()
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()

    # ── Subclass interface ────────────────────────────────────────────────

    def generate_telemetry(self) -> dict:
        raise NotImplementedError

    def get_publish_interval(self) -> float:
        raise NotImplementedError

    def run(self):
        self._connect_mqtt()
        # Wait briefly for the connection to establish
        self._stop_event.wait(2)
        logger.info("[%s] Starting telemetry loop (interval=%.1fs)",
                    self.node_name, self.get_publish_interval())
        while not self._stop_event.is_set():
            try:
                payload = self.generate_telemetry()
                self._publish(payload)
            except Exception as exc:
                logger.error("[%s] Telemetry error: %s", self.node_name, exc)
            self._stop_event.wait(self.get_publish_interval())


# ═════════════════════════════════════════════════════════════════════════════
# Power Node
# ═════════════════════════════════════════════════════════════════════════════

class PowerNode(BaseNode):
    """
    Simulates the power-node (ESP32 + Arduino Leonardo with CT clamps).

    Real behaviour:
      - Samples every ~2s, averages 60 samples, publishes every ~120s
      - Telemetry keys: power1, power2, totalPower (Watts)

    Simulation:
      - Base load: 200-400 W per channel
      - Occupancy peaks: 800-1500 W during hours 7-9, 12-14, 17-22
      - Sinusoidal day/night modulation
      - Gaussian noise ±5%
    """

    REAL_PUBLISH_INTERVAL = 120  # seconds (60 samples × 2s)

    def get_publish_interval(self) -> float:
        return self.REAL_PUBLISH_INTERVAL * self.interval_multiplier

    def generate_telemetry(self) -> dict:
        hour = datetime.now().hour + datetime.now().minute / 60.0

        # Day/night sinusoidal base (peaks at 14:00, trough at 02:00)
        day_factor = 0.5 + 0.5 * math.sin((hour - 8) * math.pi / 12)

        # Occupancy multiplier for high-usage periods
        occupancy = 1.0
        if 7 <= hour < 9 or 12 <= hour < 14 or 17 <= hour < 22:
            occupancy = 2.0 + random.uniform(0, 1.5)

        base1 = 200 + 200 * day_factor
        base2 = 200 + 150 * day_factor

        power1 = base1 * occupancy * random.gauss(1.0, 0.05)
        power2 = base2 * occupancy * random.gauss(1.0, 0.05)

        # Clamp to realistic range
        power1 = max(50, min(3000, power1))
        power2 = max(50, min(3000, power2))
        total = power1 + power2

        return {
            "power1": round(power1, 2),
            "power2": round(power2, 2),
            "totalPower": round(total, 2),
        }


# ═════════════════════════════════════════════════════════════════════════════
# Temperature Node
# ═════════════════════════════════════════════════════════════════════════════

class TempNode(BaseNode):
    """
    Simulates the temp-node (ESP32 + 2× DS18B20).

    Real behaviour:
      - Samples every 2s, averages 30 samples, publishes every ~60s
      - Telemetry keys: temperature1 (indoor), temperature2 (outdoor) in °C

    Simulation:
      - Indoor (temp1): 20-26°C with slow random drift ±0.3°C per publish
      - Outdoor (temp2): sinusoidal 18-32°C, peak at ~14:00
      - Gaussian noise ±0.5°C on both
    """

    REAL_PUBLISH_INTERVAL = 60  # seconds (30 samples × 2s)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Indoor temperature starts at a comfortable midpoint
        self._indoor_temp = 23.0

    def get_publish_interval(self) -> float:
        return self.REAL_PUBLISH_INTERVAL * self.interval_multiplier

    def generate_telemetry(self) -> dict:
        hour = datetime.now().hour + datetime.now().minute / 60.0

        # Indoor: slow random walk around 23°C, clamped to 20-26
        self._indoor_temp += random.gauss(0, 0.3)
        self._indoor_temp = max(20.0, min(26.0, self._indoor_temp))
        temp1 = self._indoor_temp + random.gauss(0, 0.5)

        # Outdoor: sinusoidal day/night (peak ~14:00, trough ~02:00)
        outdoor_base = 25.0 + 7.0 * math.sin((hour - 8) * math.pi / 12)
        temp2 = outdoor_base + random.gauss(0, 0.5)

        return {
            "temperature1": round(temp1, 2),
            "temperature2": round(temp2, 2),
        }


# ═════════════════════════════════════════════════════════════════════════════
# Water Flow Node
# ═════════════════════════════════════════════════════════════════════════════

class WaterFlowNode(BaseNode):
    """
    Simulates the water-flow-node (ESP32 + pulse-counting flow sensor).

    Real behaviour:
      - Samples every 1s, accumulates 60 samples, publishes every ~60s
      - Telemetry keys: flowRate (L/min), totalLiters (cumulative)

    Simulation:
      - Mostly zero flow (idle)
      - Morning (6-8) and evening (18-21) have probabilistic usage bursts
      - Bursts: 5-12 L/min for the publish window, simulating shower/faucet
      - totalLiters accumulates across publishes
    """

    REAL_PUBLISH_INTERVAL = 60  # seconds (60 samples × 1s)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._total_liters = 0.0

    def get_publish_interval(self) -> float:
        return self.REAL_PUBLISH_INTERVAL * self.interval_multiplier

    def generate_telemetry(self) -> dict:
        hour = datetime.now().hour + datetime.now().minute / 60.0

        # Probability of a usage burst depends on time of day
        if 6 <= hour < 8:
            burst_chance = 0.6    # Morning rush
        elif 18 <= hour < 21:
            burst_chance = 0.5    # Evening
        elif 11 <= hour < 13:
            burst_chance = 0.25   # Midday cooking/cleaning
        else:
            burst_chance = 0.05   # Occasional overnight/random use

        if random.random() < burst_chance:
            # Active burst: shower ≈ 8-12 L/min, faucet ≈ 5-8 L/min
            flow_rate = random.uniform(5.0, 12.0)
        else:
            # Idle (no flow, or tiny drip)
            flow_rate = random.uniform(0, 0.1)

        # Estimate litres used during the publish interval
        interval_minutes = self.get_publish_interval() / 60.0
        litres_used = flow_rate * interval_minutes
        self._total_liters += litres_used

        return {
            "flowRate": round(flow_rate, 2),
            "totalLiters": round(self._total_liters, 2),
        }
