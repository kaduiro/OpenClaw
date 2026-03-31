import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliArgs } from "../lib/env-config.mjs";

export function loadAllowlist(allowlistPath) {
  return JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
}

export function resolveCommandEntry(allowlist, commandId, repoRoot) {
  const entry = allowlist?.commands?.[commandId];
  if (!entry) {
    throw new Error(`Command id is not allowlisted: ${commandId}`);
  }

  const commandPath = entry.command.startsWith("./")
    ? path.resolve(repoRoot, entry.command)
    : entry.command;

  return {
    ...entry,
    command: commandPath,
    args: entry.args ?? [],
  };
}

export function executeAllowlistedCommand({ allowlistPath, commandId, repoRoot }) {
  const allowlist = loadAllowlist(allowlistPath);
  const entry = resolveCommandEntry(allowlist, commandId, repoRoot);
  const result = spawnSync(entry.command, entry.args, {
    stdio: "inherit",
    cwd: repoRoot,
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`Allowlisted command failed with exit code ${result.status}`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === executedFile) {
  const args = parseCliArgs(process.argv.slice(2));
  if (!args["command-id"]) {
    console.error("--command-id is required");
    process.exit(1);
  }

  const repoRoot = path.resolve(path.dirname(currentFile), "..", "..");
  const allowlistPath = args.allowlist
    ? path.resolve(args.allowlist)
    : path.join(repoRoot, "config", "exec-allowlist.json");

  try {
    executeAllowlistedCommand({
      allowlistPath,
      commandId: args["command-id"],
      repoRoot,
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
