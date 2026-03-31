import fs from "node:fs";
import path from "node:path";

export const REQUIRED_DIRECTORIES = [
  "inbox/raw",
  "inbox/processed",
  "memory",
  "memory/daily",
  "docs/projects",
  "tasks",
  "outputs/morning-briefs",
  "outputs/triage-logs",
  "skills/nightly-triage",
  "skills/morning-brief",
  "skills/safe-exec",
];

export const FILE_TEMPLATES = {
  "AGENTS.md": `# AGENTS

## Role

This workspace is a single-user OpenClaw personal workspace.
Use OpenClaw Gateway, Control UI, workspace files, cron, tools, and the configured Gemini provider.
Do not build a separate chat system or replacement UI.

## Operating Rules

- Treat this workspace as the canonical personal vault.
- Prefer deterministic workspace tooling over free-form automation when scheduled jobs exist.
- Keep channel-specific assumptions out of the workspace so future plugins can be added cleanly.
- Preserve Markdown readability for direct use in Obsidian.
`,
  "SOUL.md": `# SOUL

Operate as a careful personal workspace assistant.
Favor traceable updates, explicit file outputs, and conservative security defaults.
Do not take dangerous shortcuts with device auth, host execution, or public network exposure.
`,
  "USER.md": `# USER

## Preferences

- Single-user setup
- Markdown-first knowledge capture
- Obsidian-compatible structure
- Deterministic nightly triage and morning brief outputs
`,
  "TOOLS.md": `# TOOLS

## Safe Execution Policy

- Sandbox-first execution is the default.
- Do not request unrestricted host execution.
- Host execution is only allowed via the allowlisted safe exec wrapper when an operator explicitly approves it.
- Keep Control UI on loopback and keep device auth enabled.
`,
  "MEMORY.md": `# MEMORY

This file is the top-level memory index for the personal workspace.

## Daily Memory

Daily memory lives in \`memory/daily/YYYY-MM-DD.md\`.

## Outputs

- morning briefs: \`outputs/morning-briefs/\`
- triage logs: \`outputs/triage-logs/\`
`,
  "tasks/next-actions.md": `# Next Actions

## Backlog

- [ ] Review and prune completed actions regularly.
`,
  "skills/nightly-triage/SKILL.md": `# nightly-triage

Use this skill for the scheduled nightly triage run.

## Workflow

1. Confirm the workspace is the active OpenClaw personal workspace.
2. Execute the deterministic CLI inside the sandbox:
   \`node /repo/src/cli/nightly-triage.mjs --workspace /workspace\`
3. Do not improvise alternate output formats.
4. Verify that:
   - \`memory/daily/YYYY-MM-DD.md\` was updated
   - \`tasks/next-actions.md\` was updated when actions were found
   - \`outputs/triage-logs/YYYY-MM-DD.md\` exists
5. If the command fails, report the failure and stop.
`,
  "skills/morning-brief/SKILL.md": `# morning-brief

Use this skill for the scheduled morning brief run.

## Workflow

1. Run the deterministic CLI inside the sandbox:
   \`node /repo/src/cli/morning-brief.mjs --workspace /workspace\`
2. Do not invent extra summary sections.
3. Verify that \`outputs/morning-briefs/YYYY-MM-DD.md\` exists.
4. If the command fails, report the failure and stop.
`,
  "skills/safe-exec/SKILL.md": `# safe-exec

This skill exists for break-glass host execution planning only.

## Rules

- Do not use raw elevated exec.
- Do not construct ad-hoc host shell commands.
- Only use \`bash /repo/scripts/safe-host-exec.sh <command-id>\` when an operator has explicitly approved the action.
- Allowed command ids are defined in \`/repo/config/exec-allowlist.json\`.
- If the required action is not allowlisted, stop and ask for operator intervention instead of bypassing the policy.
`,
};

export function getRequiredFiles() {
  return Object.keys(FILE_TEMPLATES);
}

export function scaffoldWorkspace(workspaceRoot, { overwrite = false } = {}) {
  for (const relativeDir of REQUIRED_DIRECTORIES) {
    fs.mkdirSync(path.join(workspaceRoot, relativeDir), { recursive: true });
  }

  for (const [relativeFile, content] of Object.entries(FILE_TEMPLATES)) {
    const targetFile = path.join(workspaceRoot, relativeFile);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    if (!overwrite && fs.existsSync(targetFile)) {
      continue;
    }
    fs.writeFileSync(targetFile, content, "utf8");
  }
}

export function verifyWorkspace(workspaceRoot) {
  const missingDirs = REQUIRED_DIRECTORIES.filter((relativeDir) => !fs.existsSync(path.join(workspaceRoot, relativeDir)));
  const missingFiles = getRequiredFiles().filter((relativeFile) => !fs.existsSync(path.join(workspaceRoot, relativeFile)));
  return {
    ok: missingDirs.length === 0 && missingFiles.length === 0,
    missingDirs,
    missingFiles,
  };
}

