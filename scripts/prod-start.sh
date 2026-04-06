#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-runtime.sh"

assert_wsl_linux_runtime "scripts/prod-start.sh"

if [[ ! -f "${REPO_ROOT}/.env" ]]; then
  echo ".env is required for production startup." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "${REPO_ROOT}/.env"
set +a

export OPENCLAW_SANDBOX_IMAGE="${OPENCLAW_SANDBOX_IMAGE:-openclaw-sandbox:bookworm-python}"

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
  [[ -n "${!key:-}" ]] || fail_check "Missing required environment variable: ${key}"
done

validate_posix_path "OPENCLAW_REPO_ROOT" "${OPENCLAW_REPO_ROOT}"
validate_posix_path "OPENCLAW_WORKSPACE_DIR" "${OPENCLAW_WORKSPACE_DIR}"
validate_posix_path "OPENCLAW_CONFIG_PATH" "${OPENCLAW_CONFIG_PATH}"
validate_posix_path "OPENCLAW_STATE_DIR" "${OPENCLAW_STATE_DIR}"

NODE_BIN="$(resolve_command NODE_BIN node)"
OPENCLAW_BIN="$(resolve_command OPENCLAW_BIN openclaw)"

ensure_command "node" "${NODE_BIN}" "node is required. In WSL, confirm \`command -v node\`."
ensure_command "openclaw" "${OPENCLAW_BIN}" "openclaw CLI is required. In WSL, confirm \`command -v openclaw\` and \`openclaw --version\`."

bash "${REPO_ROOT}/scripts/doctor-wsl.sh"
bash "${REPO_ROOT}/scripts/healthcheck.sh"

OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT}" \
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR}" \
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" \
OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
OPENCLAW_SANDBOX_IMAGE="${OPENCLAW_SANDBOX_IMAGE}" \
OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE}" \
OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY}" \
OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK}" \
"${OPENCLAW_BIN}" gateway
