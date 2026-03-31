import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scaffoldWorkspace, verifyWorkspace } from "../../src/lib/workspace-contract.mjs";

describe("workspace contract", () => {
  it("creates and verifies the full workspace template", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-workspace-"));

    scaffoldWorkspace(tempRoot);

    const status = verifyWorkspace(tempRoot);
    expect(status.ok).toBe(true);
    expect(fs.existsSync(path.join(tempRoot, "skills", "morning-brief", "SKILL.md"))).toBe(true);
  });
});

