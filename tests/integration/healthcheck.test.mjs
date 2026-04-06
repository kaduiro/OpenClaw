import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { getRepoRoot } from "../../src/lib/env-config.mjs";

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, { mode: 0o755 });
}

function nodeShimContent() {
  return `#!/usr/bin/env bash
set -euo pipefail
exec "${toWslPath(process.execPath)}" "$@"
`;
}

function dockerShimContent({ missingPython = false } = {}) {
  return `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "version" ]]; then
  echo "Client:"
  exit 0
fi
if [[ "$1" == "image" && "$2" == "inspect" ]]; then
  exit 0
fi
if [[ "$1" == "run" ]]; then
  if [[ "${missingPython ? "1" : "0"}" == "1" ]]; then
    exit 1
  fi
  echo "/usr/bin/python3"
  exit 0
fi
echo docker
`;
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
  const sanitizedEnv = { ...env };
  for (const key of Object.keys(process.env)) {
    if (!key.startsWith("OPENCLAW_")) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(env, key) && env[key] !== process.env[key]) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(sanitizedEnv, key)) {
      delete sanitizedEnv[key];
    }
  }
  return execFileSync("wsl.exe", ["bash", "-lc", `cd "${wslRepoRoot}" && ${command}`], {
    cwd: repoRoot,
    env: sanitizedEnv,
    encoding: "utf8",
  });
}

describe("healthcheck script", () => {
  const repoRoot = getRepoRoot();
  const envPath = path.join(repoRoot, ".env");
  const configPath = path.join(repoRoot, "config", "openclaw.json5");
  const fakeBin = path.join(repoRoot, "tmp", "healthcheck-bin");
  const originalEnvExists = fs.existsSync(envPath);
  const originalEnvContent = originalEnvExists ? fs.readFileSync(envPath, "utf8") : "";
  const originalConfigExists = fs.existsSync(configPath);
  const originalConfigContent = originalConfigExists ? fs.readFileSync(configPath, "utf8") : "";

  afterEach(() => {
    fs.rmSync(fakeBin, { recursive: true, force: true });
    if (originalEnvExists) {
      fs.writeFileSync(envPath, originalEnvContent, "utf8");
    } else {
      fs.rmSync(envPath, { force: true });
    }
    if (originalConfigExists) {
      fs.writeFileSync(configPath, originalConfigContent, "utf8");
    } else {
      fs.rmSync(configPath, { force: true });
    }
  });

  it("passes with required tools and secure config", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    writeExecutable(path.join(fakeBin, "node"), nodeShimContent());
    writeExecutable(path.join(fakeBin, "openclaw"), "#!/usr/bin/env bash\necho openclaw\n");
    writeExecutable(path.join(fakeBin, "docker"), dockerShimContent());
    const wslFakeBin = toWslPath(fakeBin);

    fs.writeFileSync(
      envPath,
      [
        "OPENCLAW_GATEWAY_TOKEN=test-token",
        "GEMINI_API_KEY=test-gemini",
        `OPENCLAW_REPO_ROOT=${toWslPath(repoRoot)}`,
        `OPENCLAW_WORKSPACE_DIR=${toWslPath(path.join(repoRoot, "workspace"))}`,
        `OPENCLAW_CONFIG_PATH=${toWslPath(configPath)}`,
        `OPENCLAW_STATE_DIR=${toWslPath(path.join(repoRoot, ".state"))}`,
        "OPENCLAW_MODEL_PRIMARY=google/gemini-2.5-flash",
        "OPENCLAW_MODEL_FALLBACK=google/gemini-2.5-pro",
        "OPENCLAW_TIMEZONE=Asia/Tokyo",
      ].join("\n"),
      "utf8",
    );
    fs.copyFileSync(path.join(repoRoot, "config", "openclaw.json5.example"), configPath);

    const output = runInWsl(repoRoot, `PATH="${wslFakeBin}:$PATH" bash scripts/healthcheck.sh`);

    expect(output).toContain("Healthcheck passed.");
  });

  it("rejects Windows and Git Bash style paths", () => {
    fs.writeFileSync(
      envPath,
      [
        "OPENCLAW_GATEWAY_TOKEN=test-token",
        "GEMINI_API_KEY=test-gemini",
        "OPENCLAW_REPO_ROOT=C:/Users/akkun/kaduiro/Openclaw",
        `OPENCLAW_WORKSPACE_DIR=${toWslPath(path.join(repoRoot, "workspace"))}`,
        `OPENCLAW_CONFIG_PATH=${toWslPath(configPath)}`,
        `OPENCLAW_STATE_DIR=${toWslPath(path.join(repoRoot, ".state"))}`,
        "OPENCLAW_MODEL_PRIMARY=google/gemini-2.5-flash",
        "OPENCLAW_MODEL_FALLBACK=google/gemini-2.5-pro",
        "OPENCLAW_TIMEZONE=Asia/Tokyo",
      ].join("\n"),
      "utf8",
    );
    fs.copyFileSync(path.join(repoRoot, "config", "openclaw.json5.example"), configPath);

    expect(() => runInWsl(repoRoot, "bash scripts/healthcheck.sh")).toThrowError(/must use a WSL\/Linux POSIX path/);
  });

  it("rejects unsupported runtimes with a clear WSL-only error", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    const wslFakeBin = toWslPath(fakeBin);
    writeExecutable(
      path.join(fakeBin, "uname"),
      `#!/usr/bin/env bash
if [[ "$1" == "-s" ]]; then
  echo "MINGW64_NT-10.0"
  exit 0
fi
exec /usr/bin/uname "$@"
`,
    );

    expect(() => runInWsl(repoRoot, `PATH="${wslFakeBin}:$PATH" bash scripts/healthcheck.sh`)).toThrowError(
      /This script supports WSL2\/Linux only/,
    );
  });

  it("rejects sandbox images that do not provide python", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    writeExecutable(path.join(fakeBin, "node"), nodeShimContent());
    writeExecutable(path.join(fakeBin, "openclaw"), "#!/usr/bin/env bash\necho openclaw\n");
    writeExecutable(path.join(fakeBin, "docker"), dockerShimContent({ missingPython: true }));
    const wslFakeBin = toWslPath(fakeBin);

    fs.writeFileSync(
      envPath,
      [
        "OPENCLAW_GATEWAY_TOKEN=test-token",
        "GEMINI_API_KEY=test-gemini",
        "OPENCLAW_SANDBOX_IMAGE=openclaw-sandbox:bookworm-python",
        `OPENCLAW_REPO_ROOT=${toWslPath(repoRoot)}`,
        `OPENCLAW_WORKSPACE_DIR=${toWslPath(path.join(repoRoot, "workspace"))}`,
        `OPENCLAW_CONFIG_PATH=${toWslPath(configPath)}`,
        `OPENCLAW_STATE_DIR=${toWslPath(path.join(repoRoot, ".state"))}`,
        "OPENCLAW_MODEL_PRIMARY=google/gemini-2.5-flash",
        "OPENCLAW_MODEL_FALLBACK=google/gemini-2.5-pro",
        "OPENCLAW_TIMEZONE=Asia/Tokyo",
      ].join("\n"),
      "utf8",
    );
    fs.copyFileSync(path.join(repoRoot, "config", "openclaw.json5.example"), configPath);

    expect(() => runInWsl(repoRoot, `PATH="${wslFakeBin}:$PATH" bash scripts/healthcheck.sh`)).toThrowError(
      /Sandbox image missing python/,
    );
  });
});
