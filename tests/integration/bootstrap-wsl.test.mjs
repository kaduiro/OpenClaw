import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getRepoRoot } from "../../src/lib/env-config.mjs";

function toPosix(input) {
  return input.replace(/\\/g, "/");
}

function toWslPath(input) {
  const normalized = toPosix(input);
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `/mnt/${normalized[0].toLowerCase()}${normalized.slice(2)}`;
  }
  return normalized;
}

function runInWsl(repoRoot, command, env = process.env) {
  const wslRepoRoot = toWslPath(repoRoot);
  return execFileSync("wsl.exe", ["bash", "-lc", `cd "${wslRepoRoot}" && ${command}`], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

describe("bootstrap-wsl.sh", () => {
  const repoRoot = getRepoRoot();
  const fakeBin = path.join(repoRoot, "tmp", "bootstrap-bin");
  const fakeHome = path.join(repoRoot, "tmp", "bootstrap-home");
  const bootstrapLog = path.join(repoRoot, "tmp", "bootstrap-run.log");

  afterEach(() => {
    fs.rmSync(fakeBin, { recursive: true, force: true });
    fs.rmSync(fakeHome, { recursive: true, force: true });
    fs.rmSync(bootstrapLog, { force: true });
  });

  it("prints the staged bootstrap order in dry-run mode", () => {
    const output = runInWsl(repoRoot, "BOOTSTRAP_FORCE_ALL=1 bash scripts/bootstrap-wsl.sh --dry-run");

    expect(output).toContain("WSL bootstrap mode: dry-run");
    expect(output).toContain("Install Node.js LTS");
    expect(output).toContain("Enable pnpm via corepack");
    expect(output).toContain("Install OpenClaw CLI in WSL");
    expect(output).toContain("Next step: bash scripts/doctor-wsl.sh");
  });

  it("completes node, pnpm, and openclaw setup in one shell and installs the profile guard", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    fs.mkdirSync(fakeHome, { recursive: true });

    const wslFakeBin = toWslPath(fakeBin);
    const wslFakeHome = toWslPath(fakeHome);
    const wslLog = toWslPath(bootstrapLog);

    fs.writeFileSync(
      path.join(fakeBin, "sudo"),
      "#!/usr/bin/env bash\nexec \"$@\"\n",
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "apt-get"),
      `#!/usr/bin/env bash
echo "apt-get $@" >> "${wslLog}"
`,
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "curl"),
      `#!/usr/bin/env bash
cat <<'EOF'
mkdir -p "$HOME/.nvm"
cat > "$HOME/.nvm/nvm.sh" <<'EOS'
nvm() {
  if [[ "$1" == "install" ]]; then
    export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
    mkdir -p "$HOME/.nvm/versions/node/v24.14.1/bin"
  fi
  return 0
}
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
EOS
touch "$HOME/.nvm/bash_completion"
EOF
`,
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "corepack"),
      `#!/usr/bin/env bash
echo "corepack $@" >> "${wslLog}"
cat > "$HOME/.nvm/versions/node/v24.14.1/bin/pnpm" <<'EOS'
#!/usr/bin/env bash
echo pnpm
EOS
chmod +x "$HOME/.nvm/versions/node/v24.14.1/bin/pnpm"
`,
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "npm"),
      `#!/usr/bin/env bash
echo "npm $@" >> "${wslLog}"
cat > "$HOME/.nvm/versions/node/v24.14.1/bin/openclaw" <<'EOS'
#!/usr/bin/env bash
echo openclaw
EOS
chmod +x "$HOME/.nvm/versions/node/v24.14.1/bin/openclaw"
`,
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "docker"),
      `#!/usr/bin/env bash
echo "The command 'docker' could not be found in this WSL 2 distro."
exit 1
`,
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "cmd.exe"),
      "#!/usr/bin/env bash\necho C:\\\\Users\\\\akkun\n",
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "wslpath"),
      `#!/usr/bin/env bash
if [[ "$1" == "C:\\\\Users\\\\akkun" ]]; then
  echo "/mnt/c/Users/akkun"
else
  echo "$1"
fi
`,
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "dpkg"),
      "#!/usr/bin/env bash\nexit 1\n",
      { mode: 0o755 },
    );
    fs.writeFileSync(
      path.join(fakeBin, "node"),
      "#!/usr/bin/env bash\necho v24.14.1\n",
      { mode: 0o755 },
    );

    const output = runInWsl(
      repoRoot,
      `HOME="${wslFakeHome}" PATH="${wslFakeBin}:$PATH" BOOTSTRAP_FORCE_ALL=1 bash scripts/bootstrap-wsl.sh --yes`,
    );

    const bashrc = fs.readFileSync(path.join(fakeHome, ".bashrc"), "utf8");
    const log = fs.readFileSync(bootstrapLog, "utf8");

    expect(output).toContain("Bootstrap finished.");
    expect(output).toContain("source ~/.bashrc");
    expect(bashrc).toContain("openclaw-wsl-path-guard");
    expect(log).toContain("corepack enable");
    expect(log).toContain("npm install -g openclaw");
  });

  it("does not re-propose node, pnpm, or openclaw once WSL-native tools are ready", () => {
    fs.mkdirSync(fakeBin, { recursive: true });
    fs.mkdirSync(path.join(fakeHome, ".nvm", "versions", "node", "v24.14.1", "bin"), { recursive: true });

    const wslFakeBin = toWslPath(fakeBin);
    const wslFakeHome = toWslPath(fakeHome);
    const wslNodeDir = `${wslFakeHome}/.nvm/versions/node/v24.14.1/bin`;

    fs.writeFileSync(
      path.join(fakeHome, ".nvm", "nvm.sh"),
      `nvm() {
  if [[ "$1" == "use" ]]; then
    export PATH="${wslNodeDir}:$PATH"
  fi
  return 0
}
export PATH="${wslNodeDir}:$PATH"
`,
      "utf8",
    );
    fs.writeFileSync(path.join(fakeHome, ".nvm", "bash_completion"), "", "utf8");
    fs.writeFileSync(
      path.join(fakeHome, ".bashrc"),
      `# >>> openclaw-wsl-path-guard >>>
PATH="/home/kaduiro/.nvm/versions/node/v24.14.1/bin:$PATH"
# <<< openclaw-wsl-path-guard <<<
`,
      "utf8",
    );
    fs.writeFileSync(path.join(fakeBin, "docker"), "#!/usr/bin/env bash\necho docker\n", { mode: 0o755 });
    fs.writeFileSync(path.join(fakeBin, "cmd.exe"), "#!/usr/bin/env bash\necho C:\\\\Users\\\\akkun\n", { mode: 0o755 });
    fs.writeFileSync(
      path.join(fakeBin, "wslpath"),
      `#!/usr/bin/env bash
if [[ "$1" == "C:\\\\Users\\\\akkun" ]]; then
  echo "/mnt/c/Users/akkun"
else
  echo "$1"
fi
`,
      { mode: 0o755 },
    );
    fs.writeFileSync(path.join(fakeBin, "dpkg"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
    fs.writeFileSync(path.join(fakeBin, "node"), "#!/usr/bin/env bash\necho v24.14.1\n", { mode: 0o755 });
    fs.writeFileSync(path.join(fakeHome, ".nvm", "versions", "node", "v24.14.1", "bin", "pnpm"), "#!/usr/bin/env bash\necho 9.15.9\n", { mode: 0o755 });
    fs.writeFileSync(path.join(fakeHome, ".nvm", "versions", "node", "v24.14.1", "bin", "openclaw"), "#!/usr/bin/env bash\necho OpenClaw 2026.3.31\n", { mode: 0o755 });

    const output = runInWsl(
      repoRoot,
      `HOME="${wslFakeHome}" PATH="${wslFakeBin}:${wslNodeDir}:$PATH" bash scripts/bootstrap-wsl.sh --dry-run`,
    );

    expect(output).not.toContain("Install Node.js LTS");
    expect(output).not.toContain("Enable pnpm via corepack");
    expect(output).not.toContain("Install OpenClaw CLI in WSL");
  });
});
