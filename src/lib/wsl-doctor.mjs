export function isWindowsNpmShimPath(value) {
  return typeof value === "string" && /^\/mnt\/[a-z]\/Users\/[^/]+\/AppData\/Roaming\/npm\/[^/]+$/.test(value);
}

export function isProbablyNativeWslToolPath(value) {
  return typeof value === "string" && (
    value.startsWith("/usr/") ||
    value.startsWith("/usr/local/") ||
    value.startsWith("/bin/") ||
    value.startsWith("/sbin/") ||
    value.startsWith("/opt/") ||
    value.startsWith("/snap/") ||
    value.startsWith("/home/") ||
    value.startsWith("/root/") ||
    value.includes("/.nvm/")
  );
}

export function findInvalidWslconfigKeys(content) {
  const issues = [];
  const lines = String(content ?? "").split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/^\s*wsl2\.autoMemoryReclaim\s*=/.test(line)) {
      issues.push({
        key: "wsl2.autoMemoryReclaim",
        line: index + 1,
        fix: "[wsl2]\nautoMemoryReclaim=gradual",
      });
    }
  });

  return issues;
}

export function classifyWslToolReadiness({
  binaryPath,
  commandSucceeded,
  hasNvmInstall = false,
  hasProfileGuard = false,
  shimDir,
}) {
  if (!binaryPath) {
    return hasNvmInstall ? "shell_not_reloaded" : "missing";
  }

  if (isWindowsNpmShimPath(binaryPath) || (typeof shimDir === "string" && shimDir && binaryPath.startsWith(`${shimDir}/`))) {
    return hasProfileGuard ? "shell_not_reloaded" : "windows_shim";
  }

  if (!isProbablyNativeWslToolPath(binaryPath)) {
    return "windows_shim";
  }

  if (!commandSucceeded) {
    return hasNvmInstall ? "shell_not_reloaded" : "missing";
  }

  return "ready";
}
