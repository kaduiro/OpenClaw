#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-runtime.sh"

assert_wsl_linux_runtime "scripts/healthcheck.sh"

if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env"
  set +a
fi

export OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT:-${REPO_ROOT}}"
export OPENCLAW_REPO_BIND_ROOT="${OPENCLAW_REPO_BIND_ROOT:-${OPENCLAW_REPO_ROOT}}"
export OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-${REPO_ROOT}/workspace}"
export OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${REPO_ROOT}/config/openclaw.json5}"
export OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR:-${HOME}/.openclaw-personal}"

validate_posix_path "OPENCLAW_REPO_ROOT" "${OPENCLAW_REPO_ROOT}"
validate_posix_path "OPENCLAW_REPO_BIND_ROOT" "${OPENCLAW_REPO_BIND_ROOT}"
validate_posix_path "OPENCLAW_WORKSPACE_DIR" "${OPENCLAW_WORKSPACE_DIR}"
validate_posix_path "OPENCLAW_CONFIG_PATH" "${OPENCLAW_CONFIG_PATH}"
validate_posix_path "OPENCLAW_STATE_DIR" "${OPENCLAW_STATE_DIR}"

NODE_BIN="$(resolve_command NODE_BIN node)"
OPENCLAW_BIN="$(resolve_command OPENCLAW_BIN openclaw)"
DOCKER_BIN="$(resolve_command DOCKER_BIN docker)"

ensure_command "node" "${NODE_BIN}" "node is required. In WSL, confirm \`command -v node\`."
ensure_command "openclaw" "${OPENCLAW_BIN}" "openclaw CLI is required. In WSL, confirm \`command -v openclaw\` and \`openclaw --version\`."
ensure_command "docker" "${DOCKER_BIN}" "docker is required. Enable Docker Desktop WSL integration and confirm \`docker version\` in WSL."

[[ -f "${REPO_ROOT}/.env" ]] || {
  echo ".env is required." >&2
  exit 1
}

[[ -f "${OPENCLAW_CONFIG_PATH}" ]] || {
  echo "OpenClaw config not found at ${OPENCLAW_CONFIG_PATH}" >&2
  exit 1
}

"${NODE_BIN}" "${OPENCLAW_REPO_ROOT}/src/cli/scaffold-workspace.mjs" --workspace "${OPENCLAW_WORKSPACE_DIR}" --check

OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT}" \
OPENCLAW_REPO_BIND_ROOT="${OPENCLAW_REPO_BIND_ROOT}" \
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR}" \
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" \
OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE:-Asia/Tokyo}" \
OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY:-google/gemini-2.5-flash}" \
OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK:-google/gemini-2.5-pro}" \
"${NODE_BIN}" "${OPENCLAW_REPO_ROOT}/src/cli/validate-config.mjs" --config "${OPENCLAW_CONFIG_PATH}"

OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT}" \
OPENCLAW_REPO_BIND_ROOT="${OPENCLAW_REPO_BIND_ROOT}" \
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR}" \
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" \
OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE:-Asia/Tokyo}" \
OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY:-google/gemini-2.5-flash}" \
OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK:-google/gemini-2.5-pro}" \
"${OPENCLAW_BIN}" config validate >/dev/null

echo "Healthcheck passed."
