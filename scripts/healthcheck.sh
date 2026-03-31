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

node_target_path() {
  local value="$1"
  if [[ "$(basename "${NODE_BIN}")" == "node.exe" ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -w "${value}"
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
NODE_BIN="${NODE_BIN:-$(command -v node || command -v node.exe || true)}"
OPENCLAW_BIN="${OPENCLAW_BIN:-$(command -v openclaw || command -v openclaw.exe || true)}"
DOCKER_BIN="${DOCKER_BIN:-$(command -v docker || command -v docker.exe || true)}"
NODE_BIN="$(normalize_bin "${NODE_BIN}")"
OPENCLAW_BIN="$(normalize_bin "${OPENCLAW_BIN}")"
DOCKER_BIN="$(normalize_bin "${DOCKER_BIN}")"

[[ -n "${NODE_BIN}" ]] || {
  echo "node is required." >&2
  exit 1
}

[[ -n "${OPENCLAW_BIN}" ]] || {
  echo "openclaw CLI is required." >&2
  exit 1
}

[[ -n "${DOCKER_BIN}" ]] || {
  echo "docker is required for sandboxed execution." >&2
  exit 1
}

[[ -f "${REPO_ROOT}/.env" ]] || {
  echo ".env is required." >&2
  exit 1
}

[[ -f "${OPENCLAW_CONFIG_PATH}" ]] || {
  echo "OpenClaw config not found at ${OPENCLAW_CONFIG_PATH}" >&2
  exit 1
}

"${NODE_BIN}" "$(node_target_path "${REPO_ROOT}/src/cli/scaffold-workspace.mjs")" --workspace "$(node_target_path "${OPENCLAW_WORKSPACE_DIR}")" --check
"${NODE_BIN}" "$(node_target_path "${REPO_ROOT}/src/cli/validate-config.mjs")" --config "$(node_target_path "${OPENCLAW_CONFIG_PATH}")"

echo "Healthcheck passed."
