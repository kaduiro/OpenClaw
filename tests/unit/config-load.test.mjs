import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot, loadJson5Config, loadRepoEnv } from "../../src/lib/env-config.mjs";

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
      OPENCLAW_REPO_ROOT: repoRoot,
      OPENCLAW_WORKSPACE_DIR: path.join(repoRoot, "workspace"),
    };

    const config = loadJson5Config(configPath, env);

    expect(config.gateway.bind).toBe("loopback");
    expect(config.gateway.auth.mode).toBe("token");
    expect(config.agents.list[0].id).toBe("personal");
    expect(config.skills.load.extraDirs[0]).toContain("workspace/skills");
    expect(fs.existsSync(path.join(repoRoot, "config", "openclaw.json5.example"))).toBe(true);
  });
});

