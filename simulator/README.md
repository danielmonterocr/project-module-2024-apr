# IoT Sensor Node Simulator

Simulates the three ESP32 sensor nodes (power, temp, water-flow) without real hardware.
On startup it auto-provisions virtual devices through the API and publishes realistic
telemetry to ThingsBoard via MQTT.

## Quick start

```bash
# Start the full stack with the simulator enabled
./start.sh --simulate

# Or without simulation (default)
./start.sh
```

The simulator runs as an optional Docker Compose service using [profiles](https://docs.docker.com/compose/profiles/).
It is **not started** unless you pass `--simulate`.

## What it does

1. **Waits** for the API to become ready
2. **Registers** a simulator user (`simulator@test.com`) and logs in
3. **Creates** a test listing ("Simulated Property")
4. **Provisions** 3 devices through `POST /api/devices`:
   - `sim-power-node` – electricity consumption (power1, power2, totalPower in Watts)
   - `sim-temp-node` – temperature readings (temperature1, temperature2 in °C)
   - `sim-water-flow-node` – water usage (flowRate in L/min, totalLiters)
5. **Connects** each device to the ThingsBoard MQTT broker using its access token
6. **Publishes** telemetry at the same intervals as the real firmware:
   - Power node: every ~120 seconds
   - Temp node: every ~60 seconds
   - Water flow node: every ~60 seconds

If devices already exist from a previous run, the simulator reuses them (idempotent).

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
| `SIM_LISTING_TITLE` | `Simulated Property` | Test listing name |
| `PUBLISH_INTERVAL_MULTIPLIER` | `1.0` | Speed multiplier (e.g. `0.1` = 10× faster) |
| `LOG_LEVEL` | `INFO` | Python log level |

To override, set them in `api/.env` or pass them directly:

```bash
PUBLISH_INTERVAL_MULTIPLIER=0.1 docker compose -f api/docker-compose.yaml --profile simulator up -d
```

## Verifying data in ThingsBoard

1. Open **http://localhost:8080** and log in (tenant@thingsboard.org / tenant)
2. Go to **Devices** – you should see `sim-power-node`, `sim-temp-node`, `sim-water-flow-node`
3. Click a device → **Latest telemetry** tab – values should appear and update periodically

## Viewing logs

```bash
docker compose -f api/docker-compose.yaml logs -f simulator
```

## Stopping

```bash
./stop.sh          # stops everything including the simulator
```
