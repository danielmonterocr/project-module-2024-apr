#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# stop.sh – Smarter Stays teardown
#
# Usage:
#   ./stop.sh           Stop all containers (data is preserved)
#   ./stop.sh --clean   Stop everything AND erase all data to start from scratch
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEAN=false

if [[ "${1:-}" == "--clean" ]]; then
    CLEAN=true
fi

echo ""
info "Stopping API stack (MongoDB, ThingsBoard, API server)..."
if [[ "$CLEAN" == "true" ]]; then
    docker compose -f "$ROOT_DIR/api/docker-compose.yaml" down -v
else
    docker compose -f "$ROOT_DIR/api/docker-compose.yaml" down
fi

info "Stopping UI (Appsmith)..."
if [[ "$CLEAN" == "true" ]]; then
    docker compose -f "$ROOT_DIR/ui/docker-compose.yaml" down -v
else
    docker compose -f "$ROOT_DIR/ui/docker-compose.yaml" down
fi

if [[ "$CLEAN" == "true" ]]; then
    echo ""
    info "Removing ThingsBoard host data..."
    docker run --rm \
        -v "$HOME":/host \
        alpine sh -c "rm -rf /host/.mytb-data /host/.mytb-logs 2>/dev/null; echo done" \
        2>/dev/null || true
    rmdir "$HOME/.mytb-data" "$HOME/.mytb-logs" 2>/dev/null || true

    if [[ -d "$ROOT_DIR/ui/stacks" ]]; then
        info "Removing Appsmith host data..."
        docker run --rm \
            -v "$ROOT_DIR/ui/stacks":/stacks \
            alpine sh -c "rm -rf /stacks/* /stacks/.* 2>/dev/null; echo done" \
            2>/dev/null || true
        rmdir "$ROOT_DIR/ui/stacks" 2>/dev/null || true
    fi

    if [[ -f "$ROOT_DIR/api/.env" ]]; then
        info "Removing api/.env..."
        rm -f "$ROOT_DIR/api/.env"
    fi

    echo ""
    success "All services stopped and all data erased."
    echo -e "  Run ${BOLD}./start.sh${RESET} to set up everything from scratch."
else
    echo ""
    success "All services stopped."
    echo -e "  Run ${BOLD}./start.sh${RESET} to bring them back up."
    echo -e "  Run ${BOLD}./stop.sh --clean${RESET} to erase all data and start from scratch."
fi
echo ""
