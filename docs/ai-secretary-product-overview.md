# AI秘書プロダクト概要

## 目的

このドキュメントは、OpenClaw Personal Workspace を AI秘書としてどう位置づけるかを、紹介用に整理したものです。
単なるチャット UI ではなく、Markdown を正本にして、調査・要約・整理を継続的に蓄積できる個人向けの知的作業基盤として説明します。

## どんな課題を解くか

日々の開発や調査では、情報が複数の場所に散らばりやすく、あとから再利用できる形にまとまりにくい問題があります。
また、担当プロジェクトへ着手する前に文脈を把握するまでの時間が長くなり、会議メモや思いつきが次アクションへ変換されないまま残ることも少なくありません。

このプロダクトは、そうした断片的な情報を `workspace/` 配下の Markdown に集約し、必要なときに AI に読ませ、成果物として残し、夜間と翌朝の定型処理で整理し続けることを狙います。

## このプロダクトが提供する価値

- Markdown を正本として、プロジェクト brief、調査ノート、未整理メモを一貫した形式で蓄積できる
- Control UI から、要約、事前調査、論点整理のような知的作業を保存先付きで依頼できる
- nightly triage により、raw メモから daily memory 候補と next actions を継続的に抽出できる
- morning brief により、前日の学びと持ち越しタスクを翌朝の再着手点として再構成できる
- 会話履歴に依存せず、再利用可能な知識をファイルとして残せる

## 現在できること

現時点の OpenClaw Personal Workspace は、AI秘書の運用基盤として次を提供します。

- `docs/projects/` を中心に、案件ごとの正本や調査成果物を保存できる
- `inbox/raw/` に置いた未整理メモを、夜間の deterministic job で整理できる
- `tasks/next-actions.md` と `memory/daily/` に、継続的に作業判断の材料を蓄積できる
- morning brief を自動生成し、翌日の作業開始に必要な要点をまとめられる
- Control UI から、実装前の事前調査ノートや要約文書を Markdown として保存できる

## 典型的な利用シーン

典型的な使い方は、担当プロジェクトの brief を `docs/projects/` に置き、関連メモを `inbox/raw/` にため、Control UI から事前調査や要約を依頼する流れです。
日中に生まれたメモや判断材料は夜間に整理され、翌朝には morning brief と next actions を起点に再着手できます。

このため、単発の質問応答よりも、プロジェクト理解の蓄積、メモ整理、再着手支援が重要な場面で効果を発揮します。

## 現在の制約

このプロダクトは、まだ完全自律の研究員ではありません。
重い技術調査や新規の深い分析は、現状では Control UI から明示的に依頼する前提です。

また、離席中に自動で回る処理は、主に整理と要約です。
provider の quota や billing 制約によって、即時の調査依頼が止まる可能性もあるため、運用では依頼粒度の設計が重要になります。

## 今後の展望

今後は、現在の整理基盤を土台にして、より自律的な調査支援へ拡張できます。
具体的には、project brief を起点にした定期的な調査バッチ、知識の再検索性を高める retrieval 強化、依頼内容に応じた routing の改善が候補になります。

あわせて、workspace format を維持したまま、追加チャネルへの展開や plugin ごとの連携を進める余地もあります。
将来的には、個人の Markdown workspace を中心に据えたまま、調査、整理、配信をまたぐ知的作業オーケストレーションへ広げていくことを想定しています。

## 関連ドキュメント

- 運用ガイド: [docs/ai-secretary-operations.md](/mnt/c/Users/akkun/kaduiro/Openclaw/docs/ai-secretary-operations.md)
- システム構成: [docs/architecture.md](/mnt/c/Users/akkun/kaduiro/Openclaw/docs/architecture.md)
- 利用例: [docs/use-cases.md](/mnt/c/Users/akkun/kaduiro/Openclaw/docs/use-cases.md)
