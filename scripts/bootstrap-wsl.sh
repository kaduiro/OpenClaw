#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-runtime.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-shell-profile.sh"

assert_ubuntu_runtime "scripts/bootstrap-wsl.sh"

DRY_RUN=0
ASSUME_YES=0
FORCE_ALL="${BOOTSTRAP_FORCE_ALL:-0}"
OPENCLAW_SANDBOX_IMAGE="${OPENCLAW_SANDBOX_IMAGE:-openclaw-sandbox:bookworm-python}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --yes)
      ASSUME_YES=1
      ;;
    *)
      fail_check "Unknown argument: $1"
      ;;
  esac
  shift
done

command -v apt >/dev/null 2>&1 || diagnose_issue \
  "apt is unavailable" \
  "The current Ubuntu environment does not expose apt." \
  "Bootstrap assumes the standard Ubuntu package manager is available inside WSL." \
  "Open a normal Ubuntu on WSL2 shell and rerun this script."

declare -a planned_labels=()
declare -a planned_commands=()
WINDOWS_NPM_SHIM_DIR="$(get_windows_npm_shim_dir)"

append_step() {
  planned_labels+=("$1")
  planned_commands+=("$2")
}

append_if_missing_pkg() {
  local pkg="$1"
  if ! dpkg -s "${pkg}" >/dev/null 2>&1; then
    append_step "Install ${pkg}" "sudo apt-get install -y ${pkg}"
  fi
}

append_if_missing_pkg "curl"
append_if_missing_pkg "git"
append_if_missing_pkg "build-essential"
append_if_missing_pkg "ca-certificates"

if [[ -n "${WINDOWS_NPM_SHIM_DIR}" ]] && ! profile_guard_is_installed "${HOME}/.bashrc"; then
  append_step "Install WSL shell profile guard" "Persist a PATH guard that removes ${WINDOWS_NPM_SHIM_DIR}"
fi

if [[ -n "${WINDOWS_NPM_SHIM_DIR}" ]]; then
  apply_windows_npm_shim_guard_current_shell "${WINDOWS_NPM_SHIM_DIR}"
fi

NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
source_nvm_if_present

if command -v nvm >/dev/null 2>&1; then
  nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true
fi

if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
  append_step "Install nvm" "curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
fi

NODE_BIN_CURRENT="$(command -v node 2>/dev/null || true)"
PNPM_BIN_CURRENT="$(command -v pnpm 2>/dev/null || true)"
OPENCLAW_BIN_CURRENT="$(command -v openclaw 2>/dev/null || true)"
PROFILE_GUARD_ACTIVE=0
if [[ -n "${WINDOWS_NPM_SHIM_DIR}" ]]; then
  if [[ "${PATH}" != *"${WINDOWS_NPM_SHIM_DIR}"* ]]; then
    PROFILE_GUARD_ACTIVE=1
  fi
fi

NODE_READINESS="$(classify_shell_tool_readiness "node" "${NODE_BIN_CURRENT}" "${WINDOWS_NPM_SHIM_DIR}" "${PROFILE_GUARD_ACTIVE}")"
PNPM_READINESS="$(classify_shell_tool_readiness "pnpm" "${PNPM_BIN_CURRENT}" "${WINDOWS_NPM_SHIM_DIR}" "${PROFILE_GUARD_ACTIVE}")"
OPENCLAW_READINESS="$(classify_shell_tool_readiness "openclaw" "${OPENCLAW_BIN_CURRENT}" "${WINDOWS_NPM_SHIM_DIR}" "${PROFILE_GUARD_ACTIVE}")"

if [[ "${FORCE_ALL}" == "1" ]] || [[ "${NODE_READINESS}" != "ready" ]]; then
  append_step "Install Node.js LTS" "export NVM_DIR=\"${NVM_DIR}\" && . \"${NVM_DIR}/nvm.sh\" && nvm install --lts && nvm alias default 'lts/*'"
fi

if [[ "${FORCE_ALL}" == "1" ]] || [[ "${PNPM_READINESS}" != "ready" ]]; then
  append_step "Enable pnpm via corepack" "corepack enable && corepack prepare pnpm@latest --activate"
fi

if [[ "${FORCE_ALL}" == "1" ]] || [[ "${OPENCLAW_READINESS}" != "ready" ]]; then
  append_step "Install OpenClaw CLI in WSL" "npm install -g openclaw"
fi

docker_output="$(docker version 2>&1 || true)"
if [[ "${docker_output}" == *"could not be found in this WSL 2 distro"* ]] || [[ "${docker_output}" == *"command 'docker' could not be found in this WSL 2 distro"* ]] || [[ -z "$(command -v docker 2>/dev/null || true)" ]]; then
  append_step "Enable Docker Desktop WSL integration" "Open Docker Desktop > Settings > Resources > WSL Integration, enable Ubuntu, then rerun docker version"
fi

if command -v docker >/dev/null 2>&1 && [[ "${docker_output}" != *"could not be found in this WSL 2 distro"* ]] && [[ "${docker_output}" != *"command 'docker' could not be found in this WSL 2 distro"* ]] && [[ "${docker_output}" != *"Cannot connect to the Docker daemon"* ]]; then
  if ! docker image inspect "${OPENCLAW_SANDBOX_IMAGE}" >/dev/null 2>&1; then
    append_step "Build Python-enabled sandbox image" "bash scripts/build-sandbox-image.sh"
  fi
fi

if [[ ! -f "${REPO_ROOT}/.env" ]]; then
  append_step "Create local env file" "cp .env.example .env"
fi

if [[ ! -f "${REPO_ROOT}/config/openclaw.json5" ]]; then
  append_step "Create repo config" "cp config/openclaw.json5.example config/openclaw.json5"
fi

windows_profile_wsl_path="$(get_windows_userprofile_wsl_path)"
if [[ -n "${windows_profile_wsl_path}" ]] && [[ -f "${windows_profile_wsl_path}/.wslconfig" ]] && grep -Eq '^\s*wsl2\.autoMemoryReclaim\s*=' "${windows_profile_wsl_path}/.wslconfig"; then
  append_step "Fix .wslconfig key" "Edit ${windows_profile_wsl_path}/.wslconfig and replace 'wsl2.autoMemoryReclaim=...' with:\n[wsl2]\nautoMemoryReclaim=gradual"
fi

printf 'WSL bootstrap mode: %s\n' "$([[ ${DRY_RUN} -eq 1 ]] && echo dry-run || echo staged)"

if [[ ${#planned_labels[@]} -eq 0 ]]; then
  printf 'No bootstrap actions are required.\n'
  printf 'Next step: bash scripts/doctor-wsl.sh\n'
  exit 0
fi

for index in "${!planned_labels[@]}"; do
  printf '%d. %s\n' "$((index + 1))" "${planned_labels[index]}"
  printf '   %s\n' "${planned_commands[index]}"
done

if [[ ${DRY_RUN} -eq 1 ]]; then
  printf 'Next step: bash scripts/doctor-wsl.sh\n'
  exit 0
fi

if [[ ${ASSUME_YES} -ne 1 ]]; then
  printf 'Run the commands above now? [y/N] '
  read -r response
  if [[ ! "${response}" =~ ^[Yy]$ ]]; then
    printf 'Bootstrap cancelled.\n'
    printf 'Next step: bash scripts/doctor-wsl.sh\n'
    exit 0
  fi
fi

for index in "${!planned_commands[@]}"; do
  printf '==> %s\n' "${planned_labels[index]}"
  if [[ "${planned_commands[index]}" == Open\ Docker\ Desktop* ]]; then
    printf '%s\n' "${planned_commands[index]}"
    continue
  fi

  case "${planned_labels[index]}" in
    "Install WSL shell profile guard")
      install_profile_guards "${WINDOWS_NPM_SHIM_DIR}"
      apply_windows_npm_shim_guard_current_shell "${WINDOWS_NPM_SHIM_DIR}"
      ;;
    "Install nvm")
      eval "${planned_commands[index]}"
      source_nvm_if_present
      ;;
    "Install Node.js LTS")
      source_nvm_if_present
      eval "${planned_commands[index]}"
      source_nvm_if_present
      if command -v nvm >/dev/null 2>&1; then
        nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true
      fi
      command -v node >/dev/null 2>&1 || diagnose_issue \
        "Bootstrap incomplete" \
        "Node.js installation step finished without exposing \`node\` in the current shell." \
        "The Node install did not leave the active bootstrap shell with a usable Node binary, so later steps cannot continue." \
        "Run:\n  export NVM_DIR=\"${NVM_DIR}\"\n  . \"${NVM_DIR}/nvm.sh\"\n  nvm install --lts"
      ;;
    "Enable pnpm via corepack")
      source_nvm_if_present
      if command -v nvm >/dev/null 2>&1; then
        nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true
      fi
      eval "${planned_commands[index]}"
      command -v corepack >/dev/null 2>&1 || diagnose_issue \
        "Bootstrap incomplete" \
        "corepack is still unavailable after the pnpm enable step." \
        "pnpm activation depends on the Node runtime that nvm just installed." \
        "Run:\n  export NVM_DIR=\"${NVM_DIR}\"\n  . \"${NVM_DIR}/nvm.sh\"\n  corepack enable && corepack prepare pnpm@latest --activate"
      command -v pnpm >/dev/null 2>&1 || diagnose_issue \
        "Bootstrap incomplete" \
        "pnpm is still unavailable after the corepack step." \
        "Without a WSL-native pnpm binary, the repo will keep falling back to the unsupported Windows shim." \
        "Run:\n  export NVM_DIR=\"${NVM_DIR}\"\n  . \"${NVM_DIR}/nvm.sh\"\n  corepack enable && corepack prepare pnpm@latest --activate"
      ;;
    "Install OpenClaw CLI in WSL")
      source_nvm_if_present
      if command -v nvm >/dev/null 2>&1; then
        nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true
      fi
      eval "${planned_commands[index]}"
      command -v openclaw >/dev/null 2>&1 || diagnose_issue \
        "Bootstrap incomplete" \
        "openclaw is still unavailable after npm global install." \
        "The WSL-native CLI was not activated, so startup scripts would still resolve the unsupported Windows shim." \
        "Run:\n  export NVM_DIR=\"${NVM_DIR}\"\n  . \"${NVM_DIR}/nvm.sh\"\n  npm install -g openclaw"
      ;;
    "Build Python-enabled sandbox image")
      bash "${REPO_ROOT}/scripts/build-sandbox-image.sh"
      ;;
    *)
      eval "${planned_commands[index]}"
      ;;
  esac
done

if [[ -n "${WINDOWS_NPM_SHIM_DIR}" ]]; then
  apply_windows_npm_shim_guard_current_shell "${WINDOWS_NPM_SHIM_DIR}"
fi

printf 'Bootstrap finished.\n'
printf 'Current shell checks:\n'
printf '  node: %s\n' "$(command -v node 2>/dev/null || echo missing)"
printf '  pnpm: %s\n' "$(command -v pnpm 2>/dev/null || echo missing)"
printf '  openclaw: %s\n' "$(command -v openclaw 2>/dev/null || echo missing)"
printf 'If your interactive shell still resolves old commands, run:\n'
printf '  source ~/.bashrc\n'
printf 'Next step: bash scripts/doctor-wsl.sh\n'
