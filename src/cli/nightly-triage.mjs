import path from "node:path";
import { parseCliArgs, resolveDateInput } from "../lib/env-config.mjs";
import { runNightlyTriage } from "../lib/markdown-triage.mjs";

const args = parseCliArgs(process.argv.slice(2));
const workspaceRoot = args.workspace ? path.resolve(args.workspace) : path.resolve("workspace");
const date = resolveDateInput(args.date);

const result = runNightlyTriage({
  workspaceRoot,
  date,
});

console.log(JSON.stringify(result, null, 2));

