import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { getRepoRoot } from "../../src/lib/env-config.mjs";

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function toPosix(input) {
  return input.replace(/\\/g, "/");
}

function toWslPath(input) {
  const normalized = toPosix(input);
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `/mnt/${normalized[0].toLowerCase()}${normalized.slice(2)}`;
  }
  return normalized;
}

function runInWsl(repoRoot, command, env = process.env) {
  const wslRepoRoot = toWslPath(repoRoot);
  return execFileSync("wsl.exe", ["bash", "-lc", `cd "${wslRepoRoot}" && ${command}`], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

function dockerShimContent({ baseImageAvailable = true, stateFile, logFile } = {}) {
  return `#!/usr/bin/env bash
set -euo pipefail
state_file="${stateFile}"
log_file="${logFile}"
if [[ "$1" == "version" ]]; then
  echo "Client:"
  exit 0
fi
if [[ "$1" == "image" && "$2" == "inspect" ]]; then
  if [[ "$3" == "openclaw-sandbox:bookworm-slim" ]]; then
    if [[ "${baseImageAvailable ? "1" : "0"}" == "1" ]]; then
      exit 0
    fi
    exit 1
  fi
  if [[ "$3" == "openclaw-sandbox:bookworm-python" && -f "${stateFile}" ]]; then
    exit 0
  fi
  exit 1
fi
if [[ "$1" == "build" ]]; then
  echo "$@" >> "${logFile}"
  : > "${stateFile}"
  exit 0
fi
if [[ "$1" == "run" ]]; then
  if [[ -f "${stateFile}" ]]; then
    echo "/usr/bin/python3"
    exit 0
  fi
  exit 1
fi
echo "$@" >> "${logFile}"
exit 0
`;
}

describe("build-sandbox-image.sh", () => {
  const repoRoot = getRepoRoot();
  const fakeBin = path.join(repoRoot, "tmp", "sandbox-build-bin");
  const stateFile = path.join(repoRoot, "tmp", "sandbox-build.state");
  const logFile = path.join(repoRoot, "tmp", "sandbox-build.log");

  afterEach(() => {
    fs.rmSync(fakeBin, { recursive: true, force: true });
    fs.rmSync(stateFile, { force: true });
    fs.rmSync(logFile, { force: true });
  });

  it("builds and verifies the python-enabled sandbox image", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    writeExecutable(
      path.join(fakeBin, "docker"),
      dockerShimContent({ stateFile: toWslPath(stateFile), logFile: toWslPath(logFile) }),
    );

    const output = runInWsl(
      repoRoot,
      `PATH="${toWslPath(fakeBin)}:$PATH" bash scripts/build-sandbox-image.sh`,
    );

    expect(output).toContain("Building sandbox image openclaw-sandbox:bookworm-python");
    expect(output).toContain("Sandbox image ready: openclaw-sandbox:bookworm-python");
    expect(fs.readFileSync(logFile, "utf8")).toContain("build --build-arg OPENCLAW_SANDBOX_BASE_IMAGE=openclaw-sandbox:bookworm-slim");
  });

  it("fails clearly when the slim base image is missing", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    writeExecutable(
      path.join(fakeBin, "docker"),
      dockerShimContent({ baseImageAvailable: false, stateFile: toWslPath(stateFile), logFile: toWslPath(logFile) }),
    );

    expect(() =>
      runInWsl(repoRoot, `PATH="${toWslPath(fakeBin)}:$PATH" bash scripts/build-sandbox-image.sh`),
    ).toThrowError(/Sandbox base image is unavailable locally/);
  });
});
