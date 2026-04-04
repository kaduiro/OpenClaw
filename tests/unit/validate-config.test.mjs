import { describe, expect, it } from "vitest";
import { validateOpenClawConfig } from "../../src/cli/validate-config.mjs";

describe("validateOpenClawConfig", () => {
  it("accepts a secure personal workspace config", () => {
    const errors = validateOpenClawConfig({
      gateway: {
        mode: "local",
        bind: "loopback",
        auth: { mode: "token", token: "abc" },
        controlUi: { enabled: true, allowInsecureAuth: false, dangerouslyDisableDeviceAuth: false },
      },
      agents: {
        defaults: {
          sandbox: { mode: "all", backend: "docker", docker: { binds: ["/repo-root:/repo:rw"] } },
        },
        list: [{ id: "personal", tools: { elevated: { enabled: false } } }],
      },
    });

    expect(errors).toEqual([]);
  });

  it("rejects dangerous settings", () => {
    const errors = validateOpenClawConfig({
      gateway: {
        mode: "remote",
        bind: "lan",
        auth: { mode: "none", token: "" },
        controlUi: { enabled: true, allowInsecureAuth: true, dangerouslyDisableDeviceAuth: true },
      },
      tools: {
        elevated: { enabled: true },
      },
      agents: {
        defaults: {
          sandbox: { mode: "off", backend: "openshell", docker: { binds: ["C:/repo:/repo:rw"] } },
          tools: { profile: "coding" },
        },
        list: [{ id: "personal", tools: { elevated: { enabled: true } } }],
      },
      commands: {
        bash: true,
      },
    });

    expect(errors).toContain("gateway.bind must be loopback");
    expect(errors).toContain("dangerouslyDisableDeviceAuth must remain false");
    expect(errors).toContain("global elevated host exec must remain disabled");
    expect(errors).toContain("agents.defaults.tools is not supported by the current OpenClaw schema");
  });

  it("rejects Git Bash style bind roots", () => {
    const errors = validateOpenClawConfig({
      gateway: {
        mode: "local",
        bind: "loopback",
        auth: { mode: "token", token: "abc" },
        controlUi: { enabled: true, allowInsecureAuth: false, dangerouslyDisableDeviceAuth: false },
      },
      agents: {
        defaults: {
          sandbox: { mode: "all", backend: "docker", docker: { binds: ["/c/repo:/repo:rw"] } },
        },
        list: [{ id: "personal", tools: { elevated: { enabled: false } } }],
      },
    });

    expect(errors).toContain("agents.defaults.sandbox.docker.binds must use absolute POSIX source paths: /c/repo:/repo:rw");
  });
});
