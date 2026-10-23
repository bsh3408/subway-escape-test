// 호선 하나의 던전 만들기: 5×5 격자 위에 방을 놓고(주 경로 + 곁방), 이웃한 방끼리 통로로 잇는다
// 결과는 모두 평범한 데이터(JSON으로 저장 가능)다
import { createRng } from './rng.js';
import { GRID, CELL_W, CELL_H } from './constants.js';

export const T = { WALL: 0, FLOOR: 1, DOOR: 2 };
// 방 종류별 바닥 크기(타일)
const SIZE = { start: [11, 9], battle: [19, 13], elite: [19, 13], chest: [11, 9], shop: [13, 9], event: [13, 11], exit: [11, 9], boss: [27, 19] };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CORRIDOR = 3;   // 통로 폭(타일)
const LAYOUTS = ['corners', 'rows', 'bars', 'diagonal', 'scatter', 'walls'];   // 방 안 지형지물 배치 종류(두 가지를 섞음)
const SHAPES = ['rect', 'notch', 'cross', 'octagon', 'lshape'];   // 방 모양

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

// 호선마다 지형지물 배치(1 유적, 2 미로, 3 산울타리, 4 배관, 5 폐허, 6 설산, 7 사막 모래성, 8 공장, 9 서버실)
export const LINE_TERRAIN = { 1: 'ruins', 2: 'maze', 3: 'hedges', 4: 'pipes', 5: 'rubble', 6: 'mounds', 7: 'castles', 8: 'machines', 9: 'racks' };

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
  // 방 모양: 전투·엘리트 방은 귀퉁이를 깎거나(notch·cross·octagon), 한 귀퉁이를 크게 잘라 ㄱ자로(lshape) 만든다
  // 가운데 십자 길(문으로 이어지는 길, 폭 5칸)은 깎지 않는다
  for (const r of rooms) if (r.type === 'battle' || r.type === 'elite') {
    r.shape = rng.pick(SHAPES);
    const keep = (x, y) => Math.abs(x - r.cx) <= 2 || Math.abs(y - r.cy) <= 2;
    const cut = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!keep(x, y)) set(x, y, T.WALL); };
    const X1 = r.x0 + r.w - 1, Y1 = r.y0 + r.h - 1, corners = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const corner = ([cxs, cys], a, b) => cut(cxs ? X1 - a + 1 : r.x0, cys ? Y1 - b + 1 : r.y0, cxs ? X1 : r.x0 + a - 1, cys ? Y1 : r.y0 + b - 1);
    if (r.shape === 'notch') for (const c of corners) if (rng.chance(0.5)) corner(c, 2 + rng.int(3), 2 + rng.int(2));
    if (r.shape === 'cross') { const a2 = 3 + rng.int(2), b2 = 2 + rng.int(2); for (const c of corners) corner(c, a2, b2); }
    if (r.shape === 'octagon') { const k = 3 + rng.int(2); for (const [cxs, cys] of corners) for (let i = 0; i < k; i++) for (let j = 0; j < k - i; j++) { const x = cxs ? X1 - i : r.x0 + i, y = cys ? Y1 - j : r.y0 + j; if (!keep(x, y)) set(x, y, T.WALL); } }
    if (r.shape === 'lshape') corner(rng.pick(corners), Math.floor(r.w / 2) - 2, Math.floor(r.h / 2) - 2);
  }
  // 지형지물: 배치 종류 두 가지를 섞고 크기·개수도 무작위. 덩어리끼리·벽과는 한 칸 이상 띄워 막힌 구석이 없게 한다
  const pillars = [];
  for (const r of rooms) if (r.type === 'battle' || r.type === 'elite' || r.type === 'boss') {
    const lay = r.type === 'boss' ? ['corners'] : [LINE_TERRAIN[line] || rng.pick(LAYOUTS)]; r.layout = lay.join('+');
    const mine = [], place = (x, y, bw, bh) => {
      for (let yy = y - 1; yy <= y + bh; yy++) for (let xx = x - 1; xx <= x + bw; xx++) {
        if (xx < r.x0 || yy < r.y0 || xx >= r.x0 + r.w || yy >= r.y0 + r.h || tiles[yy * w + xx] !== T.FLOOR) return false;   // 둘레 한 칸까지 바닥이어야
        if (xx >= x && xx < x + bw && yy >= y && yy < y + bh && (Math.abs(xx - r.cx) <= 1 || Math.abs(yy - r.cy) <= 1)) return false;
      }
      const p = { room: r.id, x, y, w: bw, h: bh }; mine.push(p); pillars.push(p);
      for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) set(xx, yy, T.WALL);
      return true;
    };
    const qx = Math.floor(r.w / 4), qy = Math.floor(r.h / 4), j = () => rng.int(3) - 1;
    for (const L of lay) {
      if (L === 'corners') for (const [px, py] of [[r.x0 + qx - 1, r.y0 + qy - 1], [r.x0 + r.w - qx - 1, r.y0 + qy - 1], [r.x0 + qx - 1, r.y0 + r.h - qy - 1], [r.x0 + r.w - qx - 1, r.y0 + r.h - qy - 1]]) place(px + j(), py + j(), 2, 2);
      if (L === 'rows') { const gap = 2 + rng.int(3); for (const yy of [r.cy - 3 - rng.int(2), r.cy + 3 + rng.int(2)]) for (let xx = r.x0 + 2 + rng.int(2); xx < r.x0 + r.w - 2; xx += gap) place(xx, yy, 1, 1); }
      if (L === 'bars') for (const [px, py] of [[r.x0 + 3, r.y0 + 2], [r.x0 + r.w - 4, r.y0 + 2], [r.x0 + 3, r.cy + 2], [r.x0 + r.w - 4, r.cy + 2]]) if (rng.chance(0.75)) place(px + j(), py, 1, 2 + rng.int(2));
      if (L === 'diagonal') for (const [dx, dy] of [[-4, -3], [3, -3], [-4, 2], [3, 2], [-7, -4], [6, 3]]) place(r.cx + dx + j(), r.cy + dy, 2, 1 + rng.int(2));
      if (L === 'scatter') for (let k = 0, n = 4 + rng.int(6); k < 60 && mine.length < n + 2; k++) { const bw = 1 + rng.int(3); place(r.x0 + 1 + rng.int(r.w - 2), r.y0 + 1 + rng.int(r.h - 2), bw, bw === 3 ? 1 : 1 + rng.int(2)); }
      if (L === 'ruins') {   // 유적: 돌기둥이 두 줄로 늘어선 회랑 + 쓰러진 기둥
        const gap = 3 + rng.int(2), off = rng.int(gap);
        for (const yy of [r.cy - 3 - rng.int(2), r.cy + 3 + rng.int(2)]) for (let xx = r.x0 + 2 + off; xx < r.x0 + r.w - 2; xx += gap) if (rng.chance(0.85)) place(xx, yy, 1, 1);
        for (let k = 0; k < 3; k++) place(r.x0 + 2 + rng.int(r.w - 6), r.y0 + 2 + rng.int(r.h - 4), rng.chance(0.5) ? 3 : 1, 1);
      }
      if (L === 'maze') {   // 미로: 3칸 간격 격자 위에 짧은 칸막이를 가로·세로로 엇갈리게
        for (let yy = r.y0 + 2; yy < r.y0 + r.h - 2; yy += 3) for (let xx = r.x0 + 2; xx < r.x0 + r.w - 2; xx += 3) {
          if (rng.chance(0.25)) continue;
          if (rng.chance(0.5)) place(xx, yy, 2 + rng.int(2), 1); else place(xx, yy, 1, 2 + rng.int(2));
        }
      }
      if (L === 'hedges') {   // 산울타리: 길게 늘어선 덤불 줄(중간중간 틈)
        for (let yy = r.y0 + 2 + rng.int(2); yy < r.y0 + r.h - 2; yy += 3) { let xx = r.x0 + 2 + rng.int(3);
          while (xx < r.x0 + r.w - 3) { const len = 3 + rng.int(4); place(xx, yy, Math.min(len, r.x0 + r.w - 2 - xx), 1); xx += len + 2 + rng.int(2); } }
      }
      if (L === 'pipes') {   // 배관: 세로 파이프 기둥이 줄지어 서고 물탱크 몇 개
        const gap = 4 + rng.int(2);
        for (let xx = r.x0 + 2 + rng.int(3); xx < r.x0 + r.w - 2; xx += gap) { const y = r.y0 + 2 + rng.int(3); place(xx, y, 1, 3 + rng.int(3)); place(xx, r.y0 + r.h - 3 - rng.int(4), 1, 2 + rng.int(2)); }
        for (let k = 0; k < 2; k++) place(r.x0 + 2 + rng.int(r.w - 5), r.y0 + 2 + rng.int(r.h - 5), 2, 2);
      }
      if (L === 'rubble') {   // 폐허: 크기가 제각각인 콘크리트 잔해 + 굴뚝
        for (let k = 0, n = 7 + rng.int(5); k < 80 && mine.length < n; k++) { const bw = 1 + rng.int(3), bh = 1 + rng.int(2); place(r.x0 + 1 + rng.int(r.w - 2), r.y0 + 1 + rng.int(r.h - 2), bw, bh); }
        for (let k = 0; k < 2; k++) place(r.x0 + 2 + rng.int(r.w - 4), r.y0 + 2 + rng.int(r.h - 5), 1, 3);
      }
      if (L === 'mounds') {   // 설산: 눈 쌓인 바위 언덕(넓은 덩어리) + 침엽수(한 칸)
        for (let k = 0, n = 4 + rng.int(3); k < 60 && mine.length < n; k++) place(r.x0 + 1 + rng.int(r.w - 2), r.y0 + 1 + rng.int(r.h - 2), 2 + rng.int(3), 2);
        for (let k = 0, n = mine.length + 4 + rng.int(4); k < 60 && mine.length < n; k++) place(r.x0 + 1 + rng.int(r.w - 2), r.y0 + 1 + rng.int(r.h - 2), 1, 1);
      }
      if (L === 'castles') {   // 사막: 네 귀퉁이 쪽에 모래성(3×3), 사이사이 작은 모래 언덕
        for (const [px, py] of [[r.x0 + qx - 2, r.y0 + qy - 2], [r.x0 + r.w - qx - 1, r.y0 + qy - 2], [r.x0 + qx - 2, r.y0 + r.h - qy - 1], [r.x0 + r.w - qx - 1, r.y0 + r.h - qy - 1]]) if (rng.chance(0.85)) place(px + j(), py + j(), 3, 3);
        for (let k = 0, n = mine.length + 3 + rng.int(3); k < 50 && mine.length < n; k++) place(r.x0 + 1 + rng.int(r.w - 2), r.y0 + 1 + rng.int(r.h - 2), 2, 1);
      }
      if (L === 'machines') {   // 공장: 기계가 바둑판처럼(2×2, 5칸 간격)
        const ox = rng.int(3), oy = rng.int(3);
        for (let yy = r.y0 + 2 + oy; yy < r.y0 + r.h - 3; yy += 5) for (let xx = r.x0 + 2 + ox; xx < r.x0 + r.w - 3; xx += 5) if (rng.chance(0.8)) place(xx, yy, 2, 2);
      }
      if (L === 'racks') {   // 서버실: 세로로 긴 서버 랙이 줄지어 통로를 만든다
        const gap = 3 + rng.int(2);
        for (let xx = r.x0 + 2 + rng.int(2); xx < r.x0 + r.w - 2; xx += gap) { place(xx, r.y0 + 2, 1, Math.max(2, r.cy - 2 - (r.y0 + 2) - rng.int(2))); place(xx, r.cy + 2 + rng.int(2), 1, Math.max(2, r.y0 + r.h - 2 - (r.cy + 2) - 1 - rng.int(2))); }
      }
      if (L === 'walls') for (const [px, py, bw, bh] of [[r.x0 + 2, r.cy - 4, 4, 1], [r.x0 + r.w - 6, r.cy + 3, 4, 1], [r.cx + 3, r.y0 + 2, 1, 3], [r.cx - 4, r.y0 + r.h - 5, 1, 3]]) if (rng.chance(0.7)) place(px + j(), py, bw, bh);
    }
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
