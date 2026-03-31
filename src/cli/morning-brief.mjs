import path from "node:path";
import { parseCliArgs, resolveDateInput } from "../lib/env-config.mjs";
import { runMorningBrief } from "../lib/brief-generator.mjs";

const args = parseCliArgs(process.argv.slice(2));
const workspaceRoot = args.workspace ? path.resolve(args.workspace) : path.resolve("workspace");
const date = resolveDateInput(args.date);

const result = runMorningBrief({
  workspaceRoot,
  date,
});

console.log(JSON.stringify(result, null, 2));

