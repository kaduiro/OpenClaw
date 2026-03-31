import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot } from "../../src/lib/env-config.mjs";
import { loadAllowlist, resolveCommandEntry } from "../../src/cli/safe-exec.mjs";

describe("safe exec allowlist", () => {
  it("resolves allowlisted commands", () => {
    const repoRoot = getRepoRoot();
    const allowlist = loadAllowlist(path.join(repoRoot, "config", "exec-allowlist.json"));
    const command = resolveCommandEntry(allowlist, "healthcheck", repoRoot);

    expect(command.command).toContain("scripts");
    expect(command.args).toEqual([]);
  });

  it("rejects unknown command ids", () => {
    const repoRoot = getRepoRoot();
    const allowlist = loadAllowlist(path.join(repoRoot, "config", "exec-allowlist.json"));

    expect(() => resolveCommandEntry(allowlist, "rm-all", repoRoot)).toThrow("Command id is not allowlisted");
  });
});

