// Help mode: tap any control to read what it does. Descriptions are keyed by
// the control's .ctl-label text (or a synthetic key for screen buttons).
// Runs entirely in the main window.

export const HELP_TEXT = {
  // GND SERVICES (EFB stand-in)
  'GPU': '地上動力装置(外部電源)の接続/切断。EXT PWR に AVAIL を出すには先に接続が必要。',
  'FUEL': '搭載燃料の選択。6.3t(ウィングのみ)/12.0t(センタータンクあり)。エンジン停止中のみ変更可。',
  'START FAULT': '始動故障の仕込み。OFF/RND(ランダム)/HOT(ホットスタート)/HUNG(ハングスタート)。HOT・HUNG は1回のみ発動。',
  'PROGRAM': '練習範囲。FULL=離陸から着陸まで飛行、GND=地上手順のみ。',
  // ADIRS
  'IR 1': '慣性基準装置1。OFF→NAV で整列開始(本シムは30秒に短縮)。姿勢・航法の基準。',
  'IR 2': '慣性基準装置2。3台とも NAV にする。',
  'IR 3': '慣性基準装置3。3台とも NAV にする。',
  // ELEC
  'BAT 1': 'バッテリー1。最初に ON。BAT 1+2 で非常用の表示灯が点く。',
  'BAT 2': 'バッテリー2。',
  'EXT PWR': '外部電源。AVAIL(緑)で押すと ON(青)。AC 電源が確立し ECAM/CDU が起動。',
  'GEN 1': 'エンジン1発電機。通常 ON のまま。エンジン始動でオンライン。',
  'GEN 2': 'エンジン2発電機。',
  'APU GEN': 'APU 発電機。',
  'BUS TIE': '母線連絡。通常 AUTO。',
  // APU
  'MASTER SW': 'APU マスタースイッチ。ON で燃料弁が開き吸気フラップが開く。',
  'START': 'APU スタート。押すと始動、約25秒で AVAIL(緑)。',
  // HYD / FIRE / ANTI ICE
  'ENG 1 PUMP': 'エンジン1油圧ポンプ。通常 ON。エンジン停止中は低圧表示。',
  'PTU': '動力伝達ユニット。通常 ON(AUTO)。',
  'ENG 2 PUMP': 'エンジン2油圧ポンプ。',
  'WING': '主翼防氷/主翼灯(セクションにより異なる)。地上では通常 OFF。',
  // FUEL pumps
  'L TK 1': '左タンクポンプ1。始動前にウィング4ポンプを ON。',
  'L TK 2': '左タンクポンプ2。',
  'CTR 1': 'センタータンクポンプ1。センターに燃料が無ければ OFF のまま(回すと低圧警告)。',
  'CTR 2': 'センタータンクポンプ2。',
  'R TK 1': '右タンクポンプ1。',
  'R TK 2': '右タンクポンプ2。',
  // AIR COND
  'PACK 1': 'エアコンパック1。ブリード空気で作動。始動前は OFF、APU BLEED 後 ON、エンジン始動用に一時 OFF。',
  'PACK 2': 'エアコンパック2。',
  'ENG 1 BLEED': 'エンジン1ブリード。',
  'ENG 2 BLEED': 'エンジン2ブリード。',
  'APU BLEED': 'APU ブリード。ON でエンジン始動に必要な圧空を供給。',
  // EXT LT / SIGNS
  'BEACON': '衝突防止灯。エンジン始動前に ON(周囲への合図)。',
  'NAV & LOGO': '航法灯/ロゴ灯。地上準備で ON。',
  'STROBE': 'ストロボ灯。OFF/AUTO/ON。通常 AUTO(離陸時に自動点灯)。',
  'NOSE': 'ノーズ灯。OFF/TAXI/T.O。タキシーで TAXI、滑走路で T.O。',
  'RWY TURN OFF': '滑走路離脱灯。',
  'LAND': '着陸灯。タキシー〜離陸で ON。',
  'SEAT BELTS': 'シートベルトサイン。地上準備で ON。',
  'NO SMOKING': '禁煙サイン。',
  // Pedestal
  'MODE': 'ENG モードセレクタ(CRANK/NORM/IGN/START)または XPDR モード。始動時は IGN/START。',
  'FLAPS': 'フラップレバー(0/1/2/3/FULL)。離陸は 1、進入で段階的に展開。油圧が要る。',
  'SPD BRK': 'スピードブレーキ/グランドスポイラー。始動後 ARM。',
  'PARK BRK': 'パーキングブレーキ。始動中は ON、タキシー前に OFF。',
  'CODE': 'トランスポンダのスコークコード。各桁タップで 0〜7。既定 2000。',
  'MAX': 'オートブレーキ MAX(離陸時の RTO 設定)。',
  'MED': 'オートブレーキ MED(着陸用)。',
  'LO': 'オートブレーキ LO。',
  'LDG GEAR': '着陸装置レバー。正上昇で UP、進入で DOWN(3グリーン確認)。',
  // screen buttons (synthetic keys)
  '@cdu': 'MCDU を画面内にポップアップ。INIT/F-PLN/PERF などを入力。',
  '@thr': 'スラストレバー(デテント式)。離陸 FLX/MCT、上昇 CLB、着陸で IDLE→REV MAX。',
  '@ap1': '自動操縦1。離陸後 ON。',
  '@appr': '進入モード。ILS の LOC/G-S を捕捉。',
  '@warp': 'タイムワープ。前提操作が揃うと上昇→T/C、巡航→T/D、降下→APPR へ早送り。',
  '@vacate': '着陸滑走後、滑走路を離脱してタキシーへ。',
  '@lineup': '滑走路に整列(パーキングブレーキ解除後)。',
  '@tocfg': 'T.O CONFIG テスト。離陸形態が正しいか確認。',
  '@ecam': 'ECAM 下部 SD ページ切替(ENG/APU/ELEC/…)。',
};

// Resolve the description for a tapped element.
export function helpFor(el) {
  // screen buttons carry an explicit data-help key
  const keyed = el.closest('[data-help]');
  if (keyed) return { title: keyed.dataset.helpTitle || '', text: HELP_TEXT[keyed.dataset.help] || '' };
  const ctl = el.closest('.ctl');
  if (ctl) {
    const lbl = ctl.querySelector('.ctl-label');
    const name = lbl ? lbl.textContent.trim() : '';
    if (HELP_TEXT[name]) return { title: name, text: HELP_TEXT[name] };
  }
  return null;
}

export function buildHelpPopover() {
  const pop = document.createElement('div');
  pop.id = 'help-popover';
  pop.style.display = 'none';
  pop.innerHTML = '<div class="help-card"><h3></h3><p></p></div>';
  document.body.appendChild(pop);
  pop.addEventListener('click', () => { pop.style.display = 'none'; });
  return {
    show(title, text) {
      pop.querySelector('h3').textContent = title;
      pop.querySelector('p').textContent = text;
      pop.style.display = 'flex';
    },
    hide() { pop.style.display = 'none'; },
  };
}
