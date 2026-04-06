# AI 秘書運用ガイド

## 概要

このドキュメントは、OpenClaw Personal Workspace を AI 秘書として安定運用するための実務ガイドです。
対象は Control UI を起動できる状態まで到達したあとで、何を `workspace/` に置き、どう依頼し、どこへ保存し、どう夜間整理へつなぐかを判断したい場面です。

このリポジトリでは、Control UI の会話履歴を正本にしません。
正本は常に `workspace/` 配下の Markdown です。

## 現状認識

### いま到達している状態

- Control UI から embedded agent を起動できる
- `docs/...` と `inbox/raw/...` のような workspace 相対 path で read / write できる
- `docs/projects/ogawa-kogyo-hp-pre-research.md` のような成果物を Control UI 経由で更新できる
- 以前の sandbox bind 衝突、reserved path、Python 不足は通常運用上の blocker ではなくなっている
- nightly triage と morning brief による整理・要約の補助処理は動く構成になっている

### まだ制約がある状態

- 技術調査そのものは Control UI から依頼する必要がある
- unattended job は整理と要約が中心で、調査専用 cron はまだない
- Google Gemini provider の quota / billing 超過で、即時調査が止まる可能性がある
- 同一 provider 内の model fallback は quota 超過の根本解決にならない

### 運用上の意味

この構成は「完全自律研究員」ではありません。
正しく位置づけるなら、`workspace/` を正本として、依頼された調査・要約・整理を蓄積し、夜間と朝に deterministic job で整える AI 秘書です。

## 標準運用フロー

### 1. 材料投入

- `docs/projects/<project>.md` を案件正本として更新する
- `inbox/raw/` に未整理メモ、会議メモ、Slack 抜粋、思いつき、調査論点を投入する

### 2. 依頼実行

- Control UI では workspace 相対 path を使う
- 何を作るかだけでなく、保存先まで指定する
- 1 回の依頼で 1 成果物に絞る

例:

```text
docs/projects/ogawa-kogyo-hp.md を正本として読み、inbox/raw/ の ogawa-kogyo-hp 関連メモも参照してください。

ogawa-kogyo-hp の事前調査ノートを作成してください。次を含めてください。
- プロジェクトの目的
- 現在の実装構造
- 主対象テーマと関連テーマの関係
- README 記述と実装実態の差分
- `/works/` と Strength / History の論点
- 最初に読むべきファイル
- リスク
- 未解決点
- 直近の next actions

結果は docs/projects/ogawa-kogyo-hp-pre-research.md に保存してください。
```

### 3. 成果物の確定

- `docs/projects/<project>-pre-research.md` や `docs/projects/<project>-summary.md` を長期成果物として残す
- 直近アクションは `tasks/next-actions.md` に寄せるか、`inbox/raw/` に戻して nightly triage に整理させる

### 4. 夜間整理

- nightly triage が `inbox/raw/` から memory 候補と next actions を抽出する
- morning brief が翌朝の確認起点を `outputs/morning-briefs/` に出力する

## 複数プロジェクト運用

複数案件は、次の単位で管理します。

- 1 プロジェクト = 1 正本
  - `docs/projects/<project>.md`
- 1 調査成果物 = 1 出力ファイル
  - `docs/projects/<project>-pre-research.md`
  - 必要なら `docs/projects/<project>-summary.md`
- raw メモは案件名付き
  - `inbox/raw/YYYY-MM-DD-<project>-notes.md`

運用ルール:

- 長く残す知識と current brief は分けずに `docs/projects/<project>.md` に統合する
- `*-pre-research.md` は成果物であり、次回依頼の正本にはしない
- 横断比較が必要なときだけ、比較用の別ファイルを作る

## quota 制約を前提にした運用

Google Gemini provider では RPM / RPD の quota 超過が即時エラーに直結します。
そのため、AI 秘書運用では上限緩和に頼らず、依頼設計と夜間整理で浪費を抑える前提を取ります。

### 基本ルール

- 1 回の依頼で 1 成果物に絞る
- path 指定と保存先を毎回明示する
- 雑多な論点は `inbox/raw/` にためて、夜間は deterministic job で整理する
- 技術調査は「正本 brief + 関連 raw notes」単位で切って依頼する
- 重い調査を日中に何度も投げ直さない

### 避けるべき運用

- 同じ依頼を path だけ変えて何度も再送する
- 1 回の依頼で複数案件をまとめて調べさせる
- 同一 provider 内 fallback に期待して重い調査を連打する

### 補足

`google/gemini-2.5-flash` から `google/gemini-2.5-pro` への fallback は、同一 provider quota を共有している限り根本解決になりません。
quota 超過が出たら、まず依頼粒度の見直し、raw notes への退避、夜間整理への振り替えを優先します。

## `ogawa-kogyo-hp` の実例

### 正本

- `docs/projects/ogawa-kogyo-hp.md`

### raw メモ

- `inbox/raw/2026-04-04-ogawa-kogyo-hp-unstructured-notes.md`
- `inbox/raw/2026-04-04-ogawa-kogyo-hp-meeting-notes.md`
- `inbox/raw/2026-04-04-ogawa-kogyo-hp-slack-extract.md`
- `inbox/raw/2026-04-04-ogawa-kogyo-hp-ideas.md`
- `inbox/raw/2026-04-04-ogawa-kogyo-hp-research-questions.md`

### 成果物

- `docs/projects/ogawa-kogyo-hp-pre-research.md`

### 何を読ませるか

- 正本の `docs/projects/ogawa-kogyo-hp.md`
- 関連 raw メモ
- 必要に応じて target repo 側の参考資料

### 何を出力させるか

- 目的
- 実装構造
- 主対象テーマと関連テーマの関係
- README と実態の差分
- `/works/` と Strength / History の論点
- 最初に読むべきファイル
- リスク
- 未解決点
- 直近の next actions

### 成功条件

- `docs/projects/ogawa-kogyo-hp-pre-research.md` が更新される
- `/works/`、Strength / History、README 差分、主対象テーマの把握が含まれている
- 次の実装着手に使える next actions が含まれている

### 次につなぐ方法

- すぐやる項目は `tasks/next-actions.md` に転記する
- まだ粗い論点は `inbox/raw/` に残し、nightly triage に整理させる

## AI 秘書としての役割分担

- `docs/projects/`
  - 正本、summary、pre-research などの長期知識
- `inbox/raw/`
  - 整理前の材料
- `tasks/next-actions.md`
  - 実行が確定した行動
- `memory/daily/`
  - 日々の学び、判断、重要メモ
- `outputs/morning-briefs/`
  - 朝の brief
- `outputs/triage-logs/`
  - 夜の整理結果

## 関連ドキュメント

- セットアップと起動: [README.md](/mnt/c/Users/akkun/kaduiro/Openclaw/README.md)
- 日常手順と復旧: [docs/operations.md](/mnt/c/Users/akkun/kaduiro/Openclaw/docs/operations.md)
- 事前調査ユースケース: [docs/use-cases.md](/mnt/c/Users/akkun/kaduiro/Openclaw/docs/use-cases.md)
