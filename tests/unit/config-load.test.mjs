import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot, loadDotEnvFile, loadJson5Config, loadRepoEnv } from "../../src/lib/env-config.mjs";

function toWslPath(input) {
  const normalized = input.replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `/mnt/${normalized[0].toLowerCase()}${normalized.slice(2)}`;
  }
  return normalized;
}

describe("config loading", () => {
  it("loads the example config with env substitution", () => {
    const repoRoot = getRepoRoot();
    const configPath = path.join(repoRoot, "config", "openclaw.json5.example");
    const env = {
      ...loadRepoEnv(repoRoot),
      OPENCLAW_GATEWAY_TOKEN: "token-value",
      GEMINI_API_KEY: "gemini-value",
      OPENCLAW_MODEL_PRIMARY: "google/gemini-2.5-flash",
      OPENCLAW_MODEL_FALLBACK: "google/gemini-2.5-pro",
      OPENCLAW_REPO_ROOT: toWslPath(repoRoot),
      OPENCLAW_REPO_BIND_ROOT: toWslPath(repoRoot),
      OPENCLAW_WORKSPACE_DIR: toWslPath(path.join(repoRoot, "workspace")),
    };

    const config = loadJson5Config(configPath, env);

    expect(config.gateway.bind).toBe("loopback");
    expect(config.gateway.auth.mode).toBe("token");
    expect(config.agents.list[0].id).toBe("personal");
    expect(config.agents.defaults.sandbox.docker.binds[0]).toContain(":/repo:rw");
    expect(config.skills.load.extraDirs[0]).toContain("workspace/skills");
    expect(fs.existsSync(path.join(repoRoot, "config", "openclaw.json5.example"))).toBe(true);
  });

  it(".env overrides conflicting process environment values", () => {
    const repoRoot = getRepoRoot();
    const envPath = path.join(repoRoot, ".env");
    const originalEnvFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : null;
    const originalBindRoot = process.env.OPENCLAW_REPO_BIND_ROOT;

    fs.writeFileSync(
      envPath,
      [
        "OPENCLAW_GATEWAY_TOKEN=test-token",
        "GEMINI_API_KEY=test-gemini",
        "OPENCLAW_REPO_BIND_ROOT=/mnt/c/from-dot-env",
      ].join("\n"),
      "utf8",
    );
    const envFileValues = loadDotEnvFile(envPath);

    process.env.OPENCLAW_REPO_BIND_ROOT = "C:/conflicting/process/env";
    const loaded = loadRepoEnv(repoRoot);

    expect(loaded.OPENCLAW_REPO_BIND_ROOT).toBe(envFileValues.OPENCLAW_REPO_BIND_ROOT);

    if (originalBindRoot === undefined) {
      delete process.env.OPENCLAW_REPO_BIND_ROOT;
    } else {
      process.env.OPENCLAW_REPO_BIND_ROOT = originalBindRoot;
    }

    if (originalEnvFile === null) {
      fs.rmSync(envPath, { force: true });
    } else {
      fs.writeFileSync(envPath, originalEnvFile, "utf8");
    }
  });
});
