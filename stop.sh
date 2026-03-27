#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# stop.sh – Smarter Stays teardown
#
# Stops and removes all containers for both the API stack and the UI.
# Data volumes are preserved so state is not lost between restarts.
# To also remove volumes, run:
#   docker compose -f api/docker-compose.yaml down -v
#   docker compose -f ui/docker-compose.yaml down -v
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN}[INFO]${RESET}  Stopping API stack (MongoDB, ThingsBoard, API server)..."
docker compose -f "$ROOT_DIR/api/docker-compose.yaml" down

echo -e "${CYAN}[INFO]${RESET}  Stopping UI (Appsmith)..."
docker compose -f "$ROOT_DIR/ui/docker-compose.yaml" down

echo ""
echo -e "${BOLD}${GREEN}All services stopped.${RESET}"
echo -e "  Run ${BOLD}./start.sh${RESET} to bring them back up."
echo ""
