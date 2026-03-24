# Smarter Stays, Smaller Footprint

> An IoT-powered smart monitoring system for Airbnb properties that tracks energy consumption, water usage, and temperature in real-time — promoting sustainable resource use for hosts and guests.

---

## Overview

This is a Master's in Computer Science final project (CSM500) that combines IoT hardware, a REST API, and a web dashboard to give Airbnb hosts and guests real-time visibility into a property's resource consumption. The system was deployed and validated in a real Airbnb property in Costa Rica over a 30-day period, collecting ~186,000 sensor readings.

The project addresses a common blind spot in short-term rentals: guests have no awareness of how much energy or water they consume, and hosts have no easy way to track it. By surfacing this data, the system encourages more sustainable behavior and helps hosts identify inefficiencies.

> **Note:** Airbnb does not offer a public API. The Airbnb integration in this project is **simulated** using responses captured from browser network activity.

---

## Key Features

- **Real-time IoT monitoring** — Energy (kWh), water flow (liters), and temperature data collected by ESP32 microcontrollers and transmitted via MQTT to the cloud.
- **REST API** — Node.js/Express API documented with OpenAPI/Swagger, secured with JWT authentication.
- **Automated reports** — Daily and end-of-stay consumption summaries delivered to guests.
- **Host dashboard** — Web-based UI built with Appsmith for monitoring devices, viewing trends, and managing listings.
- **CSV dataset export** — Raw sensor data available for researchers.
- **Docker Compose environment** — Spin up the full stack (MongoDB, ThingsBoard, API, Appsmith) locally with a single command.
- **CI pipeline** — GitHub Actions runs firmware builds and API unit/integration tests on every push.

---

## System Architecture

The system is built across four layers:

| Layer | Technologies | Role |
|---|---|---|
| **Device** | ESP32, C++, PlatformIO, FreeRTOS, MQTT | Sensor data collection and transmission |
| **Data** | MongoDB, ThingsBoard, PostgreSQL | Application data and time-series sensor storage |
| **Communication** | Node.js, Express, JWT, Agenda.js | REST API, authentication, scheduled reporting jobs |
| **Presentation** | Appsmith | Host dashboard and guest-facing reports |

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) v18+ (for local API development without Docker)

### Run with Docker Compose

The `api/docker-compose.yaml` file defines the full development environment including MongoDB, ThingsBoard IoT Platform, and the Node.js API.

```bash
cd api
cp .env.example .env   # configure environment variables
docker compose up
```

Once running:
- **API:** `http://localhost:3000`
- **ThingsBoard:** `http://localhost:8080`
- **MongoDB:** `localhost:27017`

Refer to the OpenAPI spec in `api/open-api/` for available endpoints and request/response schemas.

### ESP32 Firmware

Firmware for each sensor node is managed with [PlatformIO](https://platformio.org/).

```bash
cd esp32/platformio/<node-name>   # e.g. power-node, water-flow-node, temp-node
pio run --target upload
```

---

## Repository Structure

```
├── api/                    — Node.js REST API (Express, MongoDB, JWT auth)
│   ├── src/                — Application source (routes, models, jobs, utils)
│   ├── tests/              — Mocha/Chai unit & integration tests
│   ├── open-api/           — OpenAPI/Swagger specification
│   ├── data/               — Sample and seed data
│   └── docker-compose.yaml — Dev environment (MongoDB, ThingsBoard, API)
├── esp32/                  — ESP32 firmware (PlatformIO)
│   └── platformio/
│       ├── power-node/     — Energy monitoring (SCT-013 current sensor)
│       ├── water-flow-node/— Water flow monitoring (TF-S201 sensor)
│       └── temp-node/      — Temperature monitoring (DS18B20 sensor)
├── arduino/                — Arduino Leonardo firmware (power node sensor offload)
├── ui/                     — Appsmith web dashboard configuration
└── docs/                   — Full LaTeX thesis and project documentation
    ├── final-report/       — Thesis chapters
    ├── diagrams/
    ├── images/
    └── schematics/
```

---

## Tech Stack

| Area | Technologies |
|---|---|
| Firmware | C++, PlatformIO, FreeRTOS, Arduino, MQTT |
| Backend | Node.js, Express.js, MongoDB/Mongoose, JWT, Agenda.js, Winston |
| IoT Platform | ThingsBoard (PostgreSQL time-series storage) |
| Frontend | Appsmith (low-code dashboard) |
| Infrastructure | Docker, Docker Compose, Google Cloud, GitHub Actions |
| Testing | Mocha, Chai, Sinon, Supertest, Postman |

---

## Deployment

The production environment runs on a **Google Cloud VM** with all services containerised via Docker Compose. The three ESP32 sensor nodes connect to the cloud ThingsBoard instance over MQTT.

The CI pipeline (`.github/workflows/`) automatically builds the ESP32 firmware and runs the API test suite on each push.

---

## Academic Context

This project was developed as a final project for the **MSc Computer Science** programme (CSM500 – Project Module). It is an academic prototype intended to demonstrate a full-stack IoT solution. The 30-day real-world deployment validated the system's feasibility, though some limitations remain (e.g. rural connectivity causing ~14% data loss, sensor accuracy at low flow rates).

---

## License

ISC — see [`api/package.json`](api/package.json) for details.

---

## Credits

**Author:** Daniel Montero  
**Programme:** MSc Computer Science — Project Module (CSM500)  
**Deployment site:** Airbnb property, Costa Rica
