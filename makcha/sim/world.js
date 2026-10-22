// 호선 하나의 진행(30Hz 고정 틱): 걷기·구르기·벽 충돌, 방 들어가면 문 잠김·적 등장, 다 잡으면 문 열림,
// 자동 조준 사격(무기 2개 교체·줍기·강화·직업 특색), 상자·지형지물, 보스 패턴, 직업 스킬, 보스 포털로 다음 환승역
// 상태는 모두 평범한 데이터이고, 난수는 정수 w.rng로만 이어진다
import { createRng } from './rng.js';
import { generateFloor, isSolid, T } from './dungeon.js';
import { INPUT, TILE, DT, TICK_HZ } from './constants.js';
import { JOBS, WEAPONS, MONSTERS, WAVES, MATS, LINES, TRAPS, STATUS, ZONE_STATUS } from './data.js';
import { difficulty, GEAR, relicFx } from './run.js';

const DASH_SPEED = 420, PLAYER_SPEED = 140, ROLL_SPEED = 330, ROLL_T = 8, ROLL_CD = 24, INVULN = 18, REGEN_WAIT = 3 * TICK_HZ, REGEN_EVERY = 30, AIM_RANGE = 300, PICK_R = 14;
const MAT_IDS = Object.keys(MATS);

// 특수능력·유물·장비를 무기·몸·스킬 수치로 바꾼다
function modsOf(ab, skillLv = 1, relics = [], gear = {}) {
  const has = id => ab.includes(id), r = relicFx(relics), m = k => r[k] ?? 1;
  const immune = [...r.immune]; for (const g of Object.values(gear)) if (g && GEAR[g].block) immune.push(...GEAR[g].block);
  return { extraShot: (has('extraShot') ? 1 : 0) + (has('fan') ? 2 : 0) + (r.extraShot || 0), fan: has('fan'), pierce: (has('pierceUp') ? 1 : 0) + (has('drillShot') ? 2 : 0),
    bounce: (has('bounce') ? 1 : 0) + (has('ricochet') ? 2 : 0), ricochet: has('ricochet'), homing: has('homing'), homingTurn: has('homingPlus') ? 0.25 : 0.12, boom: has('boom'), boomR: has('cluster') ? 52 : 26, boomMul: has('cluster') ? 0.6 : 0.4,
    rangeMul: (has('longShot') ? 2 : 1) * (has('homingPlus') ? 1.3 : 1), shotSpeedMul: has('longShot') ? 1.2 : 1, shieldBurst: has('shieldBurst'), rollShot: has('rollShot'), skillGuard: has('skillGuard'),
    rateMul: (has('rapid') ? 1.2 : 1) * (has('overclock') ? 1.2 : 1), spreadMul: (has('focus') ? 0.35 : 1) * m('spreadMul'), dmgMul: (has('bigShot') ? 1.3 : 1) * m('dmgMul'), speedMul: (has('swift') ? 1.12 : 1) * m('speedMul'), rollCdMul: (has('rollMaster') ? 0.5 : 1) * m('rollCdMul'),
    scavenger: has('scavenger'), skillCdMul: (has('skillCd') ? 0.7 : 1) * (1 - 0.15 * (skillLv - 1)) * m('skillCdMul'), skillPower: (has('skillPower') ? 1.5 : 1) * (1 + 0.3 * (skillLv - 1)), skillCharge: has('skillCharge'),
    // 유물
    immune, statusMul: r.statusMul, bossMul: m('bossMul'), propMul: m('propMul'), pickMul: m('pickMul'), energyRegenMul: m('energyRegenMul'), crit: (r.crit || 0) + (has('critShot') ? 0.15 : 0), critChain: !!r.critChain,
    matBonus: r.matBonus || 0, regenFaster: r.regenFaster || 0, clearHeal: has('regen') ? 1 : r.clearHeal || 0, chestWeapon: r.chestWeapon || 0, warnPlus: r.warnPlus || 0, bossTime: r.bossTime || 0,
    lifesteal: r.lifesteal || 0, skillEnergy: r.skillEnergy || 0, roomShield: r.roomShield || 0, partsChance: r.partsChance || 0, blastImmune: !!r.blastImmune, reflect: !!r.reflect };
}

export function createWorld({ seed, job, line, order, loadout }) {
  const floor = generateFloor(seed, { line, order }), J = JOBS[job], s = floor.rooms[0], rng = createRng(seed).fork('props');
  const L = { weapons: [{ id: J.weapon, lv: 0 }], cur: 0, gear: { head: null, body: null, feet: null }, abilities: [], relics: [], revive: 0,
    stats: { hp: J.hp, maxHp: J.hp, shield: J.shield, maxShield: J.shield, energy: J.energy, maxEnergy: J.energy }, ...(loadout || {}) };   // 넘겨받지 않은 항목은 직업 기본값
  const bonusShield = Object.values(L.gear).reduce((a, g) => a + (g && GEAR[g].shield || 0), 0), rfx = relicFx(L.relics);
  // 상자: 전투·엘리트 방마다 2~3개, 부수면 부품·재료가 나온다
  // 부서지는 기물: 상자(부품·재료), 바위(탄을 막는 엄폐물, 부수면 고철), 드럼통(터지면 둘레에 큰 피해)
  const props = [], PROP = { crate: { hp: 6, r: 8 }, rock: { hp: 14, r: 9 }, barrel: { hp: 3, r: 7 } };
  for (const r of floor.rooms) if (r.type === 'battle' || r.type === 'elite') for (const [kind, n] of [['crate', 1 + rng.int(3)], ['rock', 1 + rng.int(3)], ['barrel', rng.int(3)]]) for (let i = 0; i < n; i++) {
    for (let k = 0; k < 30; k++) {
      const tx = r.x0 + 1 + rng.int(r.w - 2), ty = r.y0 + 1 + rng.int(r.h - 2);
      if (Math.abs(tx - r.cx) < 3 || Math.abs(ty - r.cy) < 3 || isSolid(floor, tx, ty) || isSolid(floor, tx - 1, ty) || isSolid(floor, tx + 1, ty) || props.some(o => Math.hypot(o.x - (tx + 0.5) * TILE, o.y - (ty + 0.5) * TILE) < 28)) continue;
      props.push({ kind, room: r.id, x: (tx + 0.5) * TILE, y: (ty + 0.7) * TILE, ...PROP[kind] }); break;
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
    bossId: rng.pick(LINES[line].bosses), line, order, diff: difficulty(order), traps, falls: [], mods: modsOf(L.abilities, L.skillLv || 1, L.relics, L.gear), tick: 0, bonusTicks: 0, rng: createRng(seed).fork('world').state(), done: null, events: [], nextId: 1,
    floor, locked: [], rooms: floor.rooms.map(r => ({ visited: false, seen: !!rfx.seeAll, cleared: r.type !== 'battle' && r.type !== 'elite' && r.type !== 'boss', locked: false, wave: 0, opened: false })),
    player: { job, x: (s.cx + 0.5) * TILE, y: (s.cy + 0.5) * TILE, aim: 0, lastDir: 0, face: 1, moving: false,
      ...L.stats, hp: Math.min(L.stats.maxHp, L.stats.hp + (rfx.lineHeal || 0)), maxShield: L.stats.maxShield + bonusShield, st: {}, revive: L.revive || 0, weapons: L.weapons.map(x => ({ ...x })), cur: Math.min(L.cur, L.weapons.length - 1), gear: { ...L.gear },
      cool: 0, kick: 0, invuln: 0, sinceHit: 99, regen: 0, skillCd: 0, skillHeld: false, swapHeld: false, itemHeld: false, rollHeld: false,
      rollT: 0, rollCd: 0, rollA: 0, slowT: 0, rootT: 0, rootCd: 0, dashT: 0, dashA: 0, dashDist: 0, dashHit: [], swingT: 0, swingA: 0 },
    mons: [], shots: [], eshots: [], allies: [], bombs: [], zones: [], props, pickups: [], loot: { parts: 0, mats: {}, coins: 0, picks: 0 }, scanT: 0, hazardOffT: 0,
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
  if (input & INPUT.RUN) { if (!p.rollHeld && p.rollCd <= 0 && p.rollT <= 0 && p.dashT <= 0 && !(p.st.shock > 0)) {
    p.rollT = ROLL_T; p.rollCd = Math.round(ROLL_CD * w.mods.rollCdMul) + ROLL_T; p.rollA = p.moving ? p.lastDir : p.aim; p.invuln = Math.max(p.invuln, ROLL_T + 2); w.events.push({ type: 'roll' }); }
    p.rollHeld = true; } else p.rollHeld = false;
  if (p.dashT > 0) {   // 기관사 돌진 중에는 입력 대신 돌진 방향으로
    const x0 = p.x, y0 = p.y, d = DASH_SPEED * DT; moveBody(w, p, Math.cos(p.dashA) * d, Math.sin(p.dashA) * d, 5); p.dashDist += Math.hypot(p.x - x0, p.y - y0); return;
  }
  if (p.rollT > 0) { p.rollT--; delete p.st.root;
    if (p.rollT === 0 && w.mods.rollShot) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; w.shots.push({ x: p.x, y: p.y - 10, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, life: 20, dmg: 3 * w.mods.dmgMul, weapon: 'reflect', size: 3, pierce: 1, bounce: 0, hit: [] }); } const d = ROLL_SPEED * DT; moveBody(w, p, Math.cos(p.rollA) * d, Math.sin(p.rollA) * d, 5); return; }
  if (p.st.root > 0 || p.st.shock > 0) return;   // 덩굴에 묶이거나 감전되면 못 움직인다
  const sp = PLAYER_SPEED * w.mods.speedMul * (p.st.wet > 0 ? 0.7 : 1) * (p.st.frost > 0 ? 0.6 : 1) * DT;
  moveBody(w, p, mx * sp, my * sp, 5);
}

// ---------- 방: 잠금·물결·보급 상자·포털 ----------
function updateRooms(w, rng) {
  const p = w.player, id = roomOf(w, p.x, p.y);
  if (id >= 0) {
    const r = w.floor.rooms[id], st = w.rooms[id];
    if (!st.visited) { st.visited = true; for (const l of w.floor.links) if (l.includes(id)) w.rooms[l[0] === id ? l[1] : l[0]].seen = true; }
    const tx = p.x / TILE, ty = p.y / TILE, inside = tx > r.x0 + 1 && tx < r.x0 + r.w - 1 && ty > r.y0 + 1 && ty < r.y0 + r.h - 1;
    if (inside && !st.cleared && !st.locked) { st.locked = true; w.locked.push(id); w.events.push({ type: 'lock', room: id }); spawnWave(w, rng, id);
      if (w.mods.roomShield) p.shield = Math.min(p.maxShield, p.shield + w.mods.roomShield); }
    const cx = (r.cx + 0.5) * TILE, cy = (r.cy + 0.5) * TILE;
    // 보급 상자 방: 재료 2개와 부품, 절반 확률로 무기 하나
    if (r.type === 'chest' && !st.opened && Math.hypot(p.x - cx, p.y - cy) < 18) {
      st.opened = true; w.events.push({ type: 'chest', room: id });
      for (let i = 0; i < 2; i++) w.pickups.push({ kind: 'mat', id: rng.pick(MAT_IDS), x: cx - 18 + i * 36, y: cy + 16 });
      w.pickups.push({ kind: 'parts', n: 2, x: cx, y: cy + 22 });
      if (rng.chance(0.5 + w.mods.chestWeapon)) { const pool = Object.keys(WEAPONS).filter(k => !p.weapons.some(x => x.id === k)); w.pickups.push({ kind: 'weapon', id: rng.pick(pool), lv: 0, x: cx, y: cy - 20 }); }
    }
    if (r.type === 'boss' && st.cleared && Math.hypot(p.x - cx, p.y - cy) < 20) w.done = 'next';   // 호선 보스를 잡으면 다음 환승역으로 가는 포털
  }
  for (const rid of [...w.locked]) {   // 잠긴 방: 적을 다 잡으면 다음 물결, 마지막 물결이면 문을 연다
    if (w.mons.some(m => m.room === rid)) continue;
    const st = w.rooms[rid], waves = WAVES[w.floor.rooms[rid].type];
    if (st.wave < waves.length) { spawnWave(w, rng, rid); continue; }
    st.locked = false; st.cleared = true; w.locked = w.locked.filter(x => x !== rid);
    w.player.energy = Math.min(w.player.maxEnergy, w.player.energy + 30);
    if (w.mods.clearHeal && rng.chance(w.mods.clearHeal) && w.player.hp < w.player.maxHp) { w.player.hp++; w.events.push({ type: 'heal' }); }
    const ty = w.floor.rooms[rid].type; if (ty === 'elite') w.loot.picks++; if (ty === 'boss' && w.clearTick == null) w.clearTick = w.tick;
    w.events.push({ type: 'clear', room: rid });
  }
}

function addMon(w, rid, id, x, y, rng) {
  const M = MONSTERS[id], hp = Math.round(M.hp * w.diff.hpMul);
  w.mons.push({ uid: w.nextId++, id, room: rid, x, y, hp, maxHp: hp, speed: M.speed, r: M.r, cd: 1 + rng.next(), windT: 0, stun: 0, slowT: 0, dash: 0, dashA: 0, touch: 0, flash: 0, kx: 0, ky: 0, face: -1, t: 0, pattern: 0, pat: '' });
}
function spawnWave(w, rng, rid) {
  const r = w.floor.rooms[rid], st = w.rooms[rid], wave = WAVES[r.type][st.wave++], p = w.player;
  for (const [id0, count] of wave) { const id = id0 === 'BOSS' ? w.bossId : id0; for (let i = 0; i < count + (MONSTERS[id].kind === 'boss' ? 0 : w.diff.extra); i++) {
    let x, y, k = 0;
    do { x = (r.x0 + 1.5 + rng.int(r.w - 2)) * TILE; y = (r.y0 + 1.5 + rng.int(r.h - 2)) * TILE; k++; } while (k < 40 && (Math.hypot(x - p.x, y - p.y) < 90 || solidAt(w, x, y)));
    if (MONSTERS[id].kind === 'boss') { x = (r.cx + 0.5) * TILE; y = (r.y0 + 3) * TILE; }
    addMon(w, rid, id, x, y, rng);
  } }
  w.events.push({ type: 'wave', room: rid, index: st.wave });
}

function nearestTo(w, x, y, range, skip) { let best = null, bd = range; for (const m of w.mons) { if (m === skip) continue; const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } } return best; }

// ---------- 무기: 강화 단계와 특수능력을 얹은 수치 ----------
export function weaponStat(w, slot) {
  const it = w.player.weapons[slot], W = WEAPONS[it.id], M = w.mods;
  if (W.trait === 'melee') return { ...W, dmg: W.dmg * (1 + 0.3 * it.lv) * M.dmgMul, rate: W.rate * (1 + 0.08 * it.lv) * M.rateMul };
  return { ...W, dmg: W.dmg * (1 + 0.3 * it.lv) * M.dmgMul, rate: W.rate * (1 + 0.08 * it.lv) * M.rateMul, count: W.trait === 'beam' ? 1 : W.count + M.extraShot,
    spread: (W.spread + (M.extraShot ? 0.12 : 0) + (M.fan ? 0.5 : 0)) * M.spreadMul, range: W.range * M.rangeMul, speed: W.speed * M.shotSpeedMul };
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
  if ((input & INPUT.ATTACK) && p.cool <= 0 && p.energy >= st.energy && p.rollT <= 0 && !(p.st.shock > 0)) {
    p.cool = Math.max(1, Math.round(TICK_HZ / st.rate * (p.st.frost > 0 ? 1.4 : 1))); p.energy -= st.energy; p.kick = st.kick;
    const mx = p.x + Math.cos(p.aim) * 12, my = p.y - 10 + Math.sin(p.aim) * 12;
    if (st.trait === 'beam') fireBeam(w, st, mx, my, p.aim, rng);
    else if (st.trait === 'melee') swing(w, st, p.aim, rng);
    else for (let i = 0; i < st.count; i++) {
      const a = p.aim + (st.count > 1 ? (i / (st.count - 1) - 0.5) * st.spread : (rng.next() - 0.5) * st.spread);
      w.shots.push({ x: mx, y: my, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: Math.round(st.range / st.speed * TICK_HZ), dmg: st.dmg, weapon: st.id || p.weapons[p.cur].id,
        trait: st.trait, size: st.size, pierce: st.trait === 'boomerang' ? 99 : (st.trait === 'pierce' ? 3 : 1) + w.mods.pierce, bounce: w.mods.bounce, hit: [] });
      if (st.trait === 'boomerang') { const s = w.shots[w.shots.length - 1]; s.half = Math.floor(s.life / 2); s.back = false; }
    }
    w.events.push({ type: 'fire', weapon: p.weapons[p.cur].id });
  }
  if (p.swingT > 0) p.swingT--;
  if (!(input & INPUT.ATTACK) || st.energy === 0) p.energy = Math.min(p.maxEnergy, p.energy + 4 * w.mods.energyRegenMul * DT);
  p.sinceHit++;
  if (p.sinceHit > REGEN_WAIT - w.mods.regenFaster && p.shield < p.maxShield && !(p.st.infect > 0) && !(p.st.corrode > 0) && ++p.regen >= REGEN_EVERY) { p.shield++; p.regen = 0; }   // 감염·부식 중에는 방어막이 안 찬다
  // 재료·부품은 밟으면 줍는다
  for (const k of w.pickups) if (k.kind !== 'weapon' && Math.hypot(k.x - p.x, k.y - p.y) < PICK_R * w.mods.pickMul) {
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
  const p = w.player; if (p.invuln > 0 || w.done) return false;
  const had = p.shield, s = Math.min(p.shield, amount); p.shield -= s; p.hp = Math.max(0, p.hp - (amount - s));
  if (w.mods.shieldBurst && had > 0 && p.shield === 0) { w.events.push({ type: 'splash', x: p.x, y: p.y, r: 60 }); for (const m of w.mons) if (Math.hypot(m.x - p.x, m.y - p.y) < 60 + m.r) hitMon(w, m, 8, Math.sign(m.x - p.x) * 12, Math.sign(m.y - p.y) * 6); w.eshots = w.eshots.filter(e => Math.hypot(e.x - p.x, e.y - p.y) > 60); }   // 방어막 폭발
  p.invuln = INVULN; p.sinceHit = 0; p.regen = 0; w.events.push({ type: 'hurt', amount });
  checkDead(w); return true;
}
// 쓰러짐: 백신 앰플이 있으면 한 번 체력 절반으로 일어난다
function checkDead(w) {
  const p = w.player; if (p.hp > 0) return;
  if (p.revive > 0) { p.revive--; p.hp = Math.ceil(p.maxHp / 2); p.st = {}; p.invuln = 2 * TICK_HZ; w.events.push({ type: 'revive' }); return; }
  w.done = 'dead'; w.events.push({ type: 'dead' });
}
// 상태 이상에 따른 지속 피해: 무적 시간과 상관없이 방어막부터 깎는다
function dot(w, n) {
  const p = w.player; if (w.done) return;
  const s = Math.min(p.shield, n); p.shield -= s; p.hp = Math.max(0, p.hp - (n - s)); p.sinceHit = 0; p.regen = 0; w.events.push({ type: 'hurt', amount: n, dot: true }); checkDead(w);
}
// 상태 이상 걸기: 구르는 중이거나 장비·유물로 막으면 안 걸린다. 새로 걸리면 화면에 띄울 수 있게 알린다
export function inflict(w, id) {
  const p = w.player; if (w.done || p.rollT > 0 || w.mods.immune.includes(id)) return false;
  if (id === 'wet') delete p.st.burn;   // 물이 불을 끈다
  if (id === 'burn') { if (p.st.wet > 0) return false; delete p.st.frost; }   // 젖어 있으면 불이 안 붙고, 불은 동상을 녹인다
  if (id === 'root') { if (p.rootCd > 0) return false; p.rootCd = 3; }
  const t = STATUS[id].t * (w.mods.statusMul[id] ?? 1);
  if (!(p.st[id] > 0)) w.events.push({ type: 'status', id });
  p.st[id] = Math.max(p.st[id] || 0, t); return true;
}
function updateStatus(w) {
  const p = w.player, s = p.st, k = w.tick;
  if (s.infect > 0 && k % (2 * TICK_HZ) === 0) dot(w, 1);   // 감염: 2초마다 피해 1
  if (s.burn > 0 && k % TICK_HZ === 0) dot(w, 1);   // 화상: 1초마다 피해 1
  if (s.corrode > 0 && k % 45 === 0 && p.shield > 0) { p.shield--; w.events.push({ type: 'hurt', amount: 0, dot: true }); }   // 부식: 방어막이 깎인다
  if (s.poison > 0) p.energy = Math.max(0, p.energy - 15 * DT);   // 중독: 에너지가 빠진다
  for (const id of Object.keys(s)) if ((s[id] -= DT) <= 0) delete s[id];
}

function hitMon(w, m, dmg, kx = 0, ky = 0) { if (m.invuln) dmg = 0; dmg = Math.round(dmg * 10) / 10; m.hp -= dmg; m.flash = 3; m.kx += kx; m.ky += ky; w.events.push({ type: 'hit', uid: m.uid, amount: Math.round(dmg), x: m.x, y: m.y }); }

function breakProp(w, o, rng) {
  o.hp = 0; w.events.push({ type: 'propBreak', x: o.x, y: o.y, kind: o.kind });
  if (o.kind === 'barrel') {   // 드럼통: 터지며 둘레 40에 큰 피해(나도 맞는다)
    w.events.push({ type: 'splash', x: o.x, y: o.y, r: 40 });
    for (const m of w.mons) if (Math.hypot(m.x - o.x, m.y - o.y) < 40 + m.r) hitMon(w, m, 10, Math.sign(m.x - o.x) * 8, Math.sign(m.y - o.y) * 4);
    if (Math.hypot(w.player.x - o.x, w.player.y - o.y) < 40 && !w.mods.blastImmune) hurtPlayer(w, 1);
    for (const q of w.props) if (q !== o && q.hp > 0 && Math.hypot(q.x - o.x, q.y - o.y) < 40) { q.hp -= 10; if (q.hp <= 0) breakProp(w, q, rng); }   // 옆 기물도 연쇄로
    return;
  }
  for (let i = 0; i < w.mods.matBonus && o.kind !== 'barrel'; i++) w.pickups.push({ kind: 'mat', id: rng.pick(MAT_IDS), x: o.x - 8, y: o.y + 4 });   // 목장갑
  if (o.kind === 'rock') { if (rng.chance(0.5)) w.pickups.push({ kind: 'mat', id: 'scrap', x: o.x, y: o.y }); return; }
  if (rng.chance(0.35)) w.pickups.push({ kind: 'parts', n: 1, x: o.x, y: o.y });
  if (rng.chance(0.4)) w.pickups.push({ kind: 'mat', id: rng.pick(MAT_IDS), x: o.x + 8, y: o.y + 4 });
}

// 맞힘 하나: 지층 판독 +30%, 보스 추가 피해, 치명타 2배(피뢰침 조각이면 옆 적에게 번개)
function strike(w, m, base, rng, kx = 0, ky = 0) {
  const boss = MONSTERS[m.id].kind === 'boss', k = boss ? 0.1 : 1, crit = w.mods.crit > 0 && rng.chance(w.mods.crit);
  const dmg = base * (w.scanT > 0 ? 1.3 : 1) * (boss ? w.mods.bossMul : 1) * (crit ? 2 : 1);
  hitMon(w, m, dmg, kx * k, ky * k);
  if (crit) { w.events.push({ type: 'crit', x: m.x, y: m.y }); if (w.mods.critChain) { const o = nearestTo(w, m.x, m.y, 90, m); if (o) { hitMon(w, o, dmg * 0.5); w.events.push({ type: 'zap', x1: m.x, y1: m.y - MONSTERS[m.id].cy, x2: o.x, y2: o.y - MONSTERS[o.id].cy }); } } }
  return dmg;
}
// 레이저: 벽에 닿을 때까지 한 줄을 곧바로 꿰뚫는다
function fireBeam(w, st, x0, y0, a, rng) {
  const dx = Math.cos(a), dy = Math.sin(a); let L = 0;
  while (L < st.range && !solidAt(w, x0 + dx * L, y0 + dy * L)) L += 4;
  const on = (x, y, r) => { const ax = x - x0, ay = y - y0, along = ax * dx + ay * dy; return along > -4 && along < L && Math.abs(ax * dy - ay * dx) < r; };
  for (const m of w.mons) if (on(m.x, m.y - MONSTERS[m.id].cy, m.r + 4)) strike(w, m, st.dmg, rng, dx * 3, dy * 3);
  for (const o of w.props) if (o.hp > 0 && on(o.x, o.y - 6, o.r + 2)) { o.hp -= st.dmg * w.mods.propMul; if (o.hp <= 0) breakProp(w, o, rng); }
  w.props = w.props.filter(o => o.hp > 0);
  w.events.push({ type: 'beam', x1: x0, y1: y0, x2: x0 + dx * L, y2: y0 + dy * L });
}
// 근접: 앞쪽 부채꼴 안의 적을 치고 밀치며, 그 안의 적 탄을 쳐낸다
function swing(w, st, a, rng) {
  const p = w.player, cx = p.x, cy = p.y - 10, half = st.arc / 2;
  const inArc = (x, y, R) => { const d = Math.hypot(x - cx, y - cy); if (d > R) return false; let da = Math.atan2(y - cy, x - cx) - a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; return d < 8 || Math.abs(da) <= half; };
  for (const m of w.mons) if (inArc(m.x, m.y - MONSTERS[m.id].cy, st.range + m.r)) strike(w, m, st.dmg, rng, Math.cos(a) * 9, Math.sin(a) * 9);
  const before = w.eshots.length; w.eshots = w.eshots.filter(e => !inArc(e.x, e.y, st.range + 8)); if (w.eshots.length < before) w.events.push({ type: 'parry', x: cx + Math.cos(a) * 16, y: cy + Math.sin(a) * 16 });
  for (const o of w.props) if (o.hp > 0 && inArc(o.x, o.y - 6, st.range + o.r)) { o.hp -= st.dmg * w.mods.propMul; if (o.hp <= 0) breakProp(w, o, rng); }
  w.props = w.props.filter(o => o.hp > 0);
  p.swingT = 8; p.swingA = a; w.events.push({ type: 'swing', x: cx, y: cy, a, r: st.range + 6, arc: st.arc });
}

function updateShots(w, rng) {
  const p = w.player;
  for (const s of w.shots) {
    if (s.trait === 'boomerang') {   // 표창: 절반쯤 가면 손으로 되돌아오고, 돌아올 때 다시 맞힐 수 있다
      if (!s.back && s.life <= s.half) { s.back = true; s.hit = []; }
      if (s.back) { const dx = p.x - s.x, dy = p.y - 10 - s.y, d = Math.hypot(dx, dy), sp = Math.hypot(s.vx, s.vy); if (d < 10) { s.life = 0; continue; } s.vx = dx / d * sp; s.vy = dy / d * sp; s.life = Math.max(s.life, 2); }
    }
    if (w.mods.homing && !s.back) { const t = nearestTo(w, s.x, s.y, 150); if (t) { const want = Math.atan2(t.y - MONSTERS[t.id].cy - s.y, t.x - s.x), cur = Math.atan2(s.vy, s.vx), sp = Math.hypot(s.vx, s.vy);
      let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const a = cur + Math.max(-w.mods.homingTurn, Math.min(w.mods.homingTurn, d)); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; } }
    s.x += s.vx * DT; s.y += s.vy * DT; s.life--;
    if (solidAt(w, s.x, s.y) && !s.back) {
      if (s.trait === 'boomerang') { s.x -= s.vx * DT; s.y -= s.vy * DT; s.back = true; s.hit = []; w.events.push({ type: 'spark', x: s.x, y: s.y }); continue; }
      if (s.bounce > 0) { s.bounce--; if (w.mods.ricochet) s.dmg *= 1.2; s.x -= s.vx * DT; s.y -= s.vy * DT; if (solidAt(w, s.x + s.vx * DT, s.y)) s.vx = -s.vx; else s.vy = -s.vy; w.events.push({ type: 'spark', x: s.x, y: s.y }); continue; }
      s.life = 0; w.events.push({ type: 'spark', x: s.x, y: s.y }); continue;
    }
    if (!s.back) for (const o of w.props) if (o.hp > 0 && Math.hypot(o.x - s.x, o.y - 6 - s.y) < o.r + 3) { o.hp -= s.dmg * w.mods.propMul; if (o.hp <= 0) breakProp(w, o, rng); if (s.trait === 'boomerang') { s.back = true; s.hit = []; } else s.life = 0; break; }
    if (s.life <= 0) continue;
    for (const m of w.mons) if (!(s.hit ||= []).includes(m.uid) && Math.hypot(m.x - s.x, m.y - MONSTERS[m.id].cy - s.y) < m.r + 3) {
      s.hit.push(m.uid);
      const boss = MONSTERS[m.id].kind === 'boss', dmg = strike(w, m, s.dmg, rng, s.vx * 0.01, s.vy * 0.01);
      if (s.trait === 'slow') { m.slowT = 1.2; if ((m.darts = (m.darts || 0) + 1) >= 3) { m.darts = 0; m.stun = Math.max(m.stun, boss ? 0.4 : 1.5); w.events.push({ type: 'sleep', uid: m.uid }); } }   // 마취 다트: 느려지고 3번이면 잠듦
      if (s.trait === 'burn') m.burnT = 3;   // 신호 홍염: 불이 붙어 3초 동안 탄다
      if (s.trait === 'shock') m.stun = Math.max(m.stun, boss ? 0.1 : 0.35);   // 제세동 충격: 잠깐 기절
      if (s.trait === 'acid' && !w.zones.some(z => z.kind === 'acid' && Math.hypot(z.x - m.x, z.y - m.y) < 14)) w.zones.push({ kind: 'acid', x: m.x, y: m.y, r: 16, t: 2 * TICK_HZ, acc: 0 });
      if (s.trait === 'chain') { const o = nearestTo(w, m.x, m.y, 90, m); if (o) { hitMon(w, o, dmg * 0.5); w.events.push({ type: 'zap', x1: m.x, y1: m.y - MONSTERS[m.id].cy, x2: o.x, y2: o.y - MONSTERS[o.id].cy }); } }
      if (s.trait === 'shock' && m.hp <= 0 && rng.chance(0.25)) { w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1); w.events.push({ type: 'heal' }); }
      if (w.mods.boom) { const B = w.mods.boomR; w.events.push({ type: 'splash', x: m.x, y: m.y, r: B }); for (const o of w.mons) if (o !== m && Math.hypot(o.x - m.x, o.y - m.y) < B + o.r) hitMon(w, o, dmg * w.mods.boomMul); }
      if (!(--s.pierce > 0)) { s.life = 0; break; }
    }
  }
  w.shots = w.shots.filter(s => s.life > 0);
  w.props = w.props.filter(o => o.hp > 0);
  for (const e of w.eshots) {
    e.x += e.vx * DT; e.y += e.vy * DT; e.life--;
    if (solidAt(w, e.x, e.y)) e.life = 0;
    else if (w.mods.reflect && w.player.rollT > 0 && Math.hypot(w.player.x - e.x, w.player.y - 10 - e.y) < 14 + (e.size || 3)) {   // 반사경: 구르며 스친 탄을 되받아 쏜다
      e.life = 0; const t = nearestTo(w, e.x, e.y, 300), a = t ? Math.atan2(t.y - MONSTERS[t.id].cy - e.y, t.x - e.x) : Math.atan2(-e.vy, -e.vx);
      w.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: TICK_HZ, dmg: 4 * w.mods.dmgMul, weapon: 'reflect', size: 3, pierce: 1, bounce: 0, hit: [] }); }
    else if (Math.hypot(w.player.x - e.x, w.player.y - 10 - e.y) < 4 + (e.size || 3)) { e.life = 0; const I = MONSTERS[e.src]?.inflict;
      if (hurtPlayer(w, e.dmg) && I && rng.chance(I[1])) inflict(w, I[0]); }
  }
  w.eshots = w.eshots.filter(e => e.life > 0);
}

function enemyShot(w, m, a, sp, dmg, size = 3) { w.eshots.push({ x: m.x, y: m.y - MONSTERS[m.id].cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3 * TICK_HZ, dmg, size, src: m.id }); }

// ---------- 보스 패턴: 원형·이중 탄막, 회오리 탄, 부채꼴 사격, 돌진, 화석 소환, 운석 낙하 중 직전과 다른 것을 무작위로 ----------
function bossAct(w, m, rng) {
  const p = w.player, M = MONSTERS[m.id], a = Math.atan2(p.y - m.y, p.x - m.x), rage = m.hp < m.maxHp / 2;
  const pool = M.patterns.filter(x => x !== m.pat); m.pat = rng.pick(pool); w.events.push({ type: 'pattern', name: m.pat, uid: m.uid });
  if (m.pat === 'ring') { const n = rage ? 22 : 16; for (let i = 0; i < n; i++) enemyShot(w, m, a + i / n * Math.PI * 2, M.shotSpeed, 1, 4); }
  if (m.pat === 'double') { for (let i = 0; i < 14; i++) enemyShot(w, m, a + i / 14 * Math.PI * 2, M.shotSpeed * 0.9, 1, 4); m.ringLater = 0.35; }
  if (m.pat === 'spiral') { m.spiralT = rage ? 2.4 : 1.8; m.spiralA = a; }
  if (m.pat === 'fan') { const n = rage ? 9 : 7; for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) enemyShot(w, m, a + (i / (n - 1) - 0.5) * 1.0 + k * 0.07, M.shotSpeed * (1.3 + k * 0.25), 2, 3); }
  if (m.pat === 'charge') { m.dash = rage ? 0.9 : 0.7; m.dashA = a; }
  if (m.pat === 'summon' || m.pat === 'brood') for (let i = 0; i < (m.pat === 'brood' ? 5 : rage ? 4 : 3); i++) { const x = m.x + (i - 2) * 22, y = m.y + 30; addMon(w, m.room, M.minions[i % M.minions.length], blocked(w, x, y, 5) ? m.x : x, blocked(w, x, y, 5) ? m.y : y, rng); }
  if (m.pat === 'erupt') for (let i = 0; i < (rage ? 6 : 4); i++) { const x = p.x + rng.range(-90, 90), y = p.y + rng.range(-60, 60); w.falls.push({ kind: 'vent', x, y, t: 0.7 + i * 0.15, r: 26 }); }
  if (m.pat === 'slam') { m.slamN = rage ? 3 : 2; m.slamT = 0; }
  if (m.pat === 'shell') { m.shellT = 1.6; m.invuln = true; }
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
      if (m.slamN > 0 && (m.slamT -= DT) <= 0) { m.slamN--; m.slamT = 0.45; w.events.push({ type: 'splash', x: m.x, y: m.y, r: 50 }); for (let i = 0; i < 20; i++) enemyShot(w, m, i / 20 * Math.PI * 2 + m.slamN * 0.15, 100 + m.slamN * 30, 1, 4); }   // 땅 내려치기: 충격파 고리 여러 겹
      if (m.shellT > 0 && (m.shellT -= DT) <= 0) { m.invuln = false; for (let i = 0; i < 24; i++) enemyShot(w, m, i / 24 * Math.PI * 2, 160, 1, 3); }   // 껍데기 웅크리기: 무적 뒤 사방 발사
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
    w.loot.coins += boss ? 15 : 1;
    if (boss) { w.pickups.push({ kind: 'parts', n: 4, x: m.x, y: m.y }); w.bonusTicks += w.mods.bossTime * TICK_HZ; }
    else if (rng.chance((w.mods.scavenger ? 0.3 : 0.12) + w.mods.partsChance)) w.pickups.push({ kind: 'parts', n: 1, x: m.x, y: m.y });
    if (w.mods.lifesteal && rng.chance(w.mods.lifesteal) && w.player.hp < w.player.maxHp) { w.player.hp++; w.events.push({ type: 'heal' }); }
    if (w.mods.scavenger) w.player.energy = Math.min(w.player.maxEnergy, w.player.energy + 6);
  }
  w.mons = w.mons.filter(m => m.hp > 0);
}

// ---------- 직업 스킬(마우스 오른쪽). 스킬 강화 특수능력이면 효과 1.5배 ----------
function useSkill(w) {
  const p = w.player, S = JOBS[p.job].skill, k = w.mods.skillPower;
  p.skillCd = Math.round(S.cd * TICK_HZ * w.mods.skillCdMul); w.events.push({ type: 'skill', id: S.id });
  if (w.mods.skillGuard) p.invuln = Math.max(p.invuln, Math.round(1.5 * TICK_HZ));
  if (w.mods.skillCharge) { p.energy = Math.min(p.maxEnergy, p.energy + 40); p.shield = Math.min(p.maxShield, p.shield + 1); }
  if (w.mods.skillEnergy) p.energy = Math.min(p.maxEnergy, p.energy + w.mods.skillEnergy);
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
    if (ZONE_STATUS[z.kind] && Math.hypot(p.x - z.x, p.y - z.y) < z.r) inflict(w, ZONE_STATUS[z.kind]);   // 함정 장판: 서 있으면 상태 이상(용암·불 화상, 감염 구름 감염, 매연 중독, 산성 웅덩이 부식)
    if (z.kind === 'acid') for (const m of w.mons) if (Math.hypot(m.x - z.x, m.y - z.y) < z.r + m.r) m.hp -= 3 * DT;   // 산성 웅덩이: 밟은 적에게 초당 3
  }
  w.zones = w.zones.filter(z => z.t > 0);
}

// ---------- 함정: 그 방에서 싸우는 동안만 움직인다(바닥형 함정은 늘 켜져 있음) ----------
function trapBlast(w, x, y, r, kind) {
  const p = w.player; w.events.push({ type: 'trapHit', kind, x, y, r });
  if (Math.hypot(p.x - x, p.y - y) < r) { const st = TRAPS[kind]?.status; if (!w.mods.blastImmune) hurtPlayer(w, 1); if (st) inflict(w, st); }
  for (const m of w.mons) if (Math.hypot(m.x - x, m.y - y) < r + m.r) hitMon(w, m, 6);
}
function updateTraps(w, rng) {
  const p = w.player, here = roomOf(w, p.x, p.y), fighting = here >= 0 && w.rooms[here].locked;
  if (p.rootCd > 0) p.rootCd -= DT;
  for (const t of w.traps) {
    if (t.room !== here) continue;
    if (t.mode === 'pool') { if (Math.hypot(p.x - t.x, p.y - t.y) < t.r && inflict(w, TRAPS[t.kind].status) && t.kind === 'vine') w.events.push({ type: 'trapHit', kind: t.kind, x: t.x, y: t.y, r: t.r }); continue; }   // 바닥 함정: 밟고 있으면 상태 이상
    if (!fighting) continue;
    t.t -= DT;
    if (t.mode === 'vent') {
      if (t.warn > 0) { if ((t.warn -= DT) <= 0) { trapBlast(w, t.x, t.y, 26, t.kind); const z = TRAPS[t.kind].zone; if (z) w.zones.push({ kind: z, x: t.x, y: t.y, r: 20, t: Math.round(2.5 * TICK_HZ), acc: 0.5 }); t.t = 4 + rng.next() * 3; } }
      else if (t.t <= 0) { t.warn = 1 + w.mods.warnPlus; w.events.push({ type: 'trapWarn', kind: t.kind, x: t.x, y: t.y, r: 26 }); }
    } else if (t.mode === 'drop' && t.t <= 0) {
      for (let i = 0, n = 1 + (w.order >= 2 ? 1 : 0); i < n; i++) { let x = p.x, y = p.y;
        for (let k = 0; k < 10; k++) { x = p.x + rng.range(-45, 45); y = p.y + rng.range(-35, 35); if (!solidAt(w, x, y)) break; }
        w.falls.push({ kind: t.kind, x, y, t: 0.9 + w.mods.warnPlus, T: 0.9 + w.mods.warnPlus, r: 20 }); w.events.push({ type: 'trapWarn', kind: t.kind, x, y, r: 20 }); }
      t.t = 2.5 + rng.next() * 2;
    } else if (t.mode === 'pulse') {
      if (t.t <= 0) { t.on = !t.on; t.t = 2; if (t.on) w.events.push({ type: 'trapWarn', kind: t.kind, x: t.x, y: t.y, r: t.r }); }
      if (t.on && Math.hypot(p.x - t.x, p.y - t.y) < t.r && !w.mods.immune.includes('shock')) { if (hurtPlayer(w, p.st.wet > 0 ? 2 : 1)) inflict(w, 'shock'); }   // 젖은 채 감전되면 피해 2
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
  updateStatus(w);
  w.tick++; w.rng = rng.state();
}
export { T };
