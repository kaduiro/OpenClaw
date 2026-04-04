import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSON5 from "json5";

export function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function parseCliArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function parseDotEnv(content) {
  const parsed = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

export function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return parseDotEnv(fs.readFileSync(filePath, "utf8"));
}

export function loadRepoEnv(repoRoot, extraEnv = {}) {
  const exampleEnvFile = path.join(repoRoot, ".env.example");
  const envFile = path.join(repoRoot, ".env");
  return {
    ...loadDotEnvFile(exampleEnvFile),
    ...process.env,
    ...loadDotEnvFile(envFile),
    ...extraEnv,
  };
}

export function substituteEnv(text, env) {
  return text.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_, key) => {
    const value = env[key];
    if (value === undefined || value === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  });
}

export function loadJson5Config(configPath, env = process.env) {
  const raw = fs.readFileSync(configPath, "utf8");
  const substituted = substituteEnv(raw, env);
  return JSON5.parse(substituted);
}

export function resolveDateInput(value, fallbackDate = new Date()) {
  if (value) {
    return value;
  }
  return fallbackDate.toISOString().slice(0, 10);
}
