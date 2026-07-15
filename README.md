# A320 Procedure Simulator

Fenix A320 の地上手順(Cold & Dark → エンジンスタート → シャットダウン/セキュアリング)を
ブラウザで練習できる 2D パネルシミュレータです。iPad mini のタッチ操作を想定しています。

- ビルド不要の静的サイト(HTML + CSS + Vanilla JS)
- パネル: オーバーヘッド / ECAM(E/WD + SD) / ペデスタル
- MCDU は**別窓**(`cdu.html`)。BroadcastChannel でメイン窓とリアルタイム同期
- 手順チェックリスト内蔵。スイッチ操作と連動して自動でチェックが入ります
- 飛行は再現しません(地上手順のみ)

## 使い方

### GitHub Pages(推奨)

1. GitHub リポジトリの **Settings → Pages** を開く
2. **Source: Deploy from a branch**、Branch にこのファイルがあるブランチ(通常 `main`)と `/ (root)` を選んで **Save**
3. 数分後に `https://<ユーザー名>.github.io/A320sim/` で公開されます
4. iPad の Safari でその URL を開く

### ローカルサーバ

```sh
python3 -m http.server 8000
# → http://localhost:8000/ を開く
```

同一 Wi-Fi の iPad からは `http://<PCのIPアドレス>:8000/` でアクセスできます。

> **注意:** `file://` で直接 index.html を開くと ES Modules と BroadcastChannel が
> 動作しません。必ず HTTP 経由で開いてください。

## CDU 別窓の開き方(iPad)

1. メイン画面右上の **CDU** ボタンをタップ(新しいタブで MCDU が開きます)
2. Split View にすると左にパネル・右に MCDU を同時表示できます:
   CDU タブを長押し → 「新規ウインドウで開く」、または画面上部の「…」から Split View
3. 同期は同一ブラウザ・同一オリジン内で行われます(メイン窓を閉じると CDU は待機表示になります)

PC では CDU ボタンでポップアップ窓が開きます。

## 手順の流れ

右上 **CHECKLIST** ボタンで手順ドロワーを開けます。上から順に操作すると自動でチェックされます。

1. **COCKPIT PREPARATION** — GND: GPU 接続(EFB 相当)→ BAT 1+2 ON → EXT PWR ON → ADIRS NAV →
   HYD / ELEC / FIRE パネル確認 → ANTI ICE OFF 確認 → PACK 1+2 OFF 確認 → NAV & LOGO ON →
   STROBE AUTO → SIGNS ON → MCDU INIT(FROM/TO 入力 例: `RJTT/RJOO` → LSK1R)
2. **BEFORE START** — ウィング燃料ポンプ(4)ON(**CTR ポンプはセンター燃料なしのため OFF のまま**。
   ON にすると FAULT/低圧が点灯)→ APU MASTER ON → APU START(AVAIL まで約 25 秒)→ APU BLEED ON →
   **PACK 1+2 ON** → XPDR コード 2000 / STBY → PARK BRK 確認 → BEACON ON → **PACK 1+2 OFF(始動用)**
3. **ENGINE START** — ENG MODE SEL を IGN/START → ENG MASTER **2** ON(N2 安定まで約 40 秒)→ ENG MASTER **1** ON → MODE SEL を NORM
4. **AFTER START** — APU BLEED OFF → APU MASTER OFF → **PACK 1+2 ON** → EXT PWR OFF
5. **SHUTDOWN & SECURING** — PARK BRK ON → EXT PWR ON → ENG MASTER 1+2 OFF → BEACON OFF → SEAT BELTS OFF → PACK 1+2 OFF → FUEL PUMPS OFF → ADIRS OFF → NAV & LOGO OFF → EXT PWR OFF → BAT 1+2 OFF(Cold & Dark に戻る)

※ ADIRS のアライメントは実機の約 10 分を 30 秒に短縮しています(MCDU INIT ページの
`ALIGN IRS>` で即時完了も可能)。エンジン始動には AC 電源と APU ブリードが必要です。
パックは実機 SOP どおり「APU BLEED 後に ON → 始動前に OFF → 始動後に ON」の 3 段階で操作します。

## 構成

| パス | 内容 |
|---|---|
| `index.html` / `js/main.js` | メイン窓(シミュレーション本体) |
| `cdu.html` / `js/cdu.js` | MCDU 別窓(表示+キー入力のみ) |
| `js/model.js` | 状態モデルと派生値 |
| `js/sim.js` | 電源・APU・エンジン・ADIRS のシミュレーション |
| `js/checklist.js` | 手順定義と自動チェック |
| `js/ecam.js` | ECAM(SVG)描画 |
| `js/sync.js` | BroadcastChannel 同期 |
