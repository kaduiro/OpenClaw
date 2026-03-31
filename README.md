# OpenClaw Personal Workspace

This repository scaffolds a single-user OpenClaw Personal Workspace.
It does not bundle or reimplement OpenClaw.
The expected runtime is the official `openclaw` CLI running on Linux or WSL2, with OpenClaw Control UI as the initial interface.

## Repository Structure

```text
.
├─ .env.example
├─ README.md
├─ package.json
├─ config/
├─ docs/
├─ scripts/
├─ src/
├─ workspace/
└─ tests/
```

## Prerequisites

- Linux or WSL2 with `bash`
- Node.js 20+
- `pnpm`
- Docker
- Official `openclaw` CLI installed separately
- A Gemini API key exposed as `GEMINI_API_KEY`

## Setup

1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Create the local environment file.

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and fill these required values:
   - `OPENCLAW_GATEWAY_TOKEN`
   - `GEMINI_API_KEY`
   - `OPENCLAW_REPO_ROOT`
   - `OPENCLAW_WORKSPACE_DIR`
   - `OPENCLAW_CONFIG_PATH`
   - `OPENCLAW_STATE_DIR`

4. Copy the OpenClaw config template.

   ```bash
   cp config/openclaw.json5.example config/openclaw.json5
   ```

5. Scaffold or repair the workspace contract.

   ```bash
   node src/cli/scaffold-workspace.mjs --workspace ./workspace
   ```

6. Run the environment health check.

   ```bash
   bash scripts/healthcheck.sh
   ```

7. Start OpenClaw Gateway and Control UI.

   ```bash
   bash scripts/dev-start.sh
   ```

8. Register cron jobs.

   ```bash
   bash scripts/register-cron.sh
   ```

## Workspace Layout

The directory `./workspace` is the canonical personal vault.
Open it directly in Obsidian.
Core files:

- `AGENTS.md`
- `SOUL.md`
- `USER.md`
- `TOOLS.md`
- `MEMORY.md`
- `inbox/raw`
- `memory/daily`
- `tasks/next-actions.md`
- `outputs/morning-briefs`
- `outputs/triage-logs`
- `skills/*/SKILL.md`

## Raw Inbox Contract

`workspace/inbox/raw/*.md` is parsed deterministically.
Use this lightweight contract:

- `## Memory`
  - Bullet points or short paragraphs that should be considered for daily memory.
- `## Next Actions`
  - `- [ ]` or `-` items that should be appended to `tasks/next-actions.md`.
- Unchecked task items outside that section are also treated as next actions.

Example:

```md
# Capture 2026-03-31

## Memory
- Need a better backup cadence for project notes.

## Next Actions
- [ ] Review backup remote permissions.
- [ ] Add weekly cleanup note.
```

## Nightly Triage

The nightly triage job:

- reads `workspace/inbox/raw/**/*.md`
- extracts memory candidates
- appends next actions
- writes `workspace/outputs/triage-logs/YYYY-MM-DD.md`
- updates the processed-file state log

Run it manually:

```bash
node src/cli/nightly-triage.mjs --workspace ./workspace
```

## Morning Brief

The morning brief job:

- reads the previous daily memory file
- reads `workspace/tasks/next-actions.md`
- writes `workspace/outputs/morning-briefs/YYYY-MM-DD.md`

Run it manually:

```bash
node src/cli/morning-brief.mjs --workspace ./workspace
```

## OpenClaw Config

The template in `config/openclaw.json5.example` is designed around the OpenClaw docs:

- `gateway.bind: "loopback"`
- `gateway.auth.mode: "token"`
- `controlUi.enabled: true`
- `dangerouslyDisableDeviceAuth: false`
- sandbox enabled with Docker
- repo root mounted into the sandbox at `/repo`
- workspace skills loaded from `workspace/skills`

The Gemini model is configured via environment variables and uses provider refs like `google/gemini-2.5-flash`.

## Safe Exec Policy

This template is sandbox-first.

- Routine automation must run inside the OpenClaw sandbox.
- OpenClaw elevated host exec stays disabled in config.
- Host execution is only available through `scripts/safe-host-exec.sh <command-id>`.
- Only static allowlist entries from `config/exec-allowlist.json` are allowed.
- Any host-side break-glass action should require explicit operator approval.

Unsafe shortcuts that are intentionally not used:

- `dangerouslyDisableDeviceAuth`
- unrestricted host exec
- public internet exposure for Control UI

## Development and Production

- `bash scripts/dev-start.sh`
  - Loads `.env`
  - Runs the health check
  - Starts `openclaw gateway`
- `bash scripts/prod-start.sh`
  - Requires a complete `.env`
  - Fails fast on missing values

## Backup

Run:

```bash
bash scripts/backup.sh
```

Behavior:

- creates a local Git backup commit when there are changes
- optionally pushes to `BACKUP_REMOTE` and `BACKUP_BRANCH`
- does not force-push

## Tests

Run all tests:

```bash
pnpm test
```

Split test suites:

```bash
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

Coverage targets:

- config loading and validation
- workspace template completeness
- nightly triage outputs
- morning brief outputs
- safe exec allowlist rejection
- startup and cron registration flows

## Troubleshooting

- If `openclaw` is not found, install the official CLI first and rerun `bash scripts/healthcheck.sh`.
- If Docker is unavailable, fix that before starting the gateway. This template does not fall back to insecure host execution.
- If a cron job was modified manually, rerun `bash scripts/register-cron.sh`.
- If workspace files are missing, rerun `node src/cli/scaffold-workspace.mjs --workspace ./workspace`.

