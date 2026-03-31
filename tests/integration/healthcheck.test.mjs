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

describe("healthcheck script", () => {
  const repoRoot = getRepoRoot();
  const envPath = path.join(repoRoot, ".env");
  const configPath = path.join(repoRoot, "config", "openclaw.json5");
  const tmpRoot = path.join(repoRoot, "tmp");
  const fakeBin = path.join(repoRoot, "tmp", "healthcheck-bin");

  afterEach(() => {
    fs.rmSync(fakeBin, { recursive: true, force: true });
    fs.rmSync(envPath, { force: true });
    fs.rmSync(configPath, { force: true });
  });

  it("passes with required tools and secure config", () => {
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
        "OPENCLAW_BIN=./tmp/healthcheck-bin/openclaw",
        "DOCKER_BIN=./tmp/healthcheck-bin/docker",
      ].join("\n"),
      "utf8",
    );
    fs.copyFileSync(path.join(repoRoot, "config", "openclaw.json5.example"), configPath);

    const output = execFileSync("bash", ["scripts/healthcheck.sh"], {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
    });

    expect(output).toContain("Healthcheck passed.");
  });
});
