#!/usr/bin/env python3
"""
Smarter Stays – IoT Sensor Node Simulator

Automatically provisions virtual devices through the API and publishes
realistic telemetry to ThingsBoard via MQTT, mimicking the three ESP32
sensor nodes (power, temp, water-flow).

All configuration is via environment variables (see README.md).
"""

import os
import sys
import time
import signal
import logging
import requests

from nodes import PowerNode, TempNode, WaterFlowNode

# ── Configuration ─────────────────────────────────────────────────────────────

API_URL = os.environ.get("API_URL", "http://server:3000")
MQTT_BROKER = os.environ.get("MQTT_BROKER", "mytb")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
SIM_USER_EMAIL = os.environ.get("SIM_USER_EMAIL", "simulator@test.com")
SIM_USER_PASSWORD = os.environ.get("SIM_USER_PASSWORD", "simulator123")
SIM_USER_NAME = os.environ.get("SIM_USER_NAME", "simulator")
SIM_LISTING_TITLE = os.environ.get("SIM_LISTING_TITLE", "Simulated Property")
PUBLISH_INTERVAL_MULTIPLIER = float(os.environ.get("PUBLISH_INTERVAL_MULTIPLIER", "1.0"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# Devices to provision
DEVICES = [
    {"deviceName": "sim-power-node", "deviceType": "power"},
    {"deviceName": "sim-temp-node", "deviceType": "temp"},
    {"deviceName": "sim-water-flow-node", "deviceType": "water-flow"},
]

NODE_CLASSES = {
    "power": PowerNode,
    "temp": TempNode,
    "water-flow": WaterFlowNode,
}

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("simulator")


# ── Helpers ───────────────────────────────────────────────────────────────────

def wait_for_api(timeout=300, interval=5):
    """Block until the API is reachable (GET /api-docs returns 200)."""
    logger.info("Waiting for API at %s ...", API_URL)
    elapsed = 0
    while elapsed < timeout:
        try:
            resp = requests.get(f"{API_URL}/api-docs", timeout=5)
            if resp.status_code in (200, 301, 302):
                logger.info("API is ready.")
                return
        except requests.ConnectionError:
            pass
        time.sleep(interval)
        elapsed += interval
    logger.error("API did not become ready within %ds – aborting.", timeout)
    sys.exit(1)


def register_or_login() -> str:
    """Register the simulator user (or log in if it exists). Returns JWT."""
    # Try to register
    resp = requests.post(f"{API_URL}/api/users/register", json={
        "username": SIM_USER_NAME,
        "email": SIM_USER_EMAIL,
        "password": SIM_USER_PASSWORD,
    }, timeout=10)

    if resp.status_code == 200:
        logger.info("Registered simulator user: %s", SIM_USER_EMAIL)
    elif resp.status_code == 400:
        logger.info("Simulator user already exists – logging in.")
    else:
        logger.warning("Unexpected register response (%d): %s",
                        resp.status_code, resp.text)

    # Login to get a JWT
    resp = requests.post(f"{API_URL}/api/users/login", json={
        "email": SIM_USER_EMAIL,
        "password": SIM_USER_PASSWORD,
    }, timeout=10)

    if resp.status_code != 200:
        logger.error("Login failed (%d): %s", resp.status_code, resp.text)
        sys.exit(1)

    token = resp.headers.get("token")
    if not token:
        logger.error("No token in login response headers.")
        sys.exit(1)

    logger.info("Authenticated as %s", SIM_USER_EMAIL)
    return token


def ensure_listing(token: str) -> str:
    """Create the simulator listing if it doesn't exist. Returns listing _id."""
    headers = {"token": token}

    # Check if it already exists
    resp = requests.get(f"{API_URL}/api/listings",
                        params={"title": SIM_LISTING_TITLE},
                        headers=headers, timeout=10)
    if resp.status_code == 200:
        listings = resp.json()
        if listings:
            listing_id = listings[0]["_id"]
            logger.info("Listing '%s' already exists (id=%s)",
                        SIM_LISTING_TITLE, listing_id)
            return listing_id

    # Create new listing
    resp = requests.post(f"{API_URL}/api/listings", json={
        "listingId": "sim-listing-001",
        "provider": "simulator",
        "title": SIM_LISTING_TITLE,
        "location": "Simulated Location",
        "userId": "simulator",
    }, headers=headers, timeout=10)

    if resp.status_code == 200:
        listing_id = resp.json()["_id"]
        logger.info("Created listing '%s' (id=%s)",
                    SIM_LISTING_TITLE, listing_id)
        return listing_id

    logger.error("Failed to create listing (%d): %s",
                 resp.status_code, resp.text)
    sys.exit(1)


def provision_devices(token: str, listing_id: str) -> list[dict]:
    """
    Provision all simulated devices via the API.
    Returns a list of dicts with deviceName, deviceType, deviceToken.
    """
    headers = {"token": token}
    result = []

    for dev in DEVICES:
        # Check if device already exists
        resp = requests.get(f"{API_URL}/api/devices",
                            params={"deviceName": dev["deviceName"]},
                            headers=headers, timeout=10)
        if resp.status_code == 200:
            existing = resp.json()
            if existing:
                d = existing[0]
                logger.info("Device '%s' already exists (token=%s)",
                            d["deviceName"], d["deviceToken"])
                result.append({
                    "deviceName": d["deviceName"],
                    "deviceType": d["deviceType"],
                    "deviceToken": d["deviceToken"],
                })
                continue

        # Create new device (this provisions it in ThingsBoard via the API)
        resp = requests.post(f"{API_URL}/api/devices", json={
            "deviceName": dev["deviceName"],
            "deviceType": dev["deviceType"],
            "listingId": listing_id,
        }, headers=headers, timeout=30)

        if resp.status_code == 200:
            d = resp.json()
            logger.info("Provisioned device '%s' (token=%s)",
                        d["deviceName"], d["deviceToken"])
            result.append({
                "deviceName": d["deviceName"],
                "deviceType": d["deviceType"],
                "deviceToken": d["deviceToken"],
            })
        else:
            logger.error("Failed to provision '%s' (%d): %s",
                         dev["deviceName"], resp.status_code, resp.text)
            sys.exit(1)

    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("  Smarter Stays – IoT Sensor Node Simulator")
    logger.info("=" * 60)
    logger.info("  API URL       : %s", API_URL)
    logger.info("  MQTT Broker   : %s:%d", MQTT_BROKER, MQTT_PORT)
    logger.info("  Interval mult : %.2f  (1.0 = real-time)", PUBLISH_INTERVAL_MULTIPLIER)
    logger.info("=" * 60)

    # 1. Wait for API readiness
    wait_for_api()

    # 2. Register / login
    token = register_or_login()

    # 3. Ensure a listing exists for the simulated devices
    listing_id = ensure_listing(token)

    # 4. Provision the three devices
    devices = provision_devices(token, listing_id)

    # 5. Start node simulation threads
    nodes = []
    for dev in devices:
        cls = NODE_CLASSES.get(dev["deviceType"])
        if cls is None:
            logger.warning("No simulator class for device type '%s'",
                           dev["deviceType"])
            continue
        node = cls(
            name=dev["deviceName"],
            device_token=dev["deviceToken"],
            broker=MQTT_BROKER,
            port=MQTT_PORT,
            interval_multiplier=PUBLISH_INTERVAL_MULTIPLIER,
        )
        node.start()
        nodes.append(node)
        logger.info("Started %s simulation thread", dev["deviceName"])

    logger.info("All %d nodes running. Press Ctrl+C to stop.", len(nodes))

    # 6. Block until interrupted
    stop = False

    def handle_signal(signum, frame):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    while not stop:
        time.sleep(1)

    # Graceful shutdown
    logger.info("Shutting down simulator...")
    for node in nodes:
        node.stop()
    for node in nodes:
        node.join(timeout=5)
    logger.info("Simulator stopped.")


if __name__ == "__main__":
    main()
