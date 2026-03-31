# Operations

## Bootstrap

1. Copy `.env.example` to `.env` and replace all placeholder values.
2. Copy `config/openclaw.json5.example` to `config/openclaw.json5`.
3. Run `pnpm install`.
4. Run `node src/cli/scaffold-workspace.mjs --workspace ./workspace`.
5. Run `bash scripts/healthcheck.sh`.
6. Start the gateway with `bash scripts/dev-start.sh`.

## Cron Registration

- Register nightly triage and morning brief jobs with `bash scripts/register-cron.sh`.
- The script looks for existing cron jobs by name and edits them when possible.
- Default schedules:
  - nightly triage: `0 23 * * *`
  - morning brief: `0 7 * * *`
  - timezone: `Asia/Tokyo`

## Backup

- Run `bash scripts/backup.sh` to create a local Git backup commit.
- If both `BACKUP_REMOTE` and `BACKUP_BRANCH` are set, the script also pushes the current `HEAD` to that remote branch.
- The script does not force-push.

## Break-Glass Host Exec

Host exec is not enabled in OpenClaw configuration.
If an operator must run a host command, use the allowlisted wrapper:

```bash
bash scripts/safe-host-exec.sh healthcheck
```

Only command ids present in `config/exec-allowlist.json` are permitted.
Anything outside the allowlist is rejected.
This is designed for explicit operator approval flows rather than routine task execution.

## Triage State

- Processed raw files are tracked by content hash in `workspace/outputs/triage-logs/.processed-files.json`.
- If a raw file changes, it becomes eligible for triage again.
- TODO: move processed files into `workspace/inbox/processed/` after an archival policy is agreed.

## Recovery

- If cron jobs drift, rerun `bash scripts/register-cron.sh`.
- If the workspace contract drifts, rerun `node src/cli/scaffold-workspace.mjs --workspace ./workspace`.
- If a brief or triage output looks wrong, inspect:
  - `workspace/outputs/triage-logs/`
  - `workspace/memory/daily/`
  - `workspace/tasks/next-actions.md`

