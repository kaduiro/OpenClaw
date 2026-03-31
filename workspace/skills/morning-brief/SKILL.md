# morning-brief

Use this skill for the scheduled morning brief run.

## Workflow

1. Run the deterministic CLI inside the sandbox:
   `node /repo/src/cli/morning-brief.mjs --workspace /workspace`
2. Do not invent extra summary sections.
3. Verify that `outputs/morning-briefs/YYYY-MM-DD.md` exists.
4. If the command fails, report the failure and stop.

