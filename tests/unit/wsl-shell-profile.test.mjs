import { describe, expect, it } from "vitest";
import { hasProfileGuard, renderProfileGuardBlock, stripPathSegment } from "../../src/lib/wsl-shell-profile.mjs";

describe("wsl shell profile helpers", () => {
  it("removes only the targeted Windows npm shim path", () => {
    const input = "/usr/bin:/mnt/c/Users/akkun/AppData/Roaming/npm:/home/kaduiro/.nvm/versions/node/v24/bin";

    expect(stripPathSegment(input, "/mnt/c/Users/akkun/AppData/Roaming/npm")).toBe(
      "/usr/bin:/home/kaduiro/.nvm/versions/node/v24/bin",
    );
  });

  it("renders a reusable profile guard block", () => {
    const block = renderProfileGuardBlock("/mnt/c/Users/akkun/AppData/Roaming/npm");

    expect(block).toContain("# >>> openclaw-wsl-path-guard >>>");
    expect(block).toContain("OPENCLAW_WINDOWS_NPM_SHIM_DIR=\"/mnt/c/Users/akkun/AppData/Roaming/npm\"");
    expect(block).toContain("# <<< openclaw-wsl-path-guard <<<");
  });

  it("detects an installed profile guard block", () => {
    expect(hasProfileGuard(renderProfileGuardBlock("/mnt/c/Users/akkun/AppData/Roaming/npm"))).toBe(true);
    expect(hasProfileGuard("export PATH=$PATH")).toBe(false);
  });
});
