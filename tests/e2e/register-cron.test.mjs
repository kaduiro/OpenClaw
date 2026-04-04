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

describe("register-cron.sh", () => {
  const repoRoot = getRepoRoot();
  const envPath = path.join(repoRoot, ".env");
  const tmpRoot = path.join(repoRoot, "tmp");
  const fakeBin = path.join(repoRoot, "tmp", "cron-bin");
  const captureFile = path.join(repoRoot, "tmp", "cron-calls.log");
  const captureFileRelative = "./tmp/cron-calls.log";

  afterEach(() => {
    fs.rmSync(fakeBin, { recursive: true, force: true });
    fs.rmSync(captureFile, { force: true });
    fs.rmSync(envPath, { force: true });
  });

  function runInWsl(command, env = process.env) {
    const wslRepoRoot = toWslPath(repoRoot);
    return execFileSync("wsl.exe", ["bash", "-lc", `cd "${wslRepoRoot}" && ${command}`], {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    });
  }

  it("registers nightly and morning jobs with isolated light-context mode", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    const wslFakeBin = toWslPath(fakeBin);
    writeExecutable(path.join(fakeBin, "node"), nodeShimContent());
    writeExecutable(path.join(fakeBin, "pnpm"), "#!/usr/bin/env bash\necho pnpm\n");
    writeExecutable(path.join(fakeBin, "docker"), "#!/usr/bin/env bash\necho docker\n");
    writeExecutable(
      path.join(fakeBin, "openclaw"),
      `#!/usr/bin/env bash
if [[ "$1" == "cron" && "$2" == "list" ]]; then
  echo '[]'
  exit 0
fi
echo "$@" >> "${captureFileRelative}"
`,
    );

    fs.writeFileSync(
      envPath,
      [
        "OPENCLAW_GATEWAY_TOKEN=test-token",
        "GEMINI_API_KEY=test-gemini",
        `OPENCLAW_REPO_ROOT=${toWslPath(repoRoot)}`,
        `OPENCLAW_REPO_BIND_ROOT=${toWslPath(repoRoot)}`,
        `OPENCLAW_WORKSPACE_DIR=${toWslPath(path.join(repoRoot, "workspace"))}`,
        `OPENCLAW_CONFIG_PATH=${toWslPath(path.join(repoRoot, "config", "openclaw.json5"))}`,
        `OPENCLAW_STATE_DIR=${toWslPath(path.join(repoRoot, ".state"))}`,
        "OPENCLAW_TIMEZONE=Asia/Tokyo",
        "PNPM_BIN=pnpm",
      ].join("\n"),
      "utf8",
    );

    runInWsl(`PATH="${wslFakeBin}:$PATH" bash scripts/register-cron.sh`);

    const capture = fs.readFileSync(captureFile, "utf8");
    expect(capture).toContain("cron add --name personal-nightly-triage");
    expect(capture).toContain("--session isolated");
    expect(capture).toContain("--light-context");
    expect(capture).toContain("--no-deliver");
    expect(capture).toContain("personal-morning-brief");
  });
});
