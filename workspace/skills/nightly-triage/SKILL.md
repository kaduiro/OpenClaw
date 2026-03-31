# nightly-triage

Use this skill for the scheduled nightly triage run.

## Workflow

1. Confirm the workspace is the active OpenClaw personal workspace.
2. Execute the deterministic CLI inside the sandbox:
   `node /repo/src/cli/nightly-triage.mjs --workspace /workspace`
3. Do not improvise alternate output formats.
4. Verify that:
   - `memory/daily/YYYY-MM-DD.md` was updated
   - `tasks/next-actions.md` was updated when actions were found
   - `outputs/triage-logs/YYYY-MM-DD.md` exists
5. If the command fails, report the failure and stop.

