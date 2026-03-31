import fs from "node:fs";
import path from "node:path";

function extractBullets(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function extractUncheckedTasks(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s*\[\s\]\s+/.test(line))
    .map((line) => line.replace(/^-\s*\[\s\]\s+/, "").trim());
}

function shiftDate(date, days) {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function generateMorningBrief({ date, previousMemoryContent, nextActionsContent }) {
  const memoryHighlights = extractBullets(previousMemoryContent).slice(0, 5);
  const carryOverTasks = extractUncheckedTasks(nextActionsContent).slice(0, 8);
  const summaryLines = [
    `- Previous memory entries: ${memoryHighlights.length}`,
    `- Open next actions: ${carryOverTasks.length}`,
    `- Source memory date: ${shiftDate(date, -1)}`,
  ];

  return `# Morning Brief - ${date}

## Summary

${summaryLines.join("\n")}

## Carry-over Tasks

${carryOverTasks.length > 0 ? carryOverTasks.map((item) => `- [ ] ${item}`).join("\n") : "- none"}

## Memory Highlights

${memoryHighlights.length > 0 ? memoryHighlights.map((item) => `- ${item}`).join("\n") : "- none"}

## Attention Needed

${carryOverTasks.length > 0 ? "- Review carry-over tasks and mark stale items before adding new commitments." : "- No immediate carry-over pressure detected."}
`;
}

export function runMorningBrief({ workspaceRoot, date }) {
  const previousDate = shiftDate(date, -1);
  const previousMemoryFile = path.join(workspaceRoot, "memory", "daily", `${previousDate}.md`);
  const nextActionsFile = path.join(workspaceRoot, "tasks", "next-actions.md");
  const outputFile = path.join(workspaceRoot, "outputs", "morning-briefs", `${date}.md`);

  const previousMemoryContent = fs.existsSync(previousMemoryFile) ? fs.readFileSync(previousMemoryFile, "utf8") : "# Daily Memory\n";
  const nextActionsContent = fs.existsSync(nextActionsFile) ? fs.readFileSync(nextActionsFile, "utf8") : "# Next Actions\n";

  const brief = generateMorningBrief({
    date,
    previousMemoryContent,
    nextActionsContent,
  });

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, brief, "utf8");

  return {
    outputFile,
    previousMemoryFile,
  };
}

