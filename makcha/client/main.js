// 막차: 화면(입력·그리기·미니맵·직업 고르기). 게임 규칙은 sim/에만 있고, 여기서는 그리기만 한다
import { createWorld, step } from '../sim/world.js';
import { T, tileAt } from '../sim/dungeon.js';
import { INPUT, TILE, DT, VIEW_W, VIEW_H } from '../sim/constants.js';
import { JOBS, JOB_ORDER, WEAPONS, MONSTERS } from '../sim/data.js';

const cv = document.getElementById('cv'), x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
const $ = id => document.getElementById(id);
const A = { chars: [], weapons: [], mons: {} };
const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });

// ---------- 입력: WASD·방향키, 마우스 왼쪽 공격, 왼쪽 Shift 달리기 ----------
const keys = new Set(); let mouseDown = false;
const KEY = { KeyW: INPUT.UP, ArrowUp: INPUT.UP, KeyS: INPUT.DOWN, ArrowDown: INPUT.DOWN, KeyA: INPUT.LEFT, ArrowLeft: INPUT.LEFT, KeyD: INPUT.RIGHT, ArrowRight: INPUT.RIGHT, KeyJ: INPUT.ATTACK, ShiftLeft: INPUT.RUN };
addEventListener('keydown', e => { if (KEY[e.code]) { keys.add(e.code); e.preventDefault(); } });
addEventListener('keyup', e => keys.delete(e.code));
cv.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
addEventListener('mouseup', () => mouseDown = false);
addEventListener('blur', () => { keys.clear(); mouseDown = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
function readInput() { let b = 0; for (const k of keys) b |= KEY[k]; if (mouseDown) b |= INPUT.ATTACK; return b; }

function fit() { const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H); cv.style.width = VIEW_W * s + 'px'; cv.style.height = VIEW_H * s + 'px'; }
addEventListener('resize', fit); fit();

// ---------- 배경: 구역 1 지층 터널. 방 바닥은 자갈, 통로는 선로, 벽 앞면은 지층 단면 ----------
const STRATA = ['#c8b48a', '#9a7a5a', '#b8a070', '#7a6a5a', '#a88a6a'];
function bakeFloor(f) {
  const c = document.createElement('canvas'); c.width = f.w * TILE; c.height = f.h * TILE; const g = c.getContext('2d');
  const inRoom = (tx, ty) => f.rooms.some(r => tx >= r.x0 && tx < r.x0 + r.w && ty >= r.y0 && ty < r.y0 + r.h);
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let ty = 0; ty < f.h; ty++) for (let tx = 0; tx < f.w; tx++) {
    const t = f.tiles[ty * f.w + tx], X = tx * TILE, Y = ty * TILE;
    if (t !== T.WALL) {
      if (inRoom(tx, ty)) { g.fillStyle = (tx + ty) % 2 ? '#5d564c' : '#625a50'; g.fillRect(X, Y, TILE, TILE);
        for (let i = 0; i < 3; i++) { g.fillStyle = rnd() < 0.5 ? '#6f675b' : '#4d473f'; g.fillRect(X + rnd() * 14, Y + rnd() * 14, 2, 2); } }
      else {   // 선로 터널 통로: 통로 방향(가로·세로)에 맞춰 침목과 레일을 놓는다
        const vert = tileAt(f, tx - 1, ty) !== T.WALL && tileAt(f, tx + 1, ty) !== T.WALL ? false : tileAt(f, tx, ty - 1) !== T.WALL && tileAt(f, tx, ty + 1) !== T.WALL;
        g.fillStyle = '#3b3631'; g.fillRect(X, Y, TILE, TILE);
        if (vert) { g.fillStyle = '#4a3a2a'; g.fillRect(X, Y + 2, TILE, 4); g.fillRect(X, Y + 10, TILE, 4); g.fillStyle = '#8a8a90'; g.fillRect(X + 4, Y, 2, TILE); g.fillRect(X + 11, Y, 2, TILE); }
        else { g.fillStyle = '#4a3a2a'; g.fillRect(X + 2, Y, 4, TILE); g.fillRect(X + 10, Y, 4, TILE); g.fillStyle = '#8a8a90'; g.fillRect(X, Y + 4, TILE, 2); g.fillRect(X, Y + 11, TILE, 2); } }
    } else if (tileAt(f, tx, ty + 1) !== T.WALL || tileAt(f, tx, ty + 2) !== T.WALL) {
      // 카메라 쪽을 보는 벽(두 칸 높이): 지층 단면과 가끔 화석. 위 칸 꼭대기에 벽 윗면 테두리
      for (let k = 0; k < 5; k++) { g.fillStyle = STRATA[(k + ty * 5) % 5]; g.fillRect(X, Y + k * 3, TILE, 3 + (k === 4 ? 1 : 0)); }
      if (tileAt(f, tx, ty + 1) === T.WALL) { g.fillStyle = '#2c2620'; g.fillRect(X, Y, TILE, 3); }
      if (rnd() < 0.12) { g.fillStyle = '#efe6cc'; g.fillRect(X + 4, Y + 5, 8, 5); g.fillStyle = '#5a4a3a'; g.fillRect(X + 5, Y + 7, 6, 1); g.fillRect(X + 7, Y + 6, 1, 3); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(X, Y + TILE - 2, TILE, 2);
    } else { g.fillStyle = '#1b1814'; g.fillRect(X, Y, TILE, TILE); if (tileAt(f, tx, ty - 1) !== T.WALL || tileAt(f, tx - 1, ty) !== T.WALL || tileAt(f, tx + 1, ty) !== T.WALL) { g.fillStyle = '#2c2620'; g.fillRect(X, Y, TILE, TILE); } }
  }
  for (const r of f.rooms) {   // 방 표시물
    const X = (r.cx + 0.5) * TILE, Y = (r.cy + 0.5) * TILE;
    if (r.type === 'start') { g.fillStyle = '#2f5f5c'; g.fillRect(X - 30, Y - 40, 60, 10); g.fillStyle = '#4a8a84'; g.fillRect(X - 29, Y - 39, 58, 4); }
    if (r.type === 'event') { g.fillStyle = '#e0b04a'; g.fillRect(X - 10, Y - 30, 20, 16); g.fillStyle = '#1c1c1c'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('!', X, Y - 17); }
  }
  return c;
}

// ---------- 몬스터: 구역 1 그림(삼엽충, 암모나이트, 내성균 덩어리, 화석 짜깁기 공룡). 그림은 오른쪽을 보고 있다 ----------
function drawMon(m, t) {
  const fr = A.mons[m.id], X = Math.round(m.x), Y = Math.round(m.y);
  const img = m.id === 'fossilrex' ? (m.windT > 0 ? fr[m.windT < 0.2 ? 3 : 2] : fr[Math.floor(t * 3) % 2]) : fr[Math.floor(m.t * (m.dash > 0 ? 16 : 8)) % fr.length];
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(X, Y, img.width * 0.35, 3, 0, 0, 7); x.fill();
  x.save(); x.translate(X, Y); x.scale(m.face, 1); if (m.flash > 0) x.filter = 'brightness(3)'; x.drawImage(img, -Math.round(img.width / 2), -img.height + 1); x.restore();
  const top = Y - img.height;
  if (m.id === 'fossilrex') { const W = 60; x.fillStyle = '#111'; x.fillRect(X - W / 2, top - 8, W, 5); x.fillStyle = '#d84a3a'; x.fillRect(X - W / 2 + 1, top - 7, (W - 2) * m.hp / m.maxHp, 3); }
  if (m.windT > 0) { x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText('!', X, top - 10); x.fillStyle = '#ff3a2a'; x.fillText('!', X, top - 10); }
}

// ---------- 플레이어: 팔 없는 몸 + 떠서 흔들리는 총(반동) ----------
function drawPlayer(p, t) {
  const J = JOBS[p.job], fr = A.chars[J.sprite], img = p.moving ? fr[2 + Math.floor(t * (p.running ? 12 : 9)) % 4] : fr[Math.floor(t * 2) % 2];
  const k = p.kick * p.kick, bx = Math.round(p.x - Math.cos(p.aim) * k * 2), by = Math.round(p.y);
  const blink = p.invuln > 0 && Math.floor(p.invuln / 3) % 2;
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(bx, by, 7, 3, 0, 0, 7); x.fill();
  if (!blink) { x.save(); x.translate(bx, by); x.scale(p.face, 1); x.drawImage(img, -Math.round(img.width / 2), -img.height); x.restore(); }
  const g = A.weapons[WEAPONS[p.weapon].sprite], bob = Math.round(Math.sin(t * 6) * 1.5), gx = bx + p.face * 4, gy = by - 9 + bob;
  x.save(); x.translate(gx, gy); x.rotate(p.aim - p.face * 0.5 * k); if (p.face < 0) x.scale(1, -1); x.drawImage(g, -3 - Math.round(k * 5), -Math.round(g.height / 2)); x.restore();
}

// ---------- 화면 효과: 피해 숫자, 불꽃, 총구 불꽃, 화면 흔들림 ----------
const fx = { nums: [], parts: [], flashes: [], shake: 0 };
function feed(w) {
  const p = w.player;
  for (const e of w.events) {
    if (e.type === 'hit') { fx.nums.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y - 22, v: e.amount, t: 0.6 }); for (let i = 0; i < 4; i++) fx.parts.push({ x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, t: 0.3, c: '#ffe9a8' }); }
    else if (e.type === 'kill') { for (let i = 0; i < 12; i++) fx.parts.push({ x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0.45, c: '#d9d4c4' }); fx.shake = Math.max(fx.shake, 2); }
    else if (e.type === 'fire') { fx.flashes.push({ x: p.x + p.face * 4 + Math.cos(p.aim) * 12, y: p.y - 9 + Math.sin(p.aim) * 12, a: p.aim, t: 0.05 }); fx.shake = Math.max(fx.shake, WEAPONS[e.weapon].kick * 1.5); }
    else if (e.type === 'hurt') { fx.shake = Math.max(fx.shake, 4); fx.nums.push({ x: p.x, y: p.y - 34, v: '-' + e.amount, t: 0.8, red: true }); }
    else if (e.type === 'spark') fx.parts.push({ x: e.x, y: e.y, vx: 0, vy: -20, t: 0.15, c: '#fff' });
    else if (e.type === 'lock') tip('🚪 문이 잠겼다! 적을 모두 쓰러뜨려라', 2);
    else if (e.type === 'clear') tip('✅ 방을 정리했다. 문이 열렸다', 2);
    else if (e.type === 'chest') tip('📦 보급 상자: 체력 +2, 에너지 +60', 2.5);
  }
}
function updateFx(dt) {
  for (const L of [fx.nums, fx.parts, fx.flashes]) { for (const o of L) { o.t -= dt; if (o.vx !== undefined) { o.x += o.vx * dt; o.y += o.vy * dt; } } for (let i = L.length - 1; i >= 0; i--) if (L[i].t <= 0) L.splice(i, 1); }
  fx.shake = Math.max(0, fx.shake - dt * 20);
}

// ---------- 미니맵: 지나간 방과 문 너머로 본 방만 ----------
const ICON = { start: '#4a7a4a', battle: '#7a5a4a', elite: '#b04a3a', chest: '#4a6a9a', shop: '#9a7a3a', event: '#8a5aa0', exit: '#e0e0e0', boss: '#d83a2a' };
function drawMinimap(w) {
  const S = 9, ox = VIEW_W - 5 * S * 1.6 - 10, oy = 34, cur = w.floor.rooms.findIndex(r => { const tx = w.player.x / TILE, ty = w.player.y / TILE; return tx >= r.x0 && tx < r.x0 + r.w && ty >= r.y0 && ty < r.y0 + r.h; });
  x.fillStyle = 'rgba(10,12,16,.6)'; x.fillRect(ox - 4, oy - 4, 5 * S * 1.6 + 8, 5 * S * 1.6 + 8);
  const at = r => [ox + r.gx * S * 1.6, oy + r.gy * S * 1.6];
  for (const [a, b] of w.floor.links) { const A = w.rooms[a], B = w.rooms[b]; if (!(A.visited || B.visited)) continue; const [x1, y1] = at(w.floor.rooms[a]), [x2, y2] = at(w.floor.rooms[b]); x.fillStyle = '#5a5f68'; x.fillRect(Math.min(x1, x2) + S / 2 - 1, Math.min(y1, y2) + S / 2 - 1, Math.abs(x1 - x2) + 2, Math.abs(y1 - y2) + 2); }
  w.floor.rooms.forEach((r, i) => { const st = w.rooms[i]; if (!st.visited && !st.seen) return; const [X, Y] = at(r);
    x.fillStyle = st.visited ? ICON[r.type] : '#3a3e46'; x.fillRect(X, Y, S, S); if (i === cur) { x.strokeStyle = '#fff'; x.lineWidth = 1; x.strokeRect(X - 0.5, Y - 0.5, S + 1, S + 1); } });
}

function drawWorld(w, t) {
  const p = w.player, camX = Math.round(p.x - VIEW_W / 2 + (Math.random() - 0.5) * fx.shake), camY = Math.round(p.y - 12 - VIEW_H / 2 + (Math.random() - 0.5) * fx.shake);
  x.fillStyle = '#0d0b09'; x.fillRect(0, 0, VIEW_W, VIEW_H);
  x.save(); x.translate(-camX, -camY);
  x.drawImage(game.bg, 0, 0);
  // 잠긴 문: 노랑·검정 셔터
  for (const d of w.floor.doors) if (w.locked.includes(d.room)) for (const k of d.tiles) { const X = (k % w.floor.w) * TILE, Y = Math.floor(k / w.floor.w) * TILE; x.fillStyle = '#2a2a2a'; x.fillRect(X, Y, TILE, TILE); for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#1c1c1c' : '#e0b040'; x.fillRect(X, Y + i * 4, TILE, 4); } }
  for (const r of w.floor.rooms) {   // 상자·출구 포털
    const X = (r.cx + 0.5) * TILE, Y = (r.cy + 0.5) * TILE, st = w.rooms[r.id];
    if (r.type === 'chest') { x.fillStyle = '#2a1c10'; x.fillRect(X - 9, Y - 12, 18, 12); x.fillStyle = st.opened ? '#6a4a2a' : '#c8902a'; x.fillRect(X - 8, Y - 11, 16, 10); x.fillStyle = '#e8d070'; x.fillRect(X - 2, Y - 8, 4, 3); }
    if (r.type === 'exit' || (r.type === 'boss' && st.cleared)) { const g = 0.5 + Math.sin(t * 4) * 0.2; x.fillStyle = `rgba(120,200,255,${g})`; x.beginPath(); x.ellipse(X, Y, 14, 7, 0, 0, 7); x.fill(); x.fillStyle = '#e8f6ff'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.fillText('다음 역', X, Y - 12); }
  }
  const list = [...w.mons.map(m => ({ y: m.y, d: () => drawMon(m, t) })), { y: p.y, d: () => drawPlayer(p, t) }];
  list.sort((a, b) => a.y - b.y).forEach(o => o.d());
  for (const s of w.shots) { x.fillStyle = '#fff2a0'; x.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4); }
  for (const e of w.eshots) { x.fillStyle = '#2a0c10'; x.fillRect(Math.round(e.x) - 3, Math.round(e.y) - 3, 7, 7); x.fillStyle = '#ff6a5a'; x.fillRect(Math.round(e.x) - 2, Math.round(e.y) - 2, 5, 5); }
  for (const f of fx.flashes) { x.save(); x.translate(f.x, f.y); x.rotate(f.a); x.fillStyle = '#ffd040'; x.beginPath(); x.moveTo(0, -4); x.lineTo(10, 0); x.lineTo(0, 4); x.fill(); x.restore(); }
  for (const q of fx.parts) { x.fillStyle = q.c; x.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
  x.textAlign = 'center'; x.font = 'bold 10px sans-serif'; x.lineWidth = 3;
  for (const n of fx.nums) { const up = (0.7 - n.t) * 24; x.strokeStyle = '#000'; x.strokeText(n.v, n.x, n.y - up); x.fillStyle = n.red ? '#ff5a4a' : '#fff'; x.fillText(n.v, n.x, n.y - up); }
  x.restore();
  drawMinimap(w);
}

// ---------- HUD, 안내 ----------
let tipT = 0; function tip(s, sec) { $('tip').textContent = s; $('tip').classList.add('on'); tipT = sec; }
function bar(id, v, m, label) { $(id).querySelector('i').style.width = Math.max(0, v / m * 100) + '%'; $(id).querySelector('span').textContent = label; }
function hud(w, dt) {
  const p = w.player; bar('hp', p.hp, p.maxHp, `체력 ${p.hp}/${p.maxHp}`); bar('sh', p.shield, p.maxShield, `방어막 ${p.shield}/${p.maxShield}`); bar('en', p.energy, p.maxEnergy, `에너지 ${Math.floor(p.energy)}/${p.maxEnergy}`);
  $('where').textContent = `구역 1 지층 터널 · ${w.floor.station + 1}번째 역`;
  if (tipT > 0 && (tipT -= dt) <= 0) $('tip').classList.remove('on');
}

// ---------- 흐름: 직업 고르기 → 역 1~4 → 끝 ----------
const game = { w: null, bg: null, acc: 0, run: null };
function menu(html) { $('card').innerHTML = html; $('menu').hidden = false; $('hud').hidden = true; }
function jobSelect() {
  menu(`<h1>🚇 막차: 지하 생존기</h1><p>지층 터널을 지나 다음 역으로. WASD로 이동, 마우스 왼쪽(또는 J)으로 가까운 적을 자동 조준해 쏜다, 왼쪽 Shift로 달린다(달리는 동안 방어막이 차지 않음). 방에 들어가면 문이 잠기고, 적을 모두 쓰러뜨리면 열린다. 오른쪽 위 지도로 방을 확인한다.</p>
    <div class="jobs">${JOB_ORDER.map(j => `<button class="job" data-j="${j}"><canvas width="19" height="30" data-c="${JOBS[j].sprite}"></canvas>${JOBS[j].name}<br><small style="color:var(--sub)">${WEAPONS[JOBS[j].weapon].name}</small></button>`).join('')}</div>`);
  for (const c of document.querySelectorAll('[data-c]')) { const g = c.getContext('2d'), im = A.chars[+c.dataset.c][0]; c.width = im.width; c.height = im.height; g.drawImage(im, 0, 0); }
  for (const b of document.querySelectorAll('[data-j]')) b.onclick = () => { document.documentElement.requestFullscreen?.().catch(() => {}); game.run = { job: b.dataset.j, station: 0, seed: (Date.now() ^ (Math.random() * 2 ** 31)) >>> 0 }; startStation(); };
}
function startStation() {
  const r = game.run, w = createWorld({ seed: r.seed + r.station * 101, job: r.job, zone: 1, station: r.station });
  if (r.keep) Object.assign(w.player, r.keep);
  game.w = w; game.bg = bakeFloor(w.floor); $('menu').hidden = true; $('hud').hidden = false;
  tip(`🚉 지층 터널 ${r.station + 1}번째 역`, 2.5);
}
function endStation(w) {
  const r = game.run, p = w.player;
  if (w.done === 'dead') { game.w = null; return menu(`<h1>💀 쓰러졌다</h1><p>지층 터널 ${r.station + 1}번째 역에서 쓰러졌다.</p><button class="job" id="again">처음부터</button>`), ($('again').onclick = jobSelect); }
  r.keep = { hp: p.hp, shield: p.shield, energy: p.energy }; r.station++;
  if (r.station > 3) { game.w = null; return menu(`<h1>🎉 지층 터널 통과!</h1><p>화석 짜깁기 공룡을 물리치고 구역 1을 빠져나왔다. 다음 구역(지하 텃밭 마을)은 다음 단계에서 만든다.</p><button class="job" id="again">처음부터</button>`), ($('again').onclick = jobSelect); }
  startStation();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)), t = now / 1000; last = now;
  const w = game.w;
  if (w && !w.done) {
    game.acc += dt; let n = 0;
    while (game.acc >= DT && n++ < 5) { game.acc -= DT; step(w, readInput()); feed(w); if (w.done) break; }
    if (n >= 5) game.acc = 0;
    if (w.done) setTimeout(() => endStation(w), w.done === 'dead' ? 800 : 150);
  }
  updateFx(dt);
  if (game.w) { drawWorld(game.w, t); hud(game.w, dt); }
  requestAnimationFrame(frame);
}

(async () => {
  const m = await fetch('assets/manifest.json').then(r => r.json());
  A.chars = await Promise.all(m.chars.map(f => Promise.all(f.map(s => load('assets/' + s)))));
  A.weapons = await Promise.all(m.weapons.map(s => load('assets/' + s)));
  A.mons = Object.fromEntries(await Promise.all(Object.entries(m.mons).map(async ([k, f]) => [k, await Promise.all(f.map(s => load('assets/' + s)))])));
  window.__game = game; window.__jump = st => { game.run.station = st; startStation(); };   // 개발용: 원하는 역으로 바로 가기
  jobSelect(); requestAnimationFrame(frame);
})();
