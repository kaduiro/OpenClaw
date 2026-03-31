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
export OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE:-Asia/Tokyo}"
export OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY:-google/gemini-2.5-flash}"
export OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK:-google/gemini-2.5-pro}"
OPENCLAW_BIN="${OPENCLAW_BIN:-$(command -v openclaw || command -v openclaw.exe || true)}"
OPENCLAW_BIN="$(normalize_bin "${OPENCLAW_BIN}")"

if [[ -z "${OPENCLAW_BIN}" ]]; then
  echo "openclaw CLI is required." >&2
  exit 1
fi

bash "${REPO_ROOT}/scripts/healthcheck.sh"

printf 'Control UI: http://127.0.0.1:18789/openclaw\n'
printf 'Workspace: %s\n' "${OPENCLAW_WORKSPACE_DIR}"

exec env \
  OPENCLAW_REPO_ROOT="${OPENCLAW_REPO_ROOT}" \
  OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR}" \
  OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" \
  OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
  OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE}" \
  OPENCLAW_MODEL_PRIMARY="${OPENCLAW_MODEL_PRIMARY}" \
  OPENCLAW_MODEL_FALLBACK="${OPENCLAW_MODEL_FALLBACK}" \
  "${OPENCLAW_BIN}" gateway
