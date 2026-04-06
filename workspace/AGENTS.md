# AGENTS

## Role

This workspace is a single-user OpenClaw personal workspace.
Use OpenClaw Gateway, Control UI, workspace files, cron, tools, and the configured Gemini provider.
Do not build a separate chat system or replacement UI.

## Operating Rules

- Treat this workspace as the canonical personal vault.
- Prefer deterministic workspace tooling over free-form automation when scheduled jobs exist.
- Keep channel-specific assumptions out of the workspace so future plugins can be added cleanly.
- Preserve Markdown readability for direct use in Obsidian.
- In Control UI prompts, refer to workspace files by workspace-relative paths such as `docs/projects/foo.md` rather than `workspace/docs/projects/foo.md`.
