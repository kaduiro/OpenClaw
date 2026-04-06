#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-runtime.sh"

assert_wsl_linux_runtime "scripts/dev-start.sh"

if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env"
  set +a
fi

export OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT:-${REPO_ROOT}}"
export OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-${REPO_ROOT}/workspace}"
export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${REPO_ROOT}/config/openclaw.json5}"
export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-${HOME}/.openclaw-personal}"
export OPENCLAW_SANDBOX_IMAGE="${OPENCLAW_SANDBOX_IMAGE:-openclaw-sandbox:bookworm-python}"
export OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE:-Asia/Tokyo}"
export OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY:-google/gemini-2.5-flash}"
export OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK:-google/gemini-2.5-pro}"

validate_posix_path "OPENCLAW_REPO_ROOT" "${OPENCLAW_REPO_ROOT}"
validate_posix_path "OPENCLAW_WORKSPACE_DIR" "${OPENCLAW_WORKSPACE_DIR}"
validate_posix_path "OPENCLAW_CONFIG_PATH" "${OPENCLAW_CONFIG_PATH}"
validate_posix_path "OPENCLAW_STATE_DIR" "${OPENCLAW_STATE_DIR}"

OPENCLAW_BIN="$(resolve_command OPENCLAW_BIN openclaw)"
ensure_command "openclaw" "${OPENCLAW_BIN}" "openclaw CLI is required. In WSL, confirm \`command -v openclaw\` and \`openclaw --version\`."

bash "${REPO_ROOT}/scripts/doctor-wsl.sh"
bash "${REPO_ROOT}/scripts/healthcheck.sh"

printf 'Control UI: http://127.0.0.1:18789/openclaw\n'
printf 'Workspace: %s\n' "${OPENCLAW_WORKSPACE_DIR}"

OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT}" \
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR}" \
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" \
OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
OPENCLAW_SANDBOX_IMAGE="${OPENCLAW_SANDBOX_IMAGE}" \
OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE}" \
OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY}" \
OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK}" \
"${OPENCLAW_BIN}" gateway
