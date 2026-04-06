# safe-exec

This skill exists for break-glass host execution planning only.

## Rules

- Do not use raw elevated exec.
- Do not construct ad-hoc host shell commands.
- Normal workspace agents must not invoke host-side wrappers from inside the sandbox.
- If a task genuinely requires host execution, stop and hand it off to an operator-run flow outside the workspace agent.
