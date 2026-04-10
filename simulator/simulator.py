#!/usr/bin/env python3
"""
Smarter Stays – IoT Sensor Node Simulator

Automatically provisions virtual devices through the API and publishes
realistic telemetry to ThingsBoard via MQTT, mimicking the three ESP32
sensor nodes (power, temp, water-flow).

Supports multiple listings, each with a configurable set of sensors.
Configuration is resolved in priority order:
  1. SIM_CONFIG_FILE  – a JSON file with full listing definitions
  2. SIM_NUM_LISTINGS – auto-generate N listings with all 3 sensors
  3. Default          – 1 listing with all 3 sensors

See README.md for the config file schema and all environment variables.
"""

import json
import os
import re
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
SIM_CONFIG_FILE = os.environ.get("SIM_CONFIG_FILE", "")
SIM_NUM_LISTINGS = os.environ.get("SIM_NUM_LISTINGS", "")
PUBLISH_INTERVAL_MULTIPLIER = float(os.environ.get("PUBLISH_INTERVAL_MULTIPLIER", "1.0"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

VALID_SENSOR_TYPES = {"power", "temp", "water-flow"}
ALL_SENSORS = ["power", "temp", "water-flow"]

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


# ── Config loader ─────────────────────────────────────────────────────────────

def _slugify(title: str) -> str:
    """Turn a listing title into a DNS-safe slug for device naming."""
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def load_listings_config() -> list[dict]:
    """
    Resolve the listings configuration.

    Priority:
      1. SIM_CONFIG_FILE  → load JSON file
      2. SIM_NUM_LISTINGS → auto-generate N listings
      3. Default          → 1 listing with all 3 sensors
    """
    # ── 1. Config file ────────────────────────────────────────────────────
    if SIM_CONFIG_FILE:
        path = SIM_CONFIG_FILE
        if not os.path.isfile(path):
            logger.error("SIM_CONFIG_FILE=%s does not exist.", path)
            sys.exit(1)
        with open(path, "r") as f:
            data = json.load(f)
        listings = data.get("listings", [])
        if not listings:
            logger.error("Config file has no listings.")
            sys.exit(1)
        # Validate
        for idx, entry in enumerate(listings):
            if not entry.get("title"):
                logger.error("Listing #%d is missing 'title'.", idx + 1)
                sys.exit(1)
            sensors = entry.get("sensors", [])
            unknown = set(sensors) - VALID_SENSOR_TYPES
            if unknown:
                logger.error("Listing '%s' has unknown sensor types: %s",
                             entry["title"], unknown)
                sys.exit(1)
            if not sensors:
                entry["sensors"] = list(ALL_SENSORS)
            entry.setdefault("location", "Simulated Location")
        logger.info("Loaded %d listing(s) from config file: %s",
                    len(listings), path)
        return listings

    # ── 2. SIM_NUM_LISTINGS ───────────────────────────────────────────────
    if SIM_NUM_LISTINGS:
        try:
            count = int(SIM_NUM_LISTINGS)
            if count < 1:
                raise ValueError
        except ValueError:
            logger.error("SIM_NUM_LISTINGS must be a positive integer (got '%s').",
                         SIM_NUM_LISTINGS)
            sys.exit(1)
        listings = []
        for i in range(1, count + 1):
            listings.append({
                "title": f"Simulated Property {i}" if count > 1 else SIM_LISTING_TITLE,
                "location": f"Simulated Location {i}" if count > 1 else "Simulated Location",
                "sensors": list(ALL_SENSORS),
            })
        logger.info("Auto-generated config for %d listing(s).", count)
        return listings

    # ── 3. Default: 1 listing, all sensors ────────────────────────────────
    logger.info("Using default config: 1 listing with all sensors.")
    return [{
        "title": SIM_LISTING_TITLE,
        "location": "Simulated Location",
        "sensors": list(ALL_SENSORS),
    }]


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


def ensure_listings(token: str, listings_config: list[dict]) -> list[dict]:
    """
    Create simulator listings if they don't exist.
    Returns the config list enriched with 'listing_id' (string listingId)
    and 'mongo_id' (MongoDB _id) for each entry.
    """
    headers = {"token": token}

    for idx, entry in enumerate(listings_config, start=1):
        title = entry["title"]
        listing_id = f"sim-listing-{idx:03d}"

        # Check if it already exists
        resp = requests.get(f"{API_URL}/api/listings",
                            params={"title": title},
                            headers=headers, timeout=10)
        if resp.status_code == 200:
            existing = resp.json()
            if existing:
                entry["listing_id"] = existing[0]["listingId"]
                entry["mongo_id"] = existing[0]["_id"]
                logger.info("Listing '%s' already exists (id=%s)",
                            title, entry["listing_id"])
                continue

        # Create new listing
        resp = requests.post(f"{API_URL}/api/listings", json={
            "listingId": listing_id,
            "provider": "simulator",
            "title": title,
            "location": entry.get("location", "Simulated Location"),
            "userId": "simulator",
        }, headers=headers, timeout=10)

        if resp.status_code == 200:
            entry["listing_id"] = resp.json()["listingId"]
            entry["mongo_id"] = resp.json()["_id"]
            logger.info("Created listing '%s' (listingId=%s)",
                        title, entry["listing_id"])
        else:
            logger.error("Failed to create listing '%s' (%d): %s",
                         title, resp.status_code, resp.text)
            sys.exit(1)

    return listings_config


def provision_all_devices(token: str, listings: list[dict]) -> list[dict]:
    """
    Provision devices for all listings according to each listing's sensor config.
    Returns a flat list of dicts with deviceName, deviceType, deviceToken.
    """
    headers = {"token": token}
    result = []

    for entry in listings:
        slug = _slugify(entry["title"])
        listing_id = entry["mongo_id"]

        for sensor_type in entry["sensors"]:
            device_name = f"{slug}-{sensor_type}-node"

            # Check if device already exists
            resp = requests.get(f"{API_URL}/api/devices",
                                params={"deviceName": device_name},
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

            # Create new device (provisions in ThingsBoard via the API)
            resp = requests.post(f"{API_URL}/api/devices", json={
                "deviceName": device_name,
                "deviceType": sensor_type,
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
                             device_name, resp.status_code, resp.text)
                sys.exit(1)

    return result


def enable_listings(token: str, listings: list[dict]):
    """Enable monitoring for all simulator listings."""
    headers = {"token": token}

    for entry in listings:
        listing_id = entry["listing_id"]
        title = entry["title"]

        resp = requests.post(
            f"{API_URL}/api/listings/{listing_id}/enable",
            headers=headers, timeout=30,
        )
        if resp.status_code == 200:
            logger.info("Monitoring enabled for listing '%s' (%s)",
                        title, listing_id)
        else:
            logger.warning("Failed to enable listing '%s' (%d): %s",
                           title, resp.status_code, resp.text)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("  Smarter Stays – IoT Sensor Node Simulator")
    logger.info("=" * 60)
    logger.info("  API URL       : %s", API_URL)
    logger.info("  MQTT Broker   : %s:%d", MQTT_BROKER, MQTT_PORT)
    logger.info("  Interval mult : %.2f  (1.0 = real-time)", PUBLISH_INTERVAL_MULTIPLIER)
    logger.info("=" * 60)

    # 1. Load listings configuration
    listings_config = load_listings_config()
    total_sensors = sum(len(l["sensors"]) for l in listings_config)
    logger.info("Plan: %d listing(s), %d sensor node(s) total",
                len(listings_config), total_sensors)

    # 2. Wait for API readiness
    wait_for_api()

    # 3. Register / login
    token = register_or_login()

    # 4. Ensure all listings exist
    listings = ensure_listings(token, listings_config)

    # 5. Provision devices for every listing
    devices = provision_all_devices(token, listings)

    # 6. Enable monitoring on all listings
    enable_listings(token, listings)

    # 7. Start node simulation threads
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

    logger.info("All %d node(s) running across %d listing(s). Press Ctrl+C to stop.",
                len(nodes), len(listings))

    # 8. Block until interrupted
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
