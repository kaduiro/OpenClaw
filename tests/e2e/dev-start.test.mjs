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
args=()
for arg in "$@"; do
  if [[ "$arg" == /* ]] && command -v wslpath >/dev/null 2>&1; then
    args+=("$(wslpath -w "$arg")")
  else
    args+=("$arg")
  fi
done
exec "${toWslPath(process.execPath)}" "\${args[@]}"
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
  return execFileSync("wsl.exe", ["bash", "-lc", `cd "${wslRepoRoot}" && ${command}`], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

describe("dev-start.sh", () => {
  const repoRoot = getRepoRoot();
  const envPath = path.join(repoRoot, ".env");
  const configPath = path.join(repoRoot, "config", "openclaw.json5");
  const fakeBin = path.join(repoRoot, "tmp", "dev-start-bin");
  const captureFile = path.join(repoRoot, "tmp", "dev-start-openclaw.log");
  const captureFileRelative = toWslPath(captureFile);

  afterEach(() => {
    fs.rmSync(fakeBin, { recursive: true, force: true });
    fs.rmSync(captureFile, { force: true });
    fs.rmSync(envPath, { force: true });
    fs.rmSync(configPath, { force: true });
  });

  it(
    "starts openclaw gateway with the configured environment",
    () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    const wslFakeBin = toWslPath(fakeBin);
    writeExecutable(path.join(fakeBin, "node"), nodeShimContent());
    writeExecutable(path.join(fakeBin, "pnpm"), "#!/usr/bin/env bash\necho pnpm\n");
    writeExecutable(
      path.join(fakeBin, "openclaw"),
      `#!/usr/bin/env bash
echo "$@" >> "${captureFileRelative}"
`,
    );
    writeExecutable(path.join(fakeBin, "docker"), "#!/usr/bin/env bash\necho docker\n");

    fs.writeFileSync(
      envPath,
      [
        "OPENCLAW_GATEWAY_TOKEN=test-token",
        "GEMINI_API_KEY=test-gemini",
        `OPENCLAW_REPO_ROOT=${toWslPath(repoRoot)}`,
        `OPENCLAW_REPO_BIND_ROOT=${toWslPath(repoRoot)}`,
        `OPENCLAW_WORKSPACE_DIR=${toWslPath(path.join(repoRoot, "workspace"))}`,
        `OPENCLAW_CONFIG_PATH=${toWslPath(configPath)}`,
        `OPENCLAW_STATE_DIR=${toWslPath(path.join(repoRoot, ".state"))}`,
        "OPENCLAW_MODEL_PRIMARY=google/gemini-2.5-flash",
        "OPENCLAW_MODEL_FALLBACK=google/gemini-2.5-pro",
        "OPENCLAW_TIMEZONE=Asia/Tokyo",
        "PNPM_BIN=pnpm",
      ].join("\n"),
      "utf8",
    );
    fs.copyFileSync(path.join(repoRoot, "config", "openclaw.json5.example"), configPath);

    const output = runInWsl(repoRoot, `PATH="${wslFakeBin}:$PATH" bash scripts/dev-start.sh`);

    expect(output).toContain("Control UI");
    expect(fs.readFileSync(captureFile, "utf8")).toContain("gateway");
    },
    15000,
  );
});
