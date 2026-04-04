# OpenClaw Personal Workspace

このリポジトリは、単一ユーザー向けの OpenClaw Personal Workspace を構築するための雛形です。
OpenClaw 本体は同梱せず、再実装もしません。
実行環境は Linux または WSL2 上の公式 `openclaw` CLI を前提とし、初期 UI は OpenClaw Control UI を利用します。
標準運用は WSL2 上の Ubuntu で行い、Windows の Git Bash 実行は非対応です。

## このリポジトリの目的

このリポジトリは、開発者 1 人が専用の OpenClaw workspace を持ち、次のような運用をしたい場合に使います。

- リクエストやメモを Markdown で蓄積する
- 軽量な memory と next actions をリポジトリ内で管理する
- morning brief と nightly triage を自動生成する
- 担当プロジェクトに着手する前の事前調査を支援する

想定利用者はエンドユーザーではなく開発者です。
利用の中心は OpenClaw Control UI と `./workspace` 配下の Markdown workspace です。

## リポジトリ構成

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

## 前提条件

- `bash` が使える Linux または WSL2
- 推奨 distro は `Ubuntu on WSL2`
- Node.js 20 以上
- `pnpm`
- Docker
- 公式 `openclaw` CLI を別途インストール済みであること
- `GEMINI_API_KEY` として利用できる Gemini API キー

## 標準実行環境

このリポジトリの標準実行環境は WSL2 です。
以後のコマンドは Windows の `cmd` や Git Bash ではなく、WSL シェル上で実行してください。

Windows 側で repo を保持し、WSL から次のパスで作業する前提にします。

```bash
cd /mnt/c/Users/akkun/kaduiro/Openclaw
```

Git Bash と Windows ネイティブ OpenClaw を混在させると、次の問題が起きやすくなります。

- Docker bind に必要な POSIX path が `C:/...` に解釈される
- `openclaw config validate` と repo 独自 validator の結果がずれる
- npm 経由の `openclaw` shim が `node` や module path を不安定に解決する

このため、標準手順は WSL で統一します。
Windows 側の `node`、`pnpm`、`openclaw` の npm global shim を WSL から拾う構成も非対応です。

## セットアップ

### 1. WSL を起動して repo に移動する

Windows Terminal などから WSL を起動し、repo に移動します。

```bash
wsl
cd /mnt/c/Users/akkun/kaduiro/Openclaw
```

### 2. WSL bootstrap を実行する

まず、WSL 側の基盤不足を確認し、必要な導入順を把握します。

```bash
bash scripts/bootstrap-wsl.sh --dry-run
```

表示された内容をそのまま段階実行したい場合は、次を使います。

```bash
bash scripts/bootstrap-wsl.sh --yes
```

`bootstrap-wsl.sh --yes` は、WSL 側の profile guard を導入し、同一シェルで `nvm`、Node LTS、`corepack`、`pnpm`、`openclaw` まで完走する前提です。
完了後に古い PATH が残る場合だけ、保険として次を実行してください。

```bash
source ~/.bashrc
```

正常系の再実行では、未完了の項目だけが残ります。
2 回目以降も `Install Node.js LTS` や `Install OpenClaw CLI in WSL` が毎回出る場合は異常で、`bash scripts/doctor-wsl.sh` で状態を確認してください。

### 3. 必須コマンドを確認する

次のコマンドが WSL 内で通ることを確認します。

```bash
node -v
pnpm -v
docker version
openclaw --version
```

`openclaw` が見つからない場合は、WSL 内で公式インストール手順を実行してください。
このリポジトリでは Windows 側 installer ではなく、WSL 内の OpenClaw CLI を標準とします。

### 4. WSL doctor を実行する

`node`、`pnpm`、`openclaw`、`docker`、`.wslconfig`、`.env` の整合性を確認します。

```bash
bash scripts/doctor-wsl.sh
```

### 5. 依存関係をインストールする

```bash
pnpm install
```

### 6. ローカル環境設定ファイルを作成する

```bash
cp .env.example .env
```

### 7. `.env` を WSL 実行用に設定する

少なくとも次の値を設定します。

- `OPENCLAW_GATEWAY_TOKEN`
- `GEMINI_API_KEY`
- `OPENCLAW_REPO_ROOT`
- `OPENCLAW_REPO_BIND_ROOT`
- `OPENCLAW_WORKSPACE_DIR`
- `OPENCLAW_CONFIG_PATH`
- `OPENCLAW_STATE_DIR`

WSL 標準運用では、repo や config の path は WSL から見える POSIX 絶対パスで統一します。

例:

```env
OPENCLAW_GATEWAY_TOKEN=十分に長いランダム文字列
GEMINI_API_KEY=あなたのGemini APIキー
OPENCLAW_TIMEZONE=Asia/Tokyo
OPENCLAW_MODEL_PRIMARY=google/gemini-2.5-flash
OPENCLAW_MODEL_FALLBACK=google/gemini-2.5-pro
OPENCLAW_REPO_ROOT=/mnt/c/Users/akkun/kaduiro/Openclaw
OPENCLAW_REPO_BIND_ROOT=/mnt/c/Users/akkun/kaduiro/Openclaw
OPENCLAW_WORKSPACE_DIR=/mnt/c/Users/akkun/kaduiro/Openclaw/workspace
OPENCLAW_STATE_DIR=$HOME/.openclaw-personal
OPENCLAW_CONFIG_PATH=/mnt/c/Users/akkun/kaduiro/Openclaw/config/openclaw.json5
BACKUP_REMOTE=
BACKUP_BRANCH=main
NIGHTLY_TRIAGE_CRON="0 23 * * *"
MORNING_BRIEF_CRON="0 7 * * *"
```

### 8. OpenClaw 用 config 雛形をコピーする

```bash
cp config/openclaw.json5.example config/openclaw.json5
```

### 9. workspace を生成または補完する

```bash
node src/cli/scaffold-workspace.mjs --workspace ./workspace
```

### 10. health check を実行する

```bash
bash scripts/healthcheck.sh
```

### 11. OpenClaw Gateway と Control UI を起動する

```bash
bash scripts/dev-start.sh
```

### 12. cron ジョブを登録する

```bash
bash scripts/register-cron.sh
```

### 13. Control UI を確認する

Control UI を開き、personal workspace にアクセスできることを確認します。

デフォルト URL:

```text
http://127.0.0.1:18789/openclaw
```

## 初回確認チェックリスト

セットアップ後、実運用に入る前に次を確認してください。

- `bash scripts/bootstrap-wsl.sh --dry-run` が不足を正しく案内する
- `bash scripts/bootstrap-wsl.sh --yes` 後に `node -v`, `pnpm -v`, `openclaw --version` が WSL 側コマンドとして通る
- `bash scripts/doctor-wsl.sh` が成功する
- `bash scripts/healthcheck.sh` が成功する
- Control UI がローカルで開く
- `workspace/` をそのまま Obsidian で開ける
- `bash scripts/register-cron.sh` がエラーなく完了する
- `pnpm test` が成功する

## このリポジトリの使い方

日常的な運用フローは次の通りです。

1. まず context を workspace に置きます。

   例:

   - プロジェクト情報を `workspace/docs/projects/` に置く
   - 単発の依頼やメモを `workspace/inbox/raw/` に置く

2. WSL シェルで OpenClaw を起動します。

   ```bash
   bash scripts/dev-start.sh
   ```

3. Control UI を開き、具体的なタスクを依頼します。

   典型的な依頼:

   - プロジェクトの現状を要約する
   - 実装前の事前調査メモを作る
   - メモの塊から next actions を抽出する

4. 出力を確認し、workspace に保存します。

   推奨保存先:

   - 再利用するプロジェクトメモ: `workspace/docs/projects/`
   - 後で triage するための生メモ: `workspace/inbox/raw/`
   - 確定した next actions: `workspace/tasks/next-actions.md`

5. deterministic job を手動実行するか、cron に任せます。

   ```bash
   node src/cli/nightly-triage.mjs --workspace ./workspace
   node src/cli/morning-brief.mjs --workspace ./workspace
   ```

## Workspace 構成

`./workspace` は個人用 Vault の正本です。
そのまま Obsidian で開いて使います。
主要なファイルとディレクトリ:

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

## Raw Inbox の記法

`workspace/inbox/raw/*.md` は deterministic に解析されます。
次の軽量ルールを使ってください。

- `## Memory`
- daily memory に入れたい箇条書きや短文を書く
- `## Next Actions`
- `tasks/next-actions.md` に追記したい `- [ ]` または `-` の項目を書く
- その見出しの外にある未完了タスクも next action として扱われます

例:

```md
# Capture 2026-03-31

## Memory
- プロジェクトメモのバックアップ頻度を見直す必要がある。

## Next Actions
- [ ] backup remote の権限を確認する。
- [ ] 毎週の cleanup メモを追加する。
```

## Nightly Triage

nightly triage ジョブは次を行います。

- `workspace/inbox/raw/**/*.md` を読む
- memory 候補を抽出する
- next actions を追記する
- `workspace/outputs/triage-logs/YYYY-MM-DD.md` を出力する
- 処理済みファイルの状態ログを更新する

手動実行:

```bash
node src/cli/nightly-triage.mjs --workspace ./workspace
```

## Morning Brief

morning brief ジョブは次を行います。

- 前日の daily memory を読む
- `workspace/tasks/next-actions.md` を読む
- `workspace/outputs/morning-briefs/YYYY-MM-DD.md` を出力する

手動実行:

```bash
node src/cli/morning-brief.mjs --workspace ./workspace
```

## 主ユースケース: 担当プロジェクト着手前の事前調査

これは、開発者が実装に入る前に OpenClaw にプロジェクトの文脈を調べてもらいたいときの標準フローです。

### 1. 元資料を用意する

`workspace/docs/projects/` に project brief を作成または更新します。
推奨ファイル名:

```text
workspace/docs/projects/<project-name>.md
```

少なくとも次を入れてください。

- プロジェクト名
- 関連するリポジトリ名やサービス名
- ビジネス上の目的
- 既知の制約
- 調べてほしい論点や質問

ラフメモ、会議メモ、チケット抜粋がある場合は、Markdown として `workspace/inbox/raw/` に置きます。

### 2. workspace を起動する

```bash
bash scripts/dev-start.sh
```

その後、`http://127.0.0.1:18789/openclaw` で Control UI を開きます。

### 3. OpenClaw に事前調査を依頼する

推奨プロンプト:

```text
workspace/docs/projects/<project-name>.md の project brief を使って事前調査ノートを作成してください。
プロジェクトの目的、想定されるアーキテクチャ、既知のリスク、未解決の論点、直近の next actions を要約してください。
結果は workspace/docs/projects/<project-name>-pre-research.md に保存してください。
workspace/inbox/raw/ に関連メモがあれば、あわせて確認対象に含めてください。
```

### 4. 出力をレビューする

有用な事前調査ノートには、少なくとも次が含まれているべきです。

- 短いプロジェクト要約
- 重要なシステムや依存関係
- 次に読むべき資料やコード
- 未解決の論点
- 具体的な next actions

推奨出力先:

```text
workspace/docs/projects/<project-name>-pre-research.md
```

### 5. 結果を workspace に戻す

事前調査の結果として follow-up task が出た場合は、次のいずれかで扱います。

- `workspace/tasks/next-actions.md` に直接追加する
- `workspace/inbox/raw/` に保存して nightly triage に抽出させる

### 6. 同じ流れを繰り返せるようにする

新しい担当が来ても、同じ整理ルールを使います。

- brief は `workspace/docs/projects/` に置く
- 単発メモは `workspace/inbox/raw/` に置く
- 再利用する調査結果は `workspace/docs/projects/` に残す
- 実行項目は `workspace/tasks/next-actions.md` に寄せる

## OpenClaw Config

`config/openclaw.json5.example` は OpenClaw の公式ドキュメントに沿って次の方針で作っています。

- `gateway.bind: "loopback"`
- `gateway.auth.mode: "token"`
- `controlUi.enabled: true`
- `dangerouslyDisableDeviceAuth: false`
- Docker sandbox を有効化
- repo root を `OPENCLAW_REPO_BIND_ROOT` 経由で sandbox 内の `/repo` にマウント
- workspace skill は `workspace/skills` から読み込む

Gemini モデルは環境変数で設定し、`google/gemini-2.5-flash` のような provider ref を使います。

WSL 標準運用では、`OPENCLAW_REPO_ROOT` と `OPENCLAW_REPO_BIND_ROOT` はどちらも `/mnt/c/...` のような POSIX 絶対パスに揃えます。
Windows ネイティブ path と Git Bash path を混在させるのは標準手順に含めません。

## Safe Exec 方針

このテンプレートは sandbox-first です。

- 通常の自動処理は OpenClaw sandbox 内で実行する
- OpenClaw の elevated host exec は config 上で無効のままにする
- host 実行が必要な場合は `scripts/safe-host-exec.sh <command-id>` のみを使う
- 実行できるのは `config/exec-allowlist.json` の静的 allowlist にあるものだけ
- host 側の break-glass 操作は明示的な承認を前提にする

意図的に採用していない危険な近道:

- `dangerouslyDisableDeviceAuth`
- unrestricted host exec
- Control UI の公開インターネット露出

## 開発起動と本番起動

- `bash scripts/dev-start.sh`
- `.env` を読み込む
- health check を実行する
- `openclaw gateway` を起動する
- `bash scripts/prod-start.sh`
- 完全な `.env` が必須
- 値が不足していれば即座に失敗させる

## バックアップ

実行:

```bash
bash scripts/backup.sh
```

動作:

- 変更がある場合はローカルに Git バックアップコミットを作る
- `BACKUP_REMOTE` と `BACKUP_BRANCH` があれば push する
- force-push はしない

## テスト

全テスト実行:

```bash
pnpm test
```

テスト種別ごとの実行:

```bash
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

主なテスト対象:

- config の読み込みと検証
- workspace template の完全性
- nightly triage の出力
- morning brief の出力
- safe exec の allowlist 拒否
- 起動フローと cron 登録フロー

関連ドキュメント:

- `docs/operations.md`: 日常運用手順
- `docs/architecture.md`: システム構成
- `docs/use-cases.md`: 開発者向けの具体的な利用例

## トラブルシューティング

- `openclaw` が見つからない場合は、まず `bash scripts/bootstrap-wsl.sh --dry-run` と `bash scripts/doctor-wsl.sh` を実行し、WSL 内の CLI 導入手順に従ってください。
- `docker` が WSL から見えない場合は、Docker Desktop の WSL integration を有効化し、WSL 側で `docker version` が通ることを確認してください。
- `pnpm` や `openclaw` が `/mnt/c/Users/.../AppData/Roaming/npm/` を指している場合は、Windows 側 npm shim を拾っています。`bash scripts/bootstrap-wsl.sh --yes` を実行し、必要なら `source ~/.bashrc` で profile guard を反映してください。
- `wsl` 起動時に `.wslconfig` の unknown key 警告が出る場合は `bash scripts/doctor-wsl.sh` を実行し、修正例に従って `.wslconfig` を直してください。
- `nvm` 導入後なのに `node -v` が通らない場合は、`bash scripts/doctor-wsl.sh` を実行してください。doctor は「未導入」ではなく「shell 未再読み込み」を区別して案内します。
- `bootstrap-wsl.sh --yes` を再実行しても毎回 `Install Node.js LTS` や `Install OpenClaw CLI in WSL` が出る場合は、interactive shell の PATH か profile guard が壊れています。`bash scripts/doctor-wsl.sh` を実行して分類済みメッセージを確認してください。
- `.env` に `C:/...` や `/c/...` を入れている場合は、WSL 標準手順に合わせて `/mnt/c/...` へ修正してください。
- `bash scripts/healthcheck.sh` で bind path エラーが出る場合は、`OPENCLAW_REPO_BIND_ROOT` と `OPENCLAW_REPO_ROOT` が WSL 側 POSIX 絶対パスになっているか確認してください。
- cron ジョブを手動で変更した場合は `bash scripts/register-cron.sh` を再実行してください。
- workspace のファイルが欠けている場合は `node src/cli/scaffold-workspace.mjs --workspace ./workspace` を再実行してください。
