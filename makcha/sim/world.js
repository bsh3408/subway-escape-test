// 호선 하나의 진행(30Hz 고정 틱): 걷기·구르기·벽 충돌, 방 들어가면 문 잠김·적 등장, 다 잡으면 문 열림,
// 자동 조준 사격(무기 2개 교체·줍기·강화·직업 특색), 상자·지형지물, 보스 패턴, 직업 스킬, 보스 포털로 다음 환승역
// 상태는 모두 평범한 데이터이고, 난수는 정수 w.rng로만 이어진다
import { createRng } from './rng.js';
import { generateFloor, isSolid, T } from './dungeon.js';
import { INPUT, TILE, DT, TICK_HZ } from './constants.js';
import { JOBS, WEAPONS, MONSTERS, WAVES, MATS, LINES, TRAPS } from './data.js';
import { difficulty, GEAR } from './run.js';

const DASH_SPEED = 420, PLAYER_SPEED = 140, ROLL_SPEED = 330, ROLL_T = 8, ROLL_CD = 24, INVULN = 18, REGEN_WAIT = 3 * TICK_HZ, REGEN_EVERY = 30, AIM_RANGE = 300, PICK_R = 14;
const MAT_IDS = Object.keys(MATS);

// 특수능력을 무기·몸·스킬 수치로 바꾼다
function modsOf(ab) {
  const has = id => ab.includes(id);
  return { extraShot: has('extraShot') ? 1 : 0, pierce: has('pierceUp') ? 1 : 0, bounce: has('bounce') ? 1 : 0, homing: has('homing'), boom: has('boom'),
    rateMul: has('rapid') ? 1.25 : 1, dmgMul: has('bigShot') ? 1.3 : 1, speedMul: has('swift') ? 1.12 : 1, rollCdMul: has('rollMaster') ? 0.5 : 1,
    scavenger: has('scavenger'), skillCdMul: has('skillCd') ? 0.7 : 1, skillPower: has('skillPower') ? 1.5 : 1, skillCharge: has('skillCharge') };
}

export function createWorld({ seed, job, line, order, loadout }) {
  const floor = generateFloor(seed, { line, order }), J = JOBS[job], s = floor.rooms[0], rng = createRng(seed).fork('props');
  const L = { weapons: [{ id: J.weapon, lv: 0 }], cur: 0, gear: { head: null, body: null, feet: null }, abilities: [],
    stats: { hp: J.hp, maxHp: J.hp, shield: J.shield, maxShield: J.shield, energy: J.energy, maxEnergy: J.energy }, ...(loadout || {}) };   // 넘겨받지 않은 항목은 직업 기본값
  const bonusShield = Object.values(L.gear).reduce((a, g) => a + (g && GEAR[g].shield || 0), 0);
  // 상자: 전투·엘리트 방마다 2~3개, 부수면 부품·재료가 나온다
  const props = [];
  for (const r of floor.rooms) if (r.type === 'battle' || r.type === 'elite') for (let i = 0, n = 2 + rng.int(2); i < n; i++) {
    for (let k = 0; k < 30; k++) {
      const tx = r.x0 + 1 + rng.int(r.w - 2), ty = r.y0 + 1 + rng.int(r.h - 2);
      if (Math.abs(tx - r.cx) < 3 || Math.abs(ty - r.cy) < 3 || isSolid(floor, tx, ty) || props.some(o => Math.hypot(o.x - (tx + 0.5) * TILE, o.y - (ty + 0.5) * TILE) < 30)) continue;
      props.push({ kind: 'crate', room: r.id, x: (tx + 0.5) * TILE, y: (ty + 0.7) * TILE, hp: 6, r: 8 }); break;
    }
  }
  // 호선별 함정: 전투·엘리트·보스 방마다 그 호선의 함정을 놓는다
  const traps = [], freeSpot = r => { for (let k = 0; k < 40; k++) { const tx = r.x0 + 1 + rng.int(r.w - 2), ty = r.y0 + 1 + rng.int(r.h - 2);
    if (!isSolid(floor, tx, ty) && Math.hypot(tx - r.cx, ty - r.cy) > 3 && !traps.some(t => t.room === r.id && Math.hypot(t.x - (tx + 0.5) * TILE, t.y - (ty + 0.5) * TILE) < 40)) return [(tx + 0.5) * TILE, (ty + 0.5) * TILE]; } return null; };
  for (const r of floor.rooms) if (r.type === 'battle' || r.type === 'elite' || r.type === 'boss') for (const kind of LINES[line].traps) {
    const mode = TRAPS[kind].mode;
    if (mode === 'drop') { traps.push({ kind, mode, room: r.id, t: 2 + rng.next() * 2 }); continue; }
    for (let i = 0; i < 2; i++) { const p = freeSpot(r); if (p) traps.push({ kind, mode, room: r.id, x: p[0], y: p[1], r: mode === 'pool' ? 20 : 18, t: 1.5 + rng.next() * 3, warn: 0, on: false }); }
  }
  return {
    line, order, diff: difficulty(order), traps, falls: [], mods: modsOf(L.abilities), tick: 0, rng: createRng(seed).fork('world').state(), done: null, events: [], nextId: 1,
    floor, locked: [], rooms: floor.rooms.map(r => ({ visited: false, cleared: r.type !== 'battle' && r.type !== 'elite' && r.type !== 'boss', locked: false, wave: 0, opened: false })),
    player: { job, x: (s.cx + 0.5) * TILE, y: (s.cy + 0.5) * TILE, aim: 0, lastDir: 0, face: 1, moving: false,
      ...L.stats, maxShield: L.stats.maxShield + bonusShield, weapons: L.weapons.map(x => ({ ...x })), cur: Math.min(L.cur, L.weapons.length - 1), gear: { ...L.gear },
      cool: 0, kick: 0, invuln: 0, sinceHit: 99, regen: 0, skillCd: 0, skillHeld: false, swapHeld: false, itemHeld: false, rollHeld: false,
      rollT: 0, rollCd: 0, rollA: 0, slowT: 0, rootT: 0, rootCd: 0, dashT: 0, dashA: 0, dashDist: 0, dashHit: [] },
    mons: [], shots: [], eshots: [], allies: [], bombs: [], zones: [], props, pickups: [], loot: { parts: 0, mats: {} }, scanT: 0, hazardOffT: 0,
  };
}

export function roomOf(w, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const r = w.floor.rooms.find(r => tx >= r.x0 && tx < r.x0 + r.w && ty >= r.y0 && ty < r.y0 + r.h);
  return r ? r.id : -1;
}
const solidAt = (w, px, py) => isSolid(w.floor, Math.floor(px / TILE), Math.floor(py / TILE), w.locked);
// 발밑 네모(가로 ±5, 세로 -4~+1)가 벽에 닿으면 그 축으로는 움직이지 않는다. 상자도 몸을 막는다
function blocked(w, x, y, hw = 5) {
  if (solidAt(w, x - hw, y - 4) || solidAt(w, x + hw, y - 4) || solidAt(w, x - hw, y + 1) || solidAt(w, x + hw, y + 1)) return true;
  for (const o of w.props) if (Math.abs(o.x - x) < o.r + hw && Math.abs(o.y - y) < 6) return true;
  return false;
}
function moveBody(w, o, dx, dy, hw) {
  if (dx && !blocked(w, o.x + dx, o.y, hw)) o.x += dx;
  if (dy && !blocked(w, o.x, o.y + dy, hw)) o.y += dy;
}

// ---------- 이동·구르기(왼쪽 Shift) ----------
function movePlayer(w, input) {
  const p = w.player;
  let mx = (input & INPUT.RIGHT ? 1 : 0) - (input & INPUT.LEFT ? 1 : 0), my = (input & INPUT.DOWN ? 1 : 0) - (input & INPUT.UP ? 1 : 0);
  const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
  p.moving = l > 0;
  if (p.moving) p.lastDir = Math.atan2(my, mx);
  if (p.rollCd > 0) p.rollCd--;
  if (input & INPUT.RUN) { if (!p.rollHeld && p.rollCd <= 0 && p.rollT <= 0 && p.dashT <= 0) {
    p.rollT = ROLL_T; p.rollCd = Math.round(ROLL_CD * w.mods.rollCdMul) + ROLL_T; p.rollA = p.moving ? p.lastDir : p.aim; p.invuln = Math.max(p.invuln, ROLL_T + 2); w.events.push({ type: 'roll' }); }
    p.rollHeld = true; } else p.rollHeld = false;
  if (p.dashT > 0) {   // 기관사 돌진 중에는 입력 대신 돌진 방향으로
    const x0 = p.x, y0 = p.y, d = DASH_SPEED * DT; moveBody(w, p, Math.cos(p.dashA) * d, Math.sin(p.dashA) * d, 5); p.dashDist += Math.hypot(p.x - x0, p.y - y0); return;
  }
  if (p.rollT > 0) { p.rollT--; p.rootT = 0; const d = ROLL_SPEED * DT; moveBody(w, p, Math.cos(p.rollA) * d, Math.sin(p.rollA) * d, 5); return; }
  if (p.rootT > 0) { p.rootT -= DT; return; }   // 덩굴에 묶임
  const sp = PLAYER_SPEED * w.mods.speedMul * (p.slowT > 0 ? 0.6 : 1) * DT; if (p.slowT > 0) p.slowT--;
  moveBody(w, p, mx * sp, my * sp, 5);
}

// ---------- 방: 잠금·물결·보급 상자·포털 ----------
function updateRooms(w, rng) {
  const p = w.player, id = roomOf(w, p.x, p.y);
  if (id >= 0) {
    const r = w.floor.rooms[id], st = w.rooms[id];
    if (!st.visited) { st.visited = true; for (const l of w.floor.links) if (l.includes(id)) w.rooms[l[0] === id ? l[1] : l[0]].seen = true; }
    const tx = p.x / TILE, ty = p.y / TILE, inside = tx > r.x0 + 1 && tx < r.x0 + r.w - 1 && ty > r.y0 + 1 && ty < r.y0 + r.h - 1;
    if (inside && !st.cleared && !st.locked) { st.locked = true; w.locked.push(id); w.events.push({ type: 'lock', room: id }); spawnWave(w, rng, id); }
    const cx = (r.cx + 0.5) * TILE, cy = (r.cy + 0.5) * TILE;
    // 보급 상자 방: 재료 2개와 부품, 절반 확률로 무기 하나
    if (r.type === 'chest' && !st.opened && Math.hypot(p.x - cx, p.y - cy) < 18) {
      st.opened = true; w.events.push({ type: 'chest', room: id });
      for (let i = 0; i < 2; i++) w.pickups.push({ kind: 'mat', id: rng.pick(MAT_IDS), x: cx - 18 + i * 36, y: cy + 16 });
      w.pickups.push({ kind: 'parts', n: 2, x: cx, y: cy + 22 });
      if (rng.chance(0.5)) { const pool = Object.keys(WEAPONS).filter(k => !p.weapons.some(x => x.id === k)); w.pickups.push({ kind: 'weapon', id: rng.pick(pool), lv: 0, x: cx, y: cy - 20 }); }
    }
    if (r.type === 'boss' && st.cleared && Math.hypot(p.x - cx, p.y - cy) < 20) w.done = 'next';   // 호선 보스를 잡으면 다음 환승역으로 가는 포털
  }
  for (const rid of [...w.locked]) {   // 잠긴 방: 적을 다 잡으면 다음 물결, 마지막 물결이면 문을 연다
    if (w.mons.some(m => m.room === rid)) continue;
    const st = w.rooms[rid], waves = WAVES[w.floor.rooms[rid].type];
    if (st.wave < waves.length) { spawnWave(w, rng, rid); continue; }
    st.locked = false; st.cleared = true; w.locked = w.locked.filter(x => x !== rid);
    w.player.energy = Math.min(w.player.maxEnergy, w.player.energy + 30);
    w.events.push({ type: 'clear', room: rid });
  }
}

function addMon(w, rid, id, x, y, rng) {
  const M = MONSTERS[id], hp = Math.round(M.hp * w.diff.hpMul);
  w.mons.push({ uid: w.nextId++, id, room: rid, x, y, hp, maxHp: hp, speed: M.speed, r: M.r, cd: 1 + rng.next(), windT: 0, stun: 0, slowT: 0, dash: 0, dashA: 0, touch: 0, flash: 0, kx: 0, ky: 0, face: -1, t: 0, pattern: 0, pat: '' });
}
function spawnWave(w, rng, rid) {
  const r = w.floor.rooms[rid], st = w.rooms[rid], wave = WAVES[r.type][st.wave++], p = w.player;
  for (const [id, count] of wave) for (let i = 0; i < count + (MONSTERS[id].kind === 'boss' ? 0 : w.diff.extra); i++) {
    let x, y, k = 0;
    do { x = (r.x0 + 1.5 + rng.int(r.w - 2)) * TILE; y = (r.y0 + 1.5 + rng.int(r.h - 2)) * TILE; k++; } while (k < 40 && (Math.hypot(x - p.x, y - p.y) < 90 || solidAt(w, x, y)));
    if (MONSTERS[id].kind === 'boss') { x = (r.cx + 0.5) * TILE; y = (r.y0 + 3) * TILE; }
    addMon(w, rid, id, x, y, rng);
  }
  w.events.push({ type: 'wave', room: rid, index: st.wave });
}

function nearestTo(w, x, y, range, skip) { let best = null, bd = range; for (const m of w.mons) { if (m === skip) continue; const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } } return best; }

// ---------- 무기: 강화 단계와 특수능력을 얹은 수치 ----------
export function weaponStat(w, slot) {
  const it = w.player.weapons[slot], W = WEAPONS[it.id], M = w.mods;
  return { ...W, dmg: W.dmg * (1 + 0.2 * it.lv) * M.dmgMul, rate: W.rate * (1 + 0.05 * it.lv) * M.rateMul, count: W.count + M.extraShot, spread: W.spread + (M.extraShot ? 0.12 : 0) };
}

function updatePlayer(w, input, rng) {
  const p = w.player;
  if (p.cool > 0) p.cool--; if (p.invuln > 0) p.invuln--; p.kick = Math.max(0, p.kick - DT * 7);
  // 무기 바꾸기(Q)·줍기(E)
  if (input & INPUT.SWAP) { if (!p.swapHeld && p.weapons.length > 1) { p.cur = (p.cur + 1) % p.weapons.length; w.events.push({ type: 'swap' }); } p.swapHeld = true; } else p.swapHeld = false;
  if (input & INPUT.ITEM) { if (!p.itemHeld) pickWeapon(w); p.itemHeld = true; } else p.itemHeld = false;
  const st = weaponStat(w, p.cur), t = nearestTo(w, p.x, p.y, AIM_RANGE);
  p.aim = t ? Math.atan2(t.y - MONSTERS[t.id].cy - (p.y - 10), t.x - p.x) : p.lastDir;
  p.face = Math.cos(p.aim) >= 0 ? 1 : -1;
  if ((input & INPUT.ATTACK) && p.cool <= 0 && p.energy >= st.energy && p.rollT <= 0) {
    p.cool = Math.max(1, Math.round(TICK_HZ / st.rate)); p.energy -= st.energy; p.kick = st.kick;
    const mx = p.x + Math.cos(p.aim) * 12, my = p.y - 10 + Math.sin(p.aim) * 12;
    for (let i = 0; i < st.count; i++) {
      const a = p.aim + (st.count > 1 ? (i / (st.count - 1) - 0.5) * st.spread : (rng.next() - 0.5) * st.spread);
      w.shots.push({ x: mx, y: my, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: Math.round(st.range / st.speed * TICK_HZ), dmg: st.dmg, weapon: st.id || p.weapons[p.cur].id,
        trait: st.trait, size: st.size, pierce: (st.trait === 'pierce' ? 3 : 1) + w.mods.pierce, bounce: w.mods.bounce, hit: [] });
    }
    w.events.push({ type: 'fire', weapon: p.weapons[p.cur].id });
  }
  if (!(input & INPUT.ATTACK) || st.energy === 0) p.energy = Math.min(p.maxEnergy, p.energy + 4 * DT);
  p.sinceHit++;
  if (p.sinceHit > REGEN_WAIT && p.shield < p.maxShield && ++p.regen >= REGEN_EVERY) { p.shield++; p.regen = 0; }
  // 재료·부품은 밟으면 줍는다
  for (const k of w.pickups) if (k.kind !== 'weapon' && Math.hypot(k.x - p.x, k.y - p.y) < PICK_R) {
    k.taken = true; if (k.kind === 'mat') w.loot.mats[k.id] = (w.loot.mats[k.id] || 0) + 1; else w.loot.parts += k.n; w.events.push({ type: 'pickup', kind: k.kind, id: k.id, n: k.n });
  }
  w.pickups = w.pickups.filter(k => !k.taken);
}
// 무기 줍기: 빈칸이 있으면 넣고, 2개를 들고 있으면 손에 든 무기와 바꿔 바닥에 내려놓는다
function pickWeapon(w) {
  const p = w.player, k = w.pickups.find(k => k.kind === 'weapon' && Math.hypot(k.x - p.x, k.y - p.y) < 22); if (!k) return;
  w.pickups = w.pickups.filter(o => o !== k);
  if (p.weapons.length < 2) { p.weapons.push({ id: k.id, lv: k.lv }); }
  else { const old = p.weapons[p.cur]; p.weapons[p.cur] = { id: k.id, lv: k.lv }; w.pickups.push({ kind: 'weapon', id: old.id, lv: old.lv, x: p.x + 10, y: p.y + 6 }); }
  w.events.push({ type: 'getWeapon', id: k.id });
}

export function hurtPlayer(w, amount) {
  const p = w.player; if (p.invuln > 0 || w.done) return;
  const s = Math.min(p.shield, amount); p.shield -= s; p.hp = Math.max(0, p.hp - (amount - s));
  p.invuln = INVULN; p.sinceHit = 0; p.regen = 0; w.events.push({ type: 'hurt', amount });
  if (p.hp <= 0) { w.done = 'dead'; w.events.push({ type: 'dead' }); }
}

function hitMon(w, m, dmg, kx = 0, ky = 0) { dmg = Math.round(dmg * 10) / 10; m.hp -= dmg; m.flash = 3; m.kx += kx; m.ky += ky; w.events.push({ type: 'hit', uid: m.uid, amount: Math.round(dmg), x: m.x, y: m.y }); }

function breakProp(w, o, rng) {
  o.hp = 0; w.events.push({ type: 'propBreak', x: o.x, y: o.y });
  w.pickups.push({ kind: 'parts', n: 1, x: o.x, y: o.y });
  if (rng.chance(0.4)) w.pickups.push({ kind: 'mat', id: rng.pick(MAT_IDS), x: o.x + 8, y: o.y + 4 });
}

function updateShots(w, rng) {
  for (const s of w.shots) {
    if (w.mods.homing) { const t = nearestTo(w, s.x, s.y, 150); if (t) { const want = Math.atan2(t.y - MONSTERS[t.id].cy - s.y, t.x - s.x), cur = Math.atan2(s.vy, s.vx), sp = Math.hypot(s.vx, s.vy);
      let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const a = cur + Math.max(-0.12, Math.min(0.12, d)); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; } }
    s.x += s.vx * DT; s.y += s.vy * DT; s.life--;
    if (solidAt(w, s.x, s.y)) {
      if (s.bounce > 0) { s.bounce--; s.x -= s.vx * DT; s.y -= s.vy * DT; if (solidAt(w, s.x + s.vx * DT, s.y)) s.vx = -s.vx; else s.vy = -s.vy; w.events.push({ type: 'spark', x: s.x, y: s.y }); continue; }
      s.life = 0; w.events.push({ type: 'spark', x: s.x, y: s.y }); continue;
    }
    for (const o of w.props) if (o.hp > 0 && Math.hypot(o.x - s.x, o.y - 6 - s.y) < o.r + 3) { o.hp -= s.dmg; if (o.hp <= 0) breakProp(w, o, rng); s.life = 0; break; }
    if (s.life <= 0) continue;
    for (const m of w.mons) if (!(s.hit ||= []).includes(m.uid) && Math.hypot(m.x - s.x, m.y - MONSTERS[m.id].cy - s.y) < m.r + 3) {
      s.hit.push(m.uid);
      const dmg = s.dmg * (w.scanT > 0 ? 1.3 : 1), boss = MONSTERS[m.id].kind === 'boss', k = boss ? 0.1 : 1;   // 지층 판독: 약점이 드러나 피해 +30%
      hitMon(w, m, dmg, s.vx * 0.01 * k, s.vy * 0.01 * k);
      if (s.trait === 'slow') { m.slowT = 1.2; if ((m.darts = (m.darts || 0) + 1) >= 3) { m.darts = 0; m.stun = Math.max(m.stun, boss ? 0.4 : 1.5); w.events.push({ type: 'sleep', uid: m.uid }); } }   // 마취 다트: 느려지고 3번이면 잠듦
      if (s.trait === 'burn') m.burnT = 3;   // 신호 홍염: 불이 붙어 3초 동안 탄다
      if (s.trait === 'shock') m.stun = Math.max(m.stun, boss ? 0.1 : 0.35);   // 제세동 충격: 잠깐 기절
      if (s.trait === 'acid' && !w.zones.some(z => z.kind === 'acid' && Math.hypot(z.x - m.x, z.y - m.y) < 14)) w.zones.push({ kind: 'acid', x: m.x, y: m.y, r: 16, t: 2 * TICK_HZ, acc: 0 });
      if (s.trait === 'chain') { const o = nearestTo(w, m.x, m.y, 90, m); if (o) { hitMon(w, o, dmg * 0.5); w.events.push({ type: 'zap', x1: m.x, y1: m.y - MONSTERS[m.id].cy, x2: o.x, y2: o.y - MONSTERS[o.id].cy }); } }
      if (s.trait === 'shock' && m.hp <= 0 && rng.chance(0.25)) { w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1); w.events.push({ type: 'heal' }); }
      if (w.mods.boom) { w.events.push({ type: 'splash', x: m.x, y: m.y, r: 26 }); for (const o of w.mons) if (o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 26 + o.r) hitMon(w, o, dmg * 0.4); }
      if (!(--s.pierce > 0)) { s.life = 0; break; }
    }
  }
  w.shots = w.shots.filter(s => s.life > 0);
  w.props = w.props.filter(o => o.hp > 0);
  for (const e of w.eshots) {
    e.x += e.vx * DT; e.y += e.vy * DT; e.life--;
    if (solidAt(w, e.x, e.y)) e.life = 0;
    else if (Math.hypot(w.player.x - e.x, w.player.y - 10 - e.y) < 4 + (e.size || 3)) { e.life = 0; hurtPlayer(w, e.dmg); }
  }
  w.eshots = w.eshots.filter(e => e.life > 0);
}

function enemyShot(w, m, a, sp, dmg, size = 3) { w.eshots.push({ x: m.x, y: m.y - MONSTERS[m.id].cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3 * TICK_HZ, dmg, size, src: m.id }); }

// ---------- 보스 패턴: 원형·이중 탄막, 회오리 탄, 부채꼴 사격, 돌진, 화석 소환, 운석 낙하 중 직전과 다른 것을 무작위로 ----------
const BOSS_PATTERNS = ['ring', 'double', 'spiral', 'fan', 'charge', 'summon', 'meteor'];
function bossAct(w, m, rng) {
  const p = w.player, M = MONSTERS[m.id], a = Math.atan2(p.y - m.y, p.x - m.x), rage = m.hp < m.maxHp / 2;
  const pool = BOSS_PATTERNS.filter(x => x !== m.pat); m.pat = rng.pick(pool); w.events.push({ type: 'pattern', name: m.pat, uid: m.uid });
  if (m.pat === 'ring') { const n = rage ? 22 : 16; for (let i = 0; i < n; i++) enemyShot(w, m, a + i / n * Math.PI * 2, M.shotSpeed, 1, 4); }
  if (m.pat === 'double') { for (let i = 0; i < 14; i++) enemyShot(w, m, a + i / 14 * Math.PI * 2, M.shotSpeed * 0.9, 1, 4); m.ringLater = 0.35; }
  if (m.pat === 'spiral') { m.spiralT = rage ? 2.4 : 1.8; m.spiralA = a; }
  if (m.pat === 'fan') { const n = rage ? 9 : 7; for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) enemyShot(w, m, a + (i / (n - 1) - 0.5) * 1.0 + k * 0.07, M.shotSpeed * (1.3 + k * 0.25), 2, 3); }
  if (m.pat === 'charge') { m.dash = rage ? 0.9 : 0.7; m.dashA = a; }
  if (m.pat === 'summon') for (let i = 0; i < (rage ? 4 : 3); i++) addMon(w, m.room, ['trilobite', 'ammonite', 'germ'][i % 3], m.x + (i - 1.5) * 26, m.y + 30, rng);
  if (m.pat === 'meteor') for (let i = 0; i < (rage ? 7 : 5); i++) w.falls.push({ kind: 'meteor', x: p.x + rng.range(-70, 70), y: p.y + rng.range(-50, 50), t: 0.8 + i * 0.12, r: 22 });
}

function updateMons(w, rng) {
  const p = w.player;
  for (const m of w.mons) {
    const M = MONSTERS[m.id], dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    m.t += DT; if (m.flash > 0) m.flash--; if (m.slowT > 0) m.slowT -= DT;
    if (m.burnT > 0) { m.burnT -= DT; m.hp -= 2 * DT; if (Math.floor(m.t * 4) !== Math.floor((m.t - DT) * 4)) w.events.push({ type: 'burn', x: m.x, y: m.y - MONSTERS[m.id].cy }); }   // 타는 동안 초당 2
    if (m.stun > 0) { m.stun -= DT; continue; }   // 얼거나 기절하면 움직이지도 공격하지도 못한다
    m.cd -= DT; m.touch -= DT;
    let vx = dx / d, vy = dy / d, sp = m.speed * (m.slowT > 0 ? 0.5 : 1);
    if (M.kind === 'boss') {
      if (m.spiralT > 0) { m.spiralT -= DT; if (Math.floor(m.spiralT * 30) % 3 === 0) { m.spiralA += 0.32; for (const o of [0, Math.PI]) enemyShot(w, m, m.spiralA + o, M.shotSpeed * 1.1, 1, 3); } }
      if (m.ringLater > 0 && (m.ringLater -= DT) <= 0) for (let i = 0; i < 14; i++) enemyShot(w, m, i / 14 * Math.PI * 2 + Math.PI / 14, M.shotSpeed * 1.2, 1, 4);
      if (m.dash > 0) { m.dash -= DT; vx = Math.cos(m.dashA); vy = Math.sin(m.dashA); sp = 240; }
      else if (m.windT > 0) { sp = 0; m.windT -= DT; if (m.windT <= 0) { bossAct(w, m, rng); m.cd = m.hp < m.maxHp / 2 ? 0.9 : 1.3; } }
      else if (m.cd <= 0 && d < 340) { m.windT = 0.55; w.events.push({ type: 'aim', uid: m.uid }); }
    } else if (M.kind === 'ranged') {   // 몬스터마다 정한 수·퍼짐·속도·크기로 쏜다
      const A = M.attack;
      if (m.windT > 0) { sp = 0; m.windT -= DT; if (m.windT <= 0) { const a0 = Math.atan2(dy, dx);
        for (let i = 0; i < A.n; i++) enemyShot(w, m, a0 + (A.n > 1 ? (i / (A.n - 1) - 0.5) * A.spread : 0), A.speed, M.atk, A.size); m.cd = A.cd; } }
      else { if (d < M.range * 0.6) { vx = -vx; vy = -vy; } else if (d < M.range) sp = 0;
        if (m.cd <= 0 && d < 320) { m.windT = A.wind; w.events.push({ type: 'aim', uid: m.uid }); } }
    } else if (M.kind === 'roller' || M.attack?.type === 'lunge') {   // 암모나이트·삼엽충: 웅크렸다가(예고) 정한 방향으로 돌진
      const A = M.attack;
      if (m.dash > 0) { m.dash -= DT; vx = Math.cos(m.dashA); vy = Math.sin(m.dashA); sp = A.dashSpeed || M.dashSpeed;
        if (m.dash <= 0 && A.ink) for (let i = 0; i < A.ink.n; i++) enemyShot(w, m, i / A.ink.n * Math.PI * 2, A.ink.speed, M.atk, A.ink.size); }   // 멈추면 먹물
      else if (m.windT > 0) { sp = 0; m.windT -= DT; if (m.windT <= 0) { m.dash = A.dash; m.cd = A.cd; } }
      else if (m.cd <= 0 && d < A.reach) { m.windT = A.wind; m.dashA = Math.atan2(dy, dx); w.events.push({ type: 'aim', uid: m.uid }); }
    }
    if (d < 14 + m.r * 0.5 && !(m.dash > 0)) sp = 0;
    moveBody(w, m, vx * sp * DT + m.kx, vy * sp * DT + m.ky, Math.min(6, m.r * 0.6)); m.kx *= 0.75; m.ky *= 0.75;
    if (Math.abs(dx) > 2) m.face = dx > 0 ? 1 : -1;
    if (d < 14 + m.r * 0.6 && m.touch <= 0 && M.kind !== 'ranged') { m.touch = 1; hurtPlayer(w, M.atk); }
  }
  for (const m of [...w.mons]) if (m.hp <= 0) {
    w.events.push({ type: 'kill', uid: m.uid, id: m.id, x: m.x, y: m.y });
    const sp = MONSTERS[m.id].split;   // 내성균: 둘로 나뉜다. 벽·기둥·상자에 끼지 않는 자리를 골라서
    if (sp) { const spots = [[-12, 0], [12, 0], [0, -10], [0, 10], [-8, -8], [8, 8]].map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => !blocked(w, x, y, 5));
      for (let i = 0; i < 2; i++) { const [x, y] = spots[i] || [m.x, m.y]; addMon(w, m.room, sp, x, y, rng); } }
    const boss = MONSTERS[m.id].kind === 'boss';
    if (boss) w.pickups.push({ kind: 'parts', n: 6, x: m.x, y: m.y });
    else if (rng.chance(w.mods.scavenger ? 0.55 : 0.35)) w.pickups.push({ kind: 'parts', n: 1, x: m.x, y: m.y });
    if (w.mods.scavenger) w.player.energy = Math.min(w.player.maxEnergy, w.player.energy + 6);
  }
  w.mons = w.mons.filter(m => m.hp > 0);
}

// ---------- 직업 스킬(마우스 오른쪽). 스킬 강화 특수능력이면 효과 1.5배 ----------
function useSkill(w) {
  const p = w.player, S = JOBS[p.job].skill, k = w.mods.skillPower;
  p.skillCd = Math.round(S.cd * TICK_HZ * w.mods.skillCdMul); w.events.push({ type: 'skill', id: S.id });
  if (w.mods.skillCharge) { p.energy = Math.min(p.maxEnergy, p.energy + 40); p.shield = Math.min(p.maxShield, p.shield + 1); }
  switch (S.id) {
    case 'regen': p.dashT = Math.round(0.3 * TICK_HZ * k); p.dashA = p.moving ? p.lastDir : p.aim; p.dashDist = 0; p.dashHit = []; p.invuln = Math.max(p.invuln, p.dashT + 4); break;
    case 'strata': w.scanT = Math.round(5 * TICK_HZ * k); for (const r of w.rooms) r.seen = true; break;
    case 'biocontrol': for (let i = 0; i < Math.round(3 * k); i++) w.allies.push({ kind: 'hawk', x: p.x + (i - 1) * 14, y: p.y - 20, t: 8 * TICK_HZ, cd: i * 5 }); break;
    case 'neutral': { const t = nearestTo(w, p.x, p.y, 300), tx = t ? t.x : p.x + Math.cos(p.aim) * 120, ty = t ? t.y : p.y + Math.sin(p.aim) * 120;
      w.bombs.push({ sx: p.x, sy: p.y - 10, tx, ty, x: p.x, y: p.y - 10, t: 0, T: 15, dmg: 14 * k }); break; }
    case 'warning': for (const m of w.mons) m.stun = Math.max(m.stun || 0, 2.5 * k); w.eshots = []; w.hazardOffT = Math.round(5 * TICK_HZ * k); break;
    case 'firstaid': p.hp = Math.min(p.maxHp, p.hp + Math.round(3 * k)); w.zones.push({ kind: 'heal', x: p.x, y: p.y, r: 50, t: Math.round(4 * TICK_HZ * k), acc: 0 }); break;
  }
}
function updateSkills(w, input) {
  const p = w.player;
  if (p.skillCd > 0) p.skillCd--;
  if (input & INPUT.SKILL) { if (!p.skillHeld && p.skillCd <= 0) useSkill(w); p.skillHeld = true; } else p.skillHeld = false;
  if (w.scanT > 0) w.scanT--; if (w.hazardOffT > 0) w.hazardOffT--;
  if (p.dashT > 0) {   // 회생 제동: 돌진 중 부딪힌 적을 밀치고, 멈출 때 달린 거리만큼 방어막(운동 에너지 → 전기 에너지)
    for (const m of w.mons) if (!p.dashHit.includes(m.uid) && Math.hypot(m.x - p.x, m.y - p.y) < 18 + m.r) { p.dashHit.push(m.uid); hitMon(w, m, 4 * w.mods.skillPower, Math.cos(p.dashA) * 10, Math.sin(p.dashA) * 10); }
    if (--p.dashT === 0) { const gain = Math.min(p.maxShield - p.shield, Math.max(1, Math.ceil(p.dashDist / 50))); p.shield += gain; w.events.push({ type: 'charge', amount: gain }); }
  }
  for (const a of w.allies) {   // 생물적 방제: 풀어 준 천적(매)이 가까운 적을 쫓아가 공격
    a.t--; a.cd--; const t = nearestTo(w, a.x, a.y + 20, 400);
    if (t) { const dx = t.x - a.x, dy = t.y - 20 - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > 14) { a.x += dx / d * 170 * DT; a.y += dy / d * 170 * DT; } else if (a.cd <= 0) { a.cd = 12; hitMon(w, t, 3); } }
    else { a.x += (p.x - a.x) * 0.08; a.y += (p.y - 26 - a.y) * 0.08; }
  }
  w.allies = w.allies.filter(a => a.t > 0);
  for (const b of w.bombs) {   // 중화제 플라스크: 포물선으로 날아가 떨어지면 터진다
    b.t++; const k = b.t / b.T; b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k;
    if (b.t >= b.T) { b.done = true; w.events.push({ type: 'splash', x: b.tx, y: b.ty, r: 55 });
      for (const m of w.mons) if (Math.hypot(m.x - b.tx, m.y - b.ty) < 55 + m.r) hitMon(w, m, b.dmg, Math.sign(m.x - b.tx) * 6, Math.sign(m.y - b.ty) * 3); }
  }
  w.bombs = w.bombs.filter(b => !b.done);
  for (const z of w.zones) {
    z.t--;
    if (z.kind === 'heal' && Math.hypot(p.x - z.x, p.y - z.y) < z.r && (z.acc += DT) >= 1) { z.acc -= 1; p.hp = Math.min(p.maxHp, p.hp + 1); w.events.push({ type: 'heal' }); }   // 응급 처치 구역: 1초마다 체력 1
    if ((z.kind === 'lava' || z.kind === 'fire' || z.kind === 'gas' || z.kind === 'acidpool') && Math.hypot(p.x - z.x, p.y - z.y) < z.r && (z.acc += DT) >= 0.8) { z.acc = 0; hurtPlayer(w, 1); }   // 함정 장판은 0.8초마다 피해 1
    if (z.kind === 'acid') for (const m of w.mons) if (Math.hypot(m.x - z.x, m.y - z.y) < z.r + m.r) m.hp -= 3 * DT;   // 산성 웅덩이: 밟은 적에게 초당 3
  }
  w.zones = w.zones.filter(z => z.t > 0);
}

// ---------- 함정: 그 방에서 싸우는 동안만 움직인다(바닥형 함정은 늘 켜져 있음) ----------
function trapBlast(w, x, y, r, kind) {
  const p = w.player; w.events.push({ type: 'trapHit', kind, x, y, r });
  if (Math.hypot(p.x - x, p.y - y) < r) hurtPlayer(w, 1);
  for (const m of w.mons) if (Math.hypot(m.x - x, m.y - y) < r + m.r) hitMon(w, m, 6);
}
function updateTraps(w, rng) {
  const p = w.player, here = roomOf(w, p.x, p.y), fighting = here >= 0 && w.rooms[here].locked;
  if (p.rootCd > 0) p.rootCd -= DT;
  for (const t of w.traps) {
    if (t.room !== here) continue;
    if (t.mode === 'pool') { if (Math.hypot(p.x - t.x, p.y - t.y) < t.r) {
      if (TRAPS[t.kind].slow) p.slowT = 2;
      if (TRAPS[t.kind].root && p.rootCd <= 0 && p.rollT <= 0) { p.rootT = 0.7; p.rootCd = 3; w.events.push({ type: 'trapHit', kind: t.kind, x: t.x, y: t.y, r: t.r }); } } continue; }
    if (!fighting) continue;
    t.t -= DT;
    if (t.mode === 'vent') {
      if (t.warn > 0) { if ((t.warn -= DT) <= 0) { trapBlast(w, t.x, t.y, 26, t.kind); const z = TRAPS[t.kind].zone; if (z) w.zones.push({ kind: z, x: t.x, y: t.y, r: 20, t: Math.round(2.5 * TICK_HZ), acc: 0.5 }); t.t = 4 + rng.next() * 3; } }
      else if (t.t <= 0) { t.warn = 1; w.events.push({ type: 'trapWarn', kind: t.kind, x: t.x, y: t.y, r: 26 }); }
    } else if (t.mode === 'drop' && t.t <= 0) {
      for (let i = 0, n = 1 + (w.order >= 2 ? 1 : 0); i < n; i++) { let x = p.x, y = p.y;
        for (let k = 0; k < 10; k++) { x = p.x + rng.range(-45, 45); y = p.y + rng.range(-35, 35); if (!solidAt(w, x, y)) break; }
        w.falls.push({ kind: t.kind, x, y, t: 0.9, r: 20 }); w.events.push({ type: 'trapWarn', kind: t.kind, x, y, r: 20 }); }
      t.t = 2.5 + rng.next() * 2;
    } else if (t.mode === 'pulse') {
      if (t.t <= 0) { t.on = !t.on; t.t = 2; if (t.on) w.events.push({ type: 'trapWarn', kind: t.kind, x: t.x, y: t.y, r: t.r }); }
      if (t.on && Math.hypot(p.x - t.x, p.y - t.y) < t.r) { hurtPlayer(w, 1); }
    }
  }
  for (const d of w.falls) if ((d.t -= DT) <= 0) { trapBlast(w, d.x, d.y, d.r, d.kind); const z = TRAPS[d.kind].zone; if (z) w.zones.push({ kind: z, x: d.x, y: d.y, r: 18, t: Math.round(3 * TICK_HZ), acc: 0.5 }); }
  w.falls = w.falls.filter(d => d.t > 0);
}

export function step(w, input) {
  if (w.done) return;
  w.events = [];
  const rng = createRng(w.rng);
  movePlayer(w, input);
  updatePlayer(w, input, rng);
  updateSkills(w, input);
  updateShots(w, rng);
  updateMons(w, rng);
  updateRooms(w, rng);
  updateTraps(w, rng);
  w.tick++; w.rng = rng.state();
}
export { T };
