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
          sandbox: { mode: "all", backend: "docker", workspaceAccess: "rw", docker: {} },
        },
        list: [{ id: "personal", workspace: "/workspace-root", tools: { elevated: { enabled: false } } }],
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
          sandbox: { mode: "off", backend: "openshell", workspaceAccess: "ro", docker: { binds: ["C:/repo:/repo:rw"] } },
          tools: { profile: "coding" },
        },
        list: [{ id: "personal", workspace: "/workspace-root", tools: { elevated: { enabled: true } } }],
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

  it("rejects Git Bash style bind roots and reserved /workspace mounts", () => {
    const errors = validateOpenClawConfig({
      gateway: {
        mode: "local",
        bind: "loopback",
        auth: { mode: "token", token: "abc" },
        controlUi: { enabled: true, allowInsecureAuth: false, dangerouslyDisableDeviceAuth: false },
      },
      agents: {
        defaults: {
          sandbox: { mode: "all", backend: "docker", workspaceAccess: "rw", docker: { binds: ["/c/repo:/workspace:rw"] } },
        },
        list: [{ id: "personal", workspace: "/workspace-root", tools: { elevated: { enabled: false } } }],
      },
    });

    expect(errors).toContain("agents.defaults.sandbox.docker.binds must use absolute POSIX source paths: /c/repo:/workspace:rw");
    expect(errors).toContain("agents.defaults.sandbox.docker.binds must not mount reserved workspace path: /c/repo:/workspace:rw");
    expect(errors).toContain("agents.defaults.sandbox.docker.binds must be empty in workspace-only mode");
  });

  it("rejects /repo mounts and binds outside the workspace root", () => {
    const errors = validateOpenClawConfig({
      gateway: {
        mode: "local",
        bind: "loopback",
        auth: { mode: "token", token: "abc" },
        controlUi: { enabled: true, allowInsecureAuth: false, dangerouslyDisableDeviceAuth: false },
      },
      agents: {
        defaults: {
          sandbox: { mode: "all", backend: "docker", workspaceAccess: "rw", docker: { binds: ["/outside-root:/repo:rw"] } },
        },
        list: [{ id: "personal", workspace: "/workspace-root", tools: { elevated: { enabled: false } } }],
      },
    });

    expect(errors).toContain("agents.defaults.sandbox.docker.binds must not mount /repo in workspace-only mode: /outside-root:/repo:rw");
    expect(errors).toContain("agents.defaults.sandbox.docker.binds must stay within the personal workspace root: /outside-root:/repo:rw");
    expect(errors).toContain("agents.defaults.sandbox.docker.binds must be empty in workspace-only mode");
  });
});
