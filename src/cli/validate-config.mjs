import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJson5Config, loadRepoEnv, parseCliArgs } from "../lib/env-config.mjs";

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
  if (config?.agents?.defaults?.sandbox?.mode !== "all") {
    errors.push("agents.defaults.sandbox.mode must be all");
  }
  if (config?.agents?.defaults?.sandbox?.backend !== "docker") {
    errors.push("agents.defaults.sandbox.backend must be docker");
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

