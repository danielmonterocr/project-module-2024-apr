# IoT Sensor Node Simulator

Simulates the three ESP32 sensor nodes (power, temp, water-flow) without real hardware.
On startup it auto-provisions virtual devices through the API and publishes realistic
telemetry to ThingsBoard via MQTT.

Supports **multiple listings**, each with a configurable set of sensors.

## Quick start

```bash
# Start the full stack with the simulator (1 listing, 3 sensors – default)
./start.sh --simulate

# Auto-generate 3 listings, each with all 3 sensors (9 nodes total)
./start.sh --listings 3

# Use a custom config file for full control over listings and sensors
./start.sh --sim-config simulator/sim-config.example.json

# Or without simulation (default)
./start.sh
```

The simulator runs as an optional Docker Compose service using [profiles](https://docs.docker.com/compose/profiles/).
It is **not started** unless you pass `--simulate`, `--listings`, or `--sim-config`.

## What it does

1. **Loads config** — resolves listing/sensor plan (config file → `SIM_NUM_LISTINGS` → default 1 listing)
2. **Waits** for the API to become ready
3. **Registers** a simulator user (`simulator@test.com`) and logs in
4. **Creates** listings according to the config (idempotent – reuses existing ones)
5. **Provisions** devices for each listing through `POST /api/devices`:
   - `{listing-slug}-power-node` – electricity consumption (power1, power2, totalPower in Watts)
   - `{listing-slug}-temp-node` – temperature readings (temperature1, temperature2 in °C)
   - `{listing-slug}-water-flow-node` – water usage (flowRate in L/min, totalLiters)
6. **Enables monitoring** on all listings (`POST /api/listings/{listingId}/enable`)
7. **Connects** each device to the ThingsBoard MQTT broker using its access token
8. **Publishes** telemetry at the same intervals as the real firmware:
   - Power node: every ~120 seconds
   - Temp node: every ~60 seconds
   - Water flow node: every ~60 seconds

If devices/listings already exist from a previous run, the simulator reuses them (idempotent).

## Simulated data patterns

| Node | Pattern |
|------|---------|
| **Power** | Base load 200–400 W, peaks 800–1500 W during occupancy hours (7–9, 12–14, 17–22), sinusoidal day/night modulation, ±5% noise |
| **Temperature** | Indoor: 20–26 °C with slow drift. Outdoor: sinusoidal 18–32 °C peaking ~14:00 |
| **Water flow** | Mostly idle; probabilistic bursts during morning (6–8) and evening (18–21) at 5–12 L/min |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://server:3000` | API base URL (Docker DNS) |
| `MQTT_BROKER` | `mytb` | ThingsBoard MQTT host |
| `MQTT_PORT` | `1883` | MQTT port |
| `SIM_USER_EMAIL` | `simulator@test.com` | Simulator user email |
| `SIM_USER_PASSWORD` | `simulator123` | Simulator user password |
| `SIM_LISTING_TITLE` | `Simulated Property` | Default listing name (single-listing mode) |
| `SIM_NUM_LISTINGS` | *(unset)* | Auto-generate N listings with all 3 sensors |
| `SIM_CONFIG_FILE` | *(unset)* | Path to a JSON config file (see below) |
| `PUBLISH_INTERVAL_MULTIPLIER` | `1.0` | Speed multiplier (e.g. `0.1` = 10× faster) |
| `LOG_LEVEL` | `INFO` | Python log level |

**Priority:** `SIM_CONFIG_FILE` > `SIM_NUM_LISTINGS` > default (1 listing).

## Config file format

Create a JSON file (see `sim-config.example.json`):

```json
{
  "listings": [
    {
      "title": "Beach House",
      "location": "Santa Cruz, Costa Rica",
      "sensors": ["power", "temp", "water-flow"]
    },
    {
      "title": "Mountain Cabin",
      "location": "Monteverde, Costa Rica",
      "sensors": ["temp", "water-flow"]
    }
  ]
}
```

Each listing must have a `title`. The `location` and `sensors` fields are optional:
- `location` defaults to `"Simulated Location"`
- `sensors` defaults to all three: `["power", "temp", "water-flow"]`

Valid sensor types: `power`, `temp`, `water-flow`.

To override, set them in `api/.env` or pass them directly:

```bash
PUBLISH_INTERVAL_MULTIPLIER=0.1 docker compose -f api/docker-compose.yaml --profile simulator up -d
```

## Verifying data in ThingsBoard

1. Open **http://localhost:8080** and log in (tenant@thingsboard.org / tenant)
2. Go to **Devices** – you should see devices named `{listing-slug}-{sensor-type}-node`
3. Click a device → **Latest telemetry** tab – values should appear and update periodically

## Viewing logs

```bash
docker compose -f api/docker-compose.yaml logs -f simulator
```

## Stopping

```bash
./stop.sh          # stops everything including the simulator
```
