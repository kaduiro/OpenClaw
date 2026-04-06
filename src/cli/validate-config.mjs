import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJson5Config, loadRepoEnv, parseCliArgs } from "../lib/env-config.mjs";

function isAbsolutePosixPath(value) {
  return typeof value === "string" && value.startsWith("/");
}

function isGitBashDrivePath(value) {
  return typeof value === "string" && /^\/[A-Za-z](?:\/|$)/.test(value);
}

function isPathInside(root, candidate) {
  if (typeof root !== "string" || typeof candidate !== "string") {
    return false;
  }
  if (root === candidate) {
    return true;
  }
  return candidate.startsWith(`${root}/`);
}

function parseDockerBindSource(bind) {
  if (typeof bind !== "string" || bind.length === 0) {
    return "";
  }
  if (bind.startsWith("/")) {
    const secondColon = bind.indexOf(":", 1);
    if (secondColon === -1) {
      return bind;
    }
    return bind.slice(0, secondColon);
  }
  const firstColon = bind.indexOf(":");
  if (firstColon === -1) {
    return bind;
  }
  return bind.slice(0, firstColon);
}

function parseDockerBindTarget(bind) {
  if (typeof bind !== "string" || bind.length === 0) {
    return "";
  }
  const source = parseDockerBindSource(bind);
  if (!source) {
    return "";
  }
  const remainder = bind.slice(source.length + 1);
  const targetEnd = remainder.indexOf(":");
  if (targetEnd === -1) {
    return remainder;
  }
  return remainder.slice(0, targetEnd);
}

export function validateOpenClawConfig(config) {
  const errors = [];

  if (config?.gateway?.mode !== "local") {
    errors.push("gateway.mode must be local");
  }
  if (config?.gateway?.bind !== "loopback") {
    errors.push("gateway.bind must be loopback");
  }
  if (config?.gateway?.auth?.mode !== "token") {
    errors.push("gateway.auth.mode must be token");
  }
  if (!config?.gateway?.auth?.token) {
    errors.push("gateway.auth.token is required");
  }
  if (config?.gateway?.controlUi?.enabled !== true) {
    errors.push("gateway.controlUi.enabled must be true");
  }
  if (config?.gateway?.controlUi?.dangerouslyDisableDeviceAuth === true) {
    errors.push("dangerouslyDisableDeviceAuth must remain false");
  }
  if (config?.gateway?.controlUi?.allowInsecureAuth === true) {
    errors.push("allowInsecureAuth must remain false");
  }
  if (config?.agents?.defaults?.tools !== undefined) {
    errors.push("agents.defaults.tools is not supported by the current OpenClaw schema");
  }
  if (config?.tools?.elevated?.enabled === true) {
    errors.push("global elevated host exec must remain disabled");
  }
  if (config?.commands?.bash === true) {
    errors.push("commands.bash must remain disabled");
  }

  const personalAgent = config?.agents?.list?.find((agent) => agent.id === "personal");
  if (!personalAgent) {
    errors.push("agents.list must include a personal agent");
  }
  if (personalAgent?.tools?.elevated?.enabled === true) {
    errors.push("personal agent elevated host exec must remain disabled");
  }
  if (!isAbsolutePosixPath(personalAgent?.workspace) || isGitBashDrivePath(personalAgent?.workspace)) {
    errors.push("personal agent workspace must use an absolute POSIX path");
  }
  if (config?.agents?.defaults?.sandbox?.mode !== "all") {
    errors.push("agents.defaults.sandbox.mode must be all");
  }
  if (config?.agents?.defaults?.sandbox?.backend !== "docker") {
    errors.push("agents.defaults.sandbox.backend must be docker");
  }
  if (config?.agents?.defaults?.sandbox?.workspaceAccess !== "rw") {
    errors.push("agents.defaults.sandbox.workspaceAccess must be rw");
  }
  const defaultBinds = config?.agents?.defaults?.sandbox?.docker?.binds ?? [];
  for (const bind of defaultBinds) {
    const source = parseDockerBindSource(bind);
    const target = parseDockerBindTarget(bind);
    if (!isAbsolutePosixPath(source) || isGitBashDrivePath(source)) {
      errors.push(`agents.defaults.sandbox.docker.binds must use absolute POSIX source paths: ${bind}`);
    }
    if (target === "/workspace") {
      errors.push(`agents.defaults.sandbox.docker.binds must not mount reserved workspace path: ${bind}`);
    }
    if (target === "/repo") {
      errors.push(`agents.defaults.sandbox.docker.binds must not mount /repo in workspace-only mode: ${bind}`);
    }
    if (personalAgent?.workspace && !isPathInside(personalAgent.workspace, source)) {
      errors.push(`agents.defaults.sandbox.docker.binds must stay within the personal workspace root: ${bind}`);
    }
  }
  if (defaultBinds.length > 0) {
    errors.push("agents.defaults.sandbox.docker.binds must be empty in workspace-only mode");
  }

  return errors;
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === executedFile) {
  const args = parseCliArgs(process.argv.slice(2));
  const repoRoot = path.resolve(path.dirname(currentFile), "..", "..");
  const configPath = args.config ? path.resolve(args.config) : path.join(repoRoot, "config", "openclaw.json5");
  const env = loadRepoEnv(repoRoot);
  const config = loadJson5Config(configPath, env);
  const errors = validateOpenClawConfig(config);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  console.log(`Config valid: ${configPath}`);
}
