#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-runtime.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-shell-profile.sh"

assert_ubuntu_runtime "scripts/doctor-wsl.sh"

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

validate_mnt_path "OPENCLAW_REPO_ROOT" "${OPENCLAW_REPO_ROOT}"
validate_mnt_path "OPENCLAW_WORKSPACE_DIR" "${OPENCLAW_WORKSPACE_DIR}"
validate_mnt_path "OPENCLAW_CONFIG_PATH" "${OPENCLAW_CONFIG_PATH}"
validate_posix_path "OPENCLAW_STATE_DIR" "${OPENCLAW_STATE_DIR}"

NODE_BIN="$(resolve_command NODE_BIN node)"
PNPM_BIN="$(resolve_command PNPM_BIN pnpm)"
OPENCLAW_BIN="$(resolve_command OPENCLAW_BIN openclaw)"
DOCKER_BIN="$(resolve_command DOCKER_BIN docker)"
WINDOWS_NPM_SHIM_DIR="$(get_windows_npm_shim_dir)"
PROFILE_GUARD_INSTALLED=0

if profile_guard_is_installed "${HOME}/.bashrc"; then
  PROFILE_GUARD_INSTALLED=1
fi

NODE_READINESS="$(classify_shell_tool_readiness "node" "${NODE_BIN}" "${WINDOWS_NPM_SHIM_DIR}" "${PROFILE_GUARD_INSTALLED}")"
PNPM_READINESS="$(classify_shell_tool_readiness "pnpm" "${PNPM_BIN}" "${WINDOWS_NPM_SHIM_DIR}" "${PROFILE_GUARD_INSTALLED}")"
OPENCLAW_READINESS="$(classify_shell_tool_readiness "openclaw" "${OPENCLAW_BIN}" "${WINDOWS_NPM_SHIM_DIR}" "${PROFILE_GUARD_INSTALLED}")"

if [[ "${NODE_READINESS}" == "shell_not_reloaded" ]] || [[ "${PNPM_READINESS}" == "shell_not_reloaded" ]] || [[ "${OPENCLAW_READINESS}" == "shell_not_reloaded" ]]; then
  diagnose_issue \
    "Shell not reloaded" \
    "nvm or the profile guard is installed, but the current shell still resolves node/pnpm/openclaw incorrectly." \
    "The bootstrap changed your profile or Node installation, but this shell session predates that change." \
    "Run:\n  export NVM_DIR=\"${HOME}/.nvm\"\n  . \"${HOME}/.nvm/nvm.sh\"\n  source ~/.bashrc\nThen rerun:\n  bash scripts/doctor-wsl.sh"
fi

if [[ "${PNPM_READINESS}" == "windows_shim" ]] || [[ "${OPENCLAW_READINESS}" == "windows_shim" ]]; then
  diagnose_issue \
    "Windows shim contamination" \
    "pnpm/openclaw still resolve to the Windows npm shim directory." \
    "WSL is still preferring Windows npm global shims, which breaks the WSL-native execution contract for this repo." \
    "Run:\n  bash scripts/bootstrap-wsl.sh --yes\nThen reopen the shell or run:\n  source ~/.bashrc"
fi

ensure_wsl_native_command "node" "${NODE_BIN}" "Install Node.js inside WSL with nvm, then confirm \`command -v node\` and \`node -v\`."
ensure_wsl_native_command "pnpm" "${PNPM_BIN}" "Enable pnpm inside WSL with \`corepack enable\`, then confirm \`command -v pnpm\` and \`pnpm -v\`."
ensure_wsl_native_command "openclaw" "${OPENCLAW_BIN}" "Install OpenClaw inside WSL with \`npm install -g openclaw\`, then confirm \`command -v openclaw\` and \`openclaw --version\`."
ensure_wsl_native_command "docker" "${DOCKER_BIN}" "Enable Docker Desktop WSL integration, then confirm \`command -v docker\` and \`docker version\` in WSL."

docker_output="$("${DOCKER_BIN}" version 2>&1 || true)"
if [[ "${docker_output}" == *"could not be found in this WSL 2 distro"* ]] || [[ "${docker_output}" == *"command 'docker' could not be found in this WSL 2 distro"* ]]; then
  diagnose_issue \
    "Docker Desktop WSL integration is disabled" \
    "docker exists but WSL reports that this distro is not integrated with Docker Desktop." \
    "OpenClaw sandboxing depends on Docker from inside WSL. Without integration, sandbox startup and health checks will fail." \
    "Open Docker Desktop > Settings > Resources > WSL Integration, enable Ubuntu, then rerun \`docker version\`."
fi

if [[ "${docker_output}" == *"Cannot connect to the Docker daemon"* ]]; then
  diagnose_issue \
    "Docker daemon is unavailable" \
    "docker is installed but cannot connect to the daemon." \
    "OpenClaw sandboxing requires a running Docker daemon reachable from WSL." \
    "Start Docker Desktop on Windows, wait for it to finish booting, then rerun \`docker version\`."
fi

if [[ -f "${OPENCLAW_CONFIG_PATH}" ]]; then
  ensure_sandbox_image_has_python "${NODE_BIN}" "${DOCKER_BIN}" "${OPENCLAW_REPO_ROOT}" "${OPENCLAW_CONFIG_PATH}"
fi

windows_profile_wsl_path="$(get_windows_userprofile_wsl_path)"
check_known_wslconfig_issues "${windows_profile_wsl_path}/.wslconfig"

printf 'WSL doctor passed.\n'
printf 'node: %s\n' "${NODE_BIN}"
printf 'pnpm: %s\n' "${PNPM_BIN}"
printf 'openclaw: %s\n' "${OPENCLAW_BIN}"
printf 'docker: %s\n' "${DOCKER_BIN}"
