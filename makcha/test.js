'use strict';
// 막차 시험장: 패치로 추가된 기능만 골라 바로 시험한다.
// 본 게임(game.js)은 그대로 두고 그 위에 단추판만 얹는다. test.html = index.html + 이 파일
(function () {
  // ---------- 넓은 시험방: 적이 저절로 나오지 않는 방 하나 ----------
  let arena = true;
  const origBuildMap = buildMap, origZoneClear = zoneClear;
  buildMap = function () {
    if (!arena) return origBuildMap();
    map = new Uint8Array(MW * MH); links = [];
    const w = 40, h = 26, gx = 1, gy = 1, x0 = gx * CW + ((CW - w) >> 1), y0 = gy * CH + ((CH - h) >> 1);
    rooms = [{ id: 'r0', type: 'start', gx, gy, w, h, x0, y0, doors: [], state: 'clear', wi: 0, seen: true, waves: null }];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setT(x, y, 2);
    for (let y = y0 + 2; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) setT(x, y, 1);
    for (const [x, y] of [[9, 7], [w - 10, 7], [9, h - 5], [w - 10, h - 5]]) setT(x0 + x, y0 + y, 7);
    setT(x0 + 3, y0 + 3, 9); setT(x0 + 4, y0 + 3, 9); // 조합대
  };
  zoneClear = function () { if (arena) { say(P.x, P.y - 50, '보스 처치', 'crit', 'big'); return; } origZoneClear(); };
  const room = () => roomAt(P.x, P.y - 3, 0) || rooms[0];
  const place = (dx) => { const r = room(); return { x: Math.max((r.x0 + 3) * T, Math.min((r.x0 + r.w - 3) * T, P.x + dx)), y: Math.max((r.y0 + 4) * T, Math.min((r.y0 + r.h - 2) * T, P.y)) }; };
  function enter() { enterStation(); closePerk(); }

  // ---------- 치트: 무적, 에너지 무한 ----------
  let god = false, infEn = false;
  const origStep = step;
  step = function () { origStep(); if (!running) return; if (infEn) P.en = P.maxEn; if (god) { P.hp = P.maxHp; P.inv = Math.max(P.inv, 0.05); } };

  // ---------- 단추판 ----------
  const ENEMY = { tri: '삼엽충', amm: '암모나이트', rat: '텃밭 쥐', leaf: '잎벌레', spore: '곰팡이 포자', rust: '녹 덩어리', acid: '산성 방울', ember: '불씨 덩이', fog: '온실기체 안개', drone: '정전 드론', bias: '편향 자료 조각' };
  const BOSS = { mam: '매머드', owl: '포식자 여왕', furnace: '제련로 관리 로봇', ai: '관제 AI' };
  const ZN = ZONES.map(z => z.name);
  const css = document.createElement('style');
  css.textContent = `
    body { justify-content:flex-start !important; }
    #tp { position:fixed; right:0; top:0; bottom:0; width:280px; overflow-y:auto; background:#16130f; border-left:1px solid #3a342a; color:#e6dcc6; font:13px "Pretendard","Malgun Gothic",sans-serif; padding:10px 12px 40px; box-sizing:border-box; z-index:20; }
    #tp h2 { font-size:13px; color:#f0b429; margin:14px 0 6px; }
    #tp h2:first-child { margin-top:0; }
    #tp .row { display:flex; flex-wrap:wrap; gap:4px; }
    #tp button { background:#2a251e; color:#f3ead7; border:1px solid #4a4234; border-radius:5px; padding:4px 7px; font:inherit; font-size:12px; cursor:pointer; }
    #tp button:hover { border-color:#f0b429; }
    #tp button.on { background:#f0b429; color:#111; border-color:#f0b429; font-weight:700; }
    #tp button.boss { border-color:#7a2e2e; }
    #tp select { background:#2a251e; color:#f3ead7; border:1px solid #4a4234; border-radius:5px; font:inherit; font-size:12px; padding:3px; }
    #tp .now { color:#9fd8ff; font-size:12px; margin-top:4px; }
    #tp .hint { color:#8a8270; font-size:11px; line-height:1.5; }
    #tpToggle { position:fixed; right:284px; top:6px; z-index:21; background:#2a251e; color:#f3ead7; border:1px solid #4a4234; border-radius:5px; font:12px sans-serif; padding:3px 7px; cursor:pointer; }
    body.tpHide #tp { display:none; } body.tpHide #tpToggle { right:6px; }`;
  document.head.appendChild(css);
  const tp = document.createElement('div'); tp.id = 'tp'; document.body.appendChild(tp);
  const tog = document.createElement('button'); tog.id = 'tpToggle'; tog.textContent = '단추판 접기';
  tog.onclick = () => { document.body.classList.toggle('tpHide'); tog.textContent = document.body.classList.contains('tpHide') ? '단추판 펴기' : '단추판 접기'; fit(); tog.blur(); };
  document.body.appendChild(tog);
  function sec(title, hint) { const h = document.createElement('h2'); h.textContent = title; tp.appendChild(h); if (hint) { const p = document.createElement('div'); p.className = 'hint'; p.textContent = hint; tp.appendChild(p); } const r = document.createElement('div'); r.className = 'row'; tp.appendChild(r); return r; }
  function btn(row, label, fn, cls) { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = () => { fn(b); b.blur(); refresh(); }; row.appendChild(b); return b; }
  const now = document.createElement('div'); now.className = 'now';

  // 무대
  let r = sec('무대', '시험방: 적이 저절로 나오지 않는 넓은 방이다. 역으로 가면 본 게임처럼 진행된다.');
  ZN.forEach((n, z) => btn(r, `시험방 · 구역 ${z + 1}`, () => { arena = true; stage = { zone: z, st: 0 }; enter(); }));
  r = sec('역으로 가기');
  const selZ = document.createElement('select'); ZN.forEach((n, z) => { const o = document.createElement('option'); o.value = z; o.textContent = `구역 ${z + 1} ${n}`; selZ.appendChild(o); }); r.appendChild(selZ);
  const selS = document.createElement('select'); [1, 2, 3, 4].forEach(s => { const o = document.createElement('option'); o.value = s - 1; o.textContent = `역 ${s}${s === 4 ? ' (보스)' : ''}`; selS.appendChild(o); }); r.appendChild(selS);
  btn(r, '가기', () => { arena = false; stage = { zone: +selZ.value, st: +selS.value }; enter(); });
  tp.appendChild(now);

  // 적
  r = sec('적 부르기', '지금 있는 방, 내 오른쪽에 바로 나온다.');
  for (const k in ENEMY) btn(r, ENEMY[k], () => { const p = place(140); spawnEnemy(k, p.x, p.y, room()); });
  r = sec('보스 부르기');
  for (const k in BOSS) btn(r, BOSS[k], () => { enemies.filter(e => isBoss(e)).forEach(e => e.dead = true); const p = place(200); spawnEnemy(k, p.x, p.y, room()); }, 'boss');
  r = sec('');
  btn(r, '적 모두 없애기', () => { enemies.forEach(e => e.dead = true); enemies = []; ebul = []; marks = []; bossRef = null; });

  // 무기
  r = sec('무기 (손에 바로 쥐기)', '두 칸이 차 있으면 손에 든 무기와 바꾼다. Q로 바꿔 든다.');
  for (const k in WEAP) { const b = btn(r, WEAP[k].name, () => { if (!P.weapons.includes(k)) { if (P.weapons.length < MAX_WEAPONS) P.weapons.push(k); else P.weapons[P.wi] = k; } P.wi = P.weapons.indexOf(k); }); b.style.color = RARITY[WEAP[k].r]; }
  r = sec('');
  btn(r, '손에 든 무기 ★ 올리기', () => { const k = P.weapons[P.wi]; P.stars[k] = Math.min(3, (P.stars[k] || 1) + 1); say(P.x, P.y - 46, WEAP[k].name + ' ★' + P.stars[k], 'crit'); });
  btn(r, '바닥에 모두 깔기', () => { const ks = Object.keys(WEAP); ks.forEach((k, i) => { const a = i / ks.length * Math.PI * 2; pickups.push({ kind: k, x: P.x + Math.cos(a) * 80, y: P.y + Math.sin(a) * 55 }); }); });

  // 장비
  r = sec('장비', '재료를 채운 뒤 조합대 창에서 만든다. 쓰는 장비는 숫자 키 1~5.');
  btn(r, '재료 99개', () => { P.mat = { cloth: 99, part: 99 }; });
  btn(r, '조합대 열기', () => openCraft());
  btn(r, '쓰는 장비 5개씩', () => { for (const k in GEAR) if (!GEAR[k].wear) P.bag[k] = 5; });
  btn(r, '입은 장비 벗기', () => { P.worn = new Set(); });
  r = sec('상태 이상 걸기');
  for (const k in STATUS) btn(r, STATUS[k].name, () => applyStatus(k));
  btn(r, '감염(세균)', () => { delete P.st.infect; applyStatus('infect'); P.st.infect.type = '세균'; P.st.infect.life = 1e9; });
  btn(r, '감염(바이러스)', () => { delete P.st.infect; applyStatus('infect'); P.st.infect.type = '바이러스'; P.st.infect.life = 14; });
  btn(r, '모두 풀기', () => { P.st = {}; });

  // 스킬 트리
  r = sec('스킬 트리', '능력을 바로 받는다(앞 단계 조건 없이). Tab으로 트리를 본다.');
  btn(r, '능력 고르기 창 열기', () => openPerk());
  btn(r, '능력 모두 지우기', () => { const J = JOBS[P.job]; P.perks = new Set(); P.maxHp = J.hp; P.hp = Math.min(P.hp, P.maxHp); P.maxEn = J.en; P.en = Math.min(P.en, P.maxEn); P.skillMax = J.cd; });
  for (const t of TREES) { r = sec(t.name); for (const [id, name] of t.perks) btn(r, name, () => { takePerk(id); say(P.x, P.y - 46, name, 'crit'); }); }

  // 유물
  r = sec('유물 (바로 받기)', '효과는 E 내 상태 창의 수치로 확인한다.');
  for (const k in RELIC) btn(r, RELIC[k].name, () => takeRelic(k));
  r = sec('');
  btn(r, '유물 하나 떨어뜨리기', () => dropRelic(P.x + 50, P.y));
  btn(r, '유물 모두 지우기(처음부터)', () => { arena = true; start(); });

  // 직업과 스킬
  r = sec('직업 (바꾸면 처음부터)');
  for (const k in JOBS) btn(r, JOBS[k].name, () => { jobKey = k; arena = true; start(); }); // 바꾸면 구역 1 시험방에서 다시 시작
  r = sec('편의');
  btn(r, '스킬 쿨타임 0', () => { P.skillCd = 0; });
  btn(r, '체력·방어막 채우기', () => { P.hp = P.maxHp; P.sh = P.maxSh; });
  btn(r, '무적', b => { god = !god; b.classList.toggle('on', god); });
  btn(r, '에너지 무한', b => { infEn = !infEn; b.classList.toggle('on', infEn); });

  function refresh() { now.textContent = '지금: ' + (arena ? `시험방 · 구역 ${stage.zone + 1} ${ZN[stage.zone]}` : stationName()) + ' · ' + JOBS[jobKey].name; }

  // 단추판만큼 좁혀서 정수배로 맞춘다
  const origFit = fit;
  fit = function () {
    origFit();
    if (document.body.classList.contains('tpHide')) return;
    const dpr = window.devicePixelRatio || 1, aw = Math.max(200, innerWidth - 290);
    const raw = Math.min(aw * dpr / W, innerHeight * dpr / H), scale = Math.max(1, Math.floor(raw));
    view.width = W * scale; view.height = H * scale;
    const shown = raw < 1 ? raw : scale, cw = W * shown / dpr, ch = H * shown / dpr;
    wrap.style.width = cw + 'px'; wrap.style.height = ch + 'px'; view.style.width = cw + 'px'; view.style.height = ch + 'px';
    wrap.style.fontSize = (cw / 800 * 13) + 'px'; vctx.imageSmoothingEnabled = false;
    wrap.style.marginLeft = Math.max(0, (innerWidth - 290 - cw) / 2) + 'px';
  };
  addEventListener('resize', () => fit());
  fit();

  // 바로 시험방에서 시작한다
  document.title = '막차 시험장';
  start(); refresh();
})();
