#!/usr/bin/env bash

WSL_PROFILE_GUARD_BEGIN="# >>> openclaw-wsl-path-guard >>>"
WSL_PROFILE_GUARD_END="# <<< openclaw-wsl-path-guard <<<"

get_windows_npm_shim_dir() {
  local profile_root
  profile_root="$(get_windows_userprofile_wsl_path)"
  [[ -n "${profile_root}" ]] || return 0
  printf '%s/AppData/Roaming/npm' "${profile_root}"
}

strip_path_segment() {
  local path_value="$1"
  local segment="$2"
  local result=""
  local part=""

  IFS=':' read -r -a __segments <<<"${path_value}"
  for part in "${__segments[@]}"; do
    [[ -n "${part}" ]] || continue
    [[ "${part}" == "${segment}" ]] && continue
    if [[ -n "${result}" ]]; then
      result="${result}:${part}"
    else
      result="${part}"
    fi
  done

  printf '%s' "${result}"
}

apply_windows_npm_shim_guard_current_shell() {
  local shim_dir="${1:-$(get_windows_npm_shim_dir)}"
  [[ -n "${shim_dir}" ]] || return 0
  PATH="$(strip_path_segment "${PATH}" "${shim_dir}")"
  export PATH
}

render_windows_npm_shim_guard_block() {
  local shim_dir="$1"
  cat <<EOF
${WSL_PROFILE_GUARD_BEGIN}
openclaw_strip_path_segment() {
  local path_value="\$1"
  local segment="\$2"
  local result=""
  local part=""
  IFS=':' read -r -a __segments <<<"\${path_value}"
  for part in "\${__segments[@]}"; do
    [[ -n "\${part}" ]] || continue
    [[ "\${part}" == "\${segment}" ]] && continue
    if [[ -n "\${result}" ]]; then
      result="\${result}:\${part}"
    else
      result="\${part}"
    fi
  done
  printf '%s' "\${result}"
}
OPENCLAW_WINDOWS_NPM_SHIM_DIR="${shim_dir}"
PATH="\$(openclaw_strip_path_segment "\${PATH}" "\${OPENCLAW_WINDOWS_NPM_SHIM_DIR}")"
export PATH
unset OPENCLAW_WINDOWS_NPM_SHIM_DIR
${WSL_PROFILE_GUARD_END}
EOF
}

profile_guard_is_installed() {
  local target_file="$1"
  [[ -f "${target_file}" ]] || return 1
  grep -Fq "${WSL_PROFILE_GUARD_BEGIN}" "${target_file}"
}

ensure_profile_guard() {
  local target_file="$1"
  local shim_dir="$2"
  mkdir -p "$(dirname "${target_file}")"
  touch "${target_file}"

  if profile_guard_is_installed "${target_file}"; then
    return 0
  fi

  {
    printf '\n'
    render_windows_npm_shim_guard_block "${shim_dir}"
    printf '\n'
  } >> "${target_file}"
}

install_profile_guards() {
  local shim_dir="$1"
  local bashrc_target="${2:-${HOME}/.bashrc}"
  local profile_target="${3:-${HOME}/.profile}"

  ensure_profile_guard "${bashrc_target}" "${shim_dir}"
  ensure_profile_guard "${profile_target}" "${shim_dir}"
}

source_nvm_if_present() {
  export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "${NVM_DIR}/nvm.sh"
  fi

  if [[ -s "${NVM_DIR}/bash_completion" ]]; then
    # shellcheck disable=SC1090
    . "${NVM_DIR}/bash_completion"
  fi
}

tool_command_succeeds() {
  local command_name="$1"

  case "${command_name}" in
    node)
      node -v >/dev/null 2>&1
      ;;
    pnpm)
      pnpm -v >/dev/null 2>&1
      ;;
    openclaw)
      openclaw --version >/dev/null 2>&1
      ;;
    docker)
      docker version >/dev/null 2>&1
      ;;
    *)
      command -v "${command_name}" >/dev/null 2>&1
      ;;
  esac
}

classify_shell_tool_readiness() {
  local command_name="$1"
  local binary_path="$2"
  local shim_dir="${3:-$(get_windows_npm_shim_dir)}"
  local profile_guard_installed="${4:-0}"
  local has_nvm_install=0

  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    has_nvm_install=1
  fi

  if [[ -z "${binary_path}" ]]; then
    if [[ ${has_nvm_install} -eq 1 ]]; then
      printf 'shell_not_reloaded'
    else
      printf 'missing'
    fi
    return
  fi

  if [[ -n "${shim_dir}" ]] && [[ "${binary_path}" == "${shim_dir}"/* ]]; then
    if [[ "${profile_guard_installed}" == "1" ]]; then
      printf 'shell_not_reloaded'
    else
      printf 'windows_shim'
    fi
    return
  fi

  if is_windows_npm_shim_path "${binary_path}" || is_windows_host_binary_path "${binary_path}"; then
    printf 'windows_shim'
    return
  fi

  if ! tool_command_succeeds "${command_name}"; then
    if [[ ${has_nvm_install} -eq 1 ]]; then
      printf 'shell_not_reloaded'
    else
      printf 'missing'
    fi
    return
  fi

  printf 'ready'
}
