#!/usr/bin/env bash

wsl_only_error() {
  local command_name="$1"
  cat >&2 <<EOF
This script supports WSL2/Linux only.
Windows Git Bash, MSYS, MINGW, Cygwin, cmd, and PowerShell are not supported.

Open a WSL shell and run:
  cd /mnt/c/Users/akkun/kaduiro/Openclaw
  bash ${command_name}
EOF
  exit 1
}

assert_wsl_linux_runtime() {
  local command_name="$1"
  local uname_s
  uname_s="$(uname -s 2>/dev/null || true)"

  case "${uname_s}" in
    Linux)
      return 0
      ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT)
      wsl_only_error "${command_name}"
      ;;
    *)
      if [[ -r /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null; then
        return 0
      fi
      wsl_only_error "${command_name}"
      ;;
  esac
}

assert_ubuntu_runtime() {
  local command_name="$1"

  assert_wsl_linux_runtime "${command_name}"

  if [[ ! -r /etc/os-release ]]; then
    fail_check "Unable to read /etc/os-release. This repo supports Ubuntu on WSL2."
  fi

  # shellcheck disable=SC1091
  source /etc/os-release

  if [[ "${ID:-}" != "ubuntu" ]]; then
    diagnose_issue \
      "Unsupported WSL distro" \
      "Detected Linux distro: ${ID:-unknown}" \
      "This repository standardizes on Ubuntu on WSL2 so bootstrap and diagnostics stay predictable." \
      "Open Ubuntu on WSL2, then run:\n  cd /mnt/c/Users/akkun/kaduiro/Openclaw\n  bash ${command_name}"
  fi
}

fail_check() {
  echo "$1" >&2
  exit 1
}

diagnose_issue() {
  local title="$1"
  local cause="$2"
  local why="$3"
  local fix="$4"

  cat >&2 <<EOF
[WSL Doctor] ${title}
Cause:
  ${cause}
Why it fails:
  ${why}
Fix:
  ${fix}
EOF
  exit 1
}

validate_template_placeholder() {
  local key="$1"
  local value="$2"

  if [[ "${value}" == *"/abs/path/to/Openclaw"* ]] || [[ "${value}" == *"C:/path/to/Openclaw"* ]] || [[ "${value}" == *"/c/path/to/Openclaw"* ]] || [[ "${value}" == *"/mnt/c/path/to/Openclaw"* ]]; then
    fail_check "${key} still points to the template placeholder: ${value}
Use a WSL/Linux path such as /mnt/c/Users/akkun/kaduiro/Openclaw."
  fi
}

validate_posix_path() {
  local key="$1"
  local value="$2"

  [[ -n "${value}" ]] || fail_check "Missing required environment variable: ${key}"
  validate_template_placeholder "${key}" "${value}"

  if [[ "${value}" =~ ^[A-Za-z]:[\\/].* ]] || [[ "${value}" =~ ^/[A-Za-z]/.* ]]; then
    fail_check "${key} must use a WSL/Linux POSIX path.
Use /mnt/c/... instead of Windows path syntax: ${value}"
  fi

  if [[ "${value}" != /* ]]; then
    fail_check "${key} must be an absolute POSIX path.
Use /mnt/c/... or another Linux absolute path: ${value}"
  fi
}

validate_mnt_path() {
  local key="$1"
  local value="$2"
  validate_posix_path "${key}" "${value}"

  if [[ "${value}" != /mnt/* ]]; then
    fail_check "${key} must point to the repo on the Windows filesystem via /mnt/<drive>/...
Current value: ${value}"
  fi
}

validate_runtime_value() {
  local key="$1"
  local value="$2"
  local example_hint="$3"

  [[ -n "${value}" ]] || fail_check "Missing required environment variable: ${key}"

  if [[ "${value}" == replace-with-* ]] || [[ "${value}" == your-* ]] || [[ "${value}" == *"yourname"* ]]; then
    fail_check "${key} still uses a placeholder value.
Set ${key} to ${example_hint}"
  fi
}

resolve_command() {
  local env_key="$1"
  local command_name="$2"
  local resolved="${!env_key:-}"

  if [[ -n "${resolved}" ]]; then
    printf '%s' "${resolved}"
    return
  fi

  command -v "${command_name}" 2>/dev/null || true
}

ensure_command() {
  local label="$1"
  local value="$2"
  local hint="$3"

  [[ -n "${value}" ]] || fail_check "${hint}"

  if [[ "${value}" == */* ]] && [[ ! -x "${value}" ]]; then
    fail_check "${label} is not executable at ${value}"
  fi
}

is_windows_npm_shim_path() {
  local value="$1"
  [[ "${value}" =~ ^/mnt/[a-z]/Users/[^/]+/AppData/Roaming/npm/[^/]+$ ]]
}

is_windows_host_binary_path() {
  local value="$1"
  [[ "${value}" =~ ^/mnt/[a-z]/.*\.(exe|cmd|bat|ps1)$ ]] || [[ "${value}" =~ ^/mnt/[a-z]/Program\ Files/.* ]]
}

ensure_wsl_native_command() {
  local label="$1"
  local value="$2"
  local fix="$3"

  [[ -n "${value}" ]] || fail_check "${fix}"

  if is_windows_npm_shim_path "${value}"; then
    diagnose_issue \
      "Windows npm shim detected for ${label}" \
      "${label} resolves to ${value}" \
      "This path points to the Windows user's npm global shim, not a WSL-native install. It breaks PATH resolution and runtime assumptions inside WSL." \
      "${fix}"
  fi

  if is_windows_host_binary_path "${value}"; then
    diagnose_issue \
      "Windows-hosted binary detected for ${label}" \
      "${label} resolves to ${value}" \
      "Windows binaries and shims are not supported in the WSL-native workflow for this repository." \
      "${fix}"
  fi

  ensure_command "${label}" "${value}" "${fix}"
}

get_windows_userprofile_wsl_path() {
  if ! command -v cmd.exe >/dev/null 2>&1 || ! command -v wslpath >/dev/null 2>&1; then
    return 0
  fi

  local raw
  raw="$(cmd.exe /C echo %UserProfile% 2>/dev/null | tr -d '\r' || true)"
  [[ -n "${raw}" ]] || return 0
  wslpath "${raw}" 2>/dev/null || true
}

check_known_wslconfig_issues() {
  local wslconfig_path="$1"

  [[ -n "${wslconfig_path}" ]] || return 0
  [[ -f "${wslconfig_path}" ]] || return 0

  if grep -Eq '^\s*wsl2\.autoMemoryReclaim\s*=' "${wslconfig_path}"; then
    diagnose_issue \
      "Invalid .wslconfig key" \
      "Found unsupported key 'wsl2.autoMemoryReclaim' in ${wslconfig_path}" \
      "WSL ignores that key and prints a warning on every launch, which makes diagnosis noisy and hides real startup errors." \
      "Edit ${wslconfig_path} and move the setting under a [wsl2] section, for example:\n  [wsl2]\n  autoMemoryReclaim=gradual"
  fi
}

get_configured_sandbox_image() {
  local node_bin="$1"
  local repo_root="$2"
  local config_path="$3"

  OPENCLAW_REPO_ROOT_RUNTIME="${repo_root}" \
  OPENCLAW_CONFIG_PATH_RUNTIME="${config_path}" \
    "${node_bin}" --input-type=module <<'EOF'
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.env.OPENCLAW_REPO_ROOT_RUNTIME;
const configPath = process.env.OPENCLAW_CONFIG_PATH_RUNTIME;
const envConfigUrl = pathToFileURL(path.join(repoRoot, "src/lib/env-config.mjs")).href;
const { loadRepoEnv, loadJson5Config } = await import(envConfigUrl);
const env = loadRepoEnv(repoRoot);
const config = loadJson5Config(configPath, env);
process.stdout.write(config?.agents?.defaults?.sandbox?.docker?.image ?? "");
EOF
}

ensure_sandbox_image_has_python() {
  local node_bin="$1"
  local docker_bin="$2"
  local repo_root="$3"
  local config_path="$4"
  local sandbox_image
  local base_image="openclaw-sandbox:bookworm-slim"

  sandbox_image="$(get_configured_sandbox_image "${node_bin}" "${repo_root}" "${config_path}")"
  [[ -n "${sandbox_image}" ]] || fail_check "Unable to determine the configured sandbox image from ${config_path}"

  if ! "${docker_bin}" image inspect "${sandbox_image}" >/dev/null 2>&1; then
    diagnose_issue \
      "Sandbox image is unavailable locally" \
      "Configured image: ${sandbox_image}" \
      "OpenClaw cannot start sandboxed agents if the configured image is not present in Docker." \
      "Run:\n  bash scripts/build-sandbox-image.sh\nThis builds ${sandbox_image} from the required base image ${base_image}. If the base image is missing, install or pull ${base_image} first."
  fi

  if ! "${docker_bin}" run --rm --entrypoint sh "${sandbox_image}" -lc "command -v python3 || command -v python" >/dev/null 2>&1; then
    diagnose_issue \
      "Sandbox image missing python" \
      "Configured image ${sandbox_image} does not provide python3 or python." \
      "OpenClaw's pinned mutation helper needs Python inside the sandbox to write files, so agent edits will fail at runtime." \
      "Rebuild the standard Python-enabled image with:\n  bash scripts/build-sandbox-image.sh\nThen rerun this command."
  fi
}
