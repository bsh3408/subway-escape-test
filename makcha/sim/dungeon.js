// 호선 하나의 던전 만들기: 5×5 격자 위에 방을 놓고(주 경로 + 곁방), 이웃한 방끼리 통로로 잇는다
// 결과는 모두 평범한 데이터(JSON으로 저장 가능)다
import { createRng } from './rng.js';
import { GRID, CELL_W, CELL_H } from './constants.js';

export const T = { WALL: 0, FLOOR: 1, DOOR: 2 };
// 방 종류별 바닥 크기(타일)
const SIZE = { start: [11, 9], battle: [19, 13], elite: [19, 13], chest: [11, 9], shop: [13, 9], event: [13, 11], exit: [11, 9], boss: [27, 19] };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CORRIDOR = 3;   // 통로 폭(타일)
const LAYOUTS = ['corners', 'rows', 'bars', 'diagonal', 'scatter'];   // 방 안 지형지물 배치 종류

function layout(rng, order) {
  // 주 경로: 시작 → 전투 방들 → 호선 보스. 뒤에 들어간 호선일수록 전투 방이 하나 더
  const len = 5 + (order >= 2 ? 1 : 0);
  for (let tries = 0; tries < 200; tries++) {
    const used = new Map(), path = [];
    let gx = rng.int(GRID), gy = rng.int(GRID); path.push([gx, gy]); used.set(gx + ',' + gy, 0);
    let ok = true;
    for (let i = 1; i < len; i++) {
      const opts = DIRS.map(([dx, dy]) => [gx + dx, gy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < GRID && y < GRID && !used.has(x + ',' + y));
      if (!opts.length) { ok = false; break; }
      [gx, gy] = rng.pick(opts); used.set(gx + ',' + gy, i); path.push([gx, gy]);
    }
    if (!ok) continue;
    const rooms = path.map(([x, y], i) => ({ gx: x, gy: y, type: i === 0 ? 'start' : i === len - 1 ? 'boss' : 'battle' }));
    if (order >= 1 && rooms.filter(r => r.type === 'battle').length > 3) rooms[len - 2].type = 'elite';
    const links = path.slice(1).map((_, i) => [i, i + 1]);
    // 곁방: 보급(상자) 1개, 과학 장치 방 1개, 홀수 역에는 상점
    const extras = ['chest', 'event', ...(order % 2 === 1 ? ['shop'] : [])];
    for (const type of extras) {
      const hosts = rooms.map((r, i) => i).filter(i => i > 0 && i < len - 1);
      let placed = false;
      for (let i = hosts.length - 1; i > 0; i--) { const j = rng.int(i + 1); [hosts[i], hosts[j]] = [hosts[j], hosts[i]]; }   // 결정적 섞기
      for (const h of hosts) {
        const r = rooms[h], free = DIRS.map(([dx, dy]) => [r.gx + dx, r.gy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < GRID && y < GRID && !used.has(x + ',' + y));
        if (!free.length) continue;
        const [x, y] = rng.pick(free); used.set(x + ',' + y, rooms.length); links.push([h, rooms.length]); rooms.push({ gx: x, gy: y, type }); placed = true; break;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return { rooms, links };
  }
  throw new Error('던전을 만들지 못했다');
}

export function generateFloor(seed, { line, order }) {
  const rng = createRng(seed).fork('floor' + line + ':' + order);
  const { rooms, links } = layout(rng, order);
  const w = GRID * CELL_W, h = GRID * CELL_H, tiles = new Array(w * h).fill(T.WALL);
  const set = (x, y, t) => { tiles[y * w + x] = t; };
  rooms.forEach((r, id) => {
    const [rw, rh] = SIZE[r.type]; r.id = id; r.w = rw; r.h = rh;
    r.x0 = r.gx * CELL_W + Math.floor((CELL_W - rw) / 2); r.y0 = r.gy * CELL_H + Math.floor((CELL_H - rh) / 2);
    r.cx = r.x0 + Math.floor(rw / 2); r.cy = r.y0 + Math.floor(rh / 2);
    for (let y = r.y0; y < r.y0 + rh; y++) for (let x = r.x0; x < r.x0 + rw; x++) set(x, y, T.FLOOR);
  });
  const doors = [];
  for (const [a, b] of links) {
    const A = rooms[a], B = rooms[b], horiz = A.gy === B.gy, half = Math.floor(CORRIDOR / 2);
    const [L, R] = horiz ? (A.gx < B.gx ? [A, B] : [B, A]) : (A.gy < B.gy ? [A, B] : [B, A]);
    const tilesOf = { [L.id]: [], [R.id]: [] };
    if (horiz) {
      const cy = L.gy * CELL_H + Math.floor(CELL_H / 2), x1 = L.x0 + L.w, x2 = R.x0 - 1;
      for (let x = x1; x <= x2; x++) for (let y = cy - half; y <= cy + half; y++) set(x, y, T.FLOOR);
      for (let y = cy - half; y <= cy + half; y++) { tilesOf[L.id].push(y * w + x1); tilesOf[R.id].push(y * w + x2); }
    } else {
      const cx = L.gx * CELL_W + Math.floor(CELL_W / 2), y1 = L.y0 + L.h, y2 = R.y0 - 1;
      for (let y = y1; y <= y2; y++) for (let x = cx - half; x <= cx + half; x++) set(x, y, T.FLOOR);
      for (let x = cx - half; x <= cx + half; x++) { tilesOf[L.id].push(y1 * w + x); tilesOf[R.id].push(y2 * w + x); }
    }
    for (const id of [L.id, R.id]) { for (const k of tilesOf[id]) tiles[k] = T.DOOR; doors.push({ room: id, to: id === L.id ? R.id : L.id, tiles: tilesOf[id] }); }
  }
  // 지형지물: 전투·엘리트·보스 방마다 배치를 골라 바위·기둥을 놓는다(탄과 몸을 막는 엄폐물)
  // 규칙: 가운데 십자 길(문으로 이어지는 길)은 비우고, 덩어리끼리·벽과는 한 칸 이상 띄워서 막힌 구석이 생기지 않게 한다
  const pillars = [];
  for (const r of rooms) if (r.type === 'battle' || r.type === 'elite' || r.type === 'boss') {
    r.layout = r.type === 'boss' ? 'corners' : rng.pick(LAYOUTS);
    const mine = [], place = (x, y, bw, bh) => {
      if (x < r.x0 + 1 || y < r.y0 + 1 || x + bw > r.x0 + r.w - 1 || y + bh > r.y0 + r.h - 1) return false;
      for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) if (Math.abs(xx - r.cx) <= 1 || Math.abs(yy - r.cy) <= 1) return false;
      if (mine.some(p => x <= p.x + p.w && p.x <= x + bw && y <= p.y + p.h && p.y <= y + bh)) return false;   // 한 칸 이상 떨어져 있어야
      const p = { room: r.id, x, y, w: bw, h: bh }; mine.push(p); pillars.push(p);
      for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) set(xx, yy, T.WALL);
      return true;
    };
    const qx = Math.floor(r.w / 4), qy = Math.floor(r.h / 4);
    if (r.layout === 'corners') for (const [px, py] of [[r.x0 + qx - 1, r.y0 + qy - 1], [r.x0 + r.w - qx - 1, r.y0 + qy - 1], [r.x0 + qx - 1, r.y0 + r.h - qy - 1], [r.x0 + r.w - qx - 1, r.y0 + r.h - qy - 1]]) place(px, py, 2, 2);
    if (r.layout === 'rows') for (const yy of [r.cy - 3, r.cy + 3]) for (let xx = r.x0 + 2; xx < r.x0 + r.w - 2; xx += 3) place(xx, yy, 1, 1);
    if (r.layout === 'bars') for (const [px, py] of [[r.x0 + 3, r.y0 + 2], [r.x0 + r.w - 4, r.y0 + 2], [r.x0 + 3, r.cy + 2], [r.x0 + r.w - 4, r.cy + 2]]) place(px, py, 1, 3);
    if (r.layout === 'diagonal') for (const [dx, dy] of [[-4, -3], [3, -3], [-4, 2], [3, 2], [-7, -4], [6, 3]]) place(r.cx + dx, r.cy + dy, 2, 2);
    if (r.layout === 'scatter') for (let k = 0, n = 6 + rng.int(4); k < 60 && mine.length < n; k++) { const bw = 1 + rng.int(2); place(r.x0 + 1 + rng.int(r.w - 2), r.y0 + 1 + rng.int(r.h - 2), bw, bw === 2 ? 1 : 1 + rng.int(2)); }
  }
  const doorOwner = {}; for (const d of doors) for (const k of d.tiles) doorOwner[k] = d.room;
  return { line, order, w, h, tiles, rooms, links, doors, doorOwner, pillars };
}

export function tileAt(f, x, y) { return x < 0 || y < 0 || x >= f.w || y >= f.h ? T.WALL : f.tiles[y * f.w + x]; }
// 잠긴 방의 문은 벽처럼 막힌다
export function isSolid(f, x, y, locked = []) {
  const t = tileAt(f, x, y);
  if (t === T.WALL) return true;
  if (t === T.DOOR) return locked.includes(f.doorOwner[y * f.w + x]);
  return false;
}
