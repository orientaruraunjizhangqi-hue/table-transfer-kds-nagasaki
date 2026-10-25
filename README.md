# 卓移動 KDS — 長崎店専用（クラシック・ベージュテーマ）

長崎店専用の卓移動プッシュオーダーシステムです。
古い iPad（iOS 9 / 10 の Safari）から最新のタブレット・スマホ・PC までリアルタイムに同期します。

- 公開URL: https://orientaruraunjizhangqi-hue.github.io/table-transfer-kds-nagasaki/
- データ保存先: Firebase Realtime Database (`/kds/stores/nagasaki`)
  - 既存の京都・神戸・天満のシステムとはリポジトリもデータ領域も完全に独立しています。

## 初期登録の卓配置（6行×5列 フロアレイアウト）
```
A1   —   B1  B2  B3
A3  A4   A5  A6  B4
S5  S4   S3  B5   —
S6  S2   S1  B6   —
S7  O2   O1  V1   —
V5  V4   V3  V2   —
```
- オーダー発行画面では、この6行×5列の配置のまま直感的に移動元・移動先をタップできます。
- 「卓管理」から卓の追加・削除・色変更や、「初期の24卓に戻す」リセットも可能です。
