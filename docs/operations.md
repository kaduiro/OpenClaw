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
9. `bash scripts/build-sandbox-image.sh` を実行し、`openclaw-sandbox:bookworm-python` を作成します。
10. `bash scripts/doctor-wsl.sh` を実行します。
11. `pnpm install` を実行します。
12. `node src/cli/scaffold-workspace.mjs --workspace ./workspace` を実行します。
13. `bash scripts/healthcheck.sh` を実行します。
14. `bash scripts/dev-start.sh` で gateway を起動します。

`.env` の主要 path は WSL から見える POSIX 絶対パスを使います。

```env
OPENCLAW_REPO_ROOT=/mnt/c/Users/akkun/kaduiro/Openclaw
OPENCLAW_WORKSPACE_DIR=/mnt/c/Users/akkun/kaduiro/Openclaw/workspace
OPENCLAW_CONFIG_PATH=/mnt/c/Users/akkun/kaduiro/Openclaw/config/openclaw.json5
OPENCLAW_STATE_DIR=$HOME/.openclaw-personal
OPENCLAW_SANDBOX_IMAGE=openclaw-sandbox:bookworm-python
```

## 日常運用

日次の基本フローは次の通りです。

1. project brief を `workspace/docs/projects/` に置きます。
2. ラフメモや依頼内容を `workspace/inbox/raw/` に置きます。
3. WSL シェルで `bash scripts/doctor-wsl.sh` を実行し、基盤のズレがないことを確認します。
4. OpenClaw を起動し、Control UI を開きます。
5. 具体的な成果物を依頼し、workspace 内の保存先も明示します。
6. 生成された Markdown を確認し、文書として残すか triage に回します。

## AI 秘書運用の前提

このリポジトリは、独自チャット UI を作るためのものではなく、workspace を正本として OpenClaw に作業させるための運用基盤です。
そのため、AI 秘書として成立させるには次の役割分担を最初に固定します。

Control UI 起動後の標準フロー、quota 制約を前提にした依頼の切り方、複数案件の管理方法は `docs/ai-secretary-operations.md` に切り出しています。
このファイルでは全体運用と復旧を扱い、AI 秘書としての仕事の流し方は専用ガイドを正本にします。

- `workspace/docs/projects/`
  長く残すプロジェクト知識、brief、事前調査ノート
- `workspace/inbox/raw/`
  未整理メモ、会議メモ、Slack 抜粋、思いつき、調査してほしい論点
- `workspace/tasks/next-actions.md`
  実行が確定した行動
- `workspace/memory/daily/`
  その日の学び、判断、重要メモ
- `workspace/outputs/morning-briefs/`
  朝の brief
- `workspace/outputs/triage-logs/`
  夜の triage 結果

この運用では、Control UI の会話内容を正本にしません。
正本は常に `workspace/` 配下の Markdown です。

`ogawa-kogyo-hp` 案件では、次を正本と成果物にします。

- 正本:
  - `workspace/docs/projects/ogawa-kogyo-hp.md`
- 調査結果:
  - `workspace/docs/projects/ogawa-kogyo-hp-pre-research.md`

対象 repo 側の `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/docs/` は参考資料置き場であり、OpenClaw 側の正本にはしません。

Control UI からファイルを指定するときは、workspace root 相対で書きます。
つまり `workspace/docs/projects/...` ではなく `docs/projects/...`、`workspace/inbox/raw/...` ではなく `inbox/raw/...` を使います。

## Control UI 起動後の標準手順

Control UI が開ける状態から、AI 秘書運用へ入る手順は次です。

1. `workspace/AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `MEMORY.md` をあなたの運用に合わせて埋めます。
2. `workspace/docs/projects/<project-name>.md` として案件の正本を作ります。
3. 補足メモや会議メモを `workspace/inbox/raw/` に置きます。
4. Control UI で「保存先付き」の依頼を出します。
5. 生成された成果物を `workspace/docs/projects/` に残すか、`workspace/inbox/raw/` に戻して triage に回します。
6. `bash scripts/register-cron.sh` を実行し、nightly triage と morning brief を自動化します。

## まず埋めるべき workspace ファイル

### `workspace/AGENTS.md`

この workspace を AI 秘書としてどう使うかを書きます。

例:

- 単一ユーザー向けの AI 秘書として振る舞う
- 生成物は Markdown で残す
- 独自 UI を作らず OpenClaw Control UI を使う
- 保存先を明示されない成果物は作らない

### `workspace/SOUL.md`

出力の姿勢と禁止事項を書きます。

例:

- 調査結果は根拠、未解決点、次アクションを分けて書く
- 危険な host exec を使わない
- 憶測と事実を混ぜない
- あとで人間が読める Markdown を優先する

### `workspace/USER.md`

あなた個人の好みを書きます。

例:

- 日本語で出力
- 先に結論、その後に論点整理
- 実装前調査では「読むべきコード」「読むべき資料」を明記
- next actions は短いチェックリスト形式

### `workspace/TOOLS.md`

実行ポリシーを書きます。

例:

- sandbox-first
- host 実行は allowlist のみ
- 外部操作は明示承認前提

### `workspace/MEMORY.md`

memory の索引として使います。
大量の本文を書く場所ではなく、daily memory と outputs の入口です。

## project brief の作り方

最低限、各プロジェクトごとに 1 つ正本を作成します。

推奨ファイル:

```text
workspace/docs/projects/<project-name>.md
```

このファイルは「長く残す知識 + current brief」の統合文書として扱います。

最低限の構成:

- プロジェクト名
- 目的
- 関連 repo / 関連サービス
- 制約
- 調べてほしい論点
- いま困っていること

`ogawa-kogyo-hp` の例:

```md
# ogawa-kogyo-hp

## Overview
- 小川工業株式会社のコーポレートサイト改善案件

## Repositories
- C:/Users/akkun/kaduiro/ogawa-kogyo-hp
- theme/ogawa-corp
- theme/home5
- theme/header-footer

## Constraints
- route 変更は Simply Static 影響を確認する
- 共有コンポーネントへの波及は避ける

## Current Questions
- `/works/` を歴史ページとして再整理するべきか
- `theme/ogawa-corp` と docs 記述の差分は何か
- 主要テンプレートと共通 CSS / JS をどう把握するべきか
```

## raw inbox の使い方

`workspace/inbox/raw/` には、整理前の材料をそのまま入れます。

入れてよいもの:

- 会議メモ
- Slack 抜粋
- Issue やチケットのメモ
- 断片的な TODO
- 調査してほしい技術論点

推奨形式:

```md
# 2026-04-04-ogawa-kogyo-hp-notes

## Memory
- `theme/ogawa-corp` が主対象だが、README の `ogawa-renew` 記述とずれている。
- `/works/` は Strength と History の扱いが論点。

## Next Actions
- [ ] `/works/` 関連テンプレートを確認する
- [ ] `theme/home5` と `theme/header-footer` の再利用余地を確認する
```

用途別の最小テンプレートは次です。

- 未整理メモ:
  - 断片と気づきを `## Memory` に書く
- 会議メモ:
  - `## Decisions`
  - `## Open Questions`
  - `## Next Actions`
- Slack 抜粋:
  - `## Context`
  - `## Memory`
  - `## Next Actions`
- 思いつき:
  - 仮説を `## Memory` に書き、検証項目を `## Next Actions` に置く
- 調査依頼:
  - `## Questions`
  - `## Expected Output`

## Control UI での依頼テンプレート

成果物は保存先まで指定して依頼します。

### `ogawa-kogyo-hp` の現状要約

```text
docs/projects/ogawa-kogyo-hp.md を読んで、
プロジェクトの目的、主要コンポーネント、制約、未解決論点を要約してください。
結果は docs/projects/ogawa-kogyo-hp-summary.md に保存してください。
```

### `ogawa-kogyo-hp` の実装前事前調査

```text
docs/projects/ogawa-kogyo-hp.md を使って事前調査ノートを作成してください。
目的、想定アーキテクチャ、技術的リスク、最初に読むべきコード、未解決論点、次アクションを整理し、
docs/projects/ogawa-kogyo-hp-pre-research.md に保存してください。
inbox/raw/ に関連メモがあれば参照してください。
```

### `ogawa-kogyo-hp` の生メモから next actions を整理

```text
inbox/raw/ の ogawa-kogyo-hp 関連メモを読み、
daily memory に残す候補と、tasks/next-actions.md に入れるべき項目を整理してください。
必要な内容は inbox/raw/ に追記せず、既存の deterministic job で扱う前提で助言してください。
```

## 自動化できることと、まだできないこと

現状の unattended job で自動化されるのは次です。

- raw inbox の整理
- memory 候補の抽出
- next actions の更新
- 朝の brief の生成

一方で、次はまだ専用ジョブがありません。

- project brief を定期的に再読して技術調査ログを更新すること
- リポジトリ横断の継続調査バッチ
- research 専用 skill による夜間の新規調査

したがって、現状の AI 秘書運用は「調査そのものは Control UI から依頼し、整理と要約を夜と朝に自動化する」構成です。

## プロジェクト事前調査フロー

これは、このリポジトリにおける主要な開発者向けユースケースです。

1. `workspace/docs/projects/<project-name>.md` を正本として作成します。
2. 必要なら補足メモを `workspace/inbox/raw/` に追加します。
3. WSL シェルで `bash scripts/dev-start.sh` を実行して gateway を起動します。
4. Control UI で事前調査ノートの生成を依頼し、保存先を `workspace/docs/projects/` 配下に指定します。
5. 生成されたノートを確認します。
6. そこから出た next actions を `workspace/tasks/next-actions.md` に転記するか、`workspace/inbox/raw/` に置いて nightly triage に処理させます。

推奨出力ファイル:

```text
docs/projects/<project-name>-pre-research.md
```

## AI 秘書としての日次運用

朝:

- `outputs/morning-briefs/YYYY-MM-DD.md` を読む
- `workspace/tasks/next-actions.md` を確認する
- 当日やることを決める

日中:

- project brief を更新する
- `ogawa-kogyo-hp` なら `workspace/docs/projects/ogawa-kogyo-hp.md` を正本として更新する
- 散発メモを `workspace/inbox/raw/` に入れる
- Control UI で保存先付きの調査や要約を実行する

夜:

- nightly triage が raw inbox を整理する
- daily memory と next actions が更新される

この循環を定着させると、離席中でも少なくともメモ整理、次アクション抽出、朝のブリーフ生成は継続されます。

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
- configured sandbox image に `python3` または `python` が無いと、OpenClaw の mutation helper が事前調査ノートなどの保存時に失敗します。`bash scripts/doctor-wsl.sh` と `bash scripts/healthcheck.sh` で先に検出できるので、`OPENCLAW_SANDBOX_IMAGE` を Python を含む tag に変更します。
- `openclaw-sandbox:bookworm-python` がローカルに無い場合は、`bash scripts/build-sandbox-image.sh` を実行します。標準運用は `bookworm-slim` ではなく `bookworm-python` を前提にします。
- `wsl` 起動時に `.wslconfig` の unknown key 警告が出る場合は、`.wslconfig` の `wsl2.autoMemoryReclaim` のような不正キーを修正します。
- `nvm` は入っているのに `node` が通らない場合は、shell 未再読み込みです。`source ~/.bashrc` を試し、その後に `bash scripts/doctor-wsl.sh` を再実行します。
- `bootstrap-wsl.sh --yes` を 2 回目に実行しても Node / pnpm / OpenClaw の導入が毎回再提案される場合は異常です。`bash scripts/doctor-wsl.sh` を実行し、`Shell not reloaded` か `Windows shim contamination` のどちらかを確認します。
- `.env` に Windows path を入れてしまった場合は、`/mnt/c/...` 形式へ修正します。
- `bash scripts/healthcheck.sh` で sandbox bind エラーが出る場合は、config に custom `docker.binds` が残っていないか確認します。
- Control UI の prompt で `workspace/docs/...` のような path を使うと `/workspace/workspace/...` を探しにいくことがあります。prompt では `docs/projects/...`、`inbox/raw/...`、`tasks/next-actions.md` のような workspace 相対パスを使います。
- Gemini provider の `429` は単なる一時 rate limit だけでなく quota / billing 超過の可能性があります。Google AI Studio 側の利用枠、請求設定、同じ API key を使う他プロセスの消費量を確認します。モデル fallback が動いても、同一 provider quota を共有していれば根本解決しません。
- `openclaw-sandbox:bookworm-slim` しか無い状態では通常運用に進めません。Python 不足で sandbox 内の書き込みが失敗するため、`bash scripts/build-sandbox-image.sh` で `bookworm-python` を先に作成します。

- cron ジョブの状態が崩れたら `bash scripts/register-cron.sh` を再実行します。
- workspace contract が崩れたら `node src/cli/scaffold-workspace.mjs --workspace ./workspace` を再実行します。
- brief や triage の出力が不自然な場合は、次を確認します。
- `workspace/outputs/triage-logs/`
- `workspace/memory/daily/`
- `workspace/tasks/next-actions.md`
