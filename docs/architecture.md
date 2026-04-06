# Architecture

## 目的

このリポジトリは、OpenClaw 自体を再実装せずに、単一ユーザー向けの OpenClaw Personal Workspace を構築するための雛形です。
制御面は OpenClaw Gateway と Control UI をそのまま利用します。
`./workspace` 配下の Markdown workspace は個人用 Vault の正本であり、そのまま Obsidian で開くことを想定しています。

## システム構成

- OpenClaw Gateway は公式 `openclaw` CLI により外部で起動します。
- このリポジトリは config、workspace 初期化ファイル、deterministic job runner、health check、テストを提供します。
- OpenClaw の agent workspace は `./workspace` です。
- workspace mount は OpenClaw 標準の sandbox mount に委ね、通常 agent は repo root に触れません。
- sandbox の workdir は `/workspace` のままにし、Markdown の出力が personal vault 内に収まるようにします。
- deterministic job runner は通常 agent の sandbox とは分離し、明示ランナーまたはホスト側の実行経路で扱います。

## データフロー

### Nightly Triage

1. OpenClaw cron が `23:00 Asia/Tokyo` に isolated agent turn を起動します。
2. workspace skill が agent に `inbox/raw/**/*.md` をレビューさせます。
3. `## Memory` と通常の箇条書きから memory 候補を抽出します。
4. `## Next Actions` と未完了タスクから next actions を抽出します。
5. 結果を `memory/daily/YYYY-MM-DD.md` と `tasks/next-actions.md` に追記します。
6. `outputs/triage-logs/YYYY-MM-DD.md` に triage log を出力します。
7. `outputs/triage-logs/.processed-files.json` を更新し、未変更の raw file の重複処理を防ぎます。

### Morning Brief

1. OpenClaw cron が `07:00 Asia/Tokyo` に isolated agent turn を起動します。
2. workspace skill が前日の daily memory と現在の next-actions file を読みます。
3. 固定セクション構成で `outputs/morning-briefs/YYYY-MM-DD.md` を出力します。

## セキュリティ方針

- Control UI は loopback にのみ bind します。
- Gateway 認証は token mode のみを使います。
- `dangerouslyDisableDeviceAuth` は明示的に無効です。
- OpenClaw config では elevated host exec を無効にしています。
- host 側の緊急実行は `scripts/safe-host-exec.sh` と静的 allowlist に限定します。
- このテンプレートでは Control UI を公開インターネットに露出せず、unrestricted host execution も有効にしません。

## 将来拡張

- deterministic job runner と workspace format はチャネル非依存なので、将来 LINE plugin を追加できます。
- 追加の定期実行 skill も、workspace-only の入出力契約を守る限り同じ運用パターンで追加できます。
- Vault 構成を変えずに、memory search、remote delivery、plugin ごとの routing を追加できます。
