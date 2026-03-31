# Architecture

## Goals

This repository scaffolds a single-user OpenClaw Personal Workspace without reimplementing OpenClaw itself.
The control plane remains OpenClaw Gateway plus Control UI.
The Markdown workspace under `./workspace` is the canonical personal vault and is intended to be opened directly in Obsidian.

## System Layout

- OpenClaw Gateway runs externally via the official `openclaw` CLI.
- The repo provides config, workspace bootstrap files, deterministic job runners, health checks, and test coverage.
- The OpenClaw agent workspace is `./workspace`.
- The sandbox bind-mounts the repo root at `/repo` so isolated jobs can invoke deterministic tooling such as `/repo/src/cli/nightly-triage.mjs`.
- The sandbox workdir remains `/workspace`, so Markdown outputs stay inside the personal vault.

## Data Flow

### Nightly Triage

1. OpenClaw cron triggers an isolated agent turn at `23:00 Asia/Tokyo`.
2. The workspace skill instructs the agent to run the deterministic triage CLI inside the sandbox.
3. The CLI reads `workspace/inbox/raw/**/*.md`.
4. It extracts memory candidates from `## Memory` and generic bullet content.
5. It extracts next actions from `## Next Actions` and unchecked task items.
6. It appends results to `workspace/memory/daily/YYYY-MM-DD.md` and `workspace/tasks/next-actions.md`.
7. It writes a triage log to `workspace/outputs/triage-logs/YYYY-MM-DD.md`.
8. It updates `workspace/outputs/triage-logs/.processed-files.json` to prevent duplicate processing of unchanged raw files.

### Morning Brief

1. OpenClaw cron triggers an isolated agent turn at `07:00 Asia/Tokyo`.
2. The workspace skill runs the deterministic morning brief CLI in the sandbox.
3. The CLI reads the previous daily memory file and the current next-actions file.
4. It writes `workspace/outputs/morning-briefs/YYYY-MM-DD.md` with fixed sections.

## Security Posture

- Control UI binds to loopback only.
- Gateway auth uses token mode only.
- `dangerouslyDisableDeviceAuth` is explicitly disabled.
- Elevated host exec is disabled in OpenClaw config.
- Host-side emergency execution uses `scripts/safe-host-exec.sh` and a static allowlist.
- The template does not expose Control UI to the public internet and does not enable unrestricted host execution.

## Future Extensions

- A LINE plugin can be added later because the deterministic job runners and workspace format are channel-agnostic.
- Additional scheduled skills can reuse the same `/repo/src/cli/*.mjs` execution pattern.
- Memory search, remote delivery, or plugin-specific routing can be added without changing the vault layout.

