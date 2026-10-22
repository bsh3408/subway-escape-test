// 막차: 화면(입력·그리기·미니맵·직업 고르기). 게임 규칙은 sim/에만 있고, 여기서는 그리기만 한다
import { step } from '../sim/world.js';
import { createRun, offerLines, enterLine, finishLine, RUN_LINES, offerAbilities, applyAbility, ABILITIES, enhanceWeapon, enhanceCost, MAX_LV, GEAR, canCraft, craftGear, upgradeSkill, skillCost, SKILL_MAX, newMeta, pullRelic, toggleEquip, GACHA_COST, RELIC_SLOTS } from '../sim/run.js';
import { T, tileAt } from '../sim/dungeon.js';
import { INPUT, TILE, DT, VIEW_W, VIEW_H } from '../sim/constants.js';
import { JOBS, JOB_ORDER, WEAPONS, MONSTERS, LINES, MATS, STATUS, RELICS, GRADES } from '../sim/data.js';

const cv = document.getElementById('cv'), x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
const $ = id => document.getElementById(id);
// 받침이 있으면 앞 조사, 없으면 뒤 조사(을/를, 이/가)
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c < 11172 && c % 28 ? a : b); };
const A = { chars: [], weapons: [], mons: {} };
const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });

// ---------- 입력: WASD·방향키, 마우스 왼쪽 공격, 왼쪽 Shift 달리기 ----------
const keys = new Set(); let mouseDown = false, rightDown = false;
const KEY = { KeyW: INPUT.UP, ArrowUp: INPUT.UP, KeyS: INPUT.DOWN, ArrowDown: INPUT.DOWN, KeyA: INPUT.LEFT, ArrowLeft: INPUT.LEFT, KeyD: INPUT.RIGHT, ArrowRight: INPUT.RIGHT, KeyJ: INPUT.ATTACK, KeyK: INPUT.SKILL, KeyQ: INPUT.SWAP, KeyE: INPUT.ITEM, ShiftLeft: INPUT.RUN, ShiftRight: INPUT.RUN };   // Shift = 구르기
addEventListener('keydown', e => { if (KEY[e.code]) { keys.add(e.code); e.preventDefault(); } });
addEventListener('keyup', e => keys.delete(e.code));
cv.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; if (e.button === 2) rightDown = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; if (e.button === 2) rightDown = false; });
addEventListener('blur', () => { keys.clear(); mouseDown = rightDown = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
function readInput() { let b = 0; for (const k of keys) b |= KEY[k]; if (mouseDown) b |= INPUT.ATTACK; if (rightDown) b |= INPUT.SKILL; return b; }

function fit() { const s = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H); cv.style.width = VIEW_W * s + 'px'; cv.style.height = VIEW_H * s + 'px'; }
addEventListener('resize', fit); fit();

// ---------- 배경: 구역 1 지층 터널. 방 바닥은 자갈, 통로는 선로, 벽 앞면은 지층 단면 ----------
const STRATA = ['#c8b48a', '#9a7a5a', '#b8a070', '#7a6a5a', '#a88a6a'];
// 1호선은 지층 벽, 다른 호선은 콘크리트 벽에 호선 색 띠(호선별 실내 그림은 차례로 채운다)
function bakeFloor(f) {
  const L = LINES[f.line], strata = f.line === 1;
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
      if (strata) for (let k = 0; k < 5; k++) { g.fillStyle = STRATA[(k + ty * 5) % 5]; g.fillRect(X, Y + k * 3, TILE, 3 + (k === 4 ? 1 : 0)); }
      else { g.fillStyle = '#8a8d92'; g.fillRect(X, Y, TILE, TILE); g.fillStyle = '#a3a6ab'; g.fillRect(X, Y, TILE, 2); if (tileAt(f, tx, ty + 1) !== T.WALL) { g.fillStyle = L.color; g.fillRect(X, Y + 8, TILE, 3); } }
      if (tileAt(f, tx, ty + 1) === T.WALL) { g.fillStyle = '#2c2620'; g.fillRect(X, Y, TILE, 3); }
      if (strata && rnd() < 0.12) { g.fillStyle = '#efe6cc'; g.fillRect(X + 4, Y + 5, 8, 5); g.fillStyle = '#5a4a3a'; g.fillRect(X + 5, Y + 7, 6, 1); g.fillRect(X + 7, Y + 6, 1, 3); }
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
  const M = MONSTERS[m.id], small = M.small, fr = A.mons[m.id] || A.mons[M.sprite] || A.mons.germ, X = Math.round(m.x), Y = Math.round(m.y);   // 작은 내성균은 내성균 그림을 작게, 그림 없는 보스는 색을 입혀 임시로
  const img = M.kind === 'boss' ? (m.windT > 0 ? fr[m.windT < 0.2 ? 3 : 2] : fr[Math.floor(t * 3) % 2]) : fr[Math.floor(m.t * (m.dash > 0 ? 16 : 8)) % fr.length];
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(X, Y, img.width * 0.35, 3, 0, 0, 7); x.fill();
  x.save(); x.translate(X, Y); x.scale(m.face, 1); if (m.flash > 0) x.filter = 'brightness(3)'; else if (m.invuln) x.filter = 'grayscale(1) brightness(.7)'; else if (m.stun > 0) x.filter = 'hue-rotate(180deg) saturate(2) brightness(1.3)'; else if (M.tint && !A.mons[m.id]) x.filter = M.tint; if (small) x.scale(0.6, 0.6); x.drawImage(img, -Math.round(img.width / 2), -img.height + 1); x.restore();
  const top = Y - img.height;
  if (game.w?.scanT > 0) { x.strokeStyle = '#ff4a3a'; x.lineWidth = 1; x.strokeRect(X - 4.5, top + img.height * 0.4 - 4.5, 9, 9); x.fillStyle = '#ff4a3a'; x.fillRect(X - 1, top + img.height * 0.4 - 1, 2, 2); }
  if (M.kind === 'boss') { const W = 60; x.fillStyle = '#111'; x.fillRect(X - W / 2, top - 8, W, 5); x.fillStyle = '#d84a3a'; x.fillRect(X - W / 2 + 1, top - 7, (W - 2) * m.hp / m.maxHp, 3); }
  if (m.windT > 0) { x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText('!', X, top - 10); x.fillStyle = '#ff3a2a'; x.fillText('!', X, top - 10); }
}

// ---------- 플레이어: 팔 없는 몸 + 떠서 흔들리는 총(반동) ----------
function drawPlayer(p, t) {
  const J = JOBS[p.job], fr = A.chars[J.sprite], img = p.moving ? fr[2 + Math.floor(t * 10) % 4] : fr[Math.floor(t * 2) % 2];
  if (p.rollT > 0) {   // 구르기: 몸을 굴리고 먼지를 남긴다(총은 잠깐 숨김)
    const a = (1 - p.rollT / 8) * Math.PI * 2 * (Math.cos(p.rollA) >= 0 ? 1 : -1);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(p.x, p.y, 7, 3, 0, 0, 7); x.fill();
    x.save(); x.translate(Math.round(p.x), Math.round(p.y - img.height / 2)); x.rotate(a); x.scale(0.9, 0.9); x.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2)); x.restore();
    if (Math.random() < 0.6) fx.parts.push({ x: p.x + (Math.random() - 0.5) * 8, y: p.y - 1, vx: -Math.cos(p.rollA) * 30, vy: -10, t: 0.3, c: '#a89a84' });
    return;
  }
  const k = p.kick * p.kick, bx = Math.round(p.x - Math.cos(p.aim) * k * 2), by = Math.round(p.y);
  const blink = p.invuln > 0 && Math.floor(p.invuln / 3) % 2;
  x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(bx, by, 7, 3, 0, 0, 7); x.fill();
  const sts = Object.keys(p.st || {}), SF = { infect: 'sepia(1) hue-rotate(50deg) saturate(2.5)', burn: 'sepia(1) saturate(4) hue-rotate(-20deg)', wet: 'hue-rotate(180deg) saturate(1.6)', corrode: 'sepia(1) hue-rotate(30deg) saturate(3)', frost: 'saturate(.3) brightness(1.4) hue-rotate(160deg)', shock: 'brightness(2)', root: 'hue-rotate(60deg)', poison: 'hue-rotate(250deg) saturate(1.8)' };
  if (!blink) { x.save(); x.translate(bx, by); x.scale(p.face, 1); if (sts.length && Math.floor(t * 4) % 2) x.filter = SF[sts[0]]; x.drawImage(img, -Math.round(img.width / 2), -img.height); x.restore(); }
  for (const id of sts) if (Math.random() < 0.25) fx.parts.push({ x: p.x + (Math.random() - 0.5) * 12, y: p.y - 8 - Math.random() * 14, vx: 0, vy: id === 'wet' ? 25 : -25, t: 0.4, c: STATUS[id].color });
  const g = A.weapons[WEAPONS[p.weapons[p.cur].id].sprite], bob = Math.round(Math.sin(t * 6) * 1.5), gx = bx + p.face * 4, gy = by - 9 + bob;
  x.save(); x.translate(gx, gy); x.rotate(p.aim - p.face * 0.5 * k); if (p.face < 0) x.scale(1, -1); x.drawImage(g, -3 - Math.round(k * 5), -Math.round(g.height / 2)); x.restore();
}

// ---------- 화면 효과: 피해 숫자, 불꽃, 총구 불꽃, 화면 흔들림 ----------
const fx = { nums: [], parts: [], flashes: [], rings: [], trail: [], shake: 0, skillFlash: 0 };
function feed(w) {
  const p = w.player;
  for (const e of w.events) {
    if (e.type === 'hit') { fx.nums.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y - 22, v: e.amount, t: 0.6 }); for (let i = 0; i < 4; i++) fx.parts.push({ x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, t: 0.3, c: '#ffe9a8' }); }
    else if (e.type === 'kill') { for (let i = 0; i < 12; i++) fx.parts.push({ x: e.x, y: e.y - 8, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0.45, c: '#d9d4c4' }); fx.shake = Math.max(fx.shake, 2); }
    else if (e.type === 'fire') { fx.flashes.push({ x: p.x + p.face * 4 + Math.cos(p.aim) * 12, y: p.y - 9 + Math.sin(p.aim) * 12, a: p.aim, t: 0.05 }); fx.shake = Math.max(fx.shake, WEAPONS[e.weapon].kick * 1.5); }
    else if (e.type === 'hurt') { if (!e.dot) fx.shake = Math.max(fx.shake, 4); if (e.amount) fx.nums.push({ x: p.x, y: p.y - 34, v: '-' + e.amount, t: 0.8, red: true }); }
    else if (e.type === 'status') pop(`${STATUS[e.id].icon} ${STATUS[e.id].name}!`, STATUS[e.id].color);
    else if (e.type === 'revive') { pop('💉 백신 앰플! 다시 일어났다', '#7ae08a'); fx.skillFlash = 0.6; }
    else if (e.type === 'crit') fx.nums.push({ x: e.x, y: e.y - 34, v: '치명타', t: 0.6, gold: true });
    else if (e.type === 'spark') fx.parts.push({ x: e.x, y: e.y, vx: 0, vy: -20, t: 0.15, c: '#fff' });
    else if (e.type === 'pickup') fx.nums.push({ x: p.x, y: p.y - 36, v: e.kind === 'mat' ? `+${MATS[e.id]}` : `+부품 ${e.n}`, t: 0.8, gold: true });
    else if (e.type === 'getWeapon') tip(`🔫 ${WEAPONS[e.id].name}`, 1.5);
    else if (e.type === 'swap') tip(`🔁 ${WEAPONS[p.weapons[p.cur].id].name}`, 0.9);
    else if (e.type === 'zap') fx.zaps = (fx.zaps || []).concat([{ ...e, t: 0.12 }]);
    else if (e.type === 'trapHit') { fx.rings.push({ x: e.x, y: e.y, r: e.r, t: 0.35, c: { vent: '#ff7a2a', meteor: '#ffb060', gas: '#9ad050', heat: '#ffb040', icicle: '#bfe8ff', drip: '#ff9a4a', acidrain: '#b8f040', vine: '#6ac050' }[e.kind] || '#fff' });
      for (let i = 0; i < 14; i++) fx.parts.push({ x: e.x, y: e.y - 4, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.8) * 160, t: 0.45, c: { vent: '#ff8a3a', meteor: '#8a6a4a', icicle: '#e8f8ff' }[e.kind] || '#ffd060' }); if (e.kind === 'meteor' || e.kind === 'vent') fx.shake = Math.max(fx.shake, 4); }
    else if (e.type === 'burn') fx.parts.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y, vx: 0, vy: -30, t: 0.35, c: Math.random() < 0.5 ? '#ff8a3a' : '#ffd060' });
    else if (e.type === 'sleep') { const m = w.mons.find(o => o.uid === e.uid); if (m) fx.nums.push({ x: m.x, y: m.y - 28, v: 'Zz', t: 1.2, blue: true }); }
    else if (e.type === 'propBreak') { for (let i = 0; i < 10; i++) fx.parts.push({ x: e.x, y: e.y - 6, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.7) * 120, t: 0.4, c: i % 2 ? '#b9844a' : '#6a4a2a' }); fx.shake = Math.max(fx.shake, 2); }
    else if (e.type === 'skill') fx.skillFlash = 0.35;
    else if (e.type === 'charge') fx.nums.push({ x: p.x, y: p.y - 36, v: `방어막 +${e.amount}`, t: 1, blue: true });
    else if (e.type === 'splash') { fx.rings.push({ x: e.x, y: e.y, r: e.r, t: 0.35, c: '#7ad0ff' }); for (let i = 0; i < 18; i++) fx.parts.push({ x: e.x, y: e.y - 4, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 160, t: 0.45, c: i % 2 ? '#bfe8ff' : '#ffffff' }); fx.shake = Math.max(fx.shake, 3); }
    else if (e.type === 'heal') fx.nums.push({ x: p.x, y: p.y - 34, v: '+1', t: 0.7, green: true });
  }
}
function updateFx(dt) {
  fx.skillFlash = Math.max(0, fx.skillFlash - dt); fx.zaps = (fx.zaps || []).filter(z => (z.t -= dt) > 0);
  for (const L of [fx.nums, fx.parts, fx.flashes, fx.rings, fx.trail]) { for (const o of L) { o.t -= dt; if (o.vx !== undefined) { o.x += o.vx * dt; o.y += o.vy * dt; } } for (let i = L.length - 1; i >= 0; i--) if (L[i].t <= 0) L.splice(i, 1); }
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
  // 스킬 효과(바닥): 응급 처치 회복 구역, 돌진 잔상
  for (const z of w.zones) { const acid = z.kind !== 'heal', ZC = { acid: '170,220,60', acidpool: '190,240,70', lava: '255,110,30', fire: '255,170,60', gas: '140,190,80', smog: '110,100,120' }[z.kind]; x.fillStyle = acid ? `rgba(${ZC},${0.35 + 0.08 * Math.sin(t * 8)})` : `rgba(90,220,120,${0.18 + 0.06 * Math.sin(t * 6)})`; x.beginPath(); x.ellipse(z.x, z.y, z.r, z.r * 0.55, 0, 0, 7); x.fill(); if (!acid) { x.strokeStyle = 'rgba(140,255,170,.7)'; x.stroke(); } }
  // 함정: 분화구·분출구(경고 중이면 붉게 깜빡), 웅덩이·덩굴, 전기 바닥, 떨어질 자리 표시
  for (const tr of w.traps) { if (tr.x === undefined) continue; const X = Math.round(tr.x), Y = Math.round(tr.y);
    if (tr.mode === 'vent') { const C = { vent: ['#2a1a14', '#ff7a2a'], gas: ['#1e2a1a', '#9ad050'], smog: ['#1c1a20', '#8a8090'], heat: ['#3a2a1a', '#ffb040'] }[tr.kind]; x.fillStyle = C[0]; x.beginPath(); x.ellipse(X, Y, 10, 6, 0, 0, 7); x.fill(); x.fillStyle = C[1]; x.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5 + X); x.beginPath(); x.ellipse(X, Y, 5, 3, 0, 0, 7); x.fill(); x.globalAlpha = 1;
      if (tr.warn > 0) { x.strokeStyle = `rgba(255,60,40,${0.5 + 0.5 * Math.abs(Math.sin(t * 20))})`; x.lineWidth = 2; x.beginPath(); x.ellipse(X, Y, 26, 15, 0, 0, 7); x.stroke(); } }
    else if (tr.mode === 'pool') { x.fillStyle = { vine: 'rgba(70,140,50,.55)', sewage: 'rgba(110,130,40,.6)', ice: 'rgba(200,235,255,.55)' }[tr.kind] || 'rgba(80,140,210,.45)'; x.beginPath(); x.ellipse(X, Y, tr.r, tr.r * 0.55, 0, 0, 7); x.fill();
      if (tr.kind === 'sewage') { x.fillStyle = '#c8e070'; for (let i = 0; i < 3; i++) { const b = (t * 0.8 + i * 0.33) % 1; x.globalAlpha = 1 - b; x.beginPath(); x.arc(X + (i - 1) * 9, Y - b * 5, 1.5 + b * 2, 0, 7); x.fill(); } x.globalAlpha = 1; }
      if (tr.kind === 'ice') { x.fillStyle = 'rgba(255,255,255,.8)'; x.fillRect(X - 9, Y - 4, 6, 1); x.fillRect(X + 3, Y + 1, 5, 1); x.fillRect(X - 2, Y - 1, 3, 1); }
      if (tr.kind === 'vine') { x.strokeStyle = '#3a7a2a'; x.lineWidth = 1; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(X + (i - 1.5) * 8, Y, 4, Math.PI, 0); x.stroke(); } } }
    else if (tr.mode === 'pulse') { x.fillStyle = tr.on ? 'rgba(255,230,80,.55)' : 'rgba(90,95,104,.6)'; x.fillRect(X - tr.r, Y - tr.r * 0.5, tr.r * 2, tr.r); x.strokeStyle = '#2a2d33'; x.strokeRect(X - tr.r + 0.5, Y - tr.r * 0.5 + 0.5, tr.r * 2 - 1, tr.r - 1);
      if (tr.on && Math.random() < 0.5) fx.parts.push({ x: X + (Math.random() - 0.5) * tr.r * 2, y: Y + (Math.random() - 0.5) * tr.r, vx: 0, vy: -40, t: 0.15, c: '#fff6a0' }); } }
  for (const d of w.falls) { const k = Math.min(1, Math.max(0, d.t / (d.T || 0.9))), X = Math.round(d.x), Y = Math.round(d.y); x.fillStyle = `rgba(0,0,0,${0.45 - 0.3 * k})`; x.beginPath(); x.ellipse(X, Y, d.r * (1 - k * 0.6), d.r * 0.55 * (1 - k * 0.6), 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,60,40,.85)'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(X, Y, d.r, d.r * 0.55, 0, 0, 7); x.stroke();
    const FC = { meteor: '#5a3a2a', icicle: '#bfe8ff', drip: '#c86a2a', acidrain: '#b8f040' }[d.kind] || '#888'; const h = k * 90; x.fillStyle = FC; x.fillRect(X - 3, Y - 6 - h, 6, 6); if (d.kind === 'meteor') { x.fillStyle = 'rgba(255,140,40,.7)'; x.fillRect(X - 2, Y - 12 - h, 4, 6); } }
  for (const k of w.pickups) {   // 떨어진 물건: 무기(그림), 재료(색 주머니), 부품(톱니)
    const X = Math.round(k.x), Y = Math.round(k.y + Math.sin(t * 4 + k.x) * 1.5);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X - 5, Math.round(k.y) + 3, 10, 2);
    if (k.kind === 'weapon') { const g = A.weapons[WEAPONS[k.id].sprite]; x.fillStyle = 'rgba(255,230,140,.25)'; x.beginPath(); x.arc(X, Y - 2, 11, 0, 7); x.fill(); x.drawImage(g, X - Math.round(g.width / 2), Y - Math.round(g.height / 2) - 2);
      if (Math.hypot(p.x - k.x, p.y - k.y) < 22) { x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#000'; const s2 = `E 줍기: ${WEAPONS[k.id].name}${k.lv ? ' +' + k.lv : ''}`; x.strokeText(s2, X, Y - 16); x.fillStyle = '#ffe9a0'; x.fillText(s2, X, Y - 16); } }
    else if (k.kind === 'mat') { const C = { cloth: '#d8c8a8', rubber: '#3a3a3a', glass: '#9ad8f0', filter: '#e8e8e8', scrap: '#8a8f98', leather: '#8a5a3a' }[k.id]; x.fillStyle = '#111'; x.fillRect(X - 5, Y - 7, 10, 9); x.fillStyle = C; x.fillRect(X - 4, Y - 6, 8, 7); }
    else { x.fillStyle = '#111'; x.fillRect(X - 5, Y - 7, 10, 10); x.fillStyle = '#c8ccd2'; x.fillRect(X - 4, Y - 6, 8, 8); x.fillStyle = '#5a5f68'; x.fillRect(X - 1, Y - 3, 3, 3); }
  }
  for (const o of w.props) { const X = Math.round(o.x), Y = Math.round(o.y); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(X - 9, Y - 1, 18, 3);
    if (o.kind === 'rock') { x.fillStyle = '#18161a'; x.fillRect(X - 10, Y - 14, 20, 14); x.fillStyle = '#6a6460'; x.fillRect(X - 9, Y - 13, 18, 12); x.fillStyle = '#8a847c'; x.fillRect(X - 8, Y - 13, 9, 4); x.fillStyle = '#4a4642'; x.fillRect(X + 2, Y - 7, 6, 5); if (o.hp < 14) { x.fillStyle = '#18161a'; x.fillRect(X - 2, Y - 12, 1, 7); x.fillRect(X - 1, Y - 6, 3, 1); } continue; }
    if (o.kind === 'barrel') { x.fillStyle = '#18161a'; x.fillRect(X - 7, Y - 16, 14, 16); x.fillStyle = '#c83a2a'; x.fillRect(X - 6, Y - 15, 12, 14); x.fillStyle = '#e8c040'; x.fillRect(X - 6, Y - 10, 12, 3); x.fillStyle = '#1c1c1c'; x.fillRect(X - 2, Y - 10, 4, 3); x.fillStyle = '#e86a5a'; x.fillRect(X - 6, Y - 15, 12, 2); continue; }
    x.fillStyle = '#2a1c10'; x.fillRect(X - 9, Y - 15, 18, 15); x.fillStyle = '#a8743a'; x.fillRect(X - 8, Y - 14, 16, 13); x.fillStyle = '#7a5028'; x.fillRect(X - 8, Y - 9, 16, 2); x.fillRect(X - 1, Y - 14, 2, 13); x.fillStyle = '#c8945a'; x.fillRect(X - 8, Y - 14, 16, 2); }
  if (p.dashT > 0) fx.trail.push({ x: p.x, y: p.y, t: 0.25 });
  for (const q of fx.trail) { x.globalAlpha = q.t * 2; x.fillStyle = '#7ad0ff'; x.fillRect(Math.round(q.x) - 6, Math.round(q.y) - 22, 12, 22); } x.globalAlpha = 1;
  const list = [...w.mons.map(m => ({ y: m.y, d: () => drawMon(m, t) })), { y: p.y, d: () => drawPlayer(p, t) }];
  list.sort((a, b) => a.y - b.y).forEach(o => o.d());
  // 생물적 방제의 천적(매), 중화제 플라스크, 터지는 고리
  for (const a of w.allies) { const f = Math.floor(t * 10) % 2, X = Math.round(a.x), Y = Math.round(a.y); x.fillStyle = '#3a2a1a'; x.fillRect(X - 5, Y - 2, 10, 4); x.fillStyle = '#8a5a2a'; x.fillRect(X - 4, Y - 1, 8, 2); x.fillStyle = '#5a3a1a'; x.fillRect(X - 9, Y - (f ? 4 : 0), 5, 2); x.fillRect(X + 4, Y - (f ? 4 : 0), 5, 2); x.fillStyle = '#ffd040'; x.fillRect(X + 3, Y - 2, 2, 1); }
  for (const b of w.bombs) { const k = b.t / b.T, z = Math.sin(k * Math.PI) * 26; x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(Math.round(b.x) - 3, Math.round(b.y) + 6, 6, 2); x.fillStyle = '#1c2a3a'; x.fillRect(Math.round(b.x) - 3, Math.round(b.y - z) - 4, 7, 8); x.fillStyle = '#7ad0ff'; x.fillRect(Math.round(b.x) - 2, Math.round(b.y - z) - 1, 5, 4); x.fillStyle = '#e8e8e8'; x.fillRect(Math.round(b.x) - 1, Math.round(b.y - z) - 6, 3, 3); }
  for (const r of fx.rings) { x.globalAlpha = r.t / 0.35; x.strokeStyle = r.c; x.lineWidth = 2; const k = 1.15 - r.t; x.beginPath(); x.ellipse(r.x, r.y, r.r * k, r.r * 0.55 * k, 0, 0, 7); x.stroke(); } x.globalAlpha = 1;
  // 무기마다 탄 모양: 신호탄(붉은 불꽃), 드릴 날(회색 쐐기), 다트(가는 침), 시약(초록 방울), 번개(하늘빛), 전기 충격(노란 불꽃)
  for (const s of w.shots) { const X = Math.round(s.x), Y = Math.round(s.y), a = Math.atan2(s.vy, s.vx);
    if (s.weapon === 'flare') { x.fillStyle = 'rgba(255,120,40,.35)'; x.beginPath(); x.arc(X, Y, 5, 0, 7); x.fill(); x.fillStyle = '#ffdd60'; x.fillRect(X - 2, Y - 2, 4, 4); }
    else if (s.weapon === 'drill' || s.weapon === 'dart') { x.save(); x.translate(X, Y); x.rotate(a); x.fillStyle = s.weapon === 'drill' ? '#c8ccd2' : '#e8e0c8'; x.fillRect(-4, -1, 7, 2); x.fillStyle = s.weapon === 'drill' ? '#7a7f88' : '#8ac850'; x.fillRect(-5, -2, 2, 4); x.restore(); }
    else { x.fillStyle = { reagent: '#b8f040', rod: '#9ad8ff', defib: '#ffe860' }[s.weapon] || '#fff2a0'; x.fillRect(X - 2, Y - 2, 4, 4); } }
  for (const z of fx.zaps || []) { x.strokeStyle = '#bfefff'; x.lineWidth = 2; x.beginPath(); x.moveTo(z.x1, z.y1); x.lineTo((z.x1 + z.x2) / 2 + 4, (z.y1 + z.y2) / 2 - 5); x.lineTo(z.x2, z.y2); x.stroke(); }
  const ECOL = { germ: '#8ad050', germlet: '#b8f070', ammonite: '#6a3a8a', fossilrex: '#ff8a3a' };   // 몬스터마다 탄 색과 크기
  for (const e of w.eshots) { const z = e.size || 3, X = Math.round(e.x), Y = Math.round(e.y); x.fillStyle = '#1a0c10'; x.beginPath(); x.arc(X, Y, z + 1, 0, 7); x.fill(); x.fillStyle = ECOL[e.src] || '#ff6a5a'; x.beginPath(); x.arc(X, Y, z, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(X - 1, Y - 1, 1, 1); }
  for (const f of fx.flashes) { x.save(); x.translate(f.x, f.y); x.rotate(f.a); x.fillStyle = '#ffd040'; x.beginPath(); x.moveTo(0, -4); x.lineTo(10, 0); x.lineTo(0, 4); x.fill(); x.restore(); }
  for (const q of fx.parts) { x.fillStyle = q.c; x.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
  x.textAlign = 'center'; x.font = 'bold 10px sans-serif'; x.lineWidth = 3;
  for (const n of fx.nums) { const up = (0.7 - n.t) * 24; x.strokeStyle = '#000'; x.strokeText(n.v, n.x, n.y - up); x.fillStyle = n.red ? '#ff5a4a' : n.blue ? '#8ad0ff' : n.green ? '#7ae08a' : n.gold ? '#ffd060' : '#fff'; x.fillText(n.v, n.x, n.y - up); }
  x.restore();
  if (w.hazardOffT > 0 || fx.skillFlash > 0) { x.fillStyle = w.hazardOffT > 0 ? 'rgba(170,220,255,.10)' : `rgba(255,255,255,${fx.skillFlash * 0.4})`; x.fillRect(0, 0, VIEW_W, VIEW_H); }
  drawMinimap(w);
}

// ---------- HUD, 안내 ----------
let tipT = 0; function tip(s, sec) { $('tip').textContent = s; $('tip').classList.add('on'); tipT = sec; }
function bar(id, v, m, label) { $(id).querySelector('i').style.width = Math.max(0, v / m * 100) + '%'; $(id).querySelector('span').textContent = label; }
function hud(w, dt) {
  const p = w.player; bar('hp', p.hp, p.maxHp, `체력 ${p.hp}/${p.maxHp}`); bar('sh', p.shield, p.maxShield, `방어막 ${p.shield}/${p.maxShield}`); bar('en', p.energy, p.maxEnergy, `에너지 ${Math.floor(p.energy)}/${p.maxEnergy}`);
  const sec = Math.floor((game.run.ticks + w.tick) / 30);
  $('where').textContent = `${w.line}호선 ${LINES[w.line].name} · ${w.order + 1}/${RUN_LINES} · ⏱ ${clock(sec)}`;
  if (tipT > 0 && (tipT -= dt) <= 0) $('tip').classList.remove('on');
  // 무기 칸(웹 글씨): 바뀔 때만 다시 만든다
  const key = p.cur + ':' + p.weapons.map(it => it.id + it.lv).join(',');
  if (key !== lastSlots) { lastSlots = key; $('wslots').innerHTML = p.weapons.map((it, i) => `<div class="ws ${i === p.cur ? 'on' : ''}"><canvas width="22" height="12" data-w="${it.id}"></canvas><div>${WEAPONS[it.id].name}${it.lv ? ' +' + it.lv : ''}</div></div>`).join('');
    for (const c of $('wslots').querySelectorAll('canvas')) { const g = c.getContext('2d'), im = A.weapons[WEAPONS[c.dataset.w].sprite]; g.imageSmoothingEnabled = false; g.drawImage(im, Math.round((22 - im.width) / 2), Math.round((12 - im.height) / 2)); } }
  $('parts').textContent = `부품 ${game.run.parts + w.loot.parts}`;
  const near = w.pickups.find(k => k.kind === 'weapon' && Math.hypot(k.x - p.x, k.y - p.y) < 22);
  $('pickhint').textContent = near ? `E 줍기: ${WEAPONS[near.id].name}${near.lv ? ' +' + near.lv : ''}` : '';
  const stKey = Object.entries(p.st || {}).map(([id, v]) => id + Math.ceil(v)).join(',');
  if (stKey !== lastSt) { lastSt = stKey; $('status').innerHTML = Object.entries(p.st || {}).map(([id, v]) => `<span style="border-color:${STATUS[id].color}">${STATUS[id].icon} ${STATUS[id].name} ${Math.ceil(v)}</span>`).join(''); }
  const S = JOBS[p.job].skill, k = p.skillCd / Math.max(1, Math.round(S.cd * 30 * w.mods.skillCdMul));
  $('skill').classList.toggle('cd', k > 0); $('skillFill').style.height = Math.min(100, k * 100) + '%'; $('skillName').textContent = S.name; $('skillCd').textContent = k > 0 ? Math.ceil(p.skillCd / 30) + '초' : '우클릭';
}
let lastSlots = '', lastSt = '';
// 상태 이상 알림: 캐릭터 머리 위(화면 가운데)에 큰 글씨로 떠올랐다 사라진다
function pop(text, color) {
  const el = document.createElement('div'), r = cv.getBoundingClientRect();
  el.className = 'pop'; el.textContent = text; el.style.color = color; el.style.left = r.left + r.width / 2 + 'px'; el.style.top = r.top + r.height * 0.36 + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}

// ---------- 흐름: 직업 고르기 → 환승역(열린 호선 중 3개) → 호선 던전 → … 5개 → 지상 출구 ----------
const game = { w: null, bg: null, acc: 0, run: null, open: [1, 2, 3, 4, 5, 6, 7, 8, 9], meta: loadMeta() };
const clock = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
// 교사가 열어 둔 호선(연구소에 연결되어 있을 때만 서버에서 읽고, 아니면 모두 열림)
async function loadOpenLines() { try { if (typeof supaRpc === 'function') { const o = await supaRpc('subway_lines_get', {}); if (o?.open?.length) game.open = o.open; } } catch (e) {} }
// 토큰·유물은 이 기기에 저장한다(연구소에 연결하면 서버로 옮긴다)
function loadMeta() { try { const m = JSON.parse(localStorage.getItem('makcha.meta')); if (m && typeof m.coins === 'number') return { ...newMeta(), ...m }; } catch (e) {} return newMeta(); }
function saveMeta() { try { localStorage.setItem('makcha.meta', JSON.stringify(game.meta)); } catch (e) {} }
const relicChip = (id, extra = '') => { const R0 = RELICS[id], G = GRADES[R0.grade]; return `<span class="relic" style="border-color:${G.color}" ${extra}><b style="color:${G.color}">${R0.name}</b><small>${R0.text}</small></span>`; };
function gacha(result = null) {
  const m = game.meta, ids = Object.keys(RELICS), owned = ids.filter(id => m.relics[id]).length;
  menu(`<h1>🎰 역무실 유물 뽑기</h1><p>🪙 토큰 <b style="color:var(--acc)">${m.coins}</b> · 모은 유물 ${owned}/${ids.length} · 끼운 유물 ${m.equip.length}/${RELIC_SLOTS}</p>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="job" id="pull" style="background:var(--acc);color:#1a1410;font-weight:800;opacity:${m.coins >= GACHA_COST ? 1 : 0.5}">뽑기 🪙 ${GACHA_COST}</button><button class="job" id="back">← 돌아가기</button>
    ${result ? `<div class="gres" style="border-color:${GRADES[result.grade].color}"><small style="color:${GRADES[result.grade].color}">${GRADES[result.grade].name}</small> <b>${RELICS[result.id].name}</b> ${result.dup ? `<small>이미 있다 · 🪙 +${GRADES[result.grade].refund}</small>` : '<small>NEW</small>'}<br><small>${RELICS[result.id].text}</small></div>` : ''}</div>
    <p style="margin:12px 0 4px;font-size:13px">눌러서 끼우기·빼기(2개까지)</p>
    <div class="relics">${['S', 'A', 'B', 'C'].flatMap(g => ids.filter(id => RELICS[id].grade === g)).map(id => m.relics[id]
      ? relicChip(id, `data-r="${id}" ${m.equip.includes(id) ? 'data-on="1"' : ''}`)
      : `<span class="relic unknown" style="border-color:${GRADES[RELICS[id].grade].color}55"><b style="color:${GRADES[RELICS[id].grade].color}88">${GRADES[RELICS[id].grade].name}</b><small>???</small></span>`).join('')}</div>`);
  $('pull').onclick = () => { const r = pullRelic(m, Math.random(), Math.random()); if (!r) return; saveMeta(); gacha(r); };
  $('back').onclick = jobSelect;
  for (const b of document.querySelectorAll('[data-r]')) b.onclick = () => { toggleEquip(m, b.dataset.r); saveMeta(); gacha(); };
}
function menu(html) { $('card').innerHTML = html; $('menu').hidden = false; $('hud').hidden = true; $('loadout').hidden = true; }
function jobSelect() {
  const m = game.meta;
  menu(`<h1>🚇 막차: 지하 생존기</h1><p>호선 ${RUN_LINES}개를 지나 탈출하라.</p><p style="font-size:13px">이동 WASD · 쏘기 마우스 왼쪽 · 스킬 마우스 오른쪽 · 구르기 Shift · 무기 바꾸기 Q · 줍기 E</p>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><button class="job" id="gacha">🎰 유물 뽑기 · 🪙 ${m.coins}</button>${m.equip.map(id => relicChip(id)).join('')}${m.equip.length < RELIC_SLOTS ? `<span class="relic unknown"><small>빈 칸</small></span>` : ''}</div>
    <div class="jobs">${JOB_ORDER.map(j => `<button class="job" data-j="${j}"><canvas width="19" height="30" data-c="${JOBS[j].sprite}"></canvas>${JOBS[j].name}<br><small style="color:var(--sub)">${WEAPONS[JOBS[j].weapon].name}<br>${JOBS[j].skill.name}</small></button>`).join('')}</div>`);
  for (const c of document.querySelectorAll('[data-c]')) { const g = c.getContext('2d'), im = A.chars[+c.dataset.c][0]; c.width = im.width; c.height = im.height; g.drawImage(im, 0, 0); }
  for (const b of document.querySelectorAll('[data-j]')) b.onclick = () => { document.documentElement.requestFullscreen?.().catch(() => {}); game.run = createRun({ seed: (Date.now() ^ (Math.random() * 2 ** 31)) >>> 0, job: b.dataset.j, relics: m.equip }); transfer(); };
  $('gacha').onclick = () => gacha();
}
const matText = m => Object.entries(m).filter(([, v]) => v > 0).map(([k, v]) => `${MATS[k]} ${v}`).join(', ') || '없음';
function abilityPick() {
  const r = game.run, offer = offerAbilities(r), KIND = { gun: '🔫 총', body: '💪 몸', skill: '✨ 스킬' };
  if (!offer.length) return workshop();
  menu(`<h1>🔁 환승역 · 특수능력 고르기</h1><p>⏱ ${clock(Math.floor(r.ticks / 30))} · 🪙 +${r.lastCoins}</p>
    <div class="jobs" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${offer.map(id => { const a = ABILITIES[id]; return `<button class="job" data-a="${id}" style="text-align:left"><small style="color:var(--acc)">${KIND[a.kind]}</small><br><b style="font-size:17px">${a.name}</b></button>`; }).join('')}</div>
    ${r.abilities.length ? `<p style="margin-top:10px">가진 특수능력: ${r.abilities.map(id => ABILITIES[id].name).join(', ')}</p>` : ''}`);
  for (const b of document.querySelectorAll('[data-a]')) b.onclick = () => { applyAbility(r, b.dataset.a); workshop(); };
}
function workshop(msg = '') {
  const r = game.run, slots = ['head', 'body', 'feet'], SL = { head: '머리', body: '몸', feet: '발' };
  menu(`<h1>🔧 정비소</h1><p>부품 <b>${r.parts}</b> · 재료: ${matText(r.mats)} · 장비: ${slots.map(sl => `${SL[sl]} ${r.gear[sl] ? GEAR[r.gear[sl]].name : '없음'}`).join(' · ')}</p>${msg ? `<p style="color:var(--acc)">${msg}</p>` : ''}
    <h2 style="font-size:16px;margin:10px 0 4px">강화(부품)</h2><div class="jobs" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${r.weapons.map((it, i) => { const W = WEAPONS[it.id], c = enhanceCost(r, it.lv), ok = it.lv < MAX_LV && r.parts >= c;
      return `<button class="job" data-e="${i}" style="text-align:left;opacity:${ok ? 1 : 0.5}"><b>${W.name} +${it.lv}</b><br><small style="color:var(--sub)">${it.lv >= MAX_LV ? '최고 단계' : `→ +${it.lv + 1} · 부품 ${c}`}</small></button>`; }).join('')}
      ${(() => { const S = JOBS[r.job].skill, c = skillCost(r), ok = r.skillLv < SKILL_MAX && r.parts >= c; return `<button class="job" id="skillUp" style="text-align:left;opacity:${ok ? 1 : 0.5}"><b>✨ ${S.name} Lv ${r.skillLv}</b><br><small style="color:var(--sub)">${r.skillLv >= SKILL_MAX ? '최고 레벨' : `→ Lv ${r.skillLv + 1} · 부품 ${c}`}</small></button>`; })()}</div>
    <h2 style="font-size:16px;margin:12px 0 4px">장비 만들기(재료)</h2><div class="jobs" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${Object.entries(GEAR).map(([id, g]) => { const ok = canCraft(r, id);
      return `<button class="job" data-g="${id}" style="text-align:left;opacity:${ok ? 1 : 0.5}"><b>${g.name}</b> <small>(${SL[g.slot]})</small>${r.gear[g.slot] === id ? ' ✔' : ''}<br><small style="color:var(--sub)">${r.gear[g.slot] === id ? g.text + '<br>' : ''}${matText(g.recipe)}</small></button>`; }).join('')}</div>
    <div style="margin-top:14px"><button class="job" id="next" style="background:var(--acc);color:#1a1410;font-weight:800">다음 호선 고르기 →</button></div>`);
  for (const b of document.querySelectorAll('[data-e]')) b.onclick = () => workshop(enhanceWeapon(r, +b.dataset.e) ? `${josa(WEAPONS[r.weapons[+b.dataset.e].id].name, '을', '를')} +${r.weapons[+b.dataset.e].lv}로 강화했다` : '부품이 모자라거나 최고 단계다');
  for (const b of document.querySelectorAll('[data-g]')) b.onclick = () => workshop(craftGear(r, b.dataset.g) ? `${josa(GEAR[b.dataset.g].name, '을', '를')} 만들어 입었다` : '재료가 모자란다');
  $('skillUp').onclick = () => workshop(upgradeSkill(r) ? `${JOBS[r.job].skill.name} Lv ${r.skillLv}` : '부품이 모자란다');
  $('next').onclick = transfer;
}
function transfer() {
  const r = game.run, offer = offerLines(r, game.open), first = r.visited.length === 0;
  game.w = null;
  menu(`<h1>${first ? '🏠 은신처 역' : '🔁 환승역'} · ${r.visited.length + 1}/${RUN_LINES}번째 호선</h1><p>${first ? '첫 호선을 고르자.' : `지금까지 ${r.visited.map(n => n + '호선').join(' → ')} · ⏱ ${clock(Math.floor(r.ticks / 30))}`} </p>
    <div class="jobs" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${offer.map(n => { const L = LINES[n]; return `<button class="job" data-l="${n}" style="text-align:left">
      <span style="display:inline-flex;width:30px;height:30px;border-radius:50%;background:${L.color};color:#fff;font-weight:800;align-items:center;justify-content:center;margin-right:6px">${n}</span><b>${L.name}</b>
      ${r.visited.includes(n) ? '<br><small style="color:var(--sub)">다시 가는 호선</small>' : ''}</button>`; }).join('')}</div>`);
  for (const b of document.querySelectorAll('[data-l]')) b.onclick = () => startLine(+b.dataset.l);
}
function startLine(n) {
  const w = enterLine(game.run, n); game.w = w; game.bg = bakeFloor(w.floor); game.acc = 0;
  $('menu').hidden = true; $('hud').hidden = false; $('loadout').hidden = false; lastSlots = ''; tip(`🚇 ${n}호선 ${LINES[n].name}`, 2);
}
function endLine(w) {
  const r = game.run; finishLine(r, w); game.w = null;
  game.meta.coins += r.lastCoins; saveMeta();
  const time = clock(Math.floor(r.ticks / 30)), coinLine = `<p>🪙 토큰 +${r.lastCoins} (이번 판 ${r.coins})</p>`;
  if (r.dead) return menu(`<h1>💀 쓰러졌다</h1><p>${w.line}호선 ${LINES[w.line].name}에서 쓰러졌다. 지난 호선 ${r.visited.length}개 · ⏱ ${time}</p>${coinLine}<button class="job" id="again">처음부터</button>`), ($('again').onclick = jobSelect);
  if (r.escaped) return menu(`<h1>🎉 탈출 성공!</h1><p>${r.visited.map(n => n + '호선').join(' → ')}을 지나 지상 출구로 나왔다.</p><p style="font-size:22px;color:var(--ink)">⏱ 걸린 시간 <b>${time}</b></p>${coinLine}<p>지상 출구의 최종 보스 「폭주하는 막차」는 다음 단계에서 만든다.</p><button class="job" id="again">처음부터</button>`), ($('again').onclick = jobSelect);
  abilityPick();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)), t = now / 1000; last = now;
  const w = game.w;
  if (w && !w.done) {
    game.acc += dt; let n = 0;
    while (game.acc >= DT && n++ < 5) { game.acc -= DT; step(w, readInput()); feed(w); if (w.done) break; }
    if (n >= 5) game.acc = 0;
    if (w.done) setTimeout(() => endLine(w), w.done === 'dead' ? 800 : 150);
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
  window.__game = game; window.__line = n => startLine(n); window.__coins = n => { game.meta.coins += n; saveMeta(); };   // 개발용: 원하는 호선으로 바로 가기, 토큰 넣기
  await loadOpenLines();
  jobSelect(); requestAnimationFrame(frame);
})();
