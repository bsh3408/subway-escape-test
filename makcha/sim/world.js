// 역 하나의 진행(30Hz 고정 틱): 걷기·벽 충돌, 방 들어가면 문 잠김·적 등장, 다 잡으면 문 열림, 자동 조준 사격, 출구로 다음 역
// 상태는 모두 평범한 데이터이고, 난수는 정수 w.rng로만 이어진다
import { createRng } from './rng.js';
import { generateFloor, isSolid, T } from './dungeon.js';
import { INPUT, TILE, DT, TICK_HZ } from './constants.js';
import { JOBS, WEAPONS, MONSTERS, WAVES } from './data.js';

const PLAYER_SPEED = 120, RUN_MUL = 1.4, INVULN = 18, REGEN_WAIT = 3 * TICK_HZ, REGEN_EVERY = 30, AIM_RANGE = 300;

export function createWorld({ seed, job, zone, station }) {
  const floor = generateFloor(seed, { zone, station }), J = JOBS[job], s = floor.rooms[0];
  return {
    tick: 0, rng: createRng(seed).fork('world').state(), done: null, events: [], nextId: 1,
    floor, locked: [], rooms: floor.rooms.map(r => ({ visited: false, cleared: r.type !== 'battle' && r.type !== 'elite' && r.type !== 'boss', locked: false, wave: 0, opened: false })),
    player: { job, x: (s.cx + 0.5) * TILE, y: (s.cy + 0.5) * TILE, aim: 0, lastDir: 0, face: 1, moving: false, running: false,
      hp: J.hp, maxHp: J.hp, shield: J.shield, maxShield: J.shield, energy: J.energy, maxEnergy: J.energy, weapon: J.weapon,
      cool: 0, kick: 0, invuln: 0, sinceHit: 99, regen: 0 },
    mons: [], shots: [], eshots: [],
  };
}

export function roomOf(w, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const r = w.floor.rooms.find(r => tx >= r.x0 && tx < r.x0 + r.w && ty >= r.y0 && ty < r.y0 + r.h);
  return r ? r.id : -1;
}
const solidAt = (w, px, py) => isSolid(w.floor, Math.floor(px / TILE), Math.floor(py / TILE), w.locked);
// 발밑 네모(가로 ±5, 세로 -4~+1)가 벽에 닿으면 그 축으로는 움직이지 않는다
function blocked(w, x, y, hw = 5) { return solidAt(w, x - hw, y - 4) || solidAt(w, x + hw, y - 4) || solidAt(w, x - hw, y + 1) || solidAt(w, x + hw, y + 1); }
function moveBody(w, o, dx, dy, hw) {
  if (dx && !blocked(w, o.x + dx, o.y, hw)) o.x += dx;
  if (dy && !blocked(w, o.x, o.y + dy, hw)) o.y += dy;
}

function movePlayer(w, input) {
  const p = w.player;
  let mx = (input & INPUT.RIGHT ? 1 : 0) - (input & INPUT.LEFT ? 1 : 0), my = (input & INPUT.DOWN ? 1 : 0) - (input & INPUT.UP ? 1 : 0);
  const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
  p.moving = l > 0; p.running = p.moving && !!(input & INPUT.RUN);
  if (p.moving) p.lastDir = Math.atan2(my, mx);
  const sp = PLAYER_SPEED * (p.running ? RUN_MUL : 1) * DT;
  moveBody(w, p, mx * sp, my * sp, 5);
}

// 방에 처음 들어오면(바닥 안쪽으로 한 칸 이상) 문을 잠그고 첫 물결을 부른다
function updateRooms(w, rng) {
  const p = w.player, id = roomOf(w, p.x, p.y);
  if (id >= 0) {
    const r = w.floor.rooms[id], st = w.rooms[id];
    if (!st.visited) { st.visited = true; for (const l of w.floor.links) if (l.includes(id)) w.rooms[l[0] === id ? l[1] : l[0]].seen = true; }
    const tx = p.x / TILE, ty = p.y / TILE, inside = tx > r.x0 + 1 && tx < r.x0 + r.w - 1 && ty > r.y0 + 1 && ty < r.y0 + r.h - 1;
    if (inside && !st.cleared && !st.locked) { st.locked = true; w.locked.push(id); w.events.push({ type: 'lock', room: id }); spawnWave(w, rng, id); }
    if (r.type === 'chest' && !st.opened && Math.hypot(p.x - (r.cx + 0.5) * TILE, p.y - (r.cy + 0.5) * TILE) < 18) {
      st.opened = true; p.hp = Math.min(p.maxHp, p.hp + 2); p.energy = Math.min(p.maxEnergy, p.energy + 60); w.events.push({ type: 'chest', room: id });
    }
    const portal = r.type === 'exit' || (r.type === 'boss' && st.cleared);
    if (portal && Math.hypot(p.x - (r.cx + 0.5) * TILE, p.y - (r.cy + 0.5) * TILE) < 20) w.done = 'next';
  }
  // 잠긴 방: 적을 다 잡으면 다음 물결, 마지막 물결이면 문을 연다
  for (const rid of [...w.locked]) {
    if (w.mons.some(m => m.room === rid)) continue;
    const st = w.rooms[rid], waves = WAVES[w.floor.rooms[rid].type];
    if (st.wave < waves.length) { spawnWave(w, rng, rid); continue; }
    st.locked = false; st.cleared = true; w.locked = w.locked.filter(x => x !== rid);
    w.player.energy = Math.min(w.player.maxEnergy, w.player.energy + 30);
    w.events.push({ type: 'clear', room: rid });
  }
}

function spawnWave(w, rng, rid) {
  const r = w.floor.rooms[rid], st = w.rooms[rid], wave = WAVES[r.type][st.wave++], p = w.player;
  const [id, count] = wave;
  for (let i = 0; i < count; i++) {
    let x, y, k = 0;
    do { x = (r.x0 + 1.5 + rng.int(r.w - 2)) * TILE; y = (r.y0 + 1.5 + rng.int(r.h - 2)) * TILE; k++; } while (k < 30 && Math.hypot(x - p.x, y - p.y) < 90);
    if (id === 'shadow') { x = (r.cx + 0.5) * TILE; y = (r.y0 + 3) * TILE; }
    const M = MONSTERS[id];
    w.mons.push({ uid: w.nextId++, id, room: rid, x, y, hp: M.hp, maxHp: M.hp, speed: M.speed, r: M.r, cd: 1 + rng.next(), windT: 0, touch: 0, flash: 0, kx: 0, ky: 0, face: -1, t: 0 });
  }
  w.events.push({ type: 'wave', room: rid, index: st.wave });
}

function nearestMon(w, range) {
  const p = w.player; let best = null, bd = range;
  for (const m of w.mons) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
  return best;
}

function updatePlayer(w, input, rng) {
  const p = w.player, W = WEAPONS[p.weapon];
  if (p.cool > 0) p.cool--; if (p.invuln > 0) p.invuln--; p.kick = Math.max(0, p.kick - DT * 7);
  const t = nearestMon(w, AIM_RANGE);
  p.aim = t ? Math.atan2(t.y - 8 - (p.y - 10), t.x - p.x) : p.lastDir;
  p.face = Math.cos(p.aim) >= 0 ? 1 : -1;
  if ((input & INPUT.ATTACK) && p.cool <= 0 && p.energy >= W.energy) {
    p.cool = Math.max(1, Math.round(TICK_HZ / W.rate)); p.energy -= W.energy; p.kick = W.kick;
    const mx = p.x + Math.cos(p.aim) * 12, my = p.y - 10 + Math.sin(p.aim) * 12;
    for (let i = 0; i < W.count; i++) {
      const a = p.aim + (W.count > 1 ? (i / (W.count - 1) - 0.5) * W.spread : (rng.next() - 0.5) * W.spread);
      w.shots.push({ x: mx, y: my, vx: Math.cos(a) * W.speed, vy: Math.sin(a) * W.speed, life: Math.round(W.range / W.speed * TICK_HZ), dmg: W.dmg, weapon: p.weapon });
    }
    w.events.push({ type: 'fire', weapon: p.weapon });
  }
  if (!(input & INPUT.ATTACK) || W.energy === 0) p.energy = Math.min(p.maxEnergy, p.energy + 4 * DT);
  p.sinceHit++;
  if (!p.running && p.sinceHit > REGEN_WAIT && p.shield < p.maxShield && ++p.regen >= REGEN_EVERY) { p.shield++; p.regen = 0; }
}

export function hurtPlayer(w, amount) {
  const p = w.player; if (p.invuln > 0 || w.done) return;
  const s = Math.min(p.shield, amount); p.shield -= s; p.hp = Math.max(0, p.hp - (amount - s));
  p.invuln = INVULN; p.sinceHit = 0; p.regen = 0; w.events.push({ type: 'hurt', amount });
  if (p.hp <= 0) { w.done = 'dead'; w.events.push({ type: 'dead' }); }
}

function updateShots(w) {
  for (const s of w.shots) {
    s.x += s.vx * DT; s.y += s.vy * DT; s.life--;
    if (solidAt(w, s.x, s.y)) { s.life = 0; w.events.push({ type: 'spark', x: s.x, y: s.y }); continue; }
    for (const m of w.mons) if (Math.hypot(m.x - s.x, m.y - 8 - s.y) < m.r + 3) {
      m.hp -= s.dmg; m.flash = 3; const k = MONSTERS[m.id].kind === 'boss' ? 0.1 : 1; m.kx += s.vx * 0.01 * k; m.ky += s.vy * 0.01 * k;
      w.events.push({ type: 'hit', uid: m.uid, amount: s.dmg, x: m.x, y: m.y }); s.life = 0; break;
    }
  }
  w.shots = w.shots.filter(s => s.life > 0);
  for (const e of w.eshots) {
    e.x += e.vx * DT; e.y += e.vy * DT; e.life--;
    if (solidAt(w, e.x, e.y)) e.life = 0;
    else if (Math.hypot(w.player.x - e.x, w.player.y - 10 - e.y) < 7) { e.life = 0; hurtPlayer(w, e.dmg); }
  }
  w.eshots = w.eshots.filter(e => e.life > 0);
}

function enemyShot(w, m, a, sp, dmg) { w.eshots.push({ x: m.x, y: m.y - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 3 * TICK_HZ, dmg }); }

function updateMons(w, rng) {
  const p = w.player;
  for (const m of w.mons) {
    const M = MONSTERS[m.id], dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    m.t += DT; if (m.flash > 0) m.flash--; m.cd -= DT; m.touch -= DT;
    let vx = dx / d, vy = dy / d, sp = m.speed;
    if (M.kind === 'ranged' || M.kind === 'boss') {
      if (m.windT > 0) { sp = 0; m.windT -= DT; if (m.windT <= 0) {
        const a = Math.atan2(dy, dx);
        if (M.kind === 'boss') { const n = m.hp < m.maxHp / 2 ? 14 : 10; for (let i = 0; i < n; i++) enemyShot(w, m, a + i / n * Math.PI * 2, M.shotSpeed, 1); }
        else enemyShot(w, m, a, M.shotSpeed, M.atk);
        m.cd = M.kind === 'boss' ? 1.6 : 2.2; } }
      else { if (M.kind === 'ranged' && d < M.range * 0.6) { vx = -vx; vy = -vy; } else if (M.kind === 'ranged' && d < M.range) sp = 0;
        if (m.cd <= 0 && d < 320) { m.windT = 0.45; w.events.push({ type: 'aim', uid: m.uid }); } }
    }
    if (d < 14 + m.r * 0.5) sp = 0;
    moveBody(w, m, vx * sp * DT + m.kx, vy * sp * DT + m.ky, Math.min(6, m.r * 0.6)); m.kx *= 0.75; m.ky *= 0.75;
    if (Math.abs(dx) > 2) m.face = dx > 0 ? 1 : -1;
    if (d < 14 + m.r * 0.6 && m.touch <= 0 && M.kind !== 'ranged') { m.touch = 1; hurtPlayer(w, M.atk); }
  }
  for (const m of w.mons) if (m.hp <= 0) w.events.push({ type: 'kill', uid: m.uid, id: m.id, x: m.x, y: m.y });
  w.mons = w.mons.filter(m => m.hp > 0);
}

export function step(w, input) {
  if (w.done) return;
  w.events = [];
  const rng = createRng(w.rng);
  movePlayer(w, input);
  updatePlayer(w, input, rng);
  updateShots(w);
  updateMons(w, rng);
  updateRooms(w, rng);
  w.tick++; w.rng = rng.state();
}
export { T };
