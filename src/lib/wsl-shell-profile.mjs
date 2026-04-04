export function stripPathSegment(pathValue, segment) {
  return String(pathValue ?? "")
    .split(":")
    .filter((part) => part && part !== segment)
    .join(":");
}

export function renderProfileGuardBlock(shimDir) {
  return [
    "# >>> openclaw-wsl-path-guard >>>",
    "openclaw_strip_path_segment() {",
    "  local path_value=\"$1\"",
    "  local segment=\"$2\"",
    "  local result=\"\"",
    "  local part=\"\"",
    "  IFS=':' read -r -a __segments <<<\"${path_value}\"",
    "  for part in \"${__segments[@]}\"; do",
    "    [[ -n \"${part}\" ]] || continue",
    "    [[ \"${part}\" == \"${segment}\" ]] && continue",
    "    if [[ -n \"${result}\" ]]; then",
    "      result=\"${result}:${part}\"",
    "    else",
    "      result=\"${part}\"",
    "    fi",
    "  done",
    "  printf '%s' \"${result}\"",
    "}",
    `OPENCLAW_WINDOWS_NPM_SHIM_DIR="${shimDir}"`,
    "PATH=\"$(openclaw_strip_path_segment \"${PATH}\" \"${OPENCLAW_WINDOWS_NPM_SHIM_DIR}\")\"",
    "export PATH",
    "unset OPENCLAW_WINDOWS_NPM_SHIM_DIR",
    "# <<< openclaw-wsl-path-guard <<<",
  ].join("\n");
}

export function hasProfileGuard(content) {
  return String(content ?? "").includes("# >>> openclaw-wsl-path-guard >>>");
}
