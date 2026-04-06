# nightly-triage

Use this skill for the scheduled nightly triage run.

## Workflow

1. Confirm the workspace is the active OpenClaw personal workspace.
2. Review `inbox/raw/` and identify memory candidates, open questions, and actionable next steps.
3. Update only workspace files:
   - `memory/daily/YYYY-MM-DD.md`
   - `tasks/next-actions.md`
   - `outputs/triage-logs/YYYY-MM-DD.md`
4. Do not read or write outside the workspace.
5. If the task requires repo-root access or host execution, stop and escalate instead of bypassing the sandbox.
