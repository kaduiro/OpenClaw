import { describe, expect, it } from "vitest";
import {
  classifyWslToolReadiness,
  findInvalidWslconfigKeys,
  isProbablyNativeWslToolPath,
  isWindowsNpmShimPath,
} from "../../src/lib/wsl-doctor.mjs";

describe("wsl doctor helpers", () => {
  it("rejects Windows npm shim paths", () => {
    expect(isWindowsNpmShimPath("/mnt/c/Users/akkun/AppData/Roaming/npm/pnpm")).toBe(true);
    expect(isWindowsNpmShimPath("/mnt/c/Users/akkun/AppData/Roaming/npm/openclaw")).toBe(true);
    expect(isWindowsNpmShimPath("/usr/bin/pnpm")).toBe(false);
  });

  it("accepts likely WSL-native tool paths", () => {
    expect(isProbablyNativeWslToolPath("/usr/bin/docker")).toBe(true);
    expect(isProbablyNativeWslToolPath("/home/kaduiro/.nvm/versions/node/v22.0.0/bin/node")).toBe(true);
    expect(isProbablyNativeWslToolPath("/mnt/c/Users/akkun/AppData/Roaming/npm/pnpm")).toBe(false);
  });

  it("finds invalid .wslconfig keys", () => {
    const issues = findInvalidWslconfigKeys("[wsl2]\nmemory=8GB\nwsl2.autoMemoryReclaim=gradual\n");

    expect(issues).toEqual([
      {
        key: "wsl2.autoMemoryReclaim",
        line: 3,
        fix: "[wsl2]\nautoMemoryReclaim=gradual",
      },
    ]);
  });

  it("classifies tool readiness states", () => {
    expect(
      classifyWslToolReadiness({
        binaryPath: "/home/kaduiro/.nvm/versions/node/v24.14.1/bin/node",
        commandSucceeded: true,
        hasNvmInstall: true,
      }),
    ).toBe("ready");

    expect(
      classifyWslToolReadiness({
        binaryPath: "",
        commandSucceeded: false,
        hasNvmInstall: false,
      }),
    ).toBe("missing");

    expect(
      classifyWslToolReadiness({
        binaryPath: "/mnt/c/Users/akkun/AppData/Roaming/npm/pnpm",
        commandSucceeded: false,
        hasNvmInstall: true,
        hasProfileGuard: false,
        shimDir: "/mnt/c/Users/akkun/AppData/Roaming/npm",
      }),
    ).toBe("windows_shim");

    expect(
      classifyWslToolReadiness({
        binaryPath: "/mnt/c/Users/akkun/AppData/Roaming/npm/openclaw",
        commandSucceeded: false,
        hasNvmInstall: true,
        hasProfileGuard: true,
        shimDir: "/mnt/c/Users/akkun/AppData/Roaming/npm",
      }),
    ).toBe("shell_not_reloaded");
  });
});
