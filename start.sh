#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh – Smarter Stays full-stack launcher
#
# Usage:
#   ./start.sh
#
# What this script does:
#   A. Preflight checks  – validates tooling and the .env file
#   B. Start ThingsBoard – waits until the service is fully ready
#   C. Auto-provision    – fetches and patches PROVISION_DEVICE_KEY/SECRET
#   D. Start API stack   – builds and starts MongoDB + Node.js API
#   E. Start UI          – starts the Appsmith container
#   F. Print status      – shows all service URLs
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/api"
UI_DIR="$ROOT_DIR/ui"
ENV_FILE="$API_DIR/.env"
ENV_EXAMPLE="$API_DIR/.env.example"

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
die()     { error "$*"; exit 1; }

# Read a value from the .env file
env_get() {
    grep -E "^${1}=" "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

# Replace or set a key=value in the .env file (in-place, no temp files left behind)
env_set() {
    local key="$1"
    local value="$2"
    if grep -qE "^${key}=" "$ENV_FILE"; then
        # Use a delimiter that won't appear in keys/values (%%)
        sed -i "s%%^${key}=.*%%${key}=${value}%%" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# Parse a JSON field from stdin using jq if available, otherwise python3
json_field() {
    local field="$1"
    local input
    input=$(cat)
    if command -v jq &>/dev/null; then
        echo "$input" | jq -r "$field"
    else
        echo "$input" | python3 -c "
import sys, json
data = json.load(sys.stdin)
parts = '${field}'.lstrip('.').split('.')
val = data
for p in parts:
    val = val[p]
print(val)
"
    fi
}

# ═════════════════════════════════════════════════════════════════════════════
# A. PREFLIGHT CHECKS
# ═════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         Smarter Stays – Starting up...               ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
info "Stage A: Preflight checks"

command -v docker &>/dev/null     || die "Docker is not installed. Install it from https://docs.docker.com/get-docker/"
docker compose version &>/dev/null || die "Docker Compose v2 is not available. Update Docker or install the Compose plugin."
command -v curl &>/dev/null       || die "curl is required but not installed."

if ! command -v jq &>/dev/null; then
    warn "jq not found – will use python3 for JSON parsing."
    command -v python3 &>/dev/null || die "python3 is required when jq is not available. Install jq or python3."
fi

success "Docker, Docker Compose, and curl are available."

# ── .env check ────────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
    info "No api/.env found – creating one from the template..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo ""
    echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────┐${RESET}"
    echo -e "${YELLOW}  │  ACTION REQUIRED                                     │${RESET}"
    echo -e "${YELLOW}  │                                                       │${RESET}"
    echo -e "${YELLOW}  │  api/.env has been created from api/.env.example.    │${RESET}"
    echo -e "${YELLOW}  │  Open it and fill in the values marked with <...>:   │${RESET}"
    echo -e "${YELLOW}  │                                                       │${RESET}"
    echo -e "${YELLOW}  │    DB_PASSWORD     – choose a strong password        │${RESET}"
    echo -e "${YELLOW}  │    TOKEN_SECRET    – a random secret string          │${RESET}"
    echo -e "${YELLOW}  │                                                       │${RESET}"
    echo -e "${YELLOW}  │  Then re-run ./start.sh                              │${RESET}"
    echo -e "${YELLOW}  └─────────────────────────────────────────────────────┘${RESET}"
    echo ""
    exit 0
fi

# ── Validate required variables ───────────────────────────────────────────────
MISSING=()
for var in PORT DB_PREFIX DB_USER DB_PASSWORD DB_DOMAIN DB_NAME DB_PORT TOKEN_SECRET THINGSBOARD_URL THINGSBOARD_USERNAME THINGSBOARD_PASSWORD; do
    val=$(env_get "$var")
    if [[ -z "$val" || "$val" == *"<"* ]]; then
        MISSING+=("$var")
    fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
    error "The following variables in api/.env are missing or still have placeholder values:"
    for v in "${MISSING[@]}"; do
        echo -e "  ${RED}•${RESET} $v"
    done
    echo ""
    die "Fix api/.env and re-run ./start.sh"
fi

success "api/.env looks good."

# ── Load env vars for script use ──────────────────────────────────────────────
set -o allexport
# shellcheck source=/dev/null
source "$ENV_FILE"
set +o allexport

# ThingsBoard is accessed on the host (not inside Docker)
TB_HOST_URL="http://localhost:8080"

# ═════════════════════════════════════════════════════════════════════════════
# B. START THINGSBOARD
# ═════════════════════════════════════════════════════════════════════════════
echo ""
info "Stage B: Starting ThingsBoard..."

# ── Ensure host volume directories exist with correct ownership ───────────
# The ThingsBoard image uses two internal users:
#   - thingsboard (UID 799) owns /data
#   - postgres    (UID 100) owns /data/db (created by the entrypoint)
# If these directories don't exist, Docker creates them as root, which
# causes "Permission denied" errors.  We pre-create them and hand ownership
# to UID 799 so the entrypoint can bootstrap the rest.
TB_DATA_DIR="$HOME/.mytb-data"
TB_LOGS_DIR="$HOME/.mytb-logs"
info "Ensuring ThingsBoard volume directories exist with correct ownership..."
mkdir -p "$TB_DATA_DIR" "$TB_LOGS_DIR"
docker run --rm -v "$TB_DATA_DIR":/data -v "$TB_LOGS_DIR":/logs alpine \
    chown -R 799:799 /data /logs

docker compose -f "$API_DIR/docker-compose.yaml" up -d mytb

info "Waiting for ThingsBoard to become ready (this can take 3–5 minutes on first run)..."
TB_MAX_WAIT=480 # seconds – first run includes DB schema creation + Java startup
TB_INTERVAL=5
TB_ELAPSED=0
TB_READY=false
SPINNER_CHARS='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
SPINNER_IDX=0

while [[ $TB_ELAPSED -lt $TB_MAX_WAIT ]]; do
    # ── Bail early if the container is not running ────────────────────────
    CONTAINER_STATE=$(docker compose -f "$API_DIR/docker-compose.yaml" ps --format '{{.State}}' mytb 2>/dev/null || true)
    if [[ "$CONTAINER_STATE" == "exited" || "$CONTAINER_STATE" == "dead" ]]; then
        echo ""
        error "ThingsBoard container exited unexpectedly. Last 20 log lines:"
        docker compose -f "$API_DIR/docker-compose.yaml" logs --tail 20 mytb
        die "Fix the issue above and re-run ./start.sh"
    fi

    # ── Probe the login endpoint (with a short timeout to avoid hangs) ───
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
        -X POST "$TB_HOST_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"dummy","password":"dummy"}' 2>/dev/null || true)

    # 200 = ok, 401 = auth failed but service is up, 400 = bad request but service is up
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "401" || "$HTTP_CODE" == "400" ]]; then
        TB_READY=true
        break
    fi

    # ── Animated spinner with elapsed time ────────────────────────────────
    SPIN_CHAR="${SPINNER_CHARS:SPINNER_IDX:1}"
    SPINNER_IDX=$(( (SPINNER_IDX + 1) % ${#SPINNER_CHARS} ))
    printf "  ${CYAN}%s${RESET}  %3ds / %ds  (HTTP %s)   \r" "$SPIN_CHAR" "$TB_ELAPSED" "$TB_MAX_WAIT" "${HTTP_CODE:-000}"

    sleep $TB_INTERVAL
    TB_ELAPSED=$((TB_ELAPSED + TB_INTERVAL))
done

printf "\033[2K"  # clear the spinner line
if [[ "$TB_READY" != "true" ]]; then
    error "ThingsBoard did not become ready within ${TB_MAX_WAIT}s. Recent logs:"
    docker compose -f "$API_DIR/docker-compose.yaml" logs --tail 30 mytb
    die "Check the logs above for errors, then re-run ./start.sh"
fi

success "ThingsBoard is ready (took ~${TB_ELAPSED}s)."

# ═════════════════════════════════════════════════════════════════════════════
# C. AUTO-PROVISION THINGSBOARD KEYS
# ═════════════════════════════════════════════════════════════════════════════
echo ""
info "Stage C: Checking ThingsBoard provisioning keys..."

CURRENT_KEY=$(env_get "PROVISION_DEVICE_KEY")
CURRENT_SECRET=$(env_get "PROVISION_DEVICE_SECRET")

if [[ -z "$CURRENT_KEY" || "$CURRENT_KEY" == "auto_provisioned" || -z "$CURRENT_SECRET" || "$CURRENT_SECRET" == "auto_provisioned" ]]; then
    info "Provisioning keys not set – fetching from ThingsBoard API..."

    # Step 1: Login to ThingsBoard
    LOGIN_RESPONSE=$(curl -s -X POST "$TB_HOST_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${THINGSBOARD_USERNAME}\",\"password\":\"${THINGSBOARD_PASSWORD}\"}")

    TB_TOKEN=$(echo "$LOGIN_RESPONSE" | json_field ".token")

    if [[ -z "$TB_TOKEN" || "$TB_TOKEN" == "null" ]]; then
        die "Failed to authenticate with ThingsBoard. Check THINGSBOARD_USERNAME and THINGSBOARD_PASSWORD in api/.env."
    fi

    # Step 2: Get the default device profile ID
    PROFILE_INFO=$(curl -s -X GET "$TB_HOST_URL/api/deviceProfileInfo/default" \
        -H "X-Authorization: Bearer $TB_TOKEN")

    PROFILE_ID=$(echo "$PROFILE_INFO" | json_field ".id.id")

    if [[ -z "$PROFILE_ID" || "$PROFILE_ID" == "null" ]]; then
        die "Failed to retrieve default device profile from ThingsBoard."
    fi

    # Step 3: Get provisioning key and secret from the full device profile
    PROFILE=$(curl -s -X GET "$TB_HOST_URL/api/deviceProfile/${PROFILE_ID}" \
        -H "X-Authorization: Bearer $TB_TOKEN")

    PROV_KEY=$(echo "$PROFILE" | json_field ".provisionDeviceKey")

    if command -v jq &>/dev/null; then
        PROV_SECRET=$(echo "$PROFILE" | jq -r '.profileData.provisionConfiguration.provisionDeviceSecret')
    else
        PROV_SECRET=$(echo "$PROFILE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d['profileData']['provisionConfiguration']['provisionDeviceSecret'])
")
    fi

    if [[ -z "$PROV_KEY" || "$PROV_KEY" == "null" || -z "$PROV_SECRET" || "$PROV_SECRET" == "null" ]]; then
        warn "Could not retrieve provisioning key/secret from default device profile."
        warn "The API will still start, but device provisioning will not work until keys are set."
        warn "After startup, visit http://localhost:8080 and create a device profile with provisioning enabled."
    else
        env_set "PROVISION_DEVICE_KEY" "$PROV_KEY"
        env_set "PROVISION_DEVICE_SECRET" "$PROV_SECRET"
        # Reload so the API container picks up the new values
        export PROVISION_DEVICE_KEY="$PROV_KEY"
        export PROVISION_DEVICE_SECRET="$PROV_SECRET"
        success "Provisioning keys written to api/.env."
    fi
else
    success "Provisioning keys already set – skipping."
fi

# ═════════════════════════════════════════════════════════════════════════════
# D. START MONGODB + API
# ═════════════════════════════════════════════════════════════════════════════
echo ""
info "Stage D: Building and starting MongoDB + API server..."
docker compose -f "$API_DIR/docker-compose.yaml" up -d --build

info "Waiting for the API server to become ready..."
API_URL="http://localhost:${PORT:-3000}"
API_MAX_WAIT=90
API_INTERVAL=5
API_ELAPSED=0
API_READY=false

while [[ $API_ELAPSED -lt $API_MAX_WAIT ]]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api-docs" 2>/dev/null || true)
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
        API_READY=true
        break
    fi
    printf "  Waited %ds / %ds (HTTP %s)...\r" "$API_ELAPSED" "$API_MAX_WAIT" "$HTTP_CODE"
    sleep $API_INTERVAL
    API_ELAPSED=$((API_ELAPSED + API_INTERVAL))
done

echo ""
if [[ "$API_READY" != "true" ]]; then
    warn "API did not respond within ${API_MAX_WAIT}s. It may still be starting."
    warn "Check logs: docker compose -f api/docker-compose.yaml logs server"
else
    success "API server is ready."
fi

# ═════════════════════════════════════════════════════════════════════════════
# E. START UI (APPSMITH)
# ═════════════════════════════════════════════════════════════════════════════
echo ""
info "Stage E: Starting Appsmith UI..."
docker compose -f "$UI_DIR/docker-compose.yaml" up -d
success "Appsmith container started (first launch may take a few minutes to initialise)."

# ═════════════════════════════════════════════════════════════════════════════
# F. STATUS BANNER
# ═════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║   All services are up!                               ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Service          URL${RESET}"
echo -e "  ───────────────  ─────────────────────────────────────"
echo -e "  API              ${CYAN}http://localhost:${PORT:-3000}${RESET}"
echo -e "  Swagger UI       ${CYAN}http://localhost:${PORT:-3000}/api-docs${RESET}"
echo -e "  ThingsBoard      ${CYAN}http://localhost:8080${RESET}  (${THINGSBOARD_USERNAME} / ${THINGSBOARD_PASSWORD})"
echo -e "  Appsmith UI      ${CYAN}http://localhost:80${RESET}"
echo ""
echo -e "  Use ${BOLD}./stop.sh${RESET} to stop all services."
echo ""
