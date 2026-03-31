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

GIT_BIN="${GIT_BIN:-$(command -v git || command -v git.exe || true)}"
GIT_BIN="$(normalize_bin "${GIT_BIN}")"

[[ -n "${GIT_BIN}" ]] || {
  echo "git is required for backups." >&2
  exit 1
}

cd "${REPO_ROOT}"

if [[ -z "$("${GIT_BIN}" status --porcelain)" ]]; then
  echo "No changes to back up."
else
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  "${GIT_BIN}" add -A
  "${GIT_BIN}" commit -m "backup: ${timestamp}" >/dev/null
  echo "Created local backup commit at ${timestamp}"
fi

if [[ -n "${BACKUP_REMOTE:-}" && -n "${BACKUP_BRANCH:-}" ]]; then
  "${GIT_BIN}" push "${BACKUP_REMOTE}" "HEAD:${BACKUP_BRANCH}"
  echo "Pushed backup to ${BACKUP_REMOTE}/${BACKUP_BRANCH}"
fi
