import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot } from "../../src/lib/env-config.mjs";
import { runMorningBrief } from "../../src/lib/brief-generator.mjs";
import { scaffoldWorkspace } from "../../src/lib/workspace-contract.mjs";

describe("morning brief integration", () => {
  it("creates the expected brief output", () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-brief-"));
    const repoRoot = getRepoRoot();

    scaffoldWorkspace(workspaceRoot);
    fs.copyFileSync(
      path.join(repoRoot, "tests", "fixtures", "previous-memory.md"),
      path.join(workspaceRoot, "memory", "daily", "2026-03-30.md"),
    );
    fs.copyFileSync(
      path.join(repoRoot, "tests", "fixtures", "next-actions.md"),
      path.join(workspaceRoot, "tasks", "next-actions.md"),
    );

    const result = runMorningBrief({
      workspaceRoot,
      date: "2026-03-31",
    });

    const brief = fs.readFileSync(result.outputFile, "utf8");
    expect(brief).toContain("## Summary");
    expect(brief).toContain("## Carry-over Tasks");
    expect(brief).toContain("Review backup remote permissions.");
  });
});

