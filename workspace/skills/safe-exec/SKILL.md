# safe-exec

This skill exists for break-glass host execution planning only.

## Rules

- Do not use raw elevated exec.
- Do not construct ad-hoc host shell commands.
- Only use `bash /repo/scripts/safe-host-exec.sh <command-id>` when an operator has explicitly approved the action.
- Allowed command ids are defined in `/repo/config/exec-allowlist.json`.
- If the required action is not allowlisted, stop and ask for operator intervention instead of bypassing the policy.
