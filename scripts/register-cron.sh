#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-runtime.sh"

assert_wsl_linux_runtime "scripts/register-cron.sh"

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
export OPENCLAW_TIMEZONE="${OPENCLAW_TIMEZONE:-Asia/Tokyo}"
export NIGHTLY_TRIAGE_CRON="${NIGHTLY_TRIAGE_CRON:-0 23 * * *}"
export MORNING_BRIEF_CRON="${MORNING_BRIEF_CRON:-0 7 * * *}"

validate_posix_path "OPENCLAW_REPO_ROOT" "${OPENCLAW_REPO_ROOT}"
validate_posix_path "OPENCLAW_REPO_BIND_ROOT" "${OPENCLAW_REPO_BIND_ROOT}"
validate_posix_path "OPENCLAW_WORKSPACE_DIR" "${OPENCLAW_WORKSPACE_DIR}"
validate_posix_path "OPENCLAW_CONFIG_PATH" "${OPENCLAW_CONFIG_PATH}"
validate_posix_path "OPENCLAW_STATE_DIR" "${OPENCLAW_STATE_DIR}"

OPENCLAW_BIN="$(resolve_command OPENCLAW_BIN openclaw)"
NODE_BIN="$(resolve_command NODE_BIN node)"

ensure_command "openclaw" "${OPENCLAW_BIN}" "openclaw CLI is required. In WSL, confirm \`command -v openclaw\` and \`openclaw --version\`."
ensure_command "node" "${NODE_BIN}" "node is required. In WSL, confirm \`command -v node\`."

bash "${REPO_ROOT}/scripts/doctor-wsl.sh"

list_json="$(OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" "${OPENCLAW_BIN}" cron list --json || true)"

get_job_id_by_name() {
  local name="$1"
  JOB_NAME="${name}" "${NODE_BIN}" -e 'const raw = process.argv[1]; const name = process.env.JOB_NAME; if (!raw) process.exit(0); let jobs = []; try { jobs = JSON.parse(raw); } catch { process.exit(0); } const hit = jobs.find((job) => job.name === name); if (hit) process.stdout.write(hit.jobId || hit.id || "");' "${list_json}"
}

upsert_job() {
  local job_name="$1"
  local expr="$2"
  local message="$3"
  local job_id

  job_id="$(get_job_id_by_name "${job_name}")"

  if [[ -n "${job_id}" ]]; then
    OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
      "${OPENCLAW_BIN}" cron edit "${job_id}" \
      --cron "${expr}" \
      --tz "${OPENCLAW_TIMEZONE}" \
      --session isolated \
      --message "${message}" \
      --light-context \
      --no-deliver
  else
    OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH}" OPENCLAW_STATE_DIR="${OPENCLAW_STATE_DIR}" \
      "${OPENCLAW_BIN}" cron add \
      --name "${job_name}" \
      --cron "${expr}" \
      --tz "${OPENCLAW_TIMEZONE}" \
      --session isolated \
      --message "${message}" \
      --light-context \
      --no-deliver
  fi
}

nightly_message="Use the nightly-triage skill from the workspace. Execute: node /repo/src/cli/nightly-triage.mjs --workspace /workspace. Do not invent output. Save results only into the workspace files."
morning_message="Use the morning-brief skill from the workspace. Execute: node /repo/src/cli/morning-brief.mjs --workspace /workspace. Do not invent output. Save results only into the workspace files."

upsert_job "personal-nightly-triage" "${NIGHTLY_TRIAGE_CRON}" "${nightly_message}"
upsert_job "personal-morning-brief" "${MORNING_BRIEF_CRON}" "${morning_message}"

printf 'Cron jobs registered for timezone %s\n' "${OPENCLAW_TIMEZONE}"
