# A320 Procedure Simulator

Fenix A320 の地上手順(Cold & Dark → エンジンスタート → シャットダウン/セキュアリング)を
ブラウザで練習できる 2D パネルシミュレータです。iPad mini のタッチ操作を想定しています。

- ビルド不要の静的サイト(HTML + CSS + Vanilla JS)
- パネル: オーバーヘッド / FCU / ECAM(E/WD + SD) / ペデスタル
- MCDU は**別窓**(`cdu.html`)。BroadcastChannel でメイン窓とリアルタイム同期
- 手順チェックリスト内蔵。スイッチ操作と連動して自動でチェックが入ります
- ECAM 警告体系(MASTER WARN/CAUT + チャイム)と異常始動(ホット/ハングスタート)を再現
- サウンドは Web Audio 合成(クリック音・APU/エンジンスプール音・チャイム)。ヘッダの 🔊 で消音可
- **試験モード**(チェックリスト非表示で全手順を実施 → 所要時間・操作数・警告数で採点)
- 状態は自動保存(リロードしても続きから再開)。STATE メニューで Cold & Dark / ターンアラウンドを選択可
- PWA 対応(ホーム画面に追加でフルスクリーン起動・オフライン動作)
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
   STROBE AUTO → SIGNS ON → MCDU INIT A(FROM/TO 例: `RJTT/RJOO` → LSK1R)→
   MCDU INIT B(→キーで移動。ZFW/CG 例: `54.3/28.0` → LSK1R、BLOCK `6.3` → LSK2R。値は GND SERVICES のロードシート参照)→
   MCDU PERF(V1/VR/V2・TRANS ALT・FLAPS/THS `1/UP0.5`・FLEX)→
   FCU: SPD/HDG を PUSH でマネージド(`---`)→ INIT ALT 6000 → BARO を QNH 1006(FCU 上部のクリアランス表示参照)
2. **BEFORE START** — ウィング燃料ポンプ(4)ON(**CTR ポンプはセンター燃料なしのため OFF のまま**。
   ON にすると FAULT/低圧が点灯)→ APU MASTER ON → APU START(AVAIL まで約 25 秒)→ APU BLEED ON →
   **PACK 1+2 ON** → XPDR コード 2000 / STBY → PARK BRK 確認 → BEACON ON → **PACK 1+2 OFF(始動用)**
3. **ENGINE START** — ENG MODE SEL を IGN/START → ENG MASTER **2** ON(N2 安定まで約 40 秒)→ ENG MASTER **1** ON → MODE SEL を NORM
4. **AFTER START** — APU BLEED OFF → APU MASTER OFF → **PACK 1+2 ON** → EXT PWR OFF →
   GND SPLRS ARM → FLAPS 1(ECAM に 1+F 表示)→ F/CTL チェック(◀▲▼▶/RUD 全打・SD の F/CTL ページ連動)→
   AUTO BRK MAX → NOSE TAXI / RWY TURN OFF ON → **T.O CONFIG テスト**(フラップ未設定だと CONFIG 警告)
5. **SHUTDOWN & SECURING** — PARK BRK ON → FLAPS 0 → GND SPLRS DISARM → AUTO BRK OFF →
   NOSE/RWY TURN OFF OFF → EXT PWR ON → ENG MASTER 1+2 OFF → BEACON OFF → SEAT BELTS OFF →
   PACK 1+2 OFF → FUEL PUMPS OFF → ADIRS OFF → NAV & LOGO OFF → EXT PWR OFF → BAT 1+2 OFF(Cold & Dark に戻る)

※ ADIRS のアライメントは実機の約 10 分を 30 秒に短縮しています(MCDU INIT ページの
`ALIGN IRS>` で即時完了も可能)。エンジン始動には AC 電源と APU ブリードが必要です。
パックは実機 SOP どおり「APU BLEED 後に ON → 始動前に OFF → 始動後に ON」の 3 段階で操作します。

## 異常始動の練習

GND SERVICES の **START FAULT** セレクタで始動故障を仕込めます。

- **HOT** — 次の始動でホットスタート(EGT が始動リミット 725°C を超えて急上昇)。EGT 赤表示 +
  「ENG x EGT OVERLIMIT」赤警告 + MASTER WARN 点滅 + 連続チャイム(CRC)。**即 ENG MASTER OFF** で中断
- **HUNG** — ハングスタート(N2 が約 35% で停滞)。数秒後に「ENG x START FAULT」アンバー警告 +
  MASTER CAUT + シングルチャイム。同じく MASTER OFF で中断
- **RND** — 始動ごとに一定確率でホット/ハングが発生(本番練習用)
- HOT/HUNG はワンショット(発動後 OFF に戻る)なので、中断 → 再始動で正常に始動できます

MASTER WARN / MASTER CAUT(FCU 左)を押すとチャイム・点灯が消えます(警告文は原因が解消するまで E/WD に残ります)。

## 試験モード

チェックリストドロワーの **EXAM** ボタンで開始します。Cold & Dark にリセットされ、チェックリストは
非表示(フェーズ名と進捗数のみ表示)。全手順を完了すると採点画面が出ます。

- **採点基準**: 操作数(目安 85 に対する比率)と警告発生数で S / A / B / C。所要時間も表示されます
- 途中で「EXAM中止」を押すと通常のガイドモードに戻ります

## 開始状態と保存

- ヘッダの **STATE** メニューから **COLD & DARK**(完全消灯)/ **TURN-AROUND**(外部電源・ADIRS
  アライン済み。BEFORE START 以降やシャットダウン手順の練習向け)を選べます
- 状態は 2 秒ごとに localStorage へ自動保存され、リロードや Safari のタブ破棄後も続きから再開できます。
  最初からやり直すときは **RESET** を押してください

## PWA(ホーム画面に追加)

GitHub Pages で開いた状態で Safari の共有メニュー →「ホーム画面に追加」すると、フルスクリーンの
アプリとして起動でき、オフラインでも動作します(Service Worker がアセットをキャッシュします)。

## 燃料プラン

GND SERVICES の **FUEL** トグルで 6.3t(ウィングのみ)⇄ 12.0t(センタータンクあり)を切替できます(給油はエンジン停止中のみ)。
センターに燃料がある場合、BEFORE START の CTR ポンプは「OFF のまま」ではなく **ON** が正解になります。
空のセンタータンクでポンプを回すと FAULT 点灯 + 「FUEL CTR TK PUMP LO PR」コーションが出ます。

## 構成

| パス | 内容 |
|---|---|
| `index.html` / `js/main.js` | メイン窓(シミュレーション本体) |
| `js/panels/fcu.js` | FCU / グレアシールド(SPD/HDG マネージド、ALT、QNH) |
| `cdu.html` / `js/cdu.js` | MCDU 別窓(表示+キー入力のみ) |
| `js/model.js` | 状態モデルと派生値 |
| `js/sim.js` | 電源・APU・エンジン・ADIRS のシミュレーション |
| `js/checklist.js` | 手順定義と自動チェック |
| `js/ecam.js` | ECAM(SVG)描画 |
| `js/sync.js` | BroadcastChannel 同期 |
