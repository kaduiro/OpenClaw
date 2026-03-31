import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runNightlyTriage } from "../../src/lib/markdown-triage.mjs";
import { getRepoRoot } from "../../src/lib/env-config.mjs";
import { scaffoldWorkspace } from "../../src/lib/workspace-contract.mjs";

describe("nightly triage integration", () => {
  it("creates expected outputs from raw inbox markdown", () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-triage-"));
    const repoRoot = getRepoRoot();

    scaffoldWorkspace(workspaceRoot);
    fs.copyFileSync(
      path.join(repoRoot, "tests", "fixtures", "raw-note-a.md"),
      path.join(workspaceRoot, "inbox", "raw", "capture.md"),
    );

    const result = runNightlyTriage({
      workspaceRoot,
      date: "2026-03-31",
    });

    const memory = fs.readFileSync(path.join(workspaceRoot, "memory", "daily", "2026-03-31.md"), "utf8");
    const actions = fs.readFileSync(path.join(workspaceRoot, "tasks", "next-actions.md"), "utf8");
    const log = fs.readFileSync(result.logFile, "utf8");

    expect(memory).toContain("Need a better backup cadence for project notes.");
    expect(actions).toContain("## 2026-03-31");
    expect(actions).toContain("Review backup remote permissions.");
    expect(log).toContain("processed files: 1");
  });
});

