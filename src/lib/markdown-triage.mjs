import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function walkMarkdownFiles(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) {
    return files;
  }
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function normalizeBullet(line) {
  return line
    .replace(/^\s*-\s*\[\s\]\s*/, "")
    .replace(/^\s*[-*+]\s*/, "")
    .trim();
}

function extractSections(content) {
  const lines = content.split(/\r?\n/);
  const sections = new Map();
  let current = "body";
  sections.set(current, []);

  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line.trim());
    if (heading) {
      current = heading[1].trim().toLowerCase();
      if (!sections.has(current)) {
        sections.set(current, []);
      }
      continue;
    }
    sections.get(current).push(line);
  }
  return sections;
}

export function parseRawMarkdown(content) {
  const sections = extractSections(content);
  const memorySection = sections.get("memory") ?? [];
  const nextActionsSection = sections.get("next actions") ?? [];
  const bodySection = sections.get("body") ?? [];

  const memoryCandidates = [];
  const nextActions = [];

  for (const line of memorySection) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed) || /^-\s*\[\s\]\s+/.test(trimmed)) {
      memoryCandidates.push(normalizeBullet(trimmed));
      continue;
    }
    memoryCandidates.push(trimmed);
  }

  for (const line of nextActionsSection) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed) || /^-\s*\[\s\]\s+/.test(trimmed)) {
      nextActions.push(normalizeBullet(trimmed));
    }
  }

  for (const line of bodySection) {
    const trimmed = line.trim();
    if (/^-\s*\[\s\]\s+/.test(trimmed)) {
      nextActions.push(normalizeBullet(trimmed));
    }
  }

  return {
    memoryCandidates: [...new Set(memoryCandidates.filter(Boolean))],
    nextActions: [...new Set(nextActions.filter(Boolean))],
  };
}

function fileHash(content) {
  return crypto.createHash("sha1").update(content).digest("hex");
}

function loadProcessedState(stateFile) {
  if (!fs.existsSync(stateFile)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(stateFile, "utf8"));
}

function saveProcessedState(stateFile, state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
}

function ensureDailyMemoryFile(filePath, date) {
  if (fs.existsSync(filePath)) {
    return;
  }
  const initial = `# Daily Memory - ${date}

## Inbox Triage

`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, initial, "utf8");
}

function appendUniqueLines(filePath, heading, linesToAdd, prefix = "- ") {
  if (linesToAdd.length === 0) {
    return false;
  }
  const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const existingLines = new Set(
    original
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  const prepared = linesToAdd
    .map((item) => `${prefix}${item}`.trimEnd())
    .filter((line) => !existingLines.has(line.trim()));

  if (prepared.length === 0) {
    return false;
  }

  let next = original;
  if (!next.includes(heading)) {
    if (!next.endsWith("\n") && next.length > 0) {
      next += "\n";
    }
    next += `${heading}\n\n`;
  }

  if (!next.endsWith("\n")) {
    next += "\n";
  }
  next += `${prepared.join("\n")}\n`;
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

function relativeTo(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

export function runNightlyTriage({ workspaceRoot, date }) {
  const rawDir = path.join(workspaceRoot, "inbox", "raw");
  const outputsDir = path.join(workspaceRoot, "outputs", "triage-logs");
  const stateFile = path.join(outputsDir, ".processed-files.json");
  const dailyMemoryFile = path.join(workspaceRoot, "memory", "daily", `${date}.md`);
  const nextActionsFile = path.join(workspaceRoot, "tasks", "next-actions.md");
  const processedState = loadProcessedState(stateFile);
  const files = walkMarkdownFiles(rawDir);

  ensureDailyMemoryFile(dailyMemoryFile, date);

  const processedFiles = [];
  const memoryLines = [];
  const actionLines = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const hash = fileHash(content);
    const key = relativeTo(workspaceRoot, filePath);

    if (processedState[key] === hash) {
      continue;
    }

    const parsed = parseRawMarkdown(content);
    for (const entry of parsed.memoryCandidates) {
      memoryLines.push(`${key}: ${entry}`);
    }
    for (const entry of parsed.nextActions) {
      actionLines.push(entry);
    }

    processedState[key] = hash;
    processedFiles.push(key);
  }

  const uniqueMemory = [...new Set(memoryLines)];
  const uniqueActions = [...new Set(actionLines)];

  appendUniqueLines(dailyMemoryFile, "## Inbox Triage", uniqueMemory, "- ");
  appendUniqueLines(nextActionsFile, `## ${date}`, uniqueActions, "- [ ] ");

  saveProcessedState(stateFile, processedState);

  const logFile = path.join(outputsDir, `${date}.md`);
  const logContent = `# Triage Log - ${date}

## Summary

- processed files: ${processedFiles.length}
- memory candidates: ${uniqueMemory.length}
- next actions: ${uniqueActions.length}

## Processed Files

${processedFiles.length > 0 ? processedFiles.map((item) => `- ${item}`).join("\n") : "- none"}

## Memory Candidates

${uniqueMemory.length > 0 ? uniqueMemory.map((item) => `- ${item}`).join("\n") : "- none"}

## Next Actions

${uniqueActions.length > 0 ? uniqueActions.map((item) => `- [ ] ${item}`).join("\n") : "- none"}

<!-- TODO: archival move into inbox/processed can be added after retention policy is defined. -->
`;
  fs.mkdirSync(outputsDir, { recursive: true });
  fs.writeFileSync(logFile, logContent, "utf8");

  return {
    processedFiles,
    memoryCount: uniqueMemory.length,
    actionCount: uniqueActions.length,
    dailyMemoryFile,
    nextActionsFile,
    logFile,
  };
}

