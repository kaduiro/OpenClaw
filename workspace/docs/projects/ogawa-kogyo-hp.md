# ogawa-kogyo-hp

## Overview

- 小川工業株式会社のコーポレートサイト改善を扱う案件。
- OpenClaw 側では、この文書を `ogawa-kogyo-hp` 案件の正本として扱う。
- 長期知識と current brief は分けず、この 1 ファイルに統合する。
- 実装や調査の成果物は `ogawa-kogyo-hp-pre-research.md` などの派生ファイルへ保存する。

## Repositories / Systems

- Main repository:
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp`
- Primary implementation target:
  - `theme/ogawa-corp`
- Related theme areas:
  - `theme/home5`
  - `theme/header-footer`
- WordPress runtime footprint:
  - `wp-content/themes/home`
- Local environment:
  - Docker Compose
  - WordPress
  - Simply Static

## Current Implementation Reality

- 現在の主対象テーマは `theme/ogawa-corp`。
- `theme/home5` と `theme/header-footer` は、過去実装や関連 UI の参照対象として残っている。
- repo 直下の `README.md` には `theme/ogawa-renew` の記述があるが、現時点の実態とは一致していない。
- WordPress 側には `wp-content/themes/home` も存在するため、repo 内のテーマディレクトリと WordPress 実体の差分に注意が必要。
- OpenClaw 側で扱う project brief では、実態を優先し、古い README 記述は参考扱いにする。

## Constraints

- 現行テーマは `theme/ogawa-corp` を正とする。
- route やテンプレート名の変更は、redirect、canonical、Simply Static への影響確認が必要。
- 共有コンポーネントや global styles への波及は避けたい。
- 素材未確定の論点が多いため、仮実装で断定しすぎず、素材待ちと設計判断を分離する。
- OpenClaw 側の正本は `workspace/docs/projects/` に置き、対象 repo 側の `docs/` は参考資料として扱う。

## Current Context

- 現在の中心論点は `/works/` と Strength / History の整合。
- 2026-03-25 の打ち合わせ議事録では、「強み」として独立させるより「歴史」として見せる方向が強い。
- 現在の `/works/` 実装は、抽象的な「強み」や「技術力」をシネマティックに見せる構成に寄っている。
- そのため、会議で固まった意図と現行コードのズレを整理し、何を流用し、何を作り変えるべきかの判断材料が必要。

## Current Questions

- `/works/` を「弊社の強み」ページのまま改善するべきか、それとも「歴史」ページとして再定義するべきか。
- `theme/ogawa-corp` の実装と、repo の `README.md` や docs 記述のどこにズレがあるか。
- `page-strength.php` と `content-works.php` のどの要素が、会議方針とズレているか。
- 既存のシネマティック演出を活かしながら、「継承」「会社の厚み」「時代の流れ」を表現できるか。
- `theme/home5` と `theme/header-footer` で再利用できる UI / CSS / JS はあるか。
- route、テンプレート名、見出し文言の命名ズレを、どこまで修正対象に含めるべきか。
- 更新導線、主要テンプレート、共通 CSS / JS の把握をどの順で進めるべきか。

## Reference Documents

- Target repo reference docs:
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/docs/小川工業HP打ち合わせ 社内共有用まとめ 33091b1bb5a080afa0b2f38481d081b2.md`
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/docs/小川工業HP 31491b1bb5a08082869be6c129901381.md`
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/docs/小川工業（03 25） 33091b1bb5a08027a1c1f036ff53320c.md`
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/docs/THEME_ARCHITECTURE_OGAWA_CORP.md`
- Related code locations:
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/theme/ogawa-corp`
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/theme/home5`
  - `C:/Users/akkun/kaduiro/ogawa-kogyo-hp/theme/header-footer`
- Output note:
  - 詳細な調査結果は `ogawa-kogyo-hp-pre-research.md` に保存する
