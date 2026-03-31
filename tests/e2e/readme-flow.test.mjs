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

describe("README setup flow", () => {
  const repoRoot = getRepoRoot();
  const envPath = path.join(repoRoot, ".env");
  const configPath = path.join(repoRoot, "config", "openclaw.json5");
  const tmpRoot = path.join(repoRoot, "tmp");
  const fakeBin = path.join(repoRoot, "tmp", "readme-bin");

  afterEach(() => {
    fs.rmSync(fakeBin, { recursive: true, force: true });
    fs.rmSync(envPath, { force: true });
    fs.rmSync(configPath, { force: true });
  });

  it("supports the documented local bootstrap commands", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    writeExecutable(path.join(fakeBin, "openclaw"), "#!/usr/bin/env bash\necho openclaw\n");
    writeExecutable(path.join(fakeBin, "docker"), "#!/usr/bin/env bash\necho docker\n");

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
        "NODE_BIN=node.exe",
        "OPENCLAW_BIN=./tmp/readme-bin/openclaw",
        "DOCKER_BIN=./tmp/readme-bin/docker",
      ].join("\n"),
      "utf8",
    );
    fs.copyFileSync(path.join(repoRoot, "config", "openclaw.json5.example"), configPath);

    const scaffold = execFileSync("node", ["src/cli/scaffold-workspace.mjs", "--workspace", "./workspace"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const validate = execFileSync("node", ["src/cli/validate-config.mjs", "--config", "./config/openclaw.json5"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const healthcheck = execFileSync("bash", ["scripts/healthcheck.sh"], {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    });

    expect(scaffold).toContain("Workspace scaffolded");
    expect(validate).toContain("Config valid");
    expect(healthcheck).toContain("Healthcheck passed.");
  });
});
