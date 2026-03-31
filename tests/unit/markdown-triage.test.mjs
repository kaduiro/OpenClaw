import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot } from "../../src/lib/env-config.mjs";
import { parseRawMarkdown } from "../../src/lib/markdown-triage.mjs";

describe("markdown triage parser", () => {
  it("extracts memory candidates and next actions", () => {
    const repoRoot = getRepoRoot();
    const content = fs.readFileSync(path.join(repoRoot, "tests", "fixtures", "raw-note-a.md"), "utf8");
    const parsed = parseRawMarkdown(content);

    expect(parsed.memoryCandidates).toEqual(["Need a better backup cadence for project notes."]);
    expect(parsed.nextActions).toEqual(["Review backup remote permissions.", "Add weekly cleanup note."]);
  });
});

