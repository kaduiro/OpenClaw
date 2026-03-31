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

if [[ $# -ne 1 ]]; then
  echo "Usage: bash scripts/safe-host-exec.sh <command-id>" >&2
  exit 1
fi

NODE_BIN="${NODE_BIN:-$(command -v node || command -v node.exe || true)}"
NODE_BIN="$(normalize_bin "${NODE_BIN}")"

[[ -n "${NODE_BIN}" ]] || {
  echo "node is required." >&2
  exit 1
}

"${NODE_BIN}" "$(node_target_path "${REPO_ROOT}/src/cli/safe-exec.mjs")" --allowlist "$(node_target_path "${REPO_ROOT}/config/exec-allowlist.json")" --command-id "$1"
