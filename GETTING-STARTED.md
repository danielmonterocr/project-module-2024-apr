# Getting Started

This guide walks you through running the full Smarter Stays application stack locally on your machine.

---

## Prerequisites

You need the following tools installed before you begin:

| Tool | Version | Installation |
|---|---|---|
| **Docker Desktop** (macOS / Windows) **or** Docker Engine + Compose v2 (Linux) | Docker 24+ | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **curl** | any | Pre-installed on macOS/Linux. Windows: use WSL or Git Bash. |
| **jq** *(recommended)* | any | `brew install jq` / `apt install jq` / [stedolan.github.io/jq](https://stedolan.github.io/jq/) |

> `jq` is optional – if it is not available the scripts fall back to `python3`.

---

## Quick Start

### Step 1 – Clone the repository

```bash
git clone https://github.com/danielmonterocr/project-module-2024-apr.git
cd project-module-2024-apr
```

### Step 2 – Configure the environment

Copy the provided template and fill in your secrets:

```bash
cp api/.env.example api/.env
```

Open `api/.env` in any text editor and replace the two placeholder values:

```dotenv
DB_PASSWORD=<choose-a-strong-password>      # ← replace this
TOKEN_SECRET=<replace-with-a-random-secret-string>  # ← replace this
```

Everything else can be left as-is for a local development setup.

> **Tip:** Generate a strong `TOKEN_SECRET` with:
> ```bash
> openssl rand -hex 32
> ```

### Step 3 – Run the startup script

```bash
# Make the scripts executable (one-time step)
chmod +x start.sh stop.sh

./start.sh
```

The script will:

1. Validate your environment and tooling
2. Start ThingsBoard and wait until it is fully ready (~2–3 min on first run)
3. Automatically fetch and write device provisioning keys from the ThingsBoard API
4. Build and start the Node.js API and MongoDB
5. Start the Appsmith UI
6. Print a summary of all service URLs

When it finishes you will see:

```
╔══════════════════════════════════════════════════════╗
║   All services are up!                               ║
╚══════════════════════════════════════════════════════╝

  Service          URL
  ───────────────  ─────────────────────────────────────
  API              http://localhost:3000
  Swagger UI       http://localhost:3000/api-docs
  ThingsBoard      http://localhost:8080
  Appsmith UI      http://localhost:80
```

---

## What Each Service Does

| Service | URL | Purpose |
|---|---|---|
| **Node.js API** | `http://localhost:3000` | REST API — users, listings, devices, reports |
| **Swagger UI** | `http://localhost:3000/api-docs` | Interactive API documentation and test console |
| **MongoDB** | `localhost:27017` | Application database (users, listings, reservations) |
| **ThingsBoard** | `http://localhost:8080` | IoT platform — stores sensor telemetry, manages devices |
| **Appsmith UI** | `http://localhost:80` | Host dashboard — listings, devices, dashboards, reports |

---

## Basic Usage Walkthrough

### 1. Register a user

Open the Swagger UI at **http://localhost:3000/api-docs** and expand the **Auth** section.

Call `POST /api/users/register` with a JSON body:

```json
{
  "name": "Jane Host",
  "email": "jane@example.com",
  "password": "MySecret123"
}
```

### 2. Log in and get your token

Call `POST /api/users/login`:

```json
{
  "email": "jane@example.com",
  "password": "MySecret123"
}
```

Copy the `token` value from the response. You will need it for all subsequent requests.

### 3. Create a listing

Call `POST /api/listings` with the token in the request header:

```
Header:  token: <paste your token here>
```

Body:

```json
{
  "name": "Beach House",
  "airbnbId": "12345678"
}
```

### 4. Open the Appsmith UI

Go to **http://localhost:80**.

On first launch, Appsmith will ask you to create an admin account — this is a local account for the Appsmith platform itself, separate from your API user.

Once inside, sign in using the API credentials you registered in step 1. You will see listings, devices, dashboards, and reports views.

---

## Simulating Sensor Data (Without Physical Hardware)

The ESP32 sensor nodes transmit data over **MQTT** on port `1883`. You can simulate them using `mosquitto_pub` or any MQTT client.

### Install mosquitto clients

```bash
# macOS
brew install mosquitto

# Ubuntu / Debian
sudo apt install mosquitto-clients
```

### Send a simulated energy reading

```bash
mosquitto_pub \
  -h localhost \
  -p 1883 \
  -t "v1/devices/me/telemetry" \
  -u "<device-access-token>" \
  -m '{"power1": 150.5, "power2": 75.2}'
```

### Send a simulated water flow reading

```bash
mosquitto_pub \
  -h localhost \
  -p 1883 \
  -t "v1/devices/me/telemetry" \
  -u "<device-access-token>" \
  -m '{"totalLiters": 12.4}'
```

> To get a `<device-access-token>`, create a device in ThingsBoard at **http://localhost:8080** and copy its access token from the device details page.

---

## Stopping the Project

```bash
./stop.sh
```

This stops all containers but **preserves your data volumes** (MongoDB data, ThingsBoard data). Running `./start.sh` again will pick up where you left off.

To fully reset and remove all data:

```bash
docker compose -f api/docker-compose.yaml down -v
docker compose -f ui/docker-compose.yaml down -v
```

---

## Troubleshooting

### ThingsBoard takes a long time to start

ThingsBoard initialises a full PostgreSQL database on first run. Allow **3–5 minutes** on slower machines. The script polls automatically and will not proceed until it is ready.

### `start.sh` exits with "Action Required"

This means `api/.env` was just created from the template. Open it, fill in `DB_PASSWORD` and `TOKEN_SECRET`, then re-run `./start.sh`.

### API logs show a MongoDB connection error

Verify that `DB_DOMAIN=mongo` in `api/.env` (the Docker service name, not `localhost`). Using `localhost` will not work inside the Docker network.

### Port already in use

Check which process is using the conflicting port and stop it, or edit `api/.env` / `api/docker-compose.yaml` to use a different port:

```bash
# Find what is using port 3000
lsof -i :3000
```

Common conflicts:

| Port | Service |
|---|---|
| `3000` | API server |
| `8080` | ThingsBoard HTTP |
| `1883` | ThingsBoard MQTT |
| `27017` | MongoDB |
| `80` / `443` | Appsmith UI |

### View container logs

```bash
# API server
docker compose -f api/docker-compose.yaml logs -f server

# ThingsBoard
docker compose -f api/docker-compose.yaml logs -f mytb

# MongoDB
docker compose -f api/docker-compose.yaml logs -f mongo

# Appsmith
docker compose -f ui/docker-compose.yaml logs -f
```

### Provisioning keys not populated

If `PROVISION_DEVICE_KEY` remains as `auto_provisioned` after startup, it means the default ThingsBoard device profile does not have a provisioning strategy configured. To fix it:

1. Log in to **http://localhost:8080** with `tenant@thingsboard.org` / `tenant`
2. Go to **Device Profiles** → click **Default**
3. Open the **Device provisioning** tab
4. Set strategy to **Allow to create new devices**
5. Save — then re-run `./start.sh` (the keys will be fetched automatically)
