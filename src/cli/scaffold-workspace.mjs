import path from "node:path";
import { parseCliArgs } from "../lib/env-config.mjs";
import { scaffoldWorkspace, verifyWorkspace } from "../lib/workspace-contract.mjs";

const args = parseCliArgs(process.argv.slice(2));
const workspace = args.workspace ? path.resolve(args.workspace) : path.resolve("workspace");

if (args.check) {
  const status = verifyWorkspace(workspace);
  if (!status.ok) {
    console.error("Workspace contract failed.");
    for (const item of status.missingDirs) {
      console.error(`Missing directory: ${item}`);
    }
    for (const item of status.missingFiles) {
      console.error(`Missing file: ${item}`);
    }
    process.exit(1);
  }
  console.log(`Workspace verified: ${workspace}`);
  process.exit(0);
}

scaffoldWorkspace(workspace);
console.log(`Workspace scaffolded: ${workspace}`);

