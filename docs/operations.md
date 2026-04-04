# Operations

## 初期セットアップ

標準運用は WSL2 上の Ubuntu を前提にします。
Windows の Git Bash 実行と Windows 側 npm global shim の流用は非対応です。

1. WSL を起動します。
2. repo に移動します。

```bash
cd /mnt/c/Users/akkun/kaduiro/Openclaw
```

3. `bash scripts/bootstrap-wsl.sh --dry-run` を実行し、基盤不足を確認します。
4. 実際に WSL 基盤を整える場合は `bash scripts/bootstrap-wsl.sh --yes` を実行します。
5. 念のため `source ~/.bashrc` または新しい WSL シェルを開きます。
6. WSL 内で必須コマンドを確認します。

```bash
node -v
pnpm -v
docker version
openclaw --version
```

7. `.env.example` を `.env` にコピーし、WSL 用の実値に置き換えます。
8. `config/openclaw.json5.example` を `config/openclaw.json5` にコピーします。
9. `bash scripts/doctor-wsl.sh` を実行します。
10. `pnpm install` を実行します。
11. `node src/cli/scaffold-workspace.mjs --workspace ./workspace` を実行します。
12. `bash scripts/healthcheck.sh` を実行します。
13. `bash scripts/dev-start.sh` で gateway を起動します。

`.env` の主要 path は WSL から見える POSIX 絶対パスを使います。

```env
OPENCLAW_REPO_ROOT=/mnt/c/Users/akkun/kaduiro/Openclaw
OPENCLAW_REPO_BIND_ROOT=/mnt/c/Users/akkun/kaduiro/Openclaw
OPENCLAW_WORKSPACE_DIR=/mnt/c/Users/akkun/kaduiro/Openclaw/workspace
OPENCLAW_CONFIG_PATH=/mnt/c/Users/akkun/kaduiro/Openclaw/config/openclaw.json5
OPENCLAW_STATE_DIR=$HOME/.openclaw-personal
```

## 日常運用

日次の基本フローは次の通りです。

1. project brief を `workspace/docs/projects/` に置きます。
2. ラフメモや依頼内容を `workspace/inbox/raw/` に置きます。
3. WSL シェルで `bash scripts/doctor-wsl.sh` を実行し、基盤のズレがないことを確認します。
4. OpenClaw を起動し、Control UI を開きます。
5. 具体的な成果物を依頼し、workspace 内の保存先も明示します。
6. 生成された Markdown を確認し、文書として残すか triage に回します。

## プロジェクト事前調査フロー

これは、このリポジトリにおける主要な開発者向けユースケースです。

1. `workspace/docs/projects/<project-name>.md` を作成します。
2. 必要なら補足メモを `workspace/inbox/raw/` に追加します。
3. WSL シェルで `bash scripts/dev-start.sh` を実行して gateway を起動します。
4. Control UI で事前調査ノートの生成を依頼し、保存先を `workspace/docs/projects/` 配下に指定します。
5. 生成されたノートを確認します。
6. そこから出た next actions を `workspace/tasks/next-actions.md` に転記するか、`workspace/inbox/raw/` に置いて nightly triage に処理させます。

推奨出力ファイル:

```text
workspace/docs/projects/<project-name>-pre-research.md
```

## Cron 登録

- `bash scripts/register-cron.sh` で nightly triage と morning brief のジョブを登録します。
- スクリプトは同名の既存 cron ジョブを探し、可能なら更新します。
- デフォルトスケジュール:
- nightly triage: `0 23 * * *`
- morning brief: `0 7 * * *`
- timezone: `Asia/Tokyo`

## バックアップ

- `bash scripts/backup.sh` を実行すると、ローカル Git バックアップコミットを作成します。
- `BACKUP_REMOTE` と `BACKUP_BRANCH` の両方が設定されていれば、現在の `HEAD` をその remote branch に push します。
- force-push は行いません。

## Break-Glass Host Exec

OpenClaw の config では host exec を有効にしていません。
host 側コマンドを実行する必要がある場合だけ、allowlist された wrapper を使います。

```bash
bash scripts/safe-host-exec.sh healthcheck
```

許可されるのは `config/exec-allowlist.json` にある command id のみです。
allowlist にないものは拒否されます。
これは日常業務ではなく、明示的な承認を伴う例外運用を想定した仕組みです。

## Triage 状態管理

- 処理済み raw file は `workspace/outputs/triage-logs/.processed-files.json` に content hash で記録されます。
- raw file が変更されると、再度 triage 対象になります。
- TODO: archival policy が決まったら `workspace/inbox/processed/` への移動を導入します。

## 復旧

- まず `bash scripts/doctor-wsl.sh` を実行します。WSL の前提が崩れていると `healthcheck` より前で止める設計です。
- `command -v openclaw` が通らない場合は、WSL 内の OpenClaw CLI 導入を確認します。
- `pnpm` や `openclaw` が `/mnt/c/Users/.../AppData/Roaming/npm/` を指す場合は、Windows 側 npm shim を拾っています。`bash scripts/bootstrap-wsl.sh --yes` を再実行し、必要なら `source ~/.bashrc` を実行します。
- `docker version` が通らない場合は、Docker Desktop の WSL integration を確認します。
- `wsl` 起動時に `.wslconfig` の unknown key 警告が出る場合は、`.wslconfig` の `wsl2.autoMemoryReclaim` のような不正キーを修正します。
- `nvm` は入っているのに `node` が通らない場合は、shell 未再読み込みです。`source ~/.bashrc` を試し、その後に `bash scripts/doctor-wsl.sh` を再実行します。
- `bootstrap-wsl.sh --yes` を 2 回目に実行しても Node / pnpm / OpenClaw の導入が毎回再提案される場合は異常です。`bash scripts/doctor-wsl.sh` を実行し、`Shell not reloaded` か `Windows shim contamination` のどちらかを確認します。
- `.env` に Windows path を入れてしまった場合は、`/mnt/c/...` 形式へ修正します。
- `bash scripts/healthcheck.sh` で bind path エラーが出る場合は、`OPENCLAW_REPO_ROOT` と `OPENCLAW_REPO_BIND_ROOT` の両方が WSL の POSIX 絶対パスか確認します。

- cron ジョブの状態が崩れたら `bash scripts/register-cron.sh` を再実行します。
- workspace contract が崩れたら `node src/cli/scaffold-workspace.mjs --workspace ./workspace` を再実行します。
- brief や triage の出力が不自然な場合は、次を確認します。
- `workspace/outputs/triage-logs/`
- `workspace/memory/daily/`
- `workspace/tasks/next-actions.md`
