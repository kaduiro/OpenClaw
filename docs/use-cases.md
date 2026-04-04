# Use Cases

## 担当プロジェクト着手前の事前調査

### 目的

OpenClaw Personal Workspace を使い、実装に入る前にプロジェクトの理解を短時間で整理し、あとで再利用できる形で残すことを目的とします。

### 使うタイミング

開発者が新しくプロジェクトやタスクを担当し、OpenClaw に次の整理をしてほしいときに使います。

- 現在の文脈を集める
- 重要な点を要約する
- リスクや不明点を洗い出す
- 再利用できる調査ノートを作る

### 入力

workspace に次の入力を用意します。

- `workspace/docs/projects/<project-name>.md`
- 正式な project brief
- `workspace/inbox/raw/<date>-<project-name>-notes.md`
- 単発メモ、チケット抜粋、補足メモ、リマインダー

### 推奨する Project Brief テンプレート

```md
# <Project Name>

## Purpose
- このプロジェクトの目的

## Systems
- 関連リポジトリ
- 関連サービス
- 担当チームやオーナー

## Constraints
- 期限
- セキュリティやコンプライアンス上の制約
- 技術的な制約

## Questions
- 未解決の点
- 先に調べるべき点
```

### 実行手順

1. `bash scripts/dev-start.sh` で workspace を起動します。
2. Control UI を開きます。
3. project brief と関連する raw notes を参照して調査するよう OpenClaw に依頼します。
4. 再利用可能な調査ノートを `workspace/docs/projects/` に保存するよう指示します。
5. 出力されたノートを人手で確認します。
6. そこから出たアクションを `workspace/tasks/next-actions.md` または `workspace/inbox/raw/` に移します。

### 推奨プロンプト

```text
workspace/docs/projects/<project-name>.md と、workspace/inbox/raw/ 内の関連メモを参照してください。
開発者が実装に入る前の事前調査ノートを作成してください。
次を含めてください。
- プロジェクトの目的
- 想定されるアーキテクチャまたはサブシステムの整理
- 重要な依存関係
- リスクと不明点
- 先に読むべき順序
- 直近の next actions
結果は workspace/docs/projects/<project-name>-pre-research.md に保存してください。
```

### 完了条件

次の状態になれば、このユースケースは完了です。

- 再利用可能な調査ノートが `workspace/docs/projects/` にある
- 開発者が次に読むべき対象を判断できる
- リスクと不明点が明示されている
- next actions が workspace に取り込まれている

### その後の運用

事前調査ノートを確認した後は、次の方針で運用します。

- 再利用価値のある知見は `workspace/docs/projects/` に残す
- 整理前のメモは `workspace/inbox/raw/` に置き、nightly triage に拾わせる
- 翌日の carry-over work は morning brief で確認する
