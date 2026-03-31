#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

normalize_bin() {
  local value="$1"
  if [[ "${value}" =~ ^[A-Za-z]:[\\/].* ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -u "${value}"
    return
  fi
  printf '%s' "${value}"
}

if [[ ! -f "${REPO_ROOT}/.env" ]]; then
  echo ".env is required for production startup." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "${REPO_ROOT}/.env"
set +a

required_vars=(
  OPENCLAW_GATEWAY_TOKEN
  GEMINI_API_KEY
  OPENCLAW_REPO_ROOT
  OPENCLAW_WORKSPACE_DIR
  OPENCLAW_CONFIG_PATH
  OPENCLAW_STATE_DIR
  OPENCLAW_MODEL_PRIMARY
  OPENCLAW_MODEL_FALLBACK
  OPENCLAW_TIMEZONE
)

for key in "${required_vars[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required environment variable: ${key}" >&2
    exit 1
  fi
done

OPENCLAW_BIN="${OPENCLAW_BIN:-$(command -v openclaw || command -v openclaw.exe || true)}"
OPENCLAW_BIN="$(normalize_bin "${OPENCLAW_BIN}")"

if [[ -z "${OPENCLAW_BIN}" ]]; then
  echo "openclaw CLI is required." >&2
  exit 1
fi

bash "${REPO_ROOT}/scripts/healthcheck.sh"

exec env \
  OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT}" \
  OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR}" \
  OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" \
  OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
  OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE}" \
  OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY}" \
  OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK}" \
  "${OPENCLAW_BIN}" gateway
