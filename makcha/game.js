'use strict';
// 막차 3단계 시험판: 구역 1 지층 터널 · 역 1 (방 4개) · 지질학자 · 삼엽충/암모나이트 · 보스 매머드
// 규격: 800×450 고정, 정수배 확대, 타일 16, 그림 도트 1칸 = 게임 1칸 (규격.md)
const W = 800, H = 450, T = 16, DT = 1 / 60;
const WALK = 12, DASH = 28; // 초당 타일 수 (2026-10-26 교사 요청: 6 → 9 → 12)
const ACCEL = 9, FRICTION = 6; // 클수록 빨리 붙고 빨리 선다(작을수록 미끄러짐)
const DASH_CD = 0.8; // 구르기 쿨타임(초)
const RUSH = 34; // 회생 제동 급발진 속도(초당 타일)
const HIT_INV = 0.5; // 맞은 뒤 무적 시간(초) (2026-10-26 교사 요청: 1.0 → 0.5)
const STORM_R = 58; // 대기 불안정 회오리 반지름(도트)

// ---------- 화면 ----------
const view = document.getElementById('game'), vctx = view.getContext('2d');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const ctx = buf.getContext('2d');
const wrap = document.getElementById('wrap');
function fit() {
  const dpr = window.devicePixelRatio || 1;
  const raw = Math.min(innerWidth * dpr / W, innerHeight * dpr / H);
  const scale = Math.max(1, Math.floor(raw));
  view.width = W * scale; view.height = H * scale;
  const shown = raw < 1 ? raw : scale;
  const cw = W * shown / dpr, ch = H * shown / dpr;
  wrap.style.width = cw + 'px'; wrap.style.height = ch + 'px';
  view.style.width = cw + 'px'; view.style.height = ch + 'px';
  wrap.style.fontSize = (cw / 800 * 13) + 'px';
  vctx.imageSmoothingEnabled = false;
}
addEventListener('resize', fit);

// ---------- 난수 ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rand = rng(1);
const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return (h ^ h >>> 16) >>> 0; };

// ---------- 그림 도구 (임시 도형, 정수 칸만) ----------
function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function ell(g, cx, cy, w, h, c) {
  g.fillStyle = c; const a = w / 2, b = h / 2;
  for (let j = 0; j < h; j++) { const yy = j + 0.5 - b; const half = Math.round(a * Math.sqrt(Math.max(0, 1 - yy * yy / (b * b))));
    if (half > 0) g.fillRect(Math.round(cx - half), Math.round(cy - b + j), half * 2, 1); }
}
function sprite(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
  const f = document.createElement('canvas'); f.width = w; f.height = h; const fg = f.getContext('2d');
  fg.drawImage(c, 0, 0); fg.globalCompositeOperation = 'source-atop'; fg.fillStyle = '#fff'; fg.fillRect(0, 0, w, h);
  return { c, f, w, h };
}
function drawSpr(s, x, y, flip, flash) {
  const img = flash ? s.f : s.c; x = Math.round(x); y = Math.round(y);
  if (!flip) { ctx.drawImage(img, x, y); return; }
  ctx.save(); ctx.translate(x + s.w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
}

// 지질학자 30×38: 팔 없음 — 탐사모, 머리, 짧은 네모 몸통(조끼), 작은 장화
// 직업 6명 30×38: 모두 팔 없음 — 머리, 짧은 네모 몸통, 작은 발. 직업은 모자와 옷 색으로만 구분한다(그림은 설계가 끝난 뒤)
function drawHero(g, ph, moving, L) {
  const h = 38, w = 30, fh = 5, bh = 11, hh = 22, O = '#1a1512', x = 17, y = 39;
  const bob = (ph % 2 === 1) ? 1 : 0;
  const left = x - 15, top = y - h + bob;
  const step = moving ? [0, -1, 0, 1][ph % 4] : 0, fw = 9;
  px(g, left + 4, y - fh + Math.min(0, step), fw, fh, O); px(g, left + 5, y - fh + 1 + Math.min(0, step), fw - 2, fh - 2, L.shoe);
  px(g, left + w - 4 - fw, y - fh + Math.min(0, -step), fw, fh, O); px(g, left + w - 3 - fw, y - fh + 1 + Math.min(0, -step), fw - 2, fh - 2, L.shoe);
  const bw = 24, bl = x - 12, bt = top + hh - 1;
  px(g, bl, bt, bw, bh + 1, O); px(g, bl + 1, bt + 1, bw - 2, bh - 1, L.shirt);
  px(g, bl + 1, bt + 1, 6, bh - 1, L.vest); px(g, bl + bw - 7, bt + 1, 6, bh - 1, L.vest);
  px(g, bl + 2, bt + 5, 4, 3, L.pocket); px(g, bl + bw - 6, bt + 5, 4, 3, L.pocket);
  if (L.mark) L.mark(g, x, bt);
  px(g, left + 1, top, w - 2, hh, O); px(g, left, top + 1, w, hh - 2, O); px(g, left + 1, top + 1, w - 2, hh - 2, '#f2d0a9');
  HAT[L.hat](g, left, top, w, L);
  px(g, x - 4, top + 12, 2, 3, O); px(g, x + 6, top + 12, 2, 3, O);
  px(g, x - 7, top + 16, 3, 1, '#e8a68a'); px(g, x + 8, top + 16, 3, 1, '#e8a68a');
}
const HAT = {
  brim(g, l, t, w, L) { const O = '#1a1512'; px(g, l + 3, t - 1, w - 6, 7, O); px(g, l + 4, t, w - 8, 5, L.hatC); px(g, l + 4, t + 4, w - 8, 1, L.hatD); px(g, l - 2, t + 6, w + 4, 3, O); px(g, l - 1, t + 7, w + 2, 1, L.hatD); },
  cap(g, l, t, w, L) { const O = '#1a1512'; px(g, l + 1, t - 1, w - 2, 8, O); px(g, l + 2, t, w - 4, 6, L.hatC); px(g, l + 2, t + 4, w - 4, 1, L.hatD); px(g, l + 12, t + 1, 6, 3, '#e3c25a'); px(g, l + w - 6, t + 6, 9, 3, O); px(g, l + w - 5, t + 7, 7, 1, L.hatD); },
  helmet(g, l, t, w, L) { const O = '#1a1512'; px(g, l + 2, t - 2, w - 4, 9, O); px(g, l, t + 1, w, 6, O); px(g, l + 3, t - 1, w - 6, 7, L.hatC); px(g, l + 1, t + 2, w - 2, 4, L.hatC); px(g, l + 13, t - 1, 4, 7, '#d9483b'); px(g, l + 11, t + 1, 8, 3, '#d9483b'); },
  beanie(g, l, t, w, L) { const O = '#1a1512'; px(g, l + 2, t - 2, w - 4, 9, O); px(g, l + 3, t - 1, w - 6, 5, L.hatC); px(g, l + 1, t + 3, w - 2, 4, O); px(g, l + 2, t + 4, w - 4, 2, L.hatD); px(g, l + 13, t - 4, 4, 3, O); px(g, l + 14, t - 3, 2, 1, '#f3ead7'); },
  hair(g, l, t, w, L) { const O = '#1a1512'; px(g, l + 1, t - 1, w - 2, 7, O); px(g, l + 2, t, w - 4, 5, L.hatC); px(g, l + 1, t + 5, 4, 4, L.hatC); px(g, l + 20, t + 4, 8, 2, L.hatC); },
  goggles(g, l, t, w, L) { const O = '#1a1512'; px(g, l + 1, t, w - 2, 5, '#3a2a20'); px(g, l, t + 5, w, 4, O); px(g, l + 3, t + 5, 9, 3, L.hatC); px(g, l + 18, t + 5, 9, 3, L.hatC); px(g, l + 4, t + 5, 3, 1, '#e6f6ff'); px(g, l + 19, t + 5, 3, 1, '#e6f6ff'); },
  bucket(g, l, t, w, L) { const O = '#1a1512'; px(g, l + 4, t - 2, w - 8, 8, O); px(g, l + 5, t - 1, w - 10, 6, L.hatC); px(g, l - 1, t + 5, w + 2, 4, O); px(g, l, t + 6, w, 2, L.hatD); px(g, l + 6, t + 3, w - 12, 1, L.hatD); },
};
// 최종 소비자 임시 도형: 매 22×14, 호랑이 36×22(오른쪽을 봄), 사람(팔 없는 같은 꼴)
function drawHawk(g, f) { const O = '#1a1512';
  if (f) { px(g, 1, 2, 9, 4, O); px(g, 2, 3, 8, 2, '#7a5230'); px(g, 12, 2, 9, 4, O); px(g, 12, 3, 8, 2, '#7a5230'); }
  else { px(g, 2, 6, 8, 6, O); px(g, 3, 7, 7, 4, '#7a5230'); px(g, 12, 6, 8, 6, O); px(g, 12, 7, 7, 4, '#7a5230'); }
  px(g, 7, 4, 9, 8, O); px(g, 8, 5, 7, 6, '#9a6a3a'); px(g, 14, 3, 6, 6, O); px(g, 15, 4, 4, 4, '#f3ead7'); px(g, 18, 5, 3, 2, '#e3b02a'); px(g, 16, 5, 1, 1, O); }
function drawTiger(g, f) { const O = '#1a1512', B = '#e88a2a';
  for (const [lx, i] of [[4, 0], [11, 1], [20, 0], [26, 1]]) { const up = (i === 0) === !!f ? 2 : 0; px(g, lx, 15 - up, 5, 7, O); px(g, lx + 1, 16 - up, 3, 5, B); }
  px(g, 2, 6, 28, 11, O); px(g, 3, 7, 26, 9, B); px(g, 3, 13, 26, 3, '#f3ead7');
  for (const x of [7, 12, 17, 22]) px(g, x, 7, 2, 6, O);
  px(g, 24, 2, 12, 12, O); px(g, 25, 3, 10, 10, B); px(g, 25, 2, 3, 2, O); px(g, 32, 2, 3, 2, O); px(g, 29, 9, 6, 4, '#f3ead7'); px(g, 31, 6, 2, 2, O); px(g, 34, 9, 2, 1, O);
  px(g, 0, 5, 3, 2, O); px(g, 0, 3, 2, 3, O); }
const HUMAN_LOOK = { hat: 'hair', hatC: '#2a1d14', hatD: '#1a120c', shirt: '#6a8fc0', vest: '#6a8fc0', pocket: '#5a7aa8', shoe: '#2a2a30' };
// 직업: 체력·방어막·에너지, 스킬(쿨타임 초), 겉모습. 스킬 내용은 컨셉_확정.md 4절(통박사 점검 반영)
const JOBS = {
  driver: { name: '지하철 기관사', hp: 8, sh: 4, en: 100, skill: '회생 제동', cd: 10, weapons: ['sling'], pick: 'hammer',
    look: { hat: 'cap', hatC: '#24365c', hatD: '#16223d', shirt: '#dfe6ee', vest: '#2e4470', pocket: '#22355a', shoe: '#2a2a30' } },
  geo: { name: '지질학자', hp: 6, sh: 3, en: 120, skill: '지층 판독', cd: 12, weapons: ['hammer'], pick: 'sling',
    look: { hat: 'brim', hatC: '#9a7b45', hatD: '#6e552b', shirt: '#c9b27a', vest: '#6f7d3c', pocket: '#55612c', shoe: '#5a3b22' } },
  eco: { name: '생태학자', hp: 6, sh: 3, en: 140, skill: '최종 소비자', cd: 12, weapons: ['sling'], pick: 'hammer',
    look: { hat: 'bucket', hatC: '#5f8a3a', hatD: '#3f6024', shirt: '#e8e0c8', vest: '#7a9a4a', pocket: '#5a7a34', shoe: '#4a3a28' } },
  chem: { name: '화학 연구원', hp: 5, sh: 2, en: 160, skill: '중화제 투척', cd: 7, weapons: ['sling'], pick: 'hammer',
    look: { hat: 'goggles', hatC: '#7fd0c8', hatD: '#3a8a84', shirt: '#f4f4f0', vest: '#f4f4f0', pocket: '#c9d2d6', shoe: '#3a3a40',
      mark: (g, x, bt) => { px(g, x - 1, bt + 1, 2, 10, '#c9d2d6'); } } },
  weather: { name: '기상 연구원', hp: 6, sh: 3, en: 140, skill: '대기 불안정', cd: 11, weapons: ['sling'], pick: 'hammer',
    look: { hat: 'beanie', hatC: '#3f7fb8', hatD: '#2a5a86', shirt: '#d8e4ee', vest: '#e08a2e', pocket: '#b86a1e', shoe: '#2f3640' } },
  medic: { name: '응급 구조사', hp: 7, sh: 3, en: 120, skill: '응급 처치', cd: 14, weapons: ['sling'], pick: 'hammer',
    look: { hat: 'helmet', hatC: '#f3f3f3', hatD: '#c9c9c9', shirt: '#e05a3a', vest: '#f0c419', pocket: '#c99f10', shoe: '#2a2a30' } },
};
let jobKey = 'geo';
// 삼엽충 22×16 (위에서 본 모습, 머리가 오른쪽)
function drawTri(g, f) {
  ell(g, 11, 8, 22, 16, '#2a1d12'); ell(g, 11, 8, 20, 14, '#9b7a52');
  for (let i = 4; i < 15; i += 3) px(g, i, 2, 1, 12, '#6f5235');
  px(g, 3, 7, 13, 2, '#c9a676');
  ell(g, 17, 8, 8, 12, '#2a1d12'); ell(g, 17, 8, 6, 10, '#b8935f');
  px(g, 18, 5, 2, 2, '#1a1512'); px(g, 18, 9, 2, 2, '#1a1512');
  for (let i = 0; i < 4; i++) { const lx = 4 + i * 4 + (f ? 1 : 0); px(g, lx, 0, 1, 1, '#2a1d12'); px(g, lx, 15, 1, 1, '#2a1d12'); }
}
// 암모나이트 30×30
function drawAmm(g) {
  ell(g, 15, 15, 30, 30, '#2b2216'); ell(g, 15, 15, 28, 28, '#c8a46e');
  ell(g, 15, 15, 19, 19, '#7c6038'); ell(g, 15, 15, 17, 17, '#d9bb87');
  ell(g, 15, 15, 9, 9, '#7c6038'); ell(g, 15, 15, 7, 7, '#b38f5a');
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; px(g, Math.round(15 + Math.cos(a) * 11), Math.round(15 + Math.sin(a) * 11), 2, 2, '#9b7c4c'); }
  px(g, 22, 12, 3, 3, '#15161a');
}
// 매머드 96×84 (오른쪽을 봄)
function drawMam(g, f) {
  const O = '#1d120a', B = '#7a4a2a', D = '#5a341c', L = '#9a6638';
  const legY = 64;
  const legs = [[14, 0], [30, 1], [52, 0], [68, 1]];
  for (const [lx, i] of legs) { const up = (i === 0) === !!f ? 2 : 0;
    px(g, lx, legY - up, 14, 20, O); px(g, lx + 1, legY + 1 - up, 12, 18, i ? B : D); px(g, lx + 1, legY + 16 - up, 12, 2, '#d8c7a4'); }
  ell(g, 44, 42, 80, 50, O); ell(g, 44, 42, 78, 48, B);
  ell(g, 34, 22, 42, 22, O); ell(g, 34, 22, 40, 20, B);
  for (let i = 0; i < 9; i++) px(g, 12 + i * 7, 26 + (i % 2) * 3, 2, 26, D);
  px(g, 10, 58, 66, 3, D);
  ell(g, 76, 34, 34, 36, O); ell(g, 76, 34, 32, 34, L); ell(g, 74, 24, 26, 14, B);
  px(g, 82, 30, 3, 3, O);
  px(g, 84, 40, 10, 30, O); px(g, 85, 41, 8, 28, L); px(g, 82, 66, 12, 6, O); px(g, 83, 67, 10, 4, L);
  px(g, 72, 48, 16, 5, O); px(g, 73, 49, 15, 3, '#f4ecd8'); px(g, 86, 42, 6, 10, O); px(g, 87, 43, 4, 8, '#f4ecd8');
}
// 무기 20×8: 돌리지 않고 좌우만 뒤집는다
function drawHammer(g) { px(g, 0, 2, 14, 4, '#1a1512'); px(g, 1, 3, 12, 2, '#8a5a2e'); px(g, 12, 0, 8, 8, '#1a1512'); px(g, 13, 1, 6, 6, '#8d96a3'); px(g, 13, 1, 6, 2, '#c3cad3'); }
function drawSling(g) { px(g, 0, 2, 11, 4, '#1a1512'); px(g, 1, 3, 9, 2, '#8a5a2e'); px(g, 9, 0, 4, 8, '#1a1512'); px(g, 12, 0, 7, 2, '#1a1512'); px(g, 12, 6, 7, 2, '#1a1512'); px(g, 10, 1, 2, 6, '#a06a38'); px(g, 18, 1, 1, 6, '#d9483b'); }

// 구역 2~4 적·보스 임시 도형 (모두 오른쪽을 봄, 무서운 괴물로 그리지 않음)
const O_ = '#1a1512';
const DRAW = {
  rat(g, f) { ell(g, 10, 9, 18, 12, O_); ell(g, 10, 9, 16, 10, '#8a8a90'); ell(g, 17, 8, 9, 8, O_); ell(g, 17, 8, 7, 6, '#9a9aa0'); px(g, 15, 2, 3, 3, O_); px(g, 16, 3, 1, 1, '#e8a0a8');
    px(g, 21, 8, 1, 1, '#e8a0a8'); px(g, 18, 6, 1, 1, O_); px(g, 0, 8 + (f ? 1 : 0), 3, 1, '#c89aa0'); px(g, 5 + (f ? 1 : 0), 14, 2, 2, O_); px(g, 12 - (f ? 1 : 0), 14, 2, 2, O_); },
  leaf(g, f) { ell(g, 12, 9, 22, 14, O_); ell(g, 12, 9, 20, 12, '#7ab84a'); px(g, 4, 9, 16, 1, '#4f8a2a'); for (let i = 6; i < 18; i += 4) { px(g, i, 6, 1, 3, '#4f8a2a'); px(g, i, 10, 1, 3, '#4f8a2a'); }
    px(g, 19, 6, 2, 2, O_); px(g, 22, 4 + (f ? 1 : 0), 2, 1, O_); },
  spore(g, f) { for (const [x, y, r] of [[13, 15, 20], [7, 11, 12], [19, 10, 12], [13, 7, 12]]) ell(g, x, y, r, r, O_);
    for (const [x, y, r] of [[13, 15, 18], [7, 11, 10], [19, 10, 10], [13, 7, 10]]) ell(g, x, y, r, r, '#efeadc'); for (const [x, y] of [[9, 13], [16, 16], [13, 9], [19, 12]]) px(g, x, y, 2, 2, '#b8b0a0'); px(g, 15, 13, 2, 2, O_); },
  rust(g, f) { ell(g, 13, 13, 26, 22, O_); ell(g, 13, 13, 24, 20, '#9a4a26'); for (const [x, y] of [[6, 8], [14, 6], [9, 15], [18, 14]]) px(g, x, y, 4, 2, '#6a2a12'); px(g, 18, 9, 2, 2, '#f3ead7'); px(g, 4, 5, 3, 3, '#c26a3a'); },
  acid(g, f) { ell(g, 11, 14, 20, 16, O_); ell(g, 11, 14, 18, 14, '#e8d040'); px(g, 9, 2, 4, 6, O_); px(g, 10, 3, 2, 6, '#e8d040'); px(g, 6, 11, 3, 3, '#fff6a0'); px(g, 14, 13 + (f ? 1 : 0), 2, 2, '#b8a020'); px(g, 15, 10, 2, 2, O_); },
  ember(g, f) { ell(g, 12, 15, 22, 14, O_); ell(g, 12, 15, 20, 12, '#4a1a12'); for (const [x, y] of [[6, 14], [12, 17], [16, 13]]) px(g, x, y, 3, 2, '#ff7a2a');
    px(g, 9, 3 + (f ? 1 : 0), 6, 6, '#ff7a2a'); px(g, 10, 1 + (f ? 1 : 0), 4, 4, '#ffd23f'); px(g, 16, 12, 2, 2, '#ffd23f'); },
  fog(g, f) { g.globalAlpha = 0.85; for (const [x, y, w, h] of [[16, 14, 30, 18], [9, 10, 16, 14], [23, 9, 16, 14]]) ell(g, x, y, w, h, '#5a5e66'); for (const [x, y, w, h] of [[16, 14, 28, 16], [9, 10, 14, 12], [23, 9, 14, 12]]) ell(g, x, y, w, h, '#9aa0aa');
    g.globalAlpha = 1; for (const [x, y] of [[10, 9], [20, 7], [15, 15], [25, 13]]) px(g, x, y, 2, 2, '#e8ecf0'); },
  drone(g, f) { px(g, 5, 7, 16, 11, O_); px(g, 6, 8, 14, 9, '#4a5a6a'); for (const x of [1, 19]) for (const y of [3, 15]) { px(g, x, y, 6, 2, f ? '#c8d0d8' : '#8a96a2'); px(g, x + 2, y + 1, 2, 2, O_); }
    px(g, 8, 10, 10, 4, O_); px(g, 9, 11, 8, 2, '#7ee07e'); px(g, 18, 9, 2, 2, '#ff5a3c'); },
  bias(g, f) { px(g, 1, 3, 24, 22, O_); px(g, 2, 4, 22, 20, '#2a3440'); for (const [x, h] of [[4, 4], [9, 6], [14, 5], [19, 17]]) px(g, x, 22 - h, 4, h, x === 19 ? '#ff7a2a' : '#5fb8ff'); px(g, 3, 22, 20, 1, '#9aa0aa'); },
  owl(g, f) { const B = '#8a6a44', L = '#c8a878', D = '#5a4228';
    if (f) { ell(g, 14, 40, 30, 46, O_); ell(g, 14, 40, 28, 44, D); ell(g, 82, 40, 30, 46, O_); ell(g, 82, 40, 28, 44, D); } else { ell(g, 16, 52, 26, 40, O_); ell(g, 16, 52, 24, 38, D); ell(g, 80, 52, 26, 40, O_); ell(g, 80, 52, 24, 38, D); }
    ell(g, 48, 46, 64, 66, O_); ell(g, 48, 46, 62, 64, B); ell(g, 48, 56, 40, 40, L); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) px(g, 36 + j * 10 + (i % 2) * 5, 46 + i * 7, 3, 2, D);
    ell(g, 38, 30, 20, 20, O_); ell(g, 38, 30, 18, 18, '#f3ead7'); ell(g, 58, 30, 20, 20, O_); ell(g, 58, 30, 18, 18, '#f3ead7'); px(g, 40, 28, 5, 5, O_); px(g, 60, 28, 5, 5, O_);
    px(g, 46, 36, 4, 6, '#e3b02a'); px(g, 34, 14, 6, 6, D); px(g, 56, 14, 6, 6, D); px(g, 38, 76, 6, 4, '#e3b02a'); px(g, 52, 76, 6, 4, '#e3b02a'); },
  furnace(g, f) { px(g, 58, 0, 16, 26, O_); px(g, 60, 2, 12, 24, '#5a5a62'); px(g, 60, 2, 12, 3, f ? '#ff7a2a' : '#8a8a92');
    ell(g, 44, 58, 84, 68, O_); ell(g, 44, 58, 82, 66, '#6a6a72'); for (const [x, y, c] of [[16, 40, '#9a4a26'], [40, 34, '#7a7a82'], [62, 44, '#9a4a26'], [26, 62, '#7a7a82'], [52, 66, '#9a4a26']]) { px(g, x, y, 18, 14, O_); px(g, x + 1, y + 1, 16, 12, c); }
    px(g, 30, 50, 8, 6, '#7ee07e'); px(g, 50, 50, 8, 6, '#7ee07e'); px(g, 34, 78, 20, 8, O_); px(g, 35, 79, 18, 6, f ? '#ffd23f' : '#ff7a2a'); px(g, 14, 86, 14, 6, O_); px(g, 60, 86, 14, 6, O_); },
  ai(g, f) { px(g, 0, 0, 100, 64, O_); px(g, 3, 3, 94, 58, '#24303c'); px(g, 6, 6, 88, 52, '#0e1a26'); for (let y = 8; y < 56; y += 4) px(g, 6, y, 88, 1, '#14222e');
    ell(g, 50, 30, 30, 20, '#5fb8ff'); ell(g, 50, 30, 12, 12, '#0e1a26'); px(g, 48, 28, 4, 4, '#e6f6ff'); for (let i = 0; i < 6; i++) px(g, 12 + i * 14, 50, 8, 3, i % 2 === (f ? 1 : 0) ? '#7ee07e' : '#2a4a2a');
    px(g, 40, 64, 20, 10, O_); px(g, 42, 64, 16, 8, '#3a4a5a'); },
};
// 새 보스 8종 임시 도형 (차분한 표정, 그림은 설계가 끝난 뒤)
Object.assign(DRAW, {
  trilo(g, f) { ell(g, 48, 32, 94, 56, O_); ell(g, 48, 32, 90, 52, '#8a6a44'); ell(g, 48, 32, 30, 50, '#a8845a'); for (let i = 10; i < 86; i += 8) px(g, i, 8 + (f && i % 16 ? 1 : 0), 2, 48, '#6a5034');
    ell(g, 80, 32, 30, 44, O_); ell(g, 80, 32, 26, 40, '#b89468'); px(g, 82, 22, 5, 4, O_); px(g, 82, 38, 5, 4, O_); px(g, 84, 23, 2, 1, '#f3ead7'); px(g, 84, 39, 2, 1, '#f3ead7'); },
  finch(g, f) { const bird = (x, y, bk) => { ell(g, x, y, 26, 22, O_); ell(g, x, y, 24, 20, '#9a7a54'); ell(g, x - 2, y + 3, 16, 12, '#d8c09a'); px(g, x + 4, y - 4, 3, 3, O_);
      px(g, x + 11, y - 2, bk, bk > 5 ? 5 : 3, O_); px(g, x + 12, y - 1, bk - 2, bk > 5 ? 3 : 1, '#e3b02a'); px(g, x - 10, y - 4 + (f ? 2 : 0), 8, 5, '#6a5034'); };
    bird(22, 34, 7); bird(48, 18, 4); bird(70, 38, 5); },
  frog(g, f) { ell(g, 44, 52, 86, 24, O_); ell(g, 44, 52, 84, 22, '#3f8a4a'); ell(g, 44, 36, 70, 50, O_); ell(g, 44, 36, 66, 46, '#6ab84a'); ell(g, 44, 44, 44, 26, '#c8e09a');
    for (const x of [26, 62]) { ell(g, x, 14 + (f ? 1 : 0), 18, 18, O_); ell(g, x, 14 + (f ? 1 : 0), 16, 16, '#f3ead7'); px(g, x - 2, 12 + (f ? 1 : 0), 5, 5, O_); }
    px(g, 34, 40, 20, 2, '#2a5a2a'); },
  vine(g, f) { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, x = 46 + Math.cos(a) * 34, y = 56 + Math.sin(a) * 26; stroke(g, 46, 56, Math.cos(a), Math.sin(a) * 0.75, 36, 6, O_); stroke(g, 46, 56, Math.cos(a), Math.sin(a) * 0.75, 36, 4, '#4f7a2a');
      ell(g, Math.round(x), Math.round(y), 12, 9, O_); ell(g, Math.round(x), Math.round(y), 10, 7, '#7ab84a'); px(g, Math.round(x + 4), Math.round(y - 5), 2, 3, '#c8d0a8'); }
    ell(g, 46, 40, 26, 30, O_); ell(g, 46, 40, 22, 26, '#5f8a3a'); ell(g, 46, 30, 18, 16, O_); ell(g, 46, 30, 14, 12, f ? '#f0a0c8' : '#e080b0'); px(g, 44, 28, 4, 3, '#fff6a0'); },
  neutral(g, f) { for (const [x, c] of [[24, '#e8d040'], [72, '#3f7fd0']]) { px(g, x - 20, 10, 40, 60, O_); px(g, x - 18, 12, 36, 56, '#c8d0d8'); px(g, x - 16, 30 + (f ? 2 : 0), 32, 36, c); px(g, x - 14, 32 + (f ? 2 : 0), 4, 2, '#ffffff'); }
    px(g, 40, 30, 16, 24, O_); px(g, 42, 32, 12, 20, '#5a6470'); px(g, 44, 40, 8, 4, '#4fbf5a'); px(g, 10, 72, 76, 10, O_); px(g, 12, 74, 72, 6, '#3a3f46'); px(g, 18, 16, 6, 4, '#7ee07e'); px(g, 66, 16, 6, 4, '#7ee07e'); },
  cooler(g, f) { px(g, 10, 14, 68, 62, O_); px(g, 12, 16, 64, 58, '#7a8a9a'); px(g, 12, 16, 64, 6, f ? '#3f7fd0' : '#e08a2e'); for (let y = 30; y < 70; y += 6) px(g, 20, y, 48, 2, '#5a6a7a');
    for (const x of [0, 76]) { px(g, x, 30, 12, 40, O_); px(g, x + 1, 31, 10, 38, '#7fb2d9'); px(g, x + 1, 40, 10, 2, '#e6f6ff'); } px(g, 30, 24, 8, 4, '#7ee07e'); px(g, 50, 24, 8, 4, '#7ee07e'); px(g, 14, 76, 60, 8, O_); },
  turbine(g, f) { ell(g, 46, 44, 84, 84, O_); ell(g, 46, 44, 80, 80, '#6a7480'); ell(g, 46, 44, 60, 60, '#3a4048');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + (f ? 0.2 : 0); stroke(g, 46, 44, Math.cos(a), Math.sin(a), 26, 5, '#c3cad3'); }
    ell(g, 46, 44, 14, 14, O_); ell(g, 46, 44, 10, 10, '#f0b429'); px(g, 30, 84, 32, 8, O_); px(g, 32, 86, 28, 4, '#c8783a'); px(g, 20, 20, 6, 4, '#7ee07e'); px(g, 66, 20, 6, 4, '#7ee07e'); },
  solar(g, f) { px(g, 46, 40, 8, 50, O_); px(g, 48, 42, 4, 46, '#8d96a3'); for (const [x, y] of [[4, 6], [52, 6], [4, 30], [52, 30]]) { px(g, x, y + (f ? 1 : 0), 44, 22, O_); px(g, x + 2, y + 2 + (f ? 1 : 0), 40, 18, '#1e3a6a');
      for (let i = 1; i < 4; i++) px(g, x + 2 + i * 10, y + 2 + (f ? 1 : 0), 1, 18, '#5fb8ff'); px(g, x + 2, y + 11 + (f ? 1 : 0), 40, 1, '#5fb8ff'); }
    px(g, 44, 54, 12, 6, O_); px(g, 45, 55, 4, 4, '#7ee07e'); px(g, 51, 55, 4, 4, '#7ee07e'); px(g, 30, 86, 40, 4, O_); },
});
const SIZE = { trilo: [96, 60], finch: [90, 56], frog: [88, 66], vine: [92, 88], neutral: [96, 84], cooler: [88, 84], turbine: [92, 92], solar: [100, 90], rat: [22, 16], leaf: [24, 18], spore: [26, 26], rust: [26, 24], acid: [22, 22], ember: [24, 22], fog: [32, 24], drone: [26, 20], bias: [26, 26], owl: [96, 80], furnace: [88, 92], ai: [100, 74] };
function sprFor(e) {
  if (e.kind === 'tri') return SPR.tri[e.ph % 2];
  if (e.kind === 'amm') return SPR.amm[0];
  if (e.kind === 'mam') return SPR.mam[(e.st === 'walk' || e.st === 'charge') ? (e.ph >> (e.st === 'charge' ? 0 : 1)) % 2 : 0];
  return SPR[e.kind][(e.ph >> 1) % 2];
}
const SPR = {};
function buildSprites() {
  for (const k in DRAW) SPR[k] = [0, 1].map(f => sprite(SIZE[k][0], SIZE[k][1], g => DRAW[k](g, f)));
  SPR.hawk = [0, 1].map(f => sprite(22, 14, g => drawHawk(g, f)));
  SPR.tiger = [0, 1].map(f => sprite(36, 22, g => drawTiger(g, f)));
  SPR.human = { idle: [0, 1].map(p => sprite(34, 40, g => drawHero(g, p, false, HUMAN_LOOK))) };
  SPR.hero = {};
  for (const k in JOBS) SPR.hero[k] = { idle: [0, 1].map(p => sprite(34, 40, g => drawHero(g, p, false, JOBS[k].look))), walk: [0, 1, 2, 3].map(p => sprite(34, 40, g => drawHero(g, p, true, JOBS[k].look))) };
  SPR.tri = [0, 1].map(f => sprite(22, 16, g => drawTri(g, f)));
  SPR.amm = [sprite(30, 30, drawAmm)];
  SPR.mam = [0, 1].map(f => sprite(96, 84, g => drawMam(g, f)));
  SPR.hammer = sprite(20, 8, drawHammer);
  SPR.sling = sprite(20, 8, drawSling);
  SPR.wf = {};
  for (const k in WDRAW) SPR.wf[k] = weaponFrames(WDRAW[k]);
}
// 무기 방향별 그림: 그림을 회전시키지 않고(도트가 깨짐) 22.5° 간격마다 도트로 따로 그린다.
// 오른쪽 반(-90°~+90°) 9장만 그리고 왼쪽은 좌우 뒤집기로 쓴다. 손잡이(축)는 그림 가운데(20,20)
const WSTEP = Math.PI / 8, WC = 20;
function weaponFrames(drawAt) { const fr = {}; for (let k = -4; k <= 4; k++) { const a = k * WSTEP; fr[k] = sprite(40, 40, g => drawAt(g, Math.cos(a), Math.sin(a))); } return fr; }
function stroke(g, x0, y0, ux, uy, len, w, col) {
  g.fillStyle = col; const o = (w - 1) / 2;
  for (let t = 0; t <= len; t += 0.5) g.fillRect(Math.round(x0 + ux * t - o), Math.round(y0 + uy * t - o), w, w);
}
function drawHammerAt(g, ux, uy) {
  stroke(g, WC, WC, ux, uy, 11, 4, '#1a1512'); stroke(g, WC, WC, ux, uy, 11, 2, '#8a5a2e');
  const hx = Math.round(WC + ux * 13), hy = Math.round(WC + uy * 13);
  px(g, hx - 4, hy - 4, 9, 9, '#1a1512'); px(g, hx - 3, hy - 3, 7, 7, '#8d96a3'); px(g, hx - 3, hy - 3, 7, 2, '#c3cad3');
}
function drawSlingAt(g, ux, uy) {
  const vx = -uy, vy = ux;
  stroke(g, WC, WC, ux, uy, 8, 4, '#1a1512'); stroke(g, WC, WC, ux, uy, 8, 2, '#8a5a2e');
  const bx = WC + ux * 8, by = WC + uy * 8;
  for (const s of [1, -1]) { const dx = ux * 0.8 + vx * s * 0.6, dy = uy * 0.8 + vy * s * 0.6, l = Math.hypot(dx, dy);
    stroke(g, bx, by, dx / l, dy / l, 7, 4, '#1a1512'); stroke(g, bx, by, dx / l, dy / l, 7, 2, '#a06a38'); }
  const t1x = bx + (ux * 0.8 + vx * 0.6) / 1.0 * 7, t1y = by + (uy * 0.8 + vy * 0.6) * 7, t2x = bx + (ux * 0.8 - vx * 0.6) * 7, t2y = by + (uy * 0.8 - vy * 0.6) * 7;
  const n = Math.max(Math.abs(t2x - t1x), Math.abs(t2y - t1y)); g.fillStyle = '#d9483b';
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(t1x + (t2x - t1x) * i / n), Math.round(t1y + (t2y - t1y) * i / n), 1, 1);
}
// 나머지 무기의 방향별 그림: 손잡이(가운데)에서 조준 방향(ux, uy)으로 뻗는다. vx, vy는 옆 방향
function bar(g, len, w, col, ux, uy, from) { const s = from || 0; stroke(g, WC + ux * s, WC + uy * s, ux, uy, len, w + 2, '#1a1512'); stroke(g, WC + ux * s, WC + uy * s, ux, uy, len, w, col); }
function blob(g, ux, uy, at, w, h, col) { const x = Math.round(WC + ux * at), y = Math.round(WC + uy * at); px(g, x - (w >> 1) - 1, y - (h >> 1) - 1, w + 2, h + 2, '#1a1512'); px(g, x - (w >> 1), y - (h >> 1), w, h, col); }
const WDRAW = {
  hammer: drawHammerAt, sling: drawSlingAt,
  nail(g, ux, uy) { bar(g, 13, 4, '#7d8794', ux, uy); bar(g, 4, 2, '#3a3f46', ux, uy, 13); blob(g, ux, uy, 4, 4, 4, '#5a6470'); },
  umbrella(g, ux, uy) { bar(g, 10, 2, '#8a5a2e', ux, uy); const vx = -uy, vy = ux, cx = WC + ux * 12, cy = WC + uy * 12;
    stroke(g, cx - vx * 9, cy - vy * 9, vx, vy, 18, 5, '#1a1512'); stroke(g, cx - vx * 8, cy - vy * 8, vx, vy, 16, 3, '#d9483b'); stroke(g, cx - vx * 3, cy - vy * 3, vx, vy, 6, 3, '#f3ead7'); },
  ladle(g, ux, uy) { bar(g, 11, 2, '#c3cad3', ux, uy); const x = Math.round(WC + ux * 14), y = Math.round(WC + uy * 14); ell(g, x, y, 9, 9, '#1a1512'); ell(g, x, y, 7, 7, '#c3cad3'); ell(g, x, y, 3, 3, '#8d96a3'); },
  rod(g, ux, uy) { bar(g, 18, 3, '#6a7480', ux, uy); bar(g, 4, 3, '#8a5a2e', ux, uy); blob(g, ux, uy, 18, 3, 3, '#c3cad3'); },
  base(g, ux, uy) { bar(g, 8, 6, '#f4f4f0', ux, uy); bar(g, 7, 2, '#8d96a3', ux, uy, 8); blob(g, ux, uy, 3, 3, 3, '#5fb8ff'); },
  reduct(g, ux, uy) { bar(g, 8, 5, '#6a8a5a', ux, uy); bar(g, 8, 1, '#c3cad3', ux, uy, 8); blob(g, ux, uy, 3, 3, 3, '#9ad08a'); },
  pack(g, ux, uy) { bar(g, 6, 5, '#3f7fd0', ux, uy); bar(g, 6, 5, '#d9483b', ux, uy, 6); bar(g, 3, 3, '#3a3f46', ux, uy, 12); },
  beam(g, ux, uy) { bar(g, 16, 2, '#8d96a3', ux, uy); blob(g, ux, uy, 17, 4, 4, '#fff6a0'); },
  pistol(g, ux, uy) { bar(g, 10, 4, '#3a3f46', ux, uy, 2); blob(g, ux, uy, 3, 3, 4, '#5a3a22'); },
  revolver(g, ux, uy) { bar(g, 12, 3, '#8d96a3', ux, uy, 2); blob(g, ux, uy, 5, 5, 5, '#5a6470'); blob(g, ux, uy, 2, 3, 4, '#7a4a22'); },
  smg(g, ux, uy) { bar(g, 11, 5, '#2a2a30', ux, uy, 1); bar(g, 3, 2, '#3a3f46', ux, uy, 12); const vx = -uy, vy = ux; stroke(g, WC + ux * 6 + vx * 2, WC + uy * 6 + vy * 2, vx, vy, 5, 2, '#5a6470'); },
  shotgun(g, ux, uy) { bar(g, 6, 4, '#7a4a22', ux, uy, -2); bar(g, 12, 3, '#3a3f46', ux, uy, 4); bar(g, 6, 3, '#8a5a2e', ux, uy, 7); },
  rifle(g, ux, uy) { bar(g, 5, 4, '#2a2a30', ux, uy, -3); bar(g, 12, 4, '#3a3f46', ux, uy, 2); bar(g, 4, 2, '#2a2a30', ux, uy, 14); const vx = -uy, vy = ux; stroke(g, WC + ux * 7 + vx * 2, WC + uy * 7 + vy * 2, vx, vy, 4, 2, '#5a6470'); },
  sniper(g, ux, uy) { bar(g, 5, 4, '#5a4a32', ux, uy, -3); bar(g, 18, 3, '#3a3f2a', ux, uy, 2); const vx = -uy, vy = ux; stroke(g, WC + ux * 4 - vx * 3, WC + uy * 4 - vy * 3, ux, uy, 6, 2, '#1a1512'); },
  lmg(g, ux, uy) { bar(g, 17, 5, '#2a2a30', ux, uy); const vx = -uy, vy = ux; blob(g, ux, uy, 6, 6, 6, '#5a6a3a'); stroke(g, WC + ux * 12 + vx * 2, WC + uy * 12 + vy * 2, vx, vy, 3, 1, '#8d96a3'); },
  rocket(g, ux, uy) { bar(g, 16, 6, '#5a6a3a', ux, uy, -2); bar(g, 3, 6, '#3a3f2a', ux, uy, 13); blob(g, ux, uy, 2, 4, 4, '#3a3f46'); blob(g, ux, uy, 15, 3, 3, '#ff7a2a'); },
  grenade(g, ux, uy) { bar(g, 11, 6, '#4a4a3a', ux, uy); bar(g, 4, 4, '#2a2a22', ux, uy, 11); blob(g, ux, uy, 6, 5, 5, '#6a7a4a'); },
  baton(g, ux, uy) { bar(g, 6, 3, '#2a2a30', ux, uy); bar(g, 10, 3, '#3f7fd0', ux, uy, 6); blob(g, ux, uy, 16, 3, 3, '#9fd8ff'); },
  saw(g, ux, uy) { bar(g, 8, 3, '#d9483b', ux, uy); const x = Math.round(WC + ux * 13), y = Math.round(WC + uy * 13); ell(g, x, y, 13, 13, '#1a1512'); ell(g, x, y, 11, 11, '#c3cad3'); ell(g, x, y, 4, 4, '#3a3f46');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; px(g, Math.round(x + Math.cos(a) * 6), Math.round(y + Math.sin(a) * 6), 1, 1, '#1a1512'); } },
  saber(g, ux, uy) { bar(g, 5, 3, '#3a3f46', ux, uy); stroke(g, WC + ux * 5, WC + uy * 5, ux, uy, 14, 4, '#ff6ad5'); stroke(g, WC + ux * 5, WC + uy * 5, ux, uy, 14, 2, '#ffe6f8'); },
  coil(g, ux, uy) { bar(g, 12, 6, '#c8783a', ux, uy); const vx = -uy, vy = ux; g.fillStyle = '#7a4a1e';
    for (let t = 3; t < 12; t += 3) g.fillRect(Math.round(WC + ux * t - vx * 3), Math.round(WC + uy * t - vy * 3), 1, 1), g.fillRect(Math.round(WC + ux * t + vx * 3), Math.round(WC + uy * t + vy * 3), 1, 1);
    blob(g, ux, uy, 13, 3, 3, '#ffd23f'); },
};
// 조준 각도 → 그릴 그림 번호(k)와 좌우 뒤집기, 실제 그려지는 방향(총구 위치 계산용)
function weaponPose(a) {
  const flip = Math.cos(a) < 0, am = flip ? Math.PI - a : a;
  const k = Math.max(-4, Math.min(4, Math.round(Math.atan2(Math.sin(am), Math.cos(am)) / WSTEP)));
  const qa = k * WSTEP; return { k, flip, ux: flip ? -Math.cos(qa) : Math.cos(qa), uy: Math.sin(qa) };
}
function weaponPivot(a) {
  // 위를 겨누면 머리에 가려지지 않게 어깨 쪽으로 비켜 올린다
  const up = Math.max(0, -Math.sin(a) - 0.35) / 0.65, side = Math.cos(a) >= 0 ? 1 : -1;
  const x = Math.round(P.x + Math.cos(a) * 9 + side * up * 10), y = Math.round(P.y - 19 + Math.sin(a) * 5 - up * 8) + (P.moving && P.ph % 2 ? 1 : 0);
  return { x, y };
}

// ---------- 구역과 역 ----------
// 한 판 = 구역 1부터 열린 구역까지, 구역마다 역 4개, 보스는 구역의 마지막 역에만 (컨셉_확정.md 2절)
const ZONES = [
  { name: '지층 터널', stations: ['지질시대', '대멸종', '자연선택', '생물다양성'], pool: ['tri', 'amm'], boss: 'mam' },
  { name: '지하 텃밭 마을', stations: ['생태계 구성', '먹이 관계', '생태계 평형', '환경 변화'], pool: ['rat', 'leaf', 'spore'], boss: 'owl' },
  { name: '녹슨 침수 터널', stations: ['산화·환원', '연소·제련', '산·염기와 중화', '에너지 출입'], pool: ['rust', 'acid', 'ember'], boss: 'furnace' },
  { name: '지상 출구', stations: ['온난화', '태양 에너지·발전', '효율·신재생', '빅데이터·AI·윤리'], pool: ['fog', 'drone', 'bias'], boss: 'ai' },
];
let OPEN = [0, 1, 2, 3]; // 교사가 연 구역(단원). 나중에 관리 페이지와 연결. 시험판은 4개 모두 연다
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// 판마다 열린 구역의 순서를 섞는다(2026-10-27 교사 요청). zi: 몇 번째 구역인지 → 난이도는 구역 번호가 아니라 들어간 순서로 정한다
let stage = { order: [0], zi: 0, zone: 0, st: 0 };
// 역의 전투방 웨이브: 뒤 역일수록 적이 많고 세다
function wavesFor(zone, st) {
  const Z = ZONES[zone], n = 4 + st, waves = [];
  const nw = st >= 2 ? 3 : 2;
  for (let w = 0; w < nw; w++) { const wave = [];
    if (Z.pool.length === 2) for (let i = 0; i < n + w; i++) wave.push(i % 3 === 2 || (st >= 2 && i % 4 === 1) ? Z.pool[1] : Z.pool[0]);
    else { // 적 3종: 무리 짓는 쥐는 한 번에 3마리라 적게 넣는다
      const k = Z.pool, m = n + w; for (let i = 0; i < m; i++) wave.push(k[(i + w) % 3]);
      if (k[0] === 'rat') { const r = wave.filter(x => x === 'rat'); wave.splice(0, wave.length, ...wave.filter(x => x !== 'rat'), ...r.slice(0, Math.max(1, Math.round(r.length / 3)))); } }
    waves.push(wave); }
  return waves;
}

// ---------- 지도: 역 하나 = 방 3~4개를 격자에 무작위로 잇는다 ----------
// 타일: 0 빈곳 1 바닥 2 벽 3 닫힌 문 4 가로 선로 5 세로 선로 6 열린 문 7 돌기둥 8 출구(다음 역)
const CW = 44, CH = 32, GW = 4, GH = 3, MW = CW * GW, MH = CH * GH;
const SOLID = new Set([0, 2, 3, 7, 10, 11]); // 10: 부서지는 지형지물(props), 11: 부서지지 않는 장애물
let map, rooms, links;
const ROOMSIZE = { start: [20, 16], fight: [30, 20], supply: [18, 14], exit: [20, 16], boss: [38, 26] };
const tile = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? 0 : map[y * MW + x];
const setT = (x, y, v) => { map[y * MW + x] = v; };
// 칸 무작위 걸음: 시작 → 전투 → 전투 → 출구(또는 보스), 가끔 전투방 옆에 보급방이 붙는다
function layoutStation(isBossSt) {
  for (let tries = 0; tries < 200; tries++) {
    const path = [[0, Math.floor(rand() * GH)]], used = new Set([path[0].join()]);
    let ok = true;
    for (let i = 1; i < 4 && ok; i++) {
      const [x, y] = path[i - 1], opts = [[x + 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => a >= 0 && a < GW && b >= 0 && b < GH && !used.has(a + ',' + b));
      if (!opts.length) ok = false; else { const n = opts[Math.floor(rand() * opts.length)]; path.push(n); used.add(n.join()); }
    }
    if (!ok) continue;
    const types = ['start', 'fight', 'fight', isBossSt ? 'boss' : 'exit'];
    const defs = path.map(([gx, gy], i) => ({ id: 'r' + i, gx, gy, type: types[i] }));
    const L = []; for (let i = 1; i < defs.length; i++) L.push([defs[i - 1].id, defs[i].id]);
    if (rand() < 0.6) { // 보급방
      const f = defs[1 + Math.floor(rand() * 2)], cand = [[f.gx + 1, f.gy], [f.gx - 1, f.gy], [f.gx, f.gy - 1], [f.gx, f.gy + 1]].filter(([a, b]) => a >= 0 && a < GW && b >= 0 && b < GH && !used.has(a + ',' + b));
      if (cand.length) { const [gx, gy] = cand[Math.floor(rand() * cand.length)]; defs.push({ id: 'sup', gx, gy, type: 'supply' }); L.push([f.id, 'sup']); }
    }
    return { defs, L };
  }
}
function buildMap() {
  map = new Uint8Array(MW * MH);
  const isBossSt = stage.st === 3, { defs, L } = layoutStation(isBossSt);
  links = L;
  rooms = defs.map(d => { const [w, h] = ROOMSIZE[d.type];
    return { ...d, w, h, x0: d.gx * CW + ((CW - w) >> 1), y0: d.gy * CH + ((CH - h) >> 1), doors: [], state: 'idle', wi: 0, seen: false,
      waves: d.type === 'fight' ? wavesFor(stage.zone, stage.st) : d.type === 'boss' ? [[pickBoss()]] : null }; });
  for (const r of rooms) {
    for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) setT(x, y, 2);
    for (let y = r.y0 + 2; y < r.y0 + r.h - 1; y++) for (let x = r.x0 + 1; x < r.x0 + r.w - 1; x++) setT(x, y, 1);
  }
  const R = id => rooms.find(r => r.id === id);
  for (const [a0, b0] of links) {
    let A = R(a0), B = R(b0);
    if (A.gx > B.gx || A.gy > B.gy) [A, B] = [B, A]; // 왼쪽→오른쪽, 위→아래 순서로 맞춘다
    if (A.gy === B.gy) {
      const cy = A.gy * CH + CH / 2;
      for (let x = A.x0 + A.w - 1; x <= B.x0; x++) {
        for (let y = cy - 1; y <= cy + 1; y++) {
          if (x === A.x0 + A.w - 1) { setT(x, y, 6); A.doors.push([x, y]); }
          else if (x === B.x0) { setT(x, y, 6); B.doors.push([x, y]); }
          else setT(x, y, 4);
        }
        if (x > A.x0 + A.w - 1 && x < B.x0) for (const y of [cy - 3, cy - 2, cy + 2]) if (tile(x, y) === 0) setT(x, y, 2);
      }
    } else {
      const cx = A.gx * CW + CW / 2;
      for (let y = A.y0 + A.h - 1; y <= B.y0 + 1; y++) {
        for (let x = cx - 1; x <= cx + 1; x++) {
          if (y === A.y0 + A.h - 1) { setT(x, y, 6); A.doors.push([x, y]); }
          else if (y === B.y0 || y === B.y0 + 1) { setT(x, y, 6); B.doors.push([x, y]); }
          else setT(x, y, 5);
        }
        if (y > A.y0 + A.h - 1 && y < B.y0) for (const x of [cx - 2, cx + 2]) if (tile(x, y) === 0) setT(x, y, 2);
      }
    }
  }
  for (const r of rooms) if (r.type === 'exit') { const cx = r.x0 + (r.w >> 1), cy = r.y0 + (r.h >> 1); for (let y = cy - 1; y <= cy; y++) for (let x = cx - 1; x <= cx; x++) setT(x, y, 8); }
  for (const r of rooms) if (r.type === 'start' || r.type === 'supply') { setT(r.x0 + 3, r.y0 + 3, 9); setT(r.x0 + 4, r.y0 + 3, 9); } // 조합대
  for (const r of rooms) placeBlocks(r); // 부서지지 않는 장애물 덩어리
  props = []; for (const r of rooms) placeProps(r);
}
function roomAt(wx, wy, margin) {
  const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
  return rooms.find(r => tx >= r.x0 + 1 + margin && tx <= r.x0 + r.w - 2 - margin && ty >= r.y0 + 2 + margin && ty <= r.y0 + r.h - 2 - margin);
}
const solidAt = (wx, wy) => SOLID.has(tile(Math.floor(wx / T), Math.floor(wy / T)));
function blocked(x, y, w, h) {
  return solidAt(x, y) || solidAt(x + w - 1, y) || solidAt(x, y + h - 1) || solidAt(x + w - 1, y + h - 1) || solidAt(x + w / 2, y) || solidAt(x + w / 2, y + h - 1);
}
// 발밑 충돌 상자(탑뷰라 발 부분만 막힌다). 막히면 true
function move(e, dx, dy) {
  let hit = false;
  if (e.slowT > 0 && e !== P) { dx *= 0.5; dy *= 0.5; } // 냉온 팩탄(흡열): 느려짐
  if (dx) { if (!blocked(e.x + dx - e.bw / 2, e.y - e.bh, e.bw, e.bh)) e.x += dx; else hit = true; }
  if (dy) { if (!blocked(e.x - e.bw / 2, e.y + dy - e.bh, e.bw, e.bh)) e.y += dy; else hit = true; }
  return hit;
}

// ---------- 상태 ----------
let P, enemies, ebul, shots, fx, marks, pickups, cam, shake, time, running, ended, bossRef, endT;
// 무기 (통박사 초안 5절, 교사 결정: 과학 개념이 약한 순수 무기도 넣음). 줍는 화면에는 이름만 보인다
// r: 등급(흰 w → 초록 g → 파랑 b → 보라 p → 주황 o), type: melee 근접 / shot 탄 / spray 분무 / beam 빛줄기 / charge 충전
// en: 한 번 쓸 때 드는 에너지, len: 손잡이에서 총구까지 길이(탄이 나가는 곳)
const RARITY = { w: '#e8e8e8', g: '#7ee07e', b: '#5fb8ff', p: '#c08aff', o: '#ffae42' };
const WEAP = {
  sling: { name: '새총', r: 'w', type: 'shot', cd: 0.32, en: 0.5, dmg: 2, sp: 320, br: 3.5, len: 15 },
  nail: { name: '못총', r: 'w', type: 'shot', cd: 0.13, en: 0.25, dmg: 1, sp: 380, br: 2.5, spread: 0.07, len: 16 },
  umbrella: { name: '우산', r: 'w', type: 'melee', cd: 0.45, en: 0, dmg: 2, arc: 2.1, range: 46, kb: 0.6, deflect: 2.4, deflN: 4 },
  ladle: { name: '국자', r: 'w', type: 'melee', cd: 0.38, en: 0, dmg: 3, arc: 1.4, range: 40, kb: 0.8, deflect: 1.6, scoop: true },
  hammer: { name: '망치', r: 'g', type: 'melee', cd: 0.4, en: 0, dmg: 4, arc: 1.2, range: 38, kb: 1, deflect: 1.75, stun: 0.5 }, // stun: 특수효과 기절(초)
  rod: { name: '손잡이 쇠봉', r: 'g', type: 'melee', cd: 0.22, en: 0, dmg: 3, arc: 0.5, range: 58, kb: 0.5, deflect: 0.6, deflN: 2 },
  base: { name: '수산화 칼슘 분사기', r: 'b', type: 'spray', cd: 0.2, en: 1.5, dmg: 1, n: 5, spread: 0.35, sp: 260, life: 0.35, br: 3, tag: 'base', len: 15 },
  reduct: { name: '환원제 분사기', r: 'b', type: 'shot', cd: 0.16, en: 0.8, dmg: 2, sp: 420, br: 2.5, tag: 'red', len: 16 },
  pack: { name: '냉온 팩탄', r: 'p', type: 'shot', cd: 0.45, en: 1.5, dmg: 3, sp: 260, br: 5, tag: 'pack', len: 14 },
  beam: { name: '빛줄기 창', r: 'p', type: 'beam', cd: 0.5, en: 3, dmg: 4, len: 18 },
  coil: { name: '유도 코일 충전기', r: 'o', type: 'charge', cd: 0.2, en: 5, dmg: 6, len: 14 },
  // 에너지는 위력에 맞춘다: 약한 총은 적게, 강한 총은 많이(2026-10-27 교사 요청)
  // 실제 총기를 본뜬 무기 (2026-10-26 교사 요청): 연사·피해·흩어짐·에너지를 다르게
  pistol: { name: '권총', r: 'w', type: 'shot', cd: 0.28, en: 0.5, dmg: 3, sp: 420, br: 3, len: 12 },
  revolver: { name: '리볼버', r: 'g', type: 'shot', cd: 0.55, en: 1.5, dmg: 7, sp: 480, br: 3.5, len: 14 },
  smg: { name: '기관단총', r: 'g', type: 'shot', cd: 0.08, en: 0.4, dmg: 1.5, sp: 400, br: 2.5, spread: 0.12, len: 13 },
  shotgun: { name: '산탄총', r: 'b', type: 'shot', cd: 0.65, en: 3, dmg: 2, n: 6, spread: 0.4, sp: 380, life: 0.45, br: 3, len: 17 },
  rifle: { name: '돌격소총', r: 'b', type: 'shot', cd: 0.12, en: 0.6, dmg: 2.5, sp: 460, br: 3, spread: 0.05, len: 17 },
  sniper: { name: '저격소총', r: 'p', type: 'shot', cd: 1.1, en: 5, dmg: 15, sp: 800, br: 3, pierce: 3, life: 1.2, len: 19 },
  lmg: { name: '기관총', r: 'o', type: 'shot', cd: 0.06, en: 0.8, dmg: 2, sp: 440, br: 3, spread: 0.14, len: 18 },
  // 폭발 무기 (2026-10-26 교사 요청): 적에게만 피해, 둘레의 적을 밀어낸다
  rocket: { name: '로켓포', r: 'o', type: 'shot', cd: 1.0, en: 6, dmg: 4, sp: 230, br: 5, len: 18, boom: { r: 56, dmg: 14 } },
  grenade: { name: '유탄 발사기', r: 'p', type: 'lob', cd: 0.7, en: 4, dmg: 10, len: 15, boom: { r: 48, dmg: 10 } },
  // 에너지를 쓰는 근접 무기 (2026-10-26 교사 요청)
  baton: { name: '전기 충격봉', r: 'b', type: 'melee', cd: 0.32, en: 1.5, dmg: 4, arc: 1.0, range: 42, kb: 0.6, deflect: 1.2, deflN: 3, zap: true },
  saw: { name: '회전 톱', r: 'p', type: 'melee', cd: 0.12, en: 0.8, dmg: 2, arc: 1.6, range: 40, kb: 0.2, deflect: 1.6, deflN: 2 },
  saber: { name: '광선검', r: 'o', type: 'melee', cd: 0.35, en: 3, dmg: 9, arc: 1.5, range: 56, kb: 1, deflect: 2.0, deflN: 4, wave: true },
};
const MAX_WEAPONS = 2;
const starMul = k => 1 + 0.25 * ((P.stars[k] || 1) - 1); // 별 하나마다 피해 +25%
// 무기 고르기: 뒤 구역일수록 높은 등급이 잘 나온다. minR이 있으면 그 등급 이상만(보스)
function randomWeapon(minR) {
  const order = ['w', 'g', 'b', 'p', 'o'], z = stage.zi, wts = { w: 40 - z * 8, g: 30, b: 18 + z * 3, p: 9 + z * 3, o: 3 + z * 2 };
  const keys = Object.keys(WEAP).filter(k => !minR || order.indexOf(WEAP[k].r) >= order.indexOf(minR));
  let sum = 0; for (const k of keys) sum += wts[WEAP[k].r]; let x = rand() * sum;
  for (const k of keys) { x -= wts[WEAP[k].r]; if (x <= 0) return k; } return keys[keys.length - 1];
}
const CRIT = 0.05; // 치명타 확률 (2026-10-26 교사 요청: 15% → 5%)
const KNOCK = { tri: 520, amm: 380 }; // 망치 넉백 초기 속도(도트/초), 보스는 밀리지 않음
const EDEF = {
  tri: { hp: 6, bw: 18, bh: 8, w: 22, h: 16 },
  amm: { hp: 14, bw: 24, bh: 10, w: 30, h: 30 },
  mam: { hp: 420, bw: 76, bh: 22, w: 96, h: 84, boss: true, name: '매머드' },
  // 구역 2 지하 텃밭 마을 (통박사 초안 2절)
  rat: { hp: 5, bw: 18, bh: 8, w: 22, h: 16, ai: 'charge', speed: 3.2, lunge: 11, tell: 0.4 },
  leaf: { hp: 12, bw: 22, bh: 9, w: 24, h: 18, ai: 'shoot', fan: 5, spread: 0.2, bsp: 95, br: 5, cd: 2.2 },
  spore: { hp: 10, bw: 22, bh: 10, w: 26, h: 26, ai: 'spore', speed: 1.3 },
  owl: { hp: 460, bw: 60, bh: 20, w: 96, h: 80, boss: true, name: '포식자 여왕' },
  // 구역 3 녹슨 침수 터널 (통박사 초안 3절)
  rust: { hp: 14, bw: 22, bh: 10, w: 26, h: 24, ai: 'charge', speed: 2.0, lunge: 9, tell: 0.5 },
  acid: { hp: 10, bw: 20, bh: 9, w: 22, h: 22, ai: 'shoot', fan: 3, spread: 0.3, bsp: 100, br: 6, cd: 2.0, hz: 'acid' },
  ember: { hp: 10, bw: 20, bh: 9, w: 24, h: 22, ai: 'shoot', fan: 3, burst: true, bsp: 170, br: 5, cd: 2.4, tell: 0.6, hz: 'fire', near: 6, far: 11 },
  furnace: { hp: 500, bw: 70, bh: 22, w: 88, h: 92, boss: true, name: '제련로 관리 로봇' },
  // 구역 4 지상 출구 (통박사 초안 4절)
  fog: { hp: 14, bw: 26, bh: 10, w: 32, h: 24, ai: 'float', speed: 1.1 },
  drone: { hp: 9, bw: 22, bh: 9, w: 26, h: 20, ai: 'shoot', fan: 3, burst: true, bsp: 150, br: 5, cd: 1.6, near: 5, far: 10, speed: 1.8 },
  bias: { hp: 12, bw: 22, bh: 10, w: 26, h: 26, ai: 'shoot', fan: 5, spread: 0.16, side: true, bsp: 105, br: 6, cd: 2.2 },
  ai: { hp: 540, bw: 90, bh: 20, w: 100, h: 74, boss: true, name: '관제 AI' },
  // 새 보스 8종 (통박사 초안 2026-10-27)
  trilo: { hp: 440, bw: 80, bh: 22, w: 96, h: 60, boss: true, name: '고생대 삼엽충' },
  finch: { hp: 420, bw: 70, bh: 20, w: 90, h: 56, boss: true, name: '섬 핀치 무리' },
  frog: { hp: 460, bw: 70, bh: 22, w: 88, h: 66, boss: true, name: '연못 개구리' },
  vine: { hp: 500, bw: 70, bh: 24, w: 92, h: 88, boss: true, name: '가시덩굴 군락' },
  neutral: { hp: 500, bw: 80, bh: 22, w: 96, h: 84, boss: true, name: '중화조 관리 장치' },
  cooler: { hp: 500, bw: 76, bh: 22, w: 88, h: 84, boss: true, name: '냉각 설비 관리기' },
  turbine: { hp: 540, bw: 80, bh: 22, w: 92, h: 92, boss: true, name: '터빈 발전기 관리기' },
  solar: { hp: 520, bw: 70, bh: 20, w: 100, h: 90, boss: true, name: '태양광 추적 어레이' },
};
const BOSS_IDLE = { mam: 'walk', owl: 'perch', furnace: 'walk', ai: 'idle', trilo: 'walk', finch: 'walk', frog: 'walk', vine: 'walk', neutral: 'walk', cooler: 'walk', turbine: 'walk', solar: 'walk' };
// 구역마다 보스 3종 중 하나를 무작위로 (2026-10-27 교사 요청)
const ZONE_BOSSES = [['mam', 'trilo', 'finch'], ['owl', 'frog', 'vine'], ['furnace', 'neutral', 'cooler'], ['ai', 'turbine', 'solar']];
const pickBoss = () => { const b = ZONE_BOSSES[stage.zone]; return b[Math.floor(rand() * b.length)]; };
// 재료 종류 (2026-10-26 교사 요청): 생물형은 가죽, 기계형은 부품, 둘 다 아닌 것(방울·숯·기체)은 무작위
const BIO = new Set(['tri', 'amm', 'mam', 'rat', 'leaf', 'spore', 'owl']), MECH = new Set(['rust', 'drone', 'bias', 'furnace', 'ai']);
const matOf = k => BIO.has(k) ? 'cloth' : MECH.has(k) ? 'part' : (rand() < 0.5 ? 'cloth' : 'part'); // 'cloth'는 화면에서 가죽
const isBoss = e => !!EDEF[e.kind].boss;
// 새 판: 구역 1 역 1부터. 캐릭터 상태는 역을 넘어가도 이어진다
function reset() {
  rand = rng((Date.now() & 0xffffff) || 1);
  { const order = shuffle(OPEN.slice()); stage = { order, zi: 0, zone: order[0], st: 0 }; }
  const J = JOBS[jobKey];
  P = { x: 0, y: 0, bw: 18, bh: 6, hp: J.hp, maxHp: J.hp, sh: J.sh, maxSh: J.sh, en: J.en, maxEn: J.en, noEnT: 0, inv: 0, shT: 0, face: 1,
    job: jobKey, skillCd: 0, skillMax: J.cd, stars: {}, packMode: 'cold', chg: 0,
    st: {}, gear: null, guard: {}, solarT: 0, mat: { cloth: 0, part: 0 }, perks: new Set(), rollHit: new Set(), relics: [], // 상태 이상, 장비(1개), 상태 이상 막는 시간, 재료(가죽·부품)
    ph: 0, pt: 0, moving: false, vx: 0, vy: 0, dash: 0, dashCd: 0, ddx: 0, ddy: 0, weapons: J.weapons.slice(), wi: 0, cd: 0, swing: 0, swingA: 0 };
  time = 0; ended = false; endT = 0;
  enterStation();
  const s = rooms[0];
  pickups.push({ kind: J.pick, x: (s.x0 + s.w / 2) * T + 40, y: (s.y0 + s.h / 2 + 2) * T });
}
// 역에 들어간다: 지도를 새로 만들고 시작방에 선다
function enterStation() {
  buildMap();
  const s = rooms[0];
  P.x = (s.x0 + s.w / 2) * T - 40; P.y = (s.y0 + s.h / 2 + 2) * T; P.vx = P.vy = 0; P.rush = null; P.dash = 0;
  enemies = []; ebul = []; shots = []; fx = []; marks = []; pickups = []; texts = []; flasks = []; puddles = []; skillFx = { kind: '', t: 0 }; allies = []; bombs = []; lobs = [];
  cam = { x: P.x - W / 2, y: P.y - H / 2 }; shake = 0; bossRef = null; trans = 0;
  hazards = []; corpses = []; timers = []; clouds = []; dark = 0; P.slowT = 0;
  if (stage.zone === 2) for (const r of rooms) if (r.type === 'fight') for (let i = 0; i < 2; i++) { // 구역 3: 냉매통 둘레 서리 바닥
    const x = (r.x0 + 4 + rand() * (r.w - 8)) * T, y = (r.y0 + 4 + rand() * (r.h - 7)) * T; addHazard(x, y, 'frost'); }
  showBanner();
  if (stage.zi > 0 || stage.st > 0) openPerk(); // 역을 넘어올 때마다 능력 고르기
  if (relicAdd('stationHeal') && (stage.zi > 0 || stage.st > 0) && P.hp < P.maxHp) { P.hp++; say(P.x, P.y - 46, '막차 시간표 · 체력 +1', 'heal', 'small'); }
}
let trans = 0; // 다음 역으로 넘어가는 중(화면이 어두워짐)
function nextStation() {
  if (trans > 0) return;
  trans = 0.6; P.vx = P.vy = 0;
}
function stationName() { const Z = ZONES[stage.zone]; return `${stage.zi + 1}/${stage.order.length} · 구역 ${stage.zone + 1} ${Z.name} · 역 ${stage.st + 1} ${Z.stations[stage.st]}`; }
function showBanner() { const b = document.getElementById('banner'); if (!b) return; b.textContent = stationName(); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

// ---------- 입력 ----------
const keys = {}; const mouse = { sx: 0, sy: 0, down: false };
// 글자 대신 키 위치(e.code)로 읽는다: 한글 입력 상태나 Shift를 누른 채여도 똑같이 동작
const CODE = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd', KeyQ: 'q', KeyE: 'e', KeyR: 'r', KeyF: 'f', KeyG: 'g', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Escape: 'esc' };
addEventListener('keydown', e => {
  const k = CODE[e.code]; if (k) keys[k] = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'ShiftRight') e.preventDefault();
  if (!running || e.repeat) return;
  if (e.code === 'Tab') { e.preventDefault(); if (!crafting && !choosing) toggleTree(); return; }
  if (viewingTree) { if (k === 'esc') toggleTree(); return; }
  if (choosing) return; // 능력은 하나 골라야 창이 닫힌다
  if (crafting) { if (k === 'e' || k === 'esc') closeCraft(); return; }
  if (infoOpen) { if (k === 'e' || k === 'esc') closeInfo(); return; }
  if (k === 'g' || k === '1') useGear(); // 장비 쓰기
  // 구르기: Shift (2026-10-26 교사 요청은 오른쪽 Shift). 키보드마다 오른쪽 Shift 신호가 다르게 올 수 있어 양쪽 Shift를 모두 받는다
  if (e.key === 'Shift' || e.code === 'ShiftRight' || e.code === 'ShiftLeft') tryDash();
  if (k === 'q' && P.weapons.length > 1) P.wi = (P.wi + 1) % P.weapons.length;
  if (k === 'e') tryPick();
  if (k === 'r') start();
  if (k === 'f' && P.weapons[P.wi] === 'pack') { P.packMode = P.packMode === 'cold' ? 'hot' : 'cold'; say(P.x, P.y - 46, P.packMode === 'cold' ? '흡열(파랑)' : '발열(빨강)', P.packMode === 'cold' ? 'stun' : 'hurt', 'small'); }
});
addEventListener('keyup', e => { const k = CODE[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
view.addEventListener('mousemove', e => { const r = view.getBoundingClientRect(); mouse.sx = (e.clientX - r.left) / r.width * W; mouse.sy = (e.clientY - r.top) / r.height * H; });
view.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; if (e.button === 2) useSkill(); });
addEventListener('mouseup', () => { mouse.down = false; });
view.addEventListener('contextmenu', e => e.preventDefault());
const mWorld = () => ({ x: mouse.sx + Math.round(cam.x), y: mouse.sy + Math.round(cam.y) });

// ---------- 플레이어 ----------
const pCenter = () => ({ x: P.x, y: P.y - 16 });
function tryDash() {
  if (P.dashCd > 0) return;
  let ix = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), iy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
  if (!ix && !iy) ix = P.face;
  const l = Math.hypot(ix, iy); P.ddx = ix / l; P.ddy = iy / l;
  P.vx = P.ddx * DASH * T; P.vy = P.ddy * DASH * T; P.dash = 0.28; P.dashCd = dashCdMax(); P.rollHit = new Set();
}
const nearExit = () => tile(Math.floor(P.x / T), Math.floor((P.y - 3) / T)) === 8 || [[-12, 0], [12, 0], [0, -12], [0, 12]].some(([dx, dy]) => tile(Math.floor((P.x + dx) / T), Math.floor((P.y - 3 + dy) / T)) === 8);
function tryPick() {
  if (nearExit()) { nextStation(); return; }
  if (nearBench()) { openCraft(); return; }
  if (!nearWeapon()) { openInfo(); return; } // 주변에 아무것도 없으면 내 상태 보기
  // 무기 줍기: 이미 가진 무기면 별(★)이 하나 늘고(최대 3), 두 칸이 차 있으면 손에 든 무기와 바꾼다
  const p = nearWeapon(); if (!p) return;
  p.dead = true; const k = p.kind;
  if (P.weapons.includes(k)) { const s = P.stars[k] || 1; if (s < 3) { P.stars[k] = s + 1; say(P.x, P.y - 46, WEAP[k].name + ' ★' + (s + 1), 'crit'); } else { P.en = Math.min(P.maxEn, P.en + 20); say(P.x, P.y - 46, '에너지 +20', 'energy', 'small'); } P.wi = P.weapons.indexOf(k); }
  else if (P.weapons.length < MAX_WEAPONS) { P.weapons.push(k); P.wi = P.weapons.length - 1; }
  else { const old = P.weapons[P.wi]; pickups.push({ kind: old, x: P.x, y: P.y + 6 }); P.weapons[P.wi] = k; }
  pickups = pickups.filter(q => !q.dead);
}
const nearWeapon = () => { let b = null, bd = 30; for (const p of pickups) if (WEAP[p.kind] && !p.dead) { const d = Math.hypot(p.x - P.x, p.y - P.y); if (d < bd) { bd = d; b = p; } } return b; };
function dropWeapon(x, y, minR) { pickups.push({ kind: randomWeapon(minR), x, y }); burst(x, y - 8, '#fff3b0', 10); }
function hurt(n) {
  if (P.inv > 0 || P.dash > 0 || P.rush || ended) return;
  shake = 6; P.shT = 0; P.inv = HIT_INV;
  let sh = 0, hp = 0;
  for (let i = 0; i < n; i++) { if (P.sh > 0) { P.sh--; sh++; } else { P.hp--; hp++; } }
  if (sh) say(P.x, P.y - 44, '방어막 -' + sh, 'shield', 'small');
  if (hp) say(P.x, P.y - (sh ? 58 : 44), '-' + hp, 'hurt', 'big');
  if (P.hp <= 0) { P.hp = 0; finish(false); }
}
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
// 자동 조준: 보이는 적 중 가장 가까운 적을 노린다. 없으면 마우스 쪽
function seeLine(x0, y0, x1, y1, skip) { // skip: 노리는 지형지물 자기 칸은 막힌 것으로 보지 않는다
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    if (skip && Math.floor(x / T) === skip.tx && Math.floor(y / T) === skip.ty) continue;
    if (solidAt(x, y)) return false; }
  return true;
}
let target = null;
function findTarget() {
  const c = pCenter(); let best = null, bd = 15 * T;
  for (const e of enemies) { if (e.dead) continue; const ex = e.x, ey = e.y - e.h / 2, d = Math.hypot(ex - c.x, ey - c.y);
    if (d < bd && seeLine(c.x, c.y, ex, ey)) { bd = d; best = e; } }
  if (!best) { // 보이는 몬스터가 없으면 가까운 지형지물(약 5칸 안)을 노린다 (2026-10-26 교사 요청, 몬스터가 먼저)
    let pd = 5 * T;
    for (const p of props) { if (p.dead) continue; const d = Math.hypot(p.x - c.x, p.y - 8 - c.y);
      if (d < pd && seeLine(c.x, c.y, p.x, p.y - 8, p)) { pd = d; best = p; } } }
  target = best;
}
const aimPoint = () => target ? { x: target.x, y: target.y - target.h / 2 } : mWorld();
// 에너지가 모자라면 든 무기를 그냥 휘두른다(2026-10-27 교사 요청). 약하지만 탄 1개는 막거나 튕긴다
const BASH = { type: 'melee', cd: 0.4, dmg: 2, range: 30, arc: 1.0, kb: 0.7, deflect: 0.8, deflN: 1 };
function attack() {
  const wk = P.weapons[P.wi], c = pCenter(), m = aimPoint(), a = Math.atan2(m.y - c.y, m.x - c.x);
  let W0 = WEAP[wk]; const cost = enCost(W0.en);
  if (P.en < cost) { W0 = BASH; if (!(P.noEnT > 0)) { say(P.x, P.y - 46, '에너지 부족 · 휘두르기', 'energy', 'small'); P.noEnT = 2; } }
  else if (W0.type === 'charge') return; // 충전 무기는 누르고 있다가 뗄 때 쏜다(updatePlayer)
  else P.en -= cost;
  P.cd = W0.cd; P.swingW = W0 === BASH ? BASH : null;
  const dm = starMul(wk) * (P.st.corrode ? 0.7 : 1) * dmgMul(W0.type === 'melee'); // 부식: 무기 피해 30% 감소
  if (W0.type === 'melee') {
    P.swing = 0.16; P.swingA = a;
    const wr = has('wide') ? 1.15 : 1, wa = has('wide') ? 1.3 : 1; // 넓은 휘두르기
    if (has('shock')) { // 충격파: 휘두를 때 둘레로 파동이 퍼진다
      for (const e of enemies) if (!e.dead && Math.hypot(e.x - c.x, e.y - e.h / 2 - c.y) < W0.range * 1.8 + e.w * 0.3) damage(e, Math.max(1, Math.round(2 * dm)));
      fx.push({ t: 'boom', x: c.x, y: c.y + 4, life: 0.25, max: 0.25 }); }
    for (const e of enemies) {
      const ec = { x: e.x, y: e.y - e.h / 2 }, d = Math.hypot(ec.x - c.x, ec.y - c.y);
      if (d < W0.range * wr + e.w * 0.35 && angDiff(Math.atan2(ec.y - c.y, ec.x - c.x), a) < W0.arc * wa) {
        damage(e, Math.round(W0.dmg * dm));
        if (W0.zap && !e.dead) { // 전기 충격봉: 기절, 가까운 적 2마리에게 전기가 튄다
          e.stun = Math.max(e.stun || 0, isBoss(e) ? 0.3 : 1.0);
          enemies.filter(o => o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 80).slice(0, 2).forEach(o => { damage(o, 2); fx.push({ t: 'zap', x: e.x, y: e.y - e.h / 2, x2: o.x, y2: o.y - o.h / 2, life: 0.15, max: 0.15 }); }); }
        if (!isBoss(e)) { // 넉백은 모든 근접 무기, 기절은 특수효과가 있을 때만(2026-10-26 교사 요청)
          const l = d || 1, kb = (KNOCK[e.kind] || 380) * W0.kb;
          e.kx = (ec.x - c.x) / l * kb; e.ky = (ec.y - c.y) / l * kb;
          const st = meleeStun(W0);
          if (st > 0 && !e.dead) {
            if (!(e.stun > 0)) say(e.x, e.y - e.h - 16, '기절', 'stun', 'small');
            e.stun = Math.max(e.stun || 0, st);
            if (e.st === 'tell' || e.st === 'lunge') { e.st = 'rest'; e.t = 0.3; }
          }
        }
      }
    }
    // 근접 무기로 적의 탄을 다룬다: 휘두른 쪽은 적에게 튕겨내고, 몸 가까이(30도트 안)는 지운다
    // 한 번 휘두를 때 가까운 탄부터 최대 deflN개만 다룬다. 보스 탄은 튕겨낼 수 없고 막기만 한다(2026-10-26 교사 요청: 보스 옆 휘두르기가 너무 셈)
    let nRefl = 0, nBlock = 0, left = W0.deflN || 3;
    const cand = ebul.filter(b => !b.dead).map(b => ({ b, d: Math.hypot(b.x - c.x, b.y - c.y) })).sort((p, q) => p.d - q.d);
    for (const { b, d } of cand) {
      if (left <= 0) break;
      if (b.boss && (d < 30 || (d < W0.range * wr + 14 && angDiff(Math.atan2(b.y - c.y, b.x - c.x), a) < W0.deflect * wa))) { b.dead = true; burst(b.x, b.y, '#bdb5a6', 5); nBlock++; left--; continue; }
      if (d < W0.range * wr + 14 && angDiff(Math.atan2(b.y - c.y, b.x - c.x), a) < W0.deflect * wa) { left--;
        const t = aimPoint(), ra = target ? Math.atan2(t.y - b.y, t.x - b.x) : Math.atan2(b.y - c.y, b.x - c.x);
        const cs = has('counter') ? 1.3 : 1; // 되받아치기: 튕긴 탄이 더 빠르고 2배 피해
        b.dead = true; shots.push({ x: b.x, y: b.y, vx: Math.cos(ra) * 330 * cs, vy: Math.sin(ra) * 330 * cs, life: 1.2, dmg: has('counter') ? 6 : 3, r: 4, deflect: true });
        burst(b.x, b.y, '#fff3b0', 5); nRefl++;
      } else if (d < 30) { b.dead = true; burst(b.x, b.y, '#bdb5a6', 5); nBlock++; left--; }
    }
    if (nRefl) say(P.x, P.y - 46, nRefl > 1 ? '튕김 ×' + nRefl : '튕김', 'deflect');
    if (nBlock) say(P.x, P.y - (nRefl ? 60 : 46), '막음', 'block', 'small');
    for (const p of props) if (!p.dead && Math.hypot(p.x - c.x, p.y - 8 - c.y) < W0.range * wr + 10 && angDiff(Math.atan2(p.y - 8 - c.y, p.x - c.x), a) < W0.arc * wa) hitProp(p, Math.round(W0.dmg * dm)); // 근접으로 지형지물 부수기
    if (W0.wave) shots.push({ x: c.x + Math.cos(a) * 20, y: c.y + Math.sin(a) * 20, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, life: 0.55, dmg: 6 * dm, r: 9, pierce: 4, wave: true }); // 광선검: 베기 파동
    if (W0.scoop) { let n = 0; for (const h of hazards) if (Math.hypot(h.x - c.x, h.y - c.y) < W0.range + 16 && angDiff(Math.atan2(h.y - c.y, h.x - c.x), a) < W0.arc) { h.t = h.life; n++; if (h.kind === 'nutri') P.en = Math.min(P.maxEn, P.en + 5); }
      if (n) say(P.x, P.y - 46, '웅덩이 담기', 'heal', 'small'); } // 국자: 웅덩이를 떠 담는다
    return;
  }
  // 탄은 그려진 총구 끝에서 나간다
  const pose = weaponPose(a), pv = weaponPivot(a);
  const gx = pv.x + pose.ux * W0.len, gy = pv.y + pose.uy * W0.len, a2 = Math.atan2(m.y - gy, m.x - gx);
  if (W0.type === 'beam') { fireBeam(gx, gy, a2, Math.round(W0.dmg * dm)); return; }
  if (W0.type === 'lob') { const d = Math.min(Math.hypot(m.x - gx, m.y - gy), 15 * T); lobs.push({ x0: gx, y0: gy, x1: gx + Math.cos(a2) * d, y1: gy + Math.sin(a2) * d + 12, t: 0, dur: 0.45 + d / 900, r: W0.boom.r, dmg: W0.boom.dmg * dm }); return; }
  const n = W0.n || 1;
  for (let i = 0; i < n; i++) {
    const sa = a2 + (n > 1 ? (rand() - 0.5) * 2 * W0.spread : (W0.spread ? (rand() - 0.5) * 2 * W0.spread : 0)), sp = W0.sp * (n > 1 ? 0.8 + rand() * 0.4 : 1);
    const lr = has('range') ? 1.15 : 1; // 장거리탄: 더 빠르고 멀리
    shots.push({ x: gx, y: gy, vx: Math.cos(sa) * sp * lr, vy: Math.sin(sa) * sp * lr, life: (W0.life || 1.3) * (has('range') ? 1.4 : 1), dmg: W0.dmg * dm, r: W0.br, tag: W0.tag, mode: W0.tag === 'pack' ? P.packMode : undefined,
      boom: W0.boom ? { r: W0.boom.r, dmg: W0.boom.dmg * dm } : undefined, rocket: !!W0.boom, pierce: W0.pierce || 0 });
  }
}
// 빛줄기 창: 벽에 닿을 때까지 곧게 뻗어 길 위의 적을 모두 꿰뚫는다
function fireBeam(x, y, a, dmg) {
  const [x2, y2] = rayEnd(x, y, a), L = Math.hypot(x2 - x, y2 - y) || 1, ux = (x2 - x) / L, uy = (y2 - y) / L;
  for (const e of enemies) { if (e.dead) continue; const ex = e.x - x, ey = e.y - e.h / 2 - y, t = ex * ux + ey * uy;
    if (t > 0 && t < L && Math.abs(ex * uy - ey * ux) < e.w * 0.45 + 4) damage(e, dmg); }
  hitProp(propAtPx(x2 + ux * 10, y2 + uy * 10), dmg); // 빛줄기가 닿은 지형지물
  fx.push({ t: 'beam', x, y, x2, y2, life: 0.15, max: 0.15 });
}
// 유도 코일 충전기: 누르고 있으면 충전, 떼면 충전한 만큼 강한 탄
function updateCharge() {
  const wk = P.weapons[P.wi]; if (WEAP[wk].type !== 'charge' || ended) { P.chg = 0; return; }
  if (mouse.down) { if (!P.chg && P.en < enCost(WEAP[wk].en)) return; // 에너지가 없으면 attack()에서 휘두른다
    P.chg = Math.min(1, (P.chg || 0) + DT / 1.1); }
  else if (P.chg > 0) {
    if (P.chg > 0.15) { P.en -= enCost(WEAP[wk].en); const c = pCenter(), m = aimPoint(), a = Math.atan2(m.y - c.y, m.x - c.x), pose = weaponPose(a), pv = weaponPivot(a);
      const gx = pv.x + pose.ux * WEAP[wk].len, gy = pv.y + pose.uy * WEAP[wk].len, a2 = Math.atan2(m.y - gy, m.x - gx), k = P.chg;
      shots.push({ x: gx, y: gy, vx: Math.cos(a2) * 380, vy: Math.sin(a2) * 380, life: 1.6, dmg: (6 + 14 * k) * starMul(wk) * dmgMul(false), r: 4 + 4 * k, pierce: k > 0.9 ? 3 : 0, coil: true });
      shake = Math.max(shake, 2 + 4 * k); }
    P.chg = 0; }
}
// ---------- 직업별 스킬 (오른쪽 클릭) ----------
// 화면 문구는 교과서 용어·"~다"체, 과학 내용은 컨셉_확정.md 4절(통박사 점검)
let flasks = [], puddles = [], skillFx = { kind: '', t: 0 }, allies = [], bombs = [];
// 최종 소비자: 매·호랑이·사람 중 하나가 6초 동안 나타나 싸운다 (2026-10-26 교사 설계)
const ALLY = { hawk: '매', tiger: '호랑이', human: '사람' };
function summonAlly() {
  const kinds = Object.keys(ALLY), kind = kinds[Math.floor(rand() * kinds.length)];
  const a = { kind, x: P.x - P.face * 20, y: P.y + 4, t: 6, st: 'go', cd: 0.2, face: P.face, ph: 0, pt: 0, hit: new Set(), bw: 24, bh: 8 };
  allies.push(a); burst(a.x, a.y - 10, '#cfe8b0', 14);
  say(P.x, P.y - 46, '최종 소비자 · ' + ALLY[kind], 'heal');
}
function nearestEnemy(x, y) { let b = null, bd = 1e9; for (const e of enemies) if (!e.dead) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; b = e; } } return b; }
function strongestEnemy() { let b = null; for (const e of enemies) if (!e.dead && (!b || e.hp > b.hp)) b = e; return b; }
function confuse(e, t) { if (isBoss(e)) t *= 0.4; if (!(e.conf > 0)) say(e.x, e.y - e.h - 16, '혼란', 'conf', 'small'); e.conf = Math.max(e.conf || 0, t); }
// 폭발: 적에게만 피해를 주고 밀어낸다 (사람이 던진 폭탄, 로켓포, 유탄 발사기)
function explode(x, y, r = 48, dmg = 7) {
  for (const e of enemies) if (!e.dead && Math.hypot(e.x - x, (e.y - y) * 1.4) < r + e.w * 0.3) {
    damage(e, Math.round(dmg)); if (!isBoss(e)) { const d = Math.hypot(e.x - x, e.y - y) || 1; e.kx = (e.x - x) / d * 380; e.ky = (e.y - y) / d * 380; } }
  for (const p of props) if (!p.dead && Math.hypot(p.x - x, (p.y - 8 - y) * 1.4) < r + 8) hitProp(p, dmg); // 폭발은 지형지물도 부순다
  burst(x, y - 6, '#ffb347', 22 + r / 4); burst(x, y - 6, '#5a4a3a', 10); fx.push({ t: 'boom', x, y, r, life: 0.3, max: 0.3 }); shake = Math.max(shake, 4 + r / 10);
}
let lobs = []; // 유탄: 조준한 곳으로 포물선을 그리며 날아가 터진다
function updateAllies() {
  for (const a of allies) {
    a.t -= DT; a.cd -= DT; a.pt += DT; if (a.pt > 0.1) { a.pt = 0; a.ph++; }
    if (a.kind === 'hawk') { // 가장 가까운 적에게 날아가 혼란과 피해
      const e = nearestEnemy(a.x, a.y);
      if (e && a.cd <= 0) { const dx = e.x - a.x, dy = e.y - e.h / 2 - a.y + 18, d = Math.hypot(dx, dy) || 1; a.face = dx >= 0 ? 1 : -1;
        a.x += dx / d * 300 * DT; a.y += dy / d * 300 * DT;
        if (d < 16) { damage(e, 3); confuse(e, 2.5); a.cd = 0.55; a.y -= 10; } }
      else if (!e) { a.x += (P.x - a.x) * 2 * DT; a.y += (P.y - 30 - a.y) * 2 * DT; }
    } else if (a.kind === 'tiger') { // 가장 강한 적에게 직선으로 달려가 큰 피해
      if (a.st === 'go' && a.cd <= 0) { const e = strongestEnemy(); if (e) { const dx = e.x - a.x, dy = e.y - a.y, d = Math.hypot(dx, dy) || 1;
          a.dx = dx / d; a.dy = dy / d; a.face = dx >= 0 ? 1 : -1; a.st = 'aim'; a.cd = 0.25; a.hit = new Set(); } }
      else if (a.st === 'aim' && a.cd <= 0) { a.st = 'run'; a.cd = 0.9; }
      else if (a.st === 'run') {
        const wall = move(a, a.dx * 430 * DT, a.dy * 430 * DT);
        if (rand() < 0.7) fx.push({ t: 'dust', x: a.x + (rand() - 0.5) * 20, y: a.y - 2, life: 0.3, max: 0.3 });
        for (const e of enemies) if (!e.dead && !a.hit.has(e) && Math.hypot(e.x - a.x, (e.y - a.y) * 1.3) < e.bw / 2 + 18) {
          a.hit.add(e); damage(e, 12); shake = Math.max(shake, 4);
          if (!isBoss(e)) { e.kx = a.dx * 520; e.ky = a.dy * 520; e.stun = Math.max(e.stun || 0, 0.4); } }
        if (wall || a.cd <= 0) { a.st = 'go'; a.cd = 0.5; }
      }
    } else if (a.kind === 'human') { // 플레이어 곁에서 폭탄을 던진다
      const tx = P.x - P.face * 40, ty = P.y + 14, dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      if (d > 6) move(a, dx / d * Math.min(d * 6, 200) * DT, dy / d * Math.min(d * 6, 200) * DT);
      const e = nearestEnemy(a.x, a.y);
      if (e) a.face = e.x >= a.x ? 1 : -1;
      if (e && a.cd <= 0 && Math.hypot(e.x - a.x, e.y - a.y) < 15 * T) { bombs.push({ x0: a.x, y0: a.y - 20, x1: e.x, y1: e.y, t: 0, dur: 0.6 }); a.cd = 1.1; }
    }
    if (a.t <= 0) { a.dead = true; burst(a.x, a.y - 10, '#cfe8b0', 10); }
  }
  allies = allies.filter(a => !a.dead);
  for (const b of bombs) { b.t += DT; if (b.t >= b.dur) { b.dead = true; explode(b.x1, b.y1); } }
  bombs = bombs.filter(b => !b.dead);
}
function drawAlly(a) {
  const blink = a.t < 1 && Math.floor(a.t * 10) % 2 === 0; if (blink) return;
  const x = Math.round(a.x), y = Math.round(a.y);
  if (a.kind === 'hawk') { px(ctx, x - 6, y + 14, 12, 3, 'rgba(0,0,0,0.3)'); drawSpr(SPR.hawk[a.ph % 2], x - 11, y - 7, a.face < 0, false); }
  else if (a.kind === 'tiger') { px(ctx, x - 16, y - 2, 32, 3, 'rgba(0,0,0,0.3)'); drawSpr(SPR.tiger[a.st === 'run' ? a.ph % 2 : 0], x - 18, y - 22, a.face < 0, false); }
  else { px(ctx, x - 13, y - 2, 26, 3, 'rgba(0,0,0,0.3)'); const s = SPR.human; drawSpr(s.idle[a.ph % 2], x - 17, y - 39, a.face < 0, false); }
}
function useSkill() {
  if (!running || ended || P.skillCd > 0) return;
  const J = JOBS[P.job], c = pCenter();
  if (P.job === 'driver') { // 회생 제동: 이동 방향(없으면 조준 방향)으로 급발진, 멈출 때 방어막 충전
    let dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    if (!dx && !dy) { const m = aimPoint(); dx = m.x - c.x; dy = m.y - c.y; }
    const l = Math.hypot(dx, dy) || 1; P.rush = { t: 0.35, dx: dx / l, dy: dy / l, hit: new Set() }; P.dash = 0;
    say(P.x, P.y - 46, '회생 제동', 'shield');
  } else if (P.job === 'geo') { skillFx = { kind: 'geo', t: 6 }; say(P.x, P.y - 46, '지층 판독', 'stun'); }
  else if (P.job === 'eco') summonAlly();
  else if (P.job === 'chem') { const m = aimPoint(); flasks.push({ x0: c.x, y0: c.y, x1: m.x, y1: m.y, t: 0, dur: 0.45 }); }
  else if (P.job === 'weather') { skillFx = { kind: 'storm', t: 5, tick: 0 }; say(P.x, P.y - 46, '대기 불안정', 'stun'); }
  else if (P.job === 'medic') { const b = P.hp; P.hp = Math.min(P.maxHp, P.hp + 2); P.inv = Math.max(P.inv, 0.6);
    for (const k in P.st) if (k !== 'infect') delete P.st[k]; // 감염은 진단 키트로 병원체를 확인해야 풀린다(컨셉_확정 4절)
    say(P.x, P.y - 46, '응급 처치 · 체력 +' + (P.hp - b), 'heal'); burst(P.x, P.y - 16, '#7ee07e', 12); }
  P.skillCd = P.skillMax; // 스킬 단련·숙련이 쿨타임을 줄인다
  if (has('skshield')) { P.sh = Math.min(P.maxSh, P.sh + 1); say(P.x, P.y - 60, '방어막 +1', 'shield', 'small'); } // 스킬 방어막
}
const skillDmg = e => skillFx.t > 0 && skillFx.kind === 'geo' ? 1.5 : 1;
function splash(x, y) { // 중화제가 떨어진 자리: 주변 적에게 피해, 탄을 중화해 없애고, 웅덩이를 남긴다
  let n = 0;
  for (const e of enemies) if (!e.dead && Math.hypot(e.x - x, (e.y - y) * 1.4) < 46) damage(e, 6);
  for (const b of ebul) if (!b.dead && Math.hypot(b.x - x, b.y - y) < 46) { b.dead = true; n++; }
  puddles.push({ x, y, t: 0, life: 3 }); burst(x, y - 4, '#e8d040', 14); shake = Math.max(shake, 3);
  say(x, y - 20, n ? '중화 ×' + n : '중화', 'heal');
}
function updateSkills() {
  skillFx.t = Math.max(0, skillFx.t - DT);
  if (skillFx.t > 0 && skillFx.kind === 'storm') { // 대기 불안정: 몸 둘레 회오리바람
    const c = pCenter();
    for (const b of ebul) if (!b.dead && Math.hypot(b.x - c.x, b.y - c.y) < STORM_R) { b.dead = true; burst(b.x, b.y, '#dcefff', 3); }
    skillFx.tick -= DT;
    if (skillFx.tick <= 0) { skillFx.tick = 0.35;
      for (const e of enemies) { if (e.dead) continue; const ex = e.x, ey = e.y - e.h / 2, d = Math.hypot(ex - c.x, ey - c.y);
        if (d > STORM_R + e.w * 0.4) continue;
        damage(e, 2);
        if (!isBoss(e)) { const ux = (ex - c.x) / (d || 1), uy = (ey - c.y) / (d || 1); e.kx = (-ux * 0.3 - uy * 0.95) * 260; e.ky = (-uy * 0.3 + ux * 0.95) * 260; } } } // 둘레를 돌며 안쪽으로 조금 끌려온다
  }
  for (const f of flasks) { f.t += DT; if (f.t >= f.dur) { f.dead = true; splash(f.x1, f.y1); } }
  for (const l of lobs) { l.t += DT; if (l.t >= l.dur) { l.dead = true; explode(l.x1, l.y1, l.r, l.dmg); } }
  lobs = lobs.filter(l => !l.dead);
  flasks = flasks.filter(f => !f.dead);
  for (const p of puddles) { p.t += DT; for (const b of ebul) if (!b.dead && Math.hypot(b.x - p.x, b.y - p.y) < 30) { b.dead = true; burst(b.x, b.y, '#7ee07e', 3); } }
  puddles = puddles.filter(p => p.t < p.life);
  updateAllies();
}
function drawSkillsUnder() {
  for (const p of puddles) { // BTB 용액 색: 노랑(산성) → 초록(중성)
    const k = Math.min(1, p.t / 0.6), fade = Math.min(1, (p.life - p.t) / 0.8);
    ctx.globalAlpha = 0.5 * fade; ell(ctx, Math.round(p.x), Math.round(p.y), 64, 38, k < 1 ? '#e8d040' : '#4fbf5a');
    if (k < 1) { ctx.globalAlpha = 0.5 * k * fade; ell(ctx, Math.round(p.x), Math.round(p.y), 64, 38, '#4fbf5a'); }
    ctx.globalAlpha = 1; }
}
function drawSkillsOver(cx, cy) {
  for (const a of allies) if (a.kind === 'hawk') drawAlly(a); // 매는 하늘에 있으므로 맨 위에
  for (const l of lobs) { const k = l.t / l.dur, x = Math.round(l.x0 + (l.x1 - l.x0) * k), y = Math.round(l.y0 + (l.y1 - l.y0) * k - Math.sin(Math.PI * k) * 46);
    ringPx(l.x1, l.y1, l.r * 0.7, 'rgba(255,190,90,0.35)'); ell(ctx, x, y, 8, 8, '#1a1512'); ell(ctx, x, y, 6, 6, '#6a7a4a'); px(ctx, x - 1, y - 2, 2, 1, '#c8d0a8'); }
  for (const b of bombs) { const k = b.t / b.dur, x = Math.round(b.x0 + (b.x1 - b.x0) * k), y = Math.round(b.y0 + (b.y1 - b.y0) * k - Math.sin(Math.PI * k) * 40);
    ell(ctx, x, y, 9, 9, '#0d0d0d'); ell(ctx, x, y, 7, 7, '#3a3a3a'); px(ctx, x + 2, y - 6, 1, 3, '#8a6a3a'); px(ctx, x + 2, y - 7, 2, 2, Math.floor(time * 20) % 2 ? '#ffd23f' : '#ff7a2a'); }
  for (const f of flasks) { const k = f.t / f.dur, x = Math.round(f.x0 + (f.x1 - f.x0) * k), y = Math.round(f.y0 + (f.y1 - f.y0) * k - Math.sin(Math.PI * k) * 30);
    px(ctx, x - 3, y - 4, 7, 9, '#1a1512'); px(ctx, x - 2, y - 1, 5, 5, '#5fb8ff'); px(ctx, x - 1, y - 3, 3, 2, '#e6f6ff'); }
  if (skillFx.t > 0 && skillFx.kind === 'geo') for (const e of enemies) { if (e.dead) continue; // 약점 표시
    const x = Math.round(e.x), y = Math.round(e.y - e.h - 8) + (Math.floor(time * 6) % 2);
    px(ctx, x - 1, y - 3, 3, 7, '#3a0d0d'); px(ctx, x - 3, y - 1, 7, 3, '#3a0d0d'); px(ctx, x, y - 2, 1, 5, '#ff6b4a'); px(ctx, x - 2, y, 5, 1, '#ff6b4a'); }
  if (skillFx.t > 0 && skillFx.kind === 'storm') { // 회오리바람: 여러 겹의 고리가 서로 다른 빠르기로 돈다
    const c = pCenter(), fade = Math.min(1, skillFx.t / 0.5);
    for (let ring = 0; ring < 4; ring++) { const r = STORM_R * (0.4 + ring * 0.2), sp = 8 - ring * 1.3, len = 1.1 - ring * 0.1;
      ctx.globalAlpha = (0.45 + 0.12 * ring) * fade;
      for (let s = 0; s < 3; s++) { const a0 = time * sp + s * Math.PI * 2 / 3 + ring;
        for (let k = 0; k <= 1; k += 0.04) { const a = a0 + k * len, th = k > 0.7 ? 1 : 2; // 띠 끝은 가늘게
          px(ctx, Math.round(c.x + Math.cos(a) * r), Math.round(c.y + Math.sin(a) * r * 0.7), th + 1, th, ring % 2 ? '#e8f4ff' : '#a8d0f0'); } } }
    ctx.globalAlpha = 1; }
}
function updatePlayer() {
  P.inv = Math.max(0, P.inv - DT); P.cd -= DT; P.noEnT -= DT; P.skillCd = Math.max(0, P.skillCd - DT); P.dashCd -= DT; P.swing = Math.max(0, P.swing - DT);
  const shDelay = has('fastsh') ? 1.8 : 3; // 빠른 방어막
  P.shT += DT; if (P.shT > shDelay && P.sh < P.maxSh && !P.st.infect) { P.sh++; P.shT = shDelay - 1; } // 감염 중에는 방어막이 차지 않는다
  findTarget();
  const m = aimPoint(); if (Math.abs(m.x - P.x) > 2) P.face = m.x >= P.x ? 1 : -1;
  // 관성 이동: 속도가 목표 속도로 부드럽게 따라가고, 손을 떼면 미끄러지듯 멈춘다
  const ix = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), iy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0), l = Math.hypot(ix, iy) || 1;
  P.slowT = (P.slowT || 0) - DT; const sf = (P.slowT > 0 ? 0.6 : 1) * statusSpeed(); // 양분 웅덩이·열사병·동상: 느려짐
  const sw = (has('swift') ? 1.12 : 1) * relicMul('speed'); // 날렵함
  const tvx = ix / l * WALK * T * sf * sw, tvy = iy / l * WALK * T * sf * sw;
  if (P.rush) { // 회생 제동 급발진: 정해진 방향으로 곧게 달린다
    P.rush.t -= DT; P.vx = P.rush.dx * RUSH * T; P.vy = P.rush.dy * RUSH * T;
    if (rand() < 0.8) fx.push({ t: 'dust', x: P.x + (rand() - 0.5) * 16, y: P.y - 2, life: 0.4, max: 0.4 });
    for (const e of enemies) { // 지나가는 길의 적: 피해, 넉백, 기절 (한 번씩)
      if (e.dead || P.rush.hit.has(e) || Math.hypot(e.x - P.x, (e.y - P.y) * 1.3) > e.bw / 2 + 22) continue;
      P.rush.hit.add(e); damage(e, 5); shake = Math.max(shake, 5);
      if (!isBoss(e)) { const sx = Math.sign((e.x - P.x) * -P.rush.dy + (e.y - P.y) * P.rush.dx) || 1;
        e.kx = (P.rush.dx * 0.7 - P.rush.dy * sx * 0.7) * 620; e.ky = (P.rush.dy * 0.7 + P.rush.dx * sx * 0.7) * 620; }
      if (!e.dead) { e.stun = Math.max(e.stun || 0, isBoss(e) ? 0.5 : 1.0); say(e.x, e.y - e.h - 16, '기절', 'stun', 'small'); }
    }
    if (P.rush.t <= 0) { // 감속: 운동 에너지 일부를 전기 에너지로 전환해 방어막에 저장 (최댓값을 넘지 않음)
      const before = P.sh; P.sh = Math.min(P.maxSh, P.sh + 2); P.shT = 0; P.rush = null; P.vx *= 0.25; P.vy *= 0.25;
      say(P.x, P.y - 46, P.sh > before ? '방어막 +' + (P.sh - before) + ' (전환 효율 65%)' : '방어막 가득', 'shield'); burst(P.x, P.y - 6, '#9fd8ff', 12);
    }
  } else if (P.dash > 0) {
    P.dash -= DT; const k = 1 - Math.exp(-3 * DT); // 구르는 동안은 거의 그대로 미끄러진다
    P.vx += (tvx - P.vx) * k; P.vy += (tvy - P.vy) * k;
    if (rand() < 0.6) fx.push({ t: 'dust', x: P.x + (rand() - 0.5) * 12, y: P.y - 2, life: 0.35, max: 0.35 });
    if (has('rollhit')) for (const e of enemies) if (!e.dead && !P.rollHit.has(e) && Math.hypot(e.x - P.x, (e.y - P.y) * 1.3) < e.bw / 2 + 16) { P.rollHit.add(e); damage(e, 3); } // 구르기 돌진
  } else {
    const k = 1 - Math.exp(-((ix || iy) ? ACCEL : FRICTION) * DT);
    P.vx += (tvx - P.vx) * k; P.vy += (tvy - P.vy) * k;
  }
  if (Math.abs(P.vx) < 1 && !ix) P.vx = 0; if (Math.abs(P.vy) < 1 && !iy) P.vy = 0;
  const vx = P.vx * DT, vy = P.vy * DT;
  if (vx && move(P, vx, 0)) P.vx = 0;
  if (vy && move(P, 0, vy)) P.vy = 0;
  P.moving = Math.hypot(P.vx, P.vy) > 30;
  P.pt += DT; if (P.pt > (P.moving ? 0.08 : 0.4)) { P.pt = 0; P.ph++; }
  if (mouse.down && P.cd <= 0 && !ended) attack();
  updateCharge();
  for (const p of pickups) if (p.kind === 'energy') {
    p.t += DT; p.x += p.vx * DT; p.y += p.vy * DT; p.vx *= 0.9; p.vy *= 0.9;
    const dx = P.x - p.x, dy = P.y - 16 - p.y, d = Math.hypot(dx, dy) || 1;
    if (p.t > 0.3 && d < 90 * (1 + relicAdd('magnet'))) { const s = 340 * (1 - d / 120); p.vx += dx / d * s * DT * 8; p.vy += dy / d * s * DT * 8; }
    if (d < 14) { p.dead = true; P.en = Math.min(P.maxEn, P.en + (has('absorb') ? 6 : 4)); } // 에너지 흡수
  }
  for (const p of pickups) if (p.kind === 'relic' && Math.hypot(p.x - P.x, p.y - P.y) < 22) { p.dead = true; takeRelic(p.id); } // 유물은 닿으면 줍는다
  for (const p of pickups) if ((p.kind === 'cloth' || p.kind === 'part') && Math.hypot(p.x - P.x, p.y - P.y) < 22 * (1 + relicAdd('magnet'))) { // 재료는 닿으면 줍는다(자석: 더 멀리서)
    p.dead = true; P.mat[p.kind]++; say(P.x, P.y - 44, (p.kind === 'cloth' ? '가죽' : '부품') + ' +1', 'block', 'small'); }
  for (const p of pickups) if (p.kind === 'heal' && Math.hypot(p.x - P.x, p.y - P.y) < 22) { const before = P.hp; P.hp = Math.min(P.maxHp, P.hp + 2); p.dead = true; say(P.x, P.y - 44, '체력 +' + (P.hp - before), 'heal'); burst(p.x, p.y - 6, '#ff6b6b', 8); }
  pickups = pickups.filter(p => !p.dead);
}

// ---------- 적 ----------
function spawnEnemy(kind, x, y, room) {
  const d = EDEF[kind];
  const e = { kind, x, y, hp: d.hp, maxHp: d.hp, bw: d.bw, bh: d.bh, w: d.w, h: d.h, room, st: 'idle', t: 0.4 + rand() * 0.6, cd: 1 + rand(), flash: 0, face: -1, ph: 0, pt: 0, aim: 0 };
  if (kind === 'amm') e.shootT = 1.2 + rand() * 1.5;
  if (d.boss) { e.st = BOSS_IDLE[kind]; e.t = 1.4; e.seq = 0; bossRef = e; }
  if (kind === 'drone') e.batt = 10; // 정전 드론: 배터리가 0이 되면 멈춘다
  const zk = 1 + stage.zi * 0.35; e.hp = e.maxHp = Math.round(d.hp * (d.boss ? 1 + stage.zi * 0.25 : zk)); // 몇 번째로 들어간 구역일수록 튼튼하다
  enemies.push(e); return e;
}
function damage(e, n) {
  if (e.invul) { if (!(e.blockT > 0)) { say(e.x, e.y - e.h - (e.alt || 0) - 4, '막힘', 'block', 'small'); e.blockT = 0.4; } return; }
  n = Math.round(n * skillDmg(e));
  const crit = rand() < critChance(); if (crit) n *= 2; // 치명타: 피해 2배
  e.hp -= n; e.flash = 0.08; burst(e.x, e.y - e.h / 2, '#ffe9a8', 3);
  say(e.x, e.y - e.h - 2, crit ? '치명타 ' + n : String(n), crit ? 'crit' : 'dmg', crit ? 'big' : '');
  if (isBoss(e) && rand() < Math.min(0.5, n * 0.04)) { // 보스를 때리면 일정 확률로 에너지 구슬 (피해가 클수록 잘 나옴, 2026-10-26 교사 요청)
    const a = rand() * Math.PI * 2; pickups.push({ kind: 'energy', x: e.x + Math.cos(a) * e.bw * 0.4, y: e.y + 6, vx: Math.cos(a) * 70, vy: Math.sin(a) * 50 + 30, t: 0 }); }
  if (e.hp <= 0 && !e.dead) {
    e.dead = true; burst(e.x, e.y - e.h / 2, isBoss(e) ? '#c58a4a' : '#b8935f', isBoss(e) ? 40 : 10);
    if (!isBoss(e)) corpses.push({ x: e.x, y: e.y, t: 6 }); // 곰팡이 포자(분해자)가 찾아간다
    if (has('overflow')) P.en = Math.min(P.maxEn, P.en + 1); // 넘치는 에너지: 쓰러뜨리면 에너지 +1
    if (!isBoss(e) && rand() < 0.25) pickups.push({ kind: matOf(e.kind), x: e.x + (rand() - 0.5) * 16, y: e.y }); // 재료: 생물형은 가죽, 기계형은 부품
    if (isBoss(e)) for (let i = 0; i < 4; i++) pickups.push({ kind: matOf(e.kind), x: e.x - 30 + i * 20, y: e.y + 24 });
    if (e.kind === 'rat') for (const o of enemies) if (o.kind === 'rat' && !o.dead && o.room === e.room) o.rage = 4; // 앞 쥐가 쓰러지면 다음 쥐가 빨라진다
    // 에너지 구슬: 쓰러진 적이 떨어뜨리고, 가까이 가면 끌려온다
    const n = e.kind === 'tri' ? 2 : e.kind === 'amm' ? 3 : 0;
    for (let i = 0; i < n; i++) { const a = rand() * Math.PI * 2; pickups.push({ kind: 'energy', x: e.x, y: e.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 40, t: 0 }); }
    if (isBoss(e)) { shake = 14; enemies.forEach(o => { if (o !== e) { o.dead = true; burst(o.x, o.y - 6, '#b8935f', 6); } }); ebul = []; dropWeapon(e.x, e.y, 'p'); dropRelic(e.x + 40, e.y); zoneClear(); } // 보스: 보라 이상 무기
  }
}
// r: 탄 반지름(보스 탄은 크다), hz: 탄이 멈춘 자리에 남는 웅덩이(산성·불꽃)
function fire(x, y, a, sp, r, hz) { ebul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: hz ? 1.6 : 6, r: r || 5, hz, boss: firingBoss }); }
let firingBoss = false; // 보스가 쏜 탄 표시(튕겨낼 수 없음)
const BOSS_DMG = 2; // 보스 공격 피해 (2026-10-26 교사 요청: 상향)
const isTell = e => e.st === 'tell' || e.st.endsWith('Tell');
function updateEnemy(e) {
  e.flash = Math.max(0, e.flash - DT); e.pt += DT; if (e.pt > 0.15) { e.pt = 0; e.ph++; }
  e.blockT = (e.blockT || 0) - DT; if (e.rage > 0) e.rage -= DT; if (e.slowT > 0) e.slowT -= DT;
  if (e.burnT > 0) { e.burnT -= DT; e.burnTick = (e.burnTick || 0) - DT; if (e.burnTick <= 0) { e.burnTick = 0.5; damage(e, 1); } if (e.dead) return; } // 냉온 팩탄(발열): 화상
  if (e.battOut) return; // 배터리가 다 된 드론은 멈춰 있다
  if (e.kx || e.ky) { // 넉백으로 밀려나는 중
    if (move(e, e.kx * DT, 0)) e.kx = 0; if (move(e, 0, e.ky * DT)) e.ky = 0;
    const f = Math.exp(-7 * DT); e.kx *= f; e.ky *= f; if (Math.hypot(e.kx, e.ky) < 8) e.kx = e.ky = 0;
    if (rand() < 0.4) fx.push({ t: 'dust', x: e.x + (rand() - 0.5) * e.bw, y: e.y - 2, life: 0.3, max: 0.3 });
  }
  if (e.stun > 0) { e.stun -= DT; return; }
  if (e.conf > 0) { // 혼란: 공격하지 않고 아무 데로나 돌아다닌다
    e.conf -= DT; if (!(e.wt > 0)) { e.wt = 0.4; e.wa = rand() * Math.PI * 2; } e.wt -= DT;
    if (isTell(e) || e.st === 'lunge') { e.st = isBoss(e) ? BOSS_IDLE[e.kind] : 'idle'; e.t = 0.5; }
    move(e, Math.cos(e.wa) * 1.6 * T * DT, Math.sin(e.wa) * 1.6 * T * DT); return;
  }
  const pc = pCenter(), ex = e.x, ey = e.y - e.h / 2, dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy) || 1;
  if (e.kind === 'tri') {
    e.cd -= DT;
    if (e.st === 'idle') { e.t -= DT; if (e.t <= 0) e.st = 'chase'; }
    else if (e.st === 'chase') { e.face = dx >= 0 ? 1 : -1; move(e, dx / dist * 2.6 * T * DT, dy / dist * 2.6 * T * DT);
      if (dist < 4 * T && e.cd <= 0) { e.st = 'tell'; e.t = 0.45; e.aim = Math.atan2(dy, dx); } }
    else if (e.st === 'tell') { e.t -= DT; if (e.t <= 0) { e.st = 'lunge'; e.t = 0.26; } }
    else if (e.st === 'lunge') { e.t -= DT; move(e, Math.cos(e.aim) * 10 * T * DT, Math.sin(e.aim) * 10 * T * DT); if (e.t <= 0) { e.st = 'rest'; e.t = 0.5; e.cd = 1.3 + rand() * 0.6; } }
    else if (e.st === 'rest') { e.t -= DT; if (e.t <= 0) e.st = 'chase'; }
  } else if (e.kind === 'amm') {
    e.shootT -= DT; e.face = dx >= 0 ? 1 : -1;
    if (e.st === 'tell') { e.t -= DT; if (e.t <= 0) { for (const o of [-0.26, 0, 0.26]) fire(ex, ey, e.aim + o, 95); e.st = 'idle'; e.shootT = 2 + rand() * 1.2; } }
    else {
      let mx = 0, my = 0;
      if (dist < 5 * T) { mx = -dx / dist; my = -dy / dist; } else if (dist > 9 * T) { mx = dx / dist; my = dy / dist; } else { mx = -dy / dist * (e.ph % 40 < 20 ? 1 : -1); my = dx / dist * (e.ph % 40 < 20 ? 1 : -1); }
      move(e, mx * 1.3 * T * DT, my * 1.3 * T * DT);
      if (e.shootT <= 0) { e.st = 'tell'; e.t = 0.7; e.aim = Math.atan2(pc.y - ey, pc.x - ex); }
    }
  } else if (isBoss(e)) {
    firingBoss = true;
    if (e.kind === 'mam') updateBoss(e, dx, dy, dist); else if (e.kind === 'owl') bossOwl(e, dx, dy, dist);
    else if (e.kind === 'furnace') bossFurnace(e, dx, dy, dist); else if (e.kind === 'ai') bossAI(e, dx, dy, dist);
    else if (BOSS2[e.kind]) bossGeneric(e, dx, dy, dist);
    firingBoss = false;
  }
  else if (AI[EDEF[e.kind].ai]) AI[EDEF[e.kind].ai](e, EDEF[e.kind], dx, dy, dist, pc, ex, ey);
  // 몸에 닿으면 피해
  if (!e.dead && !e.invul && Math.abs(P.x - e.x) < (e.bw + P.bw) / 2 - 2 && Math.abs(P.y - e.y) < Math.max(10, e.bh)) { hurt(isBoss(e) ? BOSS_DMG : 1); if (e.kind === 'rust') applyStatus('corrode'); } // 녹 덩어리: 부식
}
// ---------- 구역 2~4 적: 공통 움직임 틀 ----------
// charge: 다가와 「!」 뒤 돌진 / shoot: 거리를 두고 「!」·조준선 뒤 부채꼴 탄 / spore: 쓰러진 적 자리로 가서 4방향 탄과 웅덩이
const AI = {
  charge(e, o, dx, dy, dist) {
    e.cd -= DT; const sp = o.speed * (e.rage > 0 ? 1.4 : 1);
    if (e.st === 'idle') { e.t -= DT; if (e.t <= 0) e.st = 'chase'; }
    else if (e.st === 'chase') { e.face = dx >= 0 ? 1 : -1; move(e, dx / dist * sp * T * DT, dy / dist * sp * T * DT);
      if (dist < 4.5 * T && e.cd <= 0) { e.st = 'tell'; e.t = o.tell || 0.45; e.aim = Math.atan2(dy, dx); } }
    else if (e.st === 'tell') { e.t -= DT; if (e.t <= 0) { e.st = 'lunge'; e.t = 0.26; } }
    else if (e.st === 'lunge') { e.t -= DT; move(e, Math.cos(e.aim) * o.lunge * T * DT, Math.sin(e.aim) * o.lunge * T * DT); if (e.t <= 0) { e.st = 'rest'; e.t = 0.5; e.cd = 1.2 + rand() * 0.6; } }
    else if (e.st === 'rest') { e.t -= DT; if (e.t <= 0) e.st = 'chase'; }
  },
  shoot(e, o, dx, dy, dist, pc, ex, ey) {
    if (e.shootT === undefined) e.shootT = 1 + rand() * 1.5;
    e.shootT -= DT; e.face = dx >= 0 ? 1 : -1;
    if (e.st === 'tell') { e.t -= DT; if (e.t <= 0) {
        for (let i = 0; i < o.fan; i++) { let off = (i - (o.fan - 1) / 2) * o.spread; if (o.side) off = e.side * (i + 0.5) * o.spread; // 한쪽으로만
          if (o.burst) setTimeout0(i * 0.12, () => !e.dead && fire(e.x, e.y - e.h / 2, e.aim, o.bsp, o.br, o.hz)); else fire(ex, ey, e.aim + off, o.bsp, o.br, o.hz); }
        e.st = 'idle'; e.shootT = o.cd + rand() * 1.0; } }
    else {
      let mx = 0, my = 0, near = o.near || 5, far = o.far || 9;
      if (dist < near * T) { mx = -dx / dist; my = -dy / dist; } else if (dist > far * T) { mx = dx / dist; my = dy / dist; } else { const s = e.ph % 40 < 20 ? 1 : -1; mx = -dy / dist * s; my = dx / dist * s; }
      move(e, mx * (o.speed || 1.3) * T * DT, my * (o.speed || 1.3) * T * DT);
      if (e.shootT <= 0 && !(e.batt !== undefined && e.batt <= 0)) { e.st = 'tell'; e.t = o.tell || 0.7; e.aim = Math.atan2(pc.y - ey, pc.x - ex); e.side = rand() < 0.5 ? 1 : -1; }
    }
    if (e.batt !== undefined) { e.batt -= DT; if (e.batt <= 0 && !e.battOut) { e.battOut = true; e.st = 'idle'; say(e.x, e.y - e.h - 16, '배터리 0', 'block', 'small'); } }
  },
  spore(e, o, dx, dy, dist, pc, ex, ey) {
    if (e.shootT === undefined) e.shootT = 1.5 + rand();
    e.shootT -= DT;
    if (e.st === 'tell') { e.t -= DT; if (e.t <= 0) { const o2 = e.n++ % 2 ? Math.PI / 4 : 0; for (let i = 0; i < 4; i++) { fire(ex, ey, o2 + i * Math.PI / 2, 80, 5); ebul[ebul.length - 1].st = 'infect'; } e.st = 'idle'; e.shootT = 2.4 + rand(); addHazard(e.x, e.y, 'nutri'); } return; } // 포자 탄: 감염
    let tx = P.x, ty = P.y; // 쓰러진 적 자리가 있으면 그쪽으로(분해자)
    if (corpses.length) { let b = corpses[0], bd = 1e9; for (const c of corpses) { const d = Math.hypot(c.x - e.x, c.y - e.y); if (d < bd) { bd = d; b = c; } } tx = b.x; ty = b.y; if (bd < 10) { b.t -= DT * 3; } }
    const ddx = tx - e.x, ddy = ty - e.y, dd = Math.hypot(ddx, ddy) || 1; if (dd > 8) move(e, ddx / dd * o.speed * T * DT, ddy / dd * o.speed * T * DT);
    if (e.shootT <= 0) { e.st = 'tell'; e.t = 0.6; e.n = e.n || 0; }
  },
  float(e, o, dx, dy, dist, pc, ex, ey) { // 온실기체 안개: 느리게 떠다니다 가까우면 열기 파동
    e.cd -= DT; if (e.st === 'tell') { e.t -= DT; if (e.t <= 0) { const a0 = rand() * Math.PI; for (let i = 0; i < 12; i++) { fire(ex, ey, a0 + i / 12 * Math.PI * 2, 75, 6); ebul[ebul.length - 1].st = 'heat'; } addHazard(e.x, e.y, 'heat'); e.st = 'idle'; e.cd = 2.6; } return; }
    move(e, dx / dist * o.speed * T * DT, dy / dist * o.speed * T * DT);
    if (dist < 4 * T && e.cd <= 0) { e.st = 'tell'; e.t = 0.7; }
  },
};
// 짧은 지연 실행(연사용): 시뮬레이션 시간으로 센다
let timers = [];
function setTimeout0(t, f) { timers.push({ t, f }); }
function updateTimers() { for (const x of timers) { x.t -= DT; if (x.t <= 0) { x.done = true; x.f(); } } timers = timers.filter(x => !x.done); }
// ---------- 상태 이상과 장비 (통박사 초안 6절, 기획안 7절) ----------
// 화면에는 이름만 보인다. 재료는 가죽과 부품 두 가지뿐이다(교사 요청, 2026-10-26 헝겊 → 가죽: 생물형은 가죽, 기계형은 부품)
const STATUS = {
  acid: { name: '산성 화상', dur: 6, col: '#e8d040' }, burn: { name: '화상', dur: 5, col: '#ff7a2a' }, corrode: { name: '부식', dur: 10, col: '#c26a3a' },
  heat: { name: '열사병', dur: 8, col: '#ff5a3c' }, frost: { name: '동상', dur: 6, col: '#9fd8ff' }, infect: { name: '감염', col: '#c08aff' },
};
// 장비: 한 번에 1개만 들고, G 키로 한 번 쓰면 사라진다(2026-10-27 교사 요청: 입는/쓰는 장비 구분 없앰)
// guard: 쓴 뒤 그 상태 이상에 걸리지 않는 시간(초)
const GEAR = {
  hotpack: { name: '핫팩', cloth: 1, part: 1, cures: 'frost', guard: 20, desc: '동상을 바로 낫게 하고, 20초 동안 동상에 걸리지 않는다' },
  coldpack: { name: '냉찜질 팩', cloth: 1, part: 1, cures: 'heat', guard: 20, desc: '열사병을 바로 낫게 하고, 20초 동안 열사병에 걸리지 않는다' },
  pad: { name: '중화 패드', cloth: 1, part: 2, cures: 'acid', guard: 20, note: '게임 연출', desc: '산성 화상을 바로 낫게 하고, 20초 동안 산성 화상을 입지 않는다' }, // 실제 응급 처치는 흐르는 물로 씻기(통박사 정정)
  coat: { name: '방수 코팅 외투', cloth: 2, part: 1, cures: 'corrode', guard: 30, desc: '부식을 바로 없애고, 30초 동안 부식되지 않는다' },
  gloves: { name: '단열 장갑', cloth: 2, part: 1, cures: 'burn', guard: 30, desc: '화상을 바로 낫게 하고, 30초 동안 불꽃 웅덩이에 다치지 않는다' },
  solar: { name: '태양광 충전 배낭', cloth: 1, part: 2, desc: '30초 동안 에너지가 1초에 3씩 찬다' },
  kit: { name: '진단·항생제 키트', cloth: 1, part: 2, desc: '감염됐을 때 쓴다. 병원체를 확인해 세균이면 항생제로 낫게 한다. 바이러스에는 항생제가 듣지 않아 키트를 아껴 둔다' },
};
const gearCost = G => [G.cloth ? '가죽 ' + G.cloth : '', G.part ? '부품 ' + G.part : ''].filter(Boolean).join(' · ');
function applyStatus(k) {
  if (ended) return;
  if (P.guard[k] > 0) { if (!(P.blockMsg > 0)) { say(P.x, P.y - 46, STATUS[k].name + ' 막음', 'block', 'small'); P.blockMsg = 1.5; } return; }
  if (k === 'infect') { if (P.st.infect) return; const virus = rand() < 0.5; P.st.infect = { t: 0, type: virus ? '바이러스' : '세균', known: false, life: virus ? 14 : 1e9 }; say(P.x, P.y - 46, '감염', 'conf'); return; }
  if (!(P.st[k] > 0)) say(P.x, P.y - 46, STATUS[k].name, 'hurt', 'small');
  P.st[k] = STATUS[k].dur;
}
function cure(k, msg) { delete P.st[k]; if (msg) say(P.x, P.y - 46, msg, 'heal', 'small'); }
function updateStatus() {
  P.blockMsg = (P.blockMsg || 0) - DT;
  for (const k in P.st) {
    if (k === 'infect') { const o = P.st.infect; o.t += DT; o.life -= DT; // 방어막이 차지 않고, 4초마다 피해
      if (Math.floor(o.t / 4) !== Math.floor((o.t - DT) / 4)) hurt(1);
      if (o.life <= 0) cure('infect', '감염이 나았다'); continue; }
    const before = P.st[k]; P.st[k] -= DT;
    if ((k === 'acid' || k === 'burn') && Math.floor(before / 2) !== Math.floor(P.st[k] / 2)) hurt(1); // 2초마다 피해
    if (k === 'heat') P.en = Math.max(0, P.en - 2 * DT); // 열사병: 에너지가 준다
    if (P.st[k] <= 0) delete P.st[k];
  }
  for (const g in P.guard) P.guard[g] -= DT;
  if (P.solarT > 0) { P.solarT -= DT; P.en = Math.min(P.maxEn, P.en + 3 * DT); } // 태양광 충전 배낭
  P.en = Math.min(P.maxEn, P.en + relicAdd('enregen') * DT); // 태양 전지판 조각
}
const statusSpeed = () => (P.st.heat ? 0.8 : 1) * (P.st.frost ? 0.7 : 1);
function useGear() {
  const k = P.gear, G = GEAR[k]; if (!running || ended) return;
  if (!G) { say(P.x, P.y - 46, '장비 없음', 'block', 'small'); return; }
  if (k === 'kit') { const inf = P.st.infect;
    if (!inf) { say(P.x, P.y - 46, '감염됐을 때 쓴다', 'block', 'small'); return; }
    if (inf.type === '바이러스') { inf.known = true; say(P.x, P.y - 46, '바이러스 · 항생제가 듣지 않는다', 'block', 'small'); return; } // 키트는 남는다
    P.gear = null; cure('infect', '세균 확인 · 항생제로 나음'); return; }
  P.gear = null;
  if (k === 'solar') { P.solarT = 30; say(P.x, P.y - 46, '태양광 충전 30초', 'energy', 'small'); return; }
  P.guard[G.cures] = G.guard; cure(G.cures, G.name + ' · ' + G.guard + '초 동안 ' + STATUS[G.cures].name + ' 막음');
}
function craft(k) { // 장비는 한 번에 1개만: 들고 있으면 먼저 써야 만들 수 있다
  const G = GEAR[k];
  if (P.gear || P.mat.cloth < G.cloth || P.mat.part < G.part) return;
  P.mat.cloth -= G.cloth; P.mat.part -= G.part; P.gear = k;
  renderCraft();
}
// ---------- 스킬 트리: 역마다 능력 하나를 고른다. 앞 단계가 있어야 다음 단계가 열린다 (컨셉_확정 5절) ----------
const TREES = [
  { id: 'shot', name: '탄', perks: [['range', '장거리탄'], ['power', '강화탄'], ['bounce', '튕김탄'], ['chain', '연쇄 튕김']] },
  { id: 'melee', name: '근접', perks: [['wide', '넓은 휘두르기'], ['stunhit', '기절 타격'], ['counter', '되받아치기'], ['shock', '충격파']] }, // 기절 타격: 근접 기절 +0.5초
  { id: 'life', name: '생존', perks: [['tough', '튼튼한 몸'], ['fastsh', '빠른 방어막'], ['regen', '재생']] },
  { id: 'move', name: '기동', perks: [['swift', '날렵함'], ['quickroll', '짧은 구르기'], ['rollhit', '구르기 돌진']] },
  { id: 'energy', name: '에너지', perks: [['save', '에너지 절약'], ['absorb', '에너지 흡수'], ['overflow', '넘치는 에너지']] },
  { id: 'skill', name: '스킬', perks: [['sk1', '스킬 단련'], ['sk2', '스킬 숙련'], ['skshield', '스킬 방어막']] },
];
const has = id => P.perks.has(id);
function dashCdMax() { return DASH_CD * (has('quickroll') ? 0.6 : 1) * relicMul('dashcd'); } // 짧은 구르기
function enCost(n) { return n ? n * (has('save') ? 0.7 : 1) * relicMul('encost') : n; } // 에너지 절약: 정확히 30% 덜 쓴다(에너지는 소수로 셈)
function perkOffer() { // 트리마다 다음 단계 하나씩 후보로 놓고 서로 다른 트리에서 3개를 고른다
  const cand = [];
  for (const t of TREES) { const i = t.perks.findIndex(([id]) => !has(id)); if (i >= 0) cand.push({ tree: t, tier: i, id: t.perks[i][0], name: t.perks[i][1] }); }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  return cand.slice(0, 3);
}
function takePerk(id) {
  if (P.perks.has(id)) return;
  P.perks.add(id);
  if (id === 'tough') { P.maxHp += 2; P.hp += 2; }
  if (id === 'overflow') { P.maxEn += 40; P.en += 40; }
  if (id === 'sk1') { P.skillMax = Math.round(P.skillMax * 0.8 * 10) / 10; }
  if (id === 'sk2') { P.skillMax = Math.round(P.skillMax * 0.85 * 10) / 10; }
}
let choosing = false;
function openPerk() {
  const offer = perkOffer(); if (!offer.length) return;
  choosing = true; const box = document.getElementById('perkList'); box.innerHTML = '';
  for (const o of offer) { const b = document.createElement('button'); b.className = 'perk';
    b.innerHTML = `<b>${o.name}</b><span>${o.tree.name}</span><em>${'●'.repeat(o.tier + 1)}${'○'.repeat(o.tree.perks.length - 1 - o.tier)}</em>`;
    b.onclick = () => { takePerk(o.id); closePerk(); say(P.x, P.y - 46, o.name, 'crit'); }; box.appendChild(b); }
  document.getElementById('perk').classList.remove('hide');
}
function closePerk() { choosing = false; document.getElementById('perk').classList.add('hide'); }
let viewingTree = false;
function toggleTree() {
  viewingTree = !viewingTree; const el = document.getElementById('tree');
  if (!viewingTree) { el.classList.add('hide'); return; }
  const box = document.getElementById('treeGrid'); box.innerHTML = '';
  for (const t of TREES) { const col = document.createElement('div'); col.className = 'tcol'; col.innerHTML = `<h3>${t.name}</h3>`;
    t.perks.forEach(([id, name], i) => { const own = has(id), open = !own && (i === 0 || has(t.perks[i - 1][0]));
      const d = document.createElement('div'); d.className = 'tnode' + (own ? ' own' : open ? ' open' : ''); d.textContent = name; col.appendChild(d); });
    box.appendChild(col); }
  el.classList.remove('hide');
}

// ---------- 유물: 주우면 그 판 내내 효과가 이어진다 ----------
// stat: 어떤 값을 바꾸는지, v: 바꾸는 양(곱하는 값은 비율). 화면에는 이름만 보인다
const RELIC = {
  fossilTri: { name: '삼엽충 화석', stat: 'shield', v: 1 },
  strata: { name: '지층 표본', stat: 'hp', v: 1 },
  fossilAmm: { name: '암모나이트 화석', stat: 'crit', v: 0.07 },
  tusk: { name: '매머드 상아', stat: 'melee', v: 0.25 },
  cog: { name: '녹슨 톱니', stat: 'ranged', v: 0.15 },
  feather: { name: '포식자 깃털', stat: 'speed', v: 0.08 },
  valve: { name: '냉매통 밸브', stat: 'dashcd', v: -0.2 },
  solarBit: { name: '태양 전지판 조각', stat: 'enregen', v: 0.8 },
  usb: { name: '낡은 USB', stat: 'encost', v: -0.15 },
  ticket: { name: '오래된 승차권', stat: 'skillcd', v: -0.15 },
  timetable: { name: '막차 시간표', stat: 'stationHeal', v: 1 },
  magnet: { name: '자석', stat: 'magnet', v: 1 },
  hammerHead: { name: '지질 망치 머리', stat: 'stun', v: 0.4 }, // 근접 기절 +0.4초
};
function takeRelic(k) {
  if (P.relics.includes(k)) return; P.relics.push(k); const R = RELIC[k];
  if (R.stat === 'shield') { P.maxSh += R.v; P.sh += R.v; }
  if (R.stat === 'hp') { P.maxHp += R.v; P.hp += R.v; }
  if (R.stat === 'skillcd') P.skillMax = Math.round(P.skillMax * (1 + R.v) * 10) / 10;
  say(P.x, P.y - 46, '유물 · ' + R.name, 'crit', 'big'); burst(P.x, P.y - 16, '#ffd23f', 14);
}
// ---------- 창고: 판 밖에 남는 것(가죽·부품, 유물 보관함). 지금은 이 브라우저에 저장하고, 나중에 연구소 서버(재화)와 연결한다 ----------
const SAVE_KEY = 'makcha.save.v1';
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.mat) return { mat: { cloth: s.mat.cloth | 0, part: s.mat.part | 0 }, relics: (s.relics || []).filter(k => RELIC[k]) }; } catch (e) { }
  return { mat: { cloth: 2, part: 2 }, relics: [] };
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
let save = loadSave();
function dropRelic(x, y) { const left = Object.keys(RELIC).filter(k => !P.relics.includes(k) && !pickups.some(p => p.kind === 'relic' && p.id === k)); if (!left.length) return;
  pickups.push({ kind: 'relic', id: left[Math.floor(rand() * left.length)], x, y }); burst(x, y - 8, '#ffd23f', 12); }
function relicMul(stat) { let m = 1; for (const k of P.relics || []) if (RELIC[k].stat === stat) m *= 1 + RELIC[k].v; return m; }
function relicAdd(stat) { let s = 0; for (const k of P.relics || []) if (RELIC[k].stat === stat) s += RELIC[k].v; return s; }
function critChance() { return CRIT + relicAdd('crit'); }
// 근접 기절 시간: 무기 특수효과 + 능력(기절 타격) + 유물(지질 망치 머리)
function meleeStun(W0) { return (W0.stun || 0) + (has('stunhit') ? 0.5 : 0) + relicAdd('stun'); }
function dmgMul(melee) { return relicMul('dmg') * relicMul(melee ? 'melee' : 'ranged') * (!melee && has('power') ? 1.25 : 1); } // 강화탄: 원거리 +25%
// 내 상태 창(E): 직업·스킬, 능력치, 무기, 장비, 상태 이상, 능력, 유물을 한눈에 본다. 여는 동안 멈춘다
let infoOpen = false;
function openInfo() {
  infoOpen = true; const J = JOBS[P.job], g = (t, v) => `<div class="irow"><span>${t}</span><b>${v}</b></div>`;
  const wl = P.weapons.map((k, i) => { const W0 = WEAP[k], s = P.stars[k] || 1, dmg = W0.boom ? W0.boom.dmg : W0.dmg * (W0.n || 1);
    return `<div class="iw${i === P.wi ? ' on' : ''}" style="border-color:${RARITY[W0.r]}"><b style="color:${RARITY[W0.r]}">${W0.name}${s > 1 ? ' ' + '★'.repeat(s) : ''}</b>
      <span>피해 ${Math.round(dmg * starMul(k) * dmgMul(W0.type === 'melee') * 10) / 10} · 간격 ${W0.cd}초 · 에너지 ${W0.en ? Math.round(enCost(W0.en) * 10) / 10 : 0}</span></div>`; }).join('');
  const list = (arr, empty) => arr.length ? arr.join(', ') : `<i>${empty}</i>`;
  document.getElementById('infoBody').innerHTML = `
    <div class="icol">
      <h3>${J.name}</h3>
      ${g('스킬', `${J.skill} · ${Math.round(P.skillMax * 10) / 10}초`)}
      ${g('체력', `${P.hp} / ${P.maxHp}`)}${g('방어막', `${P.sh} / ${P.maxSh}`)}${g('에너지', `${Math.floor(P.en)} / ${P.maxEn}`)}
      ${g('이동 속도', Math.round((has('swift') ? 1.12 : 1) * relicMul('speed') * 100) + '%')}${g('치명타', Math.round(critChance() * 100) + '%')}
      ${g('재료', `가죽 ${P.mat.cloth} · 부품 ${P.mat.part}`)}
    </div>
    <div class="icol">
      <h3>무기</h3>${wl}
      <h3>장비 · G 키</h3><div class="ilist">${P.gear ? `<b>${GEAR[P.gear].name}</b><br>${GEAR[P.gear].desc}` : '<i>없음</i>'}</div>
      <h3>상태 이상</h3><div class="ilist">${list(Object.keys(P.st).map(k => k === 'infect' ? '감염' + (P.st.infect.known ? '(' + P.st.infect.type + ')' : '') : STATUS[k].name), '없음')}</div>
    </div>
    <div class="icol">
      <h3>능력</h3><div class="ilist">${list(TREES.flatMap(t => t.perks).filter(([id]) => has(id)).map(([, n]) => n), '없음')}</div>
      <h3>유물</h3><div class="ilist">${list((P.relics || []).map(k => RELIC[k].name), '없음')}</div>
    </div>`;
  document.getElementById('info').classList.remove('hide');
}
function closeInfo() { infoOpen = false; document.getElementById('info').classList.add('hide'); }

// 조합대 창: 여는 동안 게임이 멈춘다
let crafting = false;
function openCraft() { crafting = true; renderCraft(); document.getElementById('craft').classList.remove('hide'); }
function closeCraft() { crafting = false; document.getElementById('craft').classList.add('hide'); }
function renderCraft() {
  document.getElementById('craftMat').textContent = `가죽 ${P.mat.cloth} · 부품 ${P.mat.part}`;
  const box = document.getElementById('craftList'); box.innerHTML = '';
  if (P.gear) document.getElementById('craftMat').textContent += ` · 들고 있는 장비: ${GEAR[P.gear].name} (먼저 써야 새로 만들 수 있다)`;
  for (const k in GEAR) { const G = GEAR[k], ok = !P.gear && P.mat.cloth >= G.cloth && P.mat.part >= G.part;
    const b = document.createElement('button'); b.className = 'gear' + (ok ? '' : ' off');
    b.innerHTML = `<b>${G.name}</b>${G.note ? `<i>${G.note}</i>` : ''}<small>${G.desc}</small><span>${gearCost(G)}</span>${P.gear === k ? '<em>들고 있음</em>' : ''}`;
    b.onclick = () => craft(k); box.appendChild(b); }
}
const nearBench = () => { const tx = Math.floor(P.x / T), ty = Math.floor((P.y - 3) / T); for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (tile(x, y) === 9) return true; return false; };

// 바닥 웅덩이: 산성(노랑)·불꽃·열기는 닿으면 피해, 양분은 느려짐
let hazards = [], corpses = [];
const HAZ = { acid: { r: 18, life: 4, col: '#e8d040', hurt: true, st: 'acid' }, fire: { r: 16, life: 3, col: '#ff7a2a', hurt: true, st: 'burn' }, heat: { r: 26, life: 4, col: '#ff5a3c', hurt: true, st: 'heat' },
  nutri: { r: 22, life: 5, col: '#e8e0c8', slow: true }, frost: { r: 26, life: 9999, col: '#bfe6ff', st: 'frost' }, // frost: 냉매통 둘레 서리 바닥(구역 3)
  frostT: { r: 24, life: 5, col: '#bfe6ff', st: 'frost' } }; // frostT: 냉각 설비 관리기가 남기는 잠깐의 서리
function addHazard(x, y, kind) { hazards.push({ x, y, kind, t: 0, life: HAZ[kind].life }); }
function updateHazards() {
  for (const p of props) if (p.flash > 0) p.flash -= DT;
  for (const h of hazards) { h.t += DT; const H0 = HAZ[h.kind];
    if (Math.hypot(P.x - h.x, (P.y - h.y) * 1.6) < H0.r) {
      if (h.kind === 'fire' && P.guard.burn > 0) continue; // 단열 장갑: 불꽃 웅덩이의 열이 몸에 덜 전해진다
      if (H0.hurt) hurt(1); if (H0.slow) P.slowT = 0.2; if (H0.st) applyStatus(H0.st); } }
  hazards = hazards.filter(h => h.t < h.life);
  for (const c of corpses) c.t -= DT; corpses = corpses.filter(c => c.t > 0);
}
function drawHazards() {
  for (const h of hazards) { const H0 = HAZ[h.kind], fade = Math.min(1, (h.life - h.t) / 0.8, h.t / 0.2);
    ctx.globalAlpha = 0.45 * fade; ell(ctx, Math.round(h.x), Math.round(h.y), H0.r * 2, Math.round(H0.r * 1.2), H0.col);
    ctx.globalAlpha = 0.7 * fade; if (Math.floor(time * 4 + h.x) % 3 === 0) px(ctx, Math.round(h.x + Math.sin(h.t * 5 + h.y) * H0.r * 0.5), Math.round(h.y - 2), 2, 2, '#fff');
    if (h.kind === 'frost') { ctx.globalAlpha = 1; const x = Math.round(h.x), y = Math.round(h.y); // 냉매통
      px(ctx, x - 6, y - 16, 12, 16, '#1a1512'); px(ctx, x - 5, y - 15, 10, 14, '#7fb2d9'); px(ctx, x - 5, y - 11, 10, 2, '#e6f6ff'); px(ctx, x - 5, y - 5, 10, 2, '#e6f6ff'); } }
  ctx.globalAlpha = 1;
}

// ---------- 구역 보스 ----------
// 포식자 여왕(구역 2): 횃대에 앉아 있을 때만 피해가 들어가고, 날아오르면(하강 돌진) 막힌다
function bossOwl(e, dx, dy, dist) {
  e.t -= DT; const ey = e.y - e.h / 2, r = e.room;
  if (e.st === 'perch') { e.face = dx >= 0 ? 1 : -1;
    if (e.t <= 0) { const seq = ['featherTell', 'diveTell', 'cryTell', 'nestTell', 'featherTell', 'diveTell'];
      e.st = seq[e.seq++ % seq.length]; e.t = e.st === 'diveTell' ? 0.5 : 0.7; e.n = 0; e.aim = Math.atan2(P.y - 16 - ey, P.x - e.x); } }
  else if (e.st === 'featherTell' || e.st === 'feather') { if (e.t <= 0) { const a = Math.atan2(P.y - 16 - ey, P.x - e.x);
      for (let i = 0; i < 7; i++) fire(e.x, ey, a + (i - 3) * 0.17 + (e.n % 2) * 0.085, 120, 7); e.n++; e.st = 'feather'; e.t = 0.5; if (e.n >= 3) { e.st = 'perch'; e.t = 1.2; } } }
  else if (e.st === 'diveTell') { if (e.t <= 0) { e.st = 'fly'; e.invul = true; e.t = 1.0; e.tx = P.x; e.ty = P.y; marks.push({ t: 'land', x: P.x, y: P.y, life: 1.0, max: 1.0 }); } }
  else if (e.st === 'fly') { e.alt = Math.min(60, (e.alt || 0) + 160 * DT); if (e.t <= 0) { e.x = e.tx; e.y = e.ty; e.alt = 0; e.invul = false; e.st = 'landed'; e.t = 0.9; shake = 9;
      if (Math.hypot(P.x - e.x, (P.y - e.y) * 1.3) < 46) hurt(BOSS_DMG); for (let i = 0; i < 14; i++) fire(e.x, e.y - 20, i / 14 * Math.PI * 2, 95, 7); say(e.x, e.y - e.h - 16, '기절', 'stun'); } }
  else if (e.st === 'landed') { if (e.t <= 0) { e.st = 'perch'; e.t = 1.0; } }
  else if (e.st === 'cryTell' || e.st === 'cry') { if (e.t <= 0) { const gap = Math.atan2(P.y - ey, P.x - e.x) + Math.PI + (rand() - 0.5); // 틈은 플레이어 반대쪽 근처
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; if (angDiff(a, gap) < 0.35) continue; fire(e.x, ey, a, e.n ? 70 : 100, 8); }
      e.n++; e.st = 'cry'; e.t = 0.5; if (e.n >= 2) { e.st = 'perch'; e.t = 1.2; } } }
  else if (e.st === 'nestTell') { if (e.t <= 0) { const kind = rand() < 0.5 ? 'rat' : 'leaf';
      for (const sx of [r.x0 + 3, r.x0 + r.w - 4]) for (let i = 0; i < (kind === 'rat' ? 2 : 1); i++) addSpawn(kind, sx * T, (r.y0 + 5 + i * 3) * T, r);
      e.st = 'perch'; e.t = 1.4; } }
}
// 제련로 관리 로봇(구역 3)
function bossFurnace(e, dx, dy, dist) {
  e.t -= DT; const ey = e.y - e.h / 2, r = e.room;
  if (e.st === 'walk') { e.face = dx >= 0 ? 1 : -1; move(e, dx / dist * 1.2 * T * DT, dy / dist * 1.2 * T * DT);
    if (e.t <= 0) { const seq = ['flameTell', 'pourTell', 'steamTell', 'bellowsTell', 'flameTell', 'pourTell']; e.st = seq[e.seq++ % seq.length]; e.t = 0.8; e.n = 0; e.aim = Math.atan2(P.y - 16 - ey, P.x - e.x); } }
  else if (e.st === 'flameTell' || e.st === 'flame') { if (e.t <= 0) { const a = Math.atan2(P.y - 16 - ey, P.x - e.x);
      for (let i = 0; i < 5; i++) fire(e.x, ey - 20, a + (i - 2) * 0.2, 130, 8, 'fire'); e.n++; e.st = 'flame'; e.t = 0.45; if (e.n >= 3) { e.st = 'walk'; e.t = 1.3; } } }
  else if (e.st === 'pourTell') { if (e.t <= 0) { for (let i = 1; i < 14; i++) { const x = e.x + Math.cos(e.aim) * i * 24, y = e.y + Math.sin(e.aim) * i * 24; if (solidAt(x, y)) break; setTimeout0(i * 0.05, () => addHazard(x, y, 'fire')); }
      shake = 6; e.st = 'walk'; e.t = 1.4; } }
  else if (e.st === 'steamTell') { if (e.t <= 0) { for (let i = 0; i < 3; i++) clouds.push({ x: (r.x0 + 4 + rand() * (r.w - 8)) * T, y: (r.y0 + 4 + rand() * (r.h - 8)) * T, vx: (rand() - 0.5) * 40, vy: (rand() - 0.5) * 30, t: 7 }); e.st = 'walk'; e.t = 1.2; } }
  else if (e.st === 'bellowsTell' || e.st === 'bellows') { // 풀무 바람: 1초 동안 바람이 플레이어를 밀어내고, 그 뒤 짧은 허점
    if (e.st === 'bellowsTell' && e.t <= 0) { e.st = 'bellows'; e.t = 1.0; }
    else if (e.st === 'bellows') { const d = Math.hypot(P.x - e.x, P.y - e.y) || 1; move(P, (P.x - e.x) / d * 150 * DT, (P.y - e.y) / d * 150 * DT);
      if (rand() < 0.8) fx.push({ t: 'dust', x: e.x + (rand() - 0.5) * 80, y: e.y - rand() * 60, life: 0.3, max: 0.3 });
      if (e.t <= 0) { e.st = 'stun'; e.t = 1.0; say(e.x, e.y - e.h - 16, '허점', 'stun'); } } }
  else if (e.st === 'stun') { if (e.t <= 0) { e.st = 'walk'; e.t = 1.0; } }
}
// 관제 AI(구역 4): 방 위쪽에 머무는 큰 화면
function bossAI(e, dx, dy, dist) {
  e.t -= DT; const ey = e.y - e.h / 2, r = e.room;
  const hx = (r.x0 + r.w / 2) * T + Math.sin(time * 0.6) * 80; move(e, (hx - e.x) * 1.5 * DT, 0); e.face = dx >= 0 ? 1 : -1;
  if (e.st === 'idle') { if (e.t <= 0) { const seq = ['alarmTell', 'gridTell', 'droneTell', 'blackTell', 'alarmTell', 'gridTell']; e.st = seq[e.seq++ % seq.length]; e.t = e.st === 'gridTell' ? 1.0 : 0.7; e.n = 0;
      if (e.st === 'gridTell') { e.grid = []; const n = 3; for (let i = 0; i < n; i++) { e.grid.push({ v: true, x: (r.x0 + 2 + rand() * (r.w - 4)) * T }); e.grid.push({ v: false, y: (r.y0 + 4 + rand() * (r.h - 6)) * T }); } } } }
  else if (e.st === 'alarmTell' || e.st === 'alarm') { if (e.t <= 0) { const o = rand() * Math.PI; for (let i = 0; i < 24; i++) fire(e.x, ey, o + (i + e.n * 0.5) / 24 * Math.PI * 2, 95, 7); e.n++; e.st = 'alarm'; e.t = 0.5; if (e.n >= 2) { e.st = 'idle'; e.t = 1.2; } } }
  else if (e.st === 'gridTell') { if (e.t <= 0) { // 격자 조준선을 따라 레이저
      for (const g of e.grid) { if (g.v ? Math.abs(P.x - g.x) < 10 : Math.abs(P.y - 8 - g.y) < 10) hurt(BOSS_DMG); fx.push({ t: 'laser', v: g.v, x: g.x, y: g.y, life: 0.25, max: 0.25, r: r }); }
      shake = 5; e.st = 'idle'; e.t = 1.3; } }
  else if (e.st === 'droneTell') { if (e.t <= 0) { addSpawn('drone', (r.x0 + 3) * T, (r.y0 + r.h / 2) * T, r); addSpawn('drone', (r.x0 + r.w - 4) * T, (r.y0 + r.h / 2) * T, r); e.st = 'idle'; e.t = 1.2; } }
  else if (e.st === 'blackTell' || e.st === 'black') { // 전력 차단: 방이 어두워지고 느린 탄을 흩뿌린다
    if (e.st === 'blackTell' && e.t <= 0) { e.st = 'black'; e.t = 3.0; dark = 3.0; e.ft = 0; }
    else if (e.st === 'black') { e.ft -= DT; if (e.ft <= 0) { e.ft = 0.25; fire(e.x, ey, Math.atan2(P.y - ey, P.x - e.x) + (rand() - 0.5) * 1.2, 80, 7); } if (e.t <= 0) { e.st = 'idle'; e.t = 1.0; } } }
}
let clouds = [], dark = 0;

// ---------- 새 보스 8종: 패턴을 조립하는 공통 틀 (통박사 초안 설계_통박사_보스추가.md, 2026-10-27) ----------
// 모든 패턴은 「!」(patTell)로 먼저 예고하고, 끝나면 잠깐 쉰다. 과학 장치(약점)는 무기·장비 단계에서 붙인다
// 패턴: fan 부채꼴 / ring 원형 / spin 회전 방사 / charge 돌진 / jump 점프 착지 / laser 레이저 줄 / rays 몸에서 뻗는 줄 / haz 웅덩이 / roots 바닥에서 솟음 / summon 졸개
const BOSS2 = {
  trilo: { move: 1.2, seq: [{ t: 'charge', sp: 13, bounce: 1 }, { t: 'fan', n: 5, spread: 0.2, sp: 120, r: 7, rep: 2 }, { t: 'ring', n: 20, sp: 110, r: 7, rep: 2, slow: true }, { t: 'summon', kind: 'tri', n: 4 }, { t: 'roots', n: 5, near: true }] },
  finch: { move: 1.8, seq: [{ t: 'fan', n: 7, spread: 0.14, sp: 115, r: 5, rep: 2 }, { t: 'fan', n: 3, spread: 0.3, sp: 90, r: 10, rep: 2 }, { t: 'charge', sp: 16, bounce: 0 }, { t: 'ring', n: 22, sp: 95, r: 7, rep: 2, gap: 2 }, { t: 'haz', hz: 'nutri', n: 3 }] },
  frog: { move: 0.6, seq: [{ t: 'jump' }, { t: 'laser', n: 1, len: 300 }, { t: 'fan', n: 5, spread: 0.2, sp: 115, r: 7, rep: 2 }, { t: 'summon', kind: 'leaf', n: 3 }, { t: 'haz', hz: 'nutri', n: 4 }] },
  vine: { move: 0, seq: [{ t: 'rays', n: 3 }, { t: 'ring', n: 24, sp: 100, r: 7, rep: 2 }, { t: 'roots', n: 4 }, { t: 'summon', kind: 'spore', n: 3 }, { t: 'spin', arms: 3, dur: 2.4, sp: 100, r: 6, spin: 1.8 }] },
  neutral: { move: 0.8, seq: [{ t: 'fan', n: 5, spread: 0.22, sp: 110, r: 7, rep: 2, hz: 'acid' }, { t: 'laser', n: 1, len: 360 }, { t: 'ring', n: 20, sp: 100, r: 7, rep: 2 }, { t: 'haz', hz: 'acid', n: 5 }] },
  cooler: { move: 0.9, seq: [{ t: 'fan', n: 5, spread: 0.2, sp: 110, r: 7, rep: 2, st: 'frost' }, { t: 'laser', n: 1, len: 340 }, { t: 'ring', n: 20, sp: 95, r: 7, rep: 2, st: 'heat' }, { t: 'fan', n: 2, spread: 0.6, sp: 70, r: 12, rep: 2 }, { t: 'haz', hz: 'frostT', n: 4 }] },
  turbine: { move: 0.5, seq: [{ t: 'spin', arms: 6, dur: 2.6, sp: 110, r: 6, spin: 2.6 }, { t: 'laser', n: 2, len: 380 }, { t: 'haz', hz: 'heat', n: 3 }, { t: 'roots', n: 3, near: true }, { t: 'ring', n: 26, sp: 120, r: 7, rep: 1 }] },
  solar: { move: 0.4, seq: [{ t: 'laser', n: 2, len: 420, seqDelay: 0.35 }, { t: 'fan', n: 7, spread: 0.14, sp: 140, r: 6, rep: 2 }, { t: 'haz', hz: 'heat', n: 1, big: true }, { t: 'summon', kind: 'drone', n: 2 }, { t: 'ring', n: 24, sp: 110, r: 7, rep: 2 }] },
};
function bossGeneric(e, dx, dy, dist) {
  const B = BOSS2[e.kind], ey = e.y - e.h / 2, r = e.room; e.t -= DT;
  if (e.st === 'walk') {
    if (B.move) { e.face = dx >= 0 ? 1 : -1; move(e, dx / dist * B.move * T * DT, dy / dist * B.move * T * DT); }
    if (e.t <= 0) { e.pat = B.seq[e.seq++ % B.seq.length]; e.st = 'patTell'; e.t = e.pat.t === 'charge' ? 0.9 : 0.75; e.n = 0;
      const p = e.pat, a = Math.atan2(P.y - 16 - ey, P.x - e.x); e.aim = a;
      if (p.t === 'laser') e.lines = Array.from({ length: p.n }, (_, i) => { const aa = a + (i - (p.n - 1) / 2) * 0.35; return { x1: e.x, y1: ey, x2: e.x + Math.cos(aa) * p.len, y2: ey + Math.sin(aa) * p.len }; });
      if (p.t === 'rays') { const o = rand() * Math.PI * 2; e.lines = Array.from({ length: p.n }, (_, i) => { const aa = o + i * Math.PI * 2 / p.n; const [x2, y2] = rayEnd(e.x, ey, aa); return { x1: e.x, y1: ey, x2, y2 }; }); }
      if (p.t === 'jump') { e.tx = P.x; e.ty = P.y; marks.push({ t: 'land', x: P.x, y: P.y, life: 1.6, max: 1.6 }); }
      if (p.t === 'haz') for (let i = 0; i < p.n; i++) { const x = p.big ? (r.x0 + r.w / 2) * T : P.x + (rand() - 0.5) * 140, y = p.big ? (r.y0 + r.h / 2) * T : P.y + (rand() - 0.5) * 90;
        marks.push({ t: 'haz', hz: p.hz, x, y, big: p.big, life: 0.9, max: 0.9 }); }
      if (p.t === 'roots') for (let i = 0; i < p.n; i++) { const a2 = rand() * Math.PI * 2, d2 = p.near ? 30 + rand() * 50 : 60 + rand() * 80; marks.push({ t: 'rock', x: P.x + Math.cos(a2) * d2, y: P.y + Math.sin(a2) * d2 * 0.7, life: 1.0, max: 1.0 }); }
    }
    return;
  }
  const p = e.pat;
  if (e.st === 'patTell') { if (e.t > 0) return; e.st = 'pat'; e.t = 0; e.ft = 0; if (p.t === 'spin') { e.o = rand() * Math.PI; e.t = p.dur; } if (p.t === 'charge') { e.t = 2.5; e.bn = p.bounce; } if (p.t === 'jump') { e.st = 'fly'; e.invul = true; e.t = 0.8; } }
  if (e.st === 'fly') { e.alt = Math.min(60, (e.alt || 0) + 180 * DT); if (e.t <= 0) { e.x = e.tx; e.y = e.ty; e.alt = 0; e.invul = false; shake = 9;
      if (Math.hypot(P.x - e.x, (P.y - e.y) * 1.3) < 46) hurt(BOSS_DMG); for (let i = 0; i < 16; i++) fire(e.x, e.y - 16, i / 16 * Math.PI * 2, 100, 7); for (let i = 0; i < 12; i++) fire(e.x, e.y - 16, (i + 0.5) / 12 * Math.PI * 2, 70, 7);
      return endPat(e, 1.0); } return; }
  const done = () => endPat(e, 1.1);
  if (p.t === 'fan') { e.t -= 0; if (e.ft > 0) { e.ft -= DT; return; } const a = Math.atan2(P.y - 16 - ey, P.x - e.x);
    for (let i = 0; i < p.n; i++) { fire(e.x, ey, a + (i - (p.n - 1) / 2) * p.spread + (e.n % 2) * p.spread / 2, p.sp, p.r, p.hz); if (p.st) ebul[ebul.length - 1].st = p.st; }
    e.n++; e.ft = 0.45; if (e.n >= (p.rep || 1)) done(); }
  else if (p.t === 'ring') { if (e.ft > 0) { e.ft -= DT; return; } const o = rand() * Math.PI;
    for (let i = 0; i < p.n; i++) { const a = o + (i + (e.n % 2) * 0.5) / p.n * Math.PI * 2; if (p.gap && i % Math.floor(p.n / p.gap) === 0) continue; fire(e.x, ey, a, p.slow && e.n ? p.sp * 0.6 : p.sp, p.r); if (p.st) ebul[ebul.length - 1].st = p.st; }
    e.n++; e.ft = 0.45; if (e.n >= (p.rep || 1)) done(); }
  else if (p.t === 'spin') { e.ft -= DT; e.o += p.spin * DT; if (e.ft <= 0) { e.ft = 0.11; for (let i = 0; i < p.arms; i++) fire(e.x, ey, e.o + i * Math.PI * 2 / p.arms, p.sp, p.r); } if (e.t <= 0) done(); }
  else if (p.t === 'charge') { const hit = move(e, Math.cos(e.aim) * p.sp * T * DT, Math.sin(e.aim) * p.sp * T * DT);
    if (rand() < 0.6) fx.push({ t: 'dust', x: e.x + (rand() - 0.5) * 50, y: e.y - 2, life: 0.4, max: 0.4 });
    if (hit) { shake = 7; if (e.bn > 0) { e.bn--; e.aim = Math.atan2(P.y - e.y, P.x - e.x); } else { say(e.x, e.y - e.h - 16, '허점', 'stun'); endPat(e, 1.4); } } else if (e.t <= 0) done(); }
  else if (p.t === 'laser' || p.t === 'rays') { // 예고했던 줄을 따라 레이저(줄 위에 있으면 피해)
    const pc = pCenter(); let hitMe = false;
    e.lines.forEach((L, i) => { const k = p.seqDelay ? i * p.seqDelay : 0; setTimeout0(k, () => { if (segDist(pc.x, pc.y, L) < 11 && !hitMe) { hitMe = true; hurt(BOSS_DMG); } fx.push({ t: 'laser2', ...L, life: 0.25, max: 0.25 }); }); });
    shake = Math.max(shake, 4); done(); }
  else if (p.t === 'summon') { for (let i = 0; i < p.n; i++) { const a = rand() * Math.PI * 2; addSpawn(p.kind, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 50, r); } done(); }
  else done(); // haz·roots는 예고 표시(marks)가 시간이 되면 스스로 터진다
}
function endPat(e, rest) { e.st = 'walk'; e.t = rest; e.pat = null; e.lines = null; }
function segDist(px0, py0, L) { const vx = L.x2 - L.x1, vy = L.y2 - L.y1, l2 = vx * vx + vy * vy || 1; const k = Math.max(0, Math.min(1, ((px0 - L.x1) * vx + (py0 - L.y1) * vy) / l2)); return Math.hypot(px0 - (L.x1 + vx * k), py0 - (L.y1 + vy * k)); }
function updateBossExtras() {
  for (const c of clouds) { c.t -= DT; c.x += c.vx * DT; c.y += c.vy * DT; if (solidAt(c.x, c.y)) { c.vx *= -1; c.vy *= -1; }
    if (Math.hypot(P.x - c.x, (P.y - 12 - c.y) * 1.3) < 30) { hurt(BOSS_DMG); applyStatus('acid'); }
    for (const p of puddles) if (Math.hypot(p.x - c.x, p.y - c.y) < 50) c.t = Math.min(c.t, 0.3); } // 중화제에 닿으면 사라짐
  clouds = clouds.filter(c => c.t > 0);
  dark = Math.max(0, dark - DT);
}
function updateBoss(e, dx, dy, dist) {
  e.t -= DT;
  const r = e.room, ey = e.y - e.h / 2;
  if (e.st === 'walk') {
    e.face = dx >= 0 ? 1 : -1; move(e, dx / dist * 1.5 * T * DT, dy / dist * 1.5 * T * DT);
    if (e.t <= 0) { // 체력이 60% 아래로 내려가면 패턴이 늘어난다. 모든 패턴은 「!」로 먼저 예고한다
      const low = e.hp < e.maxHp * 0.6;
      const seq = low ? ['chargeTell', 'stompTell', 'spiralTell', 'fanTell', 'summonTell', 'ringTell'] : ['chargeTell', 'ringTell', 'fanTell', 'spiralTell'];
      e.st = seq[e.seq++ % seq.length];
      e.t = e.st === 'chargeTell' ? 0.9 : 0.7; e.n = 0;
      e.aim = Math.atan2(P.y - e.y, P.x - e.x);
      if (e.st === 'chargeTell') e.face = Math.cos(e.aim) >= 0 ? 1 : -1;
    }
  } else if (e.st === 'chargeTell') { if (e.t <= 0) { e.st = 'charge'; e.t = 2.5; } }
  else if (e.st === 'fanTell' || e.st === 'fan') { // 엄니 부채꼴: 플레이어 쪽으로 넓은 부채꼴 탄을 세 번
    if (e.t <= 0) { const a = Math.atan2(P.y - 16 - ey, P.x - e.x);
      for (let i = 0; i < 11; i++) fire(e.x, ey, a + (i - 5) * 0.13 + (e.n % 2 ? 0.065 : 0), 125, 7);
      e.n++; e.st = 'fan'; e.t = 0.45; if (e.n >= 3) { e.st = 'walk'; e.t = 1.3; } } }
  else if (e.st === 'spiralTell' || e.st === 'spiral') { // 나선 탄막: 두 줄기가 돌며 2.4초 동안 뿜는다
    if (e.st === 'spiralTell' && e.t <= 0) { e.st = 'spiral'; e.t = 2.4; e.o = rand() * Math.PI; e.ft = 0; }
    else if (e.st === 'spiral') { e.ft -= DT; e.o += 2.3 * DT;
      if (e.ft <= 0) { e.ft = 0.09; for (const s of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) fire(e.x, ey, e.o + s, 105, 7); }
      if (e.t <= 0) { e.st = 'walk'; e.t = 1.3; } } }
  else if (e.st === 'stompTell' || e.st === 'stomp') { // 쿵쿵: 세 번 발을 구르며 원형 탄과 낙석
    if (e.t <= 0) { const o = rand() * Math.PI;
      for (let i = 0; i < 16; i++) fire(e.x, e.y - 8, o + i / 16 * Math.PI * 2, 70, 9);
      for (let i = 0; i < 3; i++) marks.push({ t: 'rock', x: P.x + (rand() - 0.5) * 90, y: P.y + (rand() - 0.5) * 60, life: 0.9, max: 0.9 });
      shake = Math.max(shake, 7); burst(e.x, e.y - 4, '#8b7d6b', 14);
      e.n++; e.st = 'stomp'; e.t = 0.6; if (e.n >= 3) { e.st = 'walk'; e.t = 1.3; } } }
  else if (e.st === 'charge') {
    const hit = move(e, Math.cos(e.aim) * 15 * T * DT, Math.sin(e.aim) * 15 * T * DT);
    if (rand() < 0.6) fx.push({ t: 'dust', x: e.x + (rand() - 0.5) * 60, y: e.y - 2, life: 0.4, max: 0.4 });
    if (hit || e.t <= 0) { // 벽에 부딪히면 낙석
      e.st = 'stun'; e.t = 1.1; shake = 10; say(e.x, e.y - e.h - 16, '기절', 'stun');
      const pts = [[P.x, P.y]];
      for (let i = 0; i < 10; i++) pts.push([(r.x0 + 2 + rand() * (r.w - 4)) * T, (r.y0 + 3 + rand() * (r.h - 5)) * T]);
      for (const [x, y] of pts) marks.push({ t: 'rock', x, y, life: 0.9 + rand() * 0.3, max: 1.2 });
    }
  } else if (e.st === 'stun') { if (e.t <= 0) { e.st = 'walk'; e.t = 1.0 + rand() * 0.6; } }
  else if (e.st === 'ringTell' || e.st === 'ring') { // 원형 탄막 세 겹 (겹마다 반 칸씩 엇갈림)
    if (e.t <= 0) { if (e.st === 'ringTell') e.o = rand() * Math.PI;
      for (let i = 0; i < 24; i++) fire(e.x, ey, e.o + (i + (e.n % 2) * 0.5) / 24 * Math.PI * 2, 90, 8);
      e.n++; e.st = 'ring'; e.t = 0.5; if (e.n >= 3) { e.st = 'walk'; e.t = 1.3; } } }
  else if (e.st === 'summonTell') { if (e.t <= 0) { for (let i = 0; i < 3; i++) { const a = rand() * Math.PI * 2; addSpawn('tri', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 50, r); } e.st = 'walk'; e.t = 1.2; } }
}

// ---------- 방 진행 ----------
function addSpawn(kind, x, y, room) {
  const d = EDEF[kind]; let tries = 0;
  while (blocked(x - d.bw / 2, y - d.bh, d.bw, d.bh) && tries++ < 30) { x = (room.x0 + 2 + rand() * (room.w - 4)) * T; y = (room.y0 + 3 + rand() * (room.h - 5)) * T; }
  marks.push({ t: 'spawn', kind, x, y, room, life: 0.7, max: 0.7 });
}
function spawnWave(r) {
  for (const kind of r.waves[r.wi]) {
    if (EDEF[kind].boss) { marks.push({ t: 'spawn', kind, x: (r.x0 + r.w / 2) * T, y: (r.y0 + (kind === 'ai' ? 7 : 10)) * T, room: r, life: 1.0, max: 1.0 }); continue; }
    if (kind === 'rat') { // 쥐는 3마리가 줄지어 나온다
      let x, y, ok = false; for (let i = 0; i < 40 && !ok; i++) { x = (r.x0 + 3 + rand() * (r.w - 8)) * T; y = (r.y0 + 4 + rand() * (r.h - 7)) * T; ok = Math.hypot(x - P.x, y - P.y) > 7 * T && !blocked(x - 12, y - 10, 60, 10); }
      for (let i = 0; i < 3; i++) addSpawn('rat', x + i * 22, y, r); continue; }
    let x, y, ok = false;
    for (let i = 0; i < 40 && !ok; i++) { x = (r.x0 + 2 + rand() * (r.w - 4)) * T; y = (r.y0 + 3 + rand() * (r.h - 5)) * T;
      ok = Math.hypot(x - P.x, y - P.y) > 6 * T && !blocked(x - 12, y - 10, 24, 10); }
    addSpawn(kind, x, y, r);
  }
  r.wi++;
}
function setDoors(r, v) { for (const [x, y] of r.doors) setT(x, y, v); }
function updateRooms() {
  const inside = roomAt(P.x, P.y - 3, 1);
  for (const r of rooms) if (roomAt(P.x, P.y - 3, 0) === r) r.seen = true;
  if (inside && inside.state === 'idle' && (inside.type === 'fight' || inside.type === 'boss')) {
    inside.state = 'fight'; setDoors(inside, 3); spawnWave(inside);
  }
  if (inside && inside.type === 'supply' && inside.state === 'idle') { // 보급방: 회복 상자와 에너지 구슬
    inside.state = 'clear'; const cx = (inside.x0 + inside.w / 2) * T, cy = (inside.y0 + inside.h / 2 + 1) * T;
    pickups.push({ kind: 'heal', x: cx - 30, y: cy });
    dropWeapon(cx + 30, cy); if (rand() < 0.35) dropRelic(cx, cy - 26); // 보급방 무기 상자, 가끔 유물
    pickups.push({ kind: 'cloth', x: cx - 10, y: cy + 26 }, { kind: 'part', x: cx + 10, y: cy + 26 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pickups.push({ kind: 'energy', x: cx, y: cy, vx: Math.cos(a) * 70, vy: Math.sin(a) * 50, t: 0 }); }
  }
  for (const r of rooms) if (r.state === 'fight') {
    const alive = enemies.some(e => e.room === r && !e.dead) || marks.some(m => m.t === 'spawn' && m.room === r);
    if (!alive) {
      if (r.wi < r.waves.length) spawnWave(r);
      else { r.state = 'clear'; setDoors(r, 6);
        if (has('regen') && P.hp < P.maxHp) { P.hp++; say(P.x, P.y - 46, '재생 · 체력 +1', 'heal', 'small'); } // 재생 if (r.type === 'fight' && rand() < 0.5) pickups.push({ kind: 'heal', x: (r.x0 + r.w / 2) * T, y: (r.y0 + r.h / 2 + 1) * T });
        if (r.type === 'fight' && rand() < 0.3) dropWeapon((r.x0 + r.w / 2) * T + 36, (r.y0 + r.h / 2 + 1) * T); // 전투방 보상: 가끔 무기
        if (r.type === 'fight' && rand() < 0.08) dropRelic((r.x0 + r.w / 2) * T - 36, (r.y0 + r.h / 2 + 1) * T); } // 드물게 유물
    }
  }
}

// ---------- 떠오르는 글자: 피해 숫자, 상태 이상 ----------
// 한글이 흐려지지 않도록 캔버스가 아닌 화면 위 글자로 띄운다
const TXT = { dmg: '#fff', crit: '#ffd23f', hurt: '#ff5a5a', shield: '#8fc4ec', heal: '#7ee07e', stun: '#9fd8ff', deflect: '#fff3b0', block: '#cfc6b3', energy: '#5fb8ff', conf: '#d7a6ff' };
let texts = [];
const floatEl = document.getElementById('float'), pool = [];
function say(x, y, str, kind, size) {
  x += (rand() - 0.5) * 8;
  // 같은 자리에 방금 뜬 글자가 있으면 그 위로 쌓는다
  for (let i = 0; i < 6; i++) { if (!texts.some(t => Math.abs(t.x - x) < 40 && Math.abs(t.y - y) < 13)) break; y -= 14; }
  texts.push({ x, y, str, col: TXT[kind], size: size || '', life: 0.8, max: 0.8 });
}
function updateTexts() { for (const t of texts) { t.life -= DT; t.y -= 34 * DT; } texts = texts.filter(t => t.life > 0); }
let camDraw = { x: 0, y: 0 };
function drawTexts() {
  const sw = view.clientWidth / W;
  while (pool.length < texts.length) { const d = document.createElement('div'); d.className = 'ft'; floatEl.appendChild(d); pool.push(d); }
  pool.forEach((d, i) => {
    const t = texts[i]; if (!t) { d.style.display = 'none'; return; }
    d.style.display = ''; d.textContent = t.str; d.style.color = t.col; d.className = 'ft ' + t.size;
    d.style.left = ((t.x - camDraw.x) * sw) + 'px'; d.style.top = ((t.y - camDraw.y) * sw) + 'px';
    d.style.opacity = Math.min(1, t.life / (t.max * 0.35));
  });
}

// ---------- 효과 ----------
function burst(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rand() * Math.PI * 2, s = 40 + rand() * 90; fx.push({ t: 'bit', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, col, life: 0.35, max: 0.35 }); } }
function updateFx() {
  for (const f of fx) { f.life -= DT; if (f.t === 'bit') { f.x += f.vx * DT; f.y += f.vy * DT; f.vx *= 0.9; f.vy *= 0.9; } }
  fx = fx.filter(f => f.life > 0);
  for (const m of marks) { m.life -= DT; if (m.life <= 0) {
    if (m.t === 'spawn') spawnEnemy(m.kind, m.x, m.y, m.room);
    else if (m.t === 'haz') { if (m.big) { for (let i = 0; i < 5; i++) addHazard(m.x + (i - 2) * 30, m.y + (i % 2) * 14, m.hz); } else addHazard(m.x, m.y, m.hz); }
    else if (m.t === 'rock') { burst(m.x, m.y - 4, '#8b7d6b', 8); shake = Math.max(shake, 4); if (Math.hypot(P.x - m.x, (P.y - m.y) * 1.3) < 18) hurt(BOSS_DMG); }
  } }
  marks = marks.filter(m => m.life > 0);
}

// ---------- 탄 ----------
// 적 탄: 가운데·좌우 가장자리·장애물 윗면(그림이 타일 위로 8도트 솟음)에 닿으면 막힌다
const bulletWall = b => solidAt(b.x, b.y) || solidAt(b.x, b.y + 7) || solidAt(b.x - b.r * 0.7, b.y) || solidAt(b.x + b.r * 0.7, b.y);
// 두 점 사이에 벽·장애물이 있으면 true(벽에 붙어 선 몸통이 벽 너머 탄에 맞지 않게)
function wallBetween(x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  for (let i = 1; i < n; i++) if (solidAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return true; return false; }
function updateBullets() {
  const pc = pCenter();
  for (const b of ebul) { b.x += b.vx * DT; b.y += b.vy * DT; b.life -= DT;
    if (bulletWall(b) || b.life <= 0) { b.dead = true; if (b.life > 0) hitProp(propAtPx(b.x, b.y), 1); if (b.hz) addHazard(b.x - b.vx * DT * 2, b.y - b.vy * DT * 2, b.hz); } // 적 탄도 엄폐물을 조금씩 깎는다
    if (!b.dead && Math.hypot(b.x - pc.x, b.y - pc.y) < 7 + b.r && !wallBetween(b.x, b.y, P.x, P.y - 4)) { b.dead = true; hurt(b.boss ? BOSS_DMG : 1);
      const s = b.st || (b.hz === 'acid' ? 'acid' : b.hz === 'fire' ? 'burn' : null); if (s) applyStatus(s); } }
  ebul = ebul.filter(b => !b.dead && b.life > 0);
  for (const s of shots) { s.x += s.vx * DT; s.y += s.vy * DT; s.life -= DT;
    if (solidAt(s.x, s.y)) { hitProp(propAtPx(s.x, s.y), s.dmg); // 지형지물에 맞으면 부서진다
      if (has('bounce') && !s.bounced && !s.deflect) { // 튕김탄: 벽에서 한 번 튕긴다
        s.x -= s.vx * DT; s.y -= s.vy * DT; if (solidAt(s.x + s.vx * DT, s.y)) s.vx *= -1; if (solidAt(s.x, s.y + s.vy * DT)) s.vy *= -1; s.bounced = true; burst(s.x, s.y, '#fff3b0', 2); continue; }
      s.dead = true; if (s.boom) explode(s.x - s.vx * DT, s.y - s.vy * DT, s.boom.r, s.boom.dmg); else burst(s.x, s.y, '#bdb5a6', 3); continue; }
    if (s.rocket) { s.vx *= 1.03; s.vy *= 1.03; if (rand() < 0.7) fx.push({ t: 'dust', x: s.x - s.vx * 0.02, y: s.y - s.vy * 0.02 + 4, life: 0.35, max: 0.35 }); } // 로켓: 점점 빨라지고 연기를 남긴다
    if (s.boom && s.life <= DT) { s.dead = true; explode(s.x, s.y, s.boom.r, s.boom.dmg); continue; }
    if (s.tag === 'base') for (const h of hazards) if (h.kind === 'acid' && Math.hypot(h.x - s.x, h.y - s.y) < 20) { h.t = h.life; say(h.x, h.y - 10, '중화', 'heal', 'small'); } // 염기로 산성 웅덩이를 중화
    for (const e of enemies) if (!e.dead && !(s.hit && s.hit.has(e)) && Math.abs(s.x - e.x) < e.w * 0.42 && s.y > e.y - e.h && s.y < e.y + 2) {
      let d = s.dmg;
      if (s.tag === 'base' && e.kind === 'acid') d *= 2; // 수산화 칼슘(염기) → 산성 방울에 강하다
      if (s.tag === 'red' && e.kind === 'rust') d *= 2; // 환원제 → 녹(산화철)에 강하다
      damage(e, Math.max(1, Math.round(d)));
      if (s.tag === 'pack' && !e.dead) { if (s.mode === 'hot') { if (!(e.burnT > 0)) say(e.x, e.y - e.h - 16, '화상', 'hurt', 'small'); e.burnT = 3; } else { if (!(e.slowT > 0)) say(e.x, e.y - e.h - 16, '느려짐', 'stun', 'small'); e.slowT = 2.5; } }
      if (has('chain') && !s.chained && !s.deflect) { // 연쇄 튕김: 맞힌 자리에서 가장 가까운 다른 적에게 튄다
        let n = null, nd = 160; for (const o of enemies) if (o !== e && !o.dead) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < nd) { nd = d; n = o; } }
        if (n) { const a = Math.atan2(n.y - n.h / 2 - s.y, n.x - s.x); shots.push({ x: s.x, y: s.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, life: 0.6, dmg: s.dmg * 0.7, r: s.r, tag: s.tag, chained: true, hit: new Set([e]) }); } }
      if (s.boom) { s.dead = true; explode(s.x, s.y, s.boom.r, s.boom.dmg); break; }
      if (s.pierce > 0) { s.pierce--; (s.hit = s.hit || new Set()).add(e); } else { s.dead = true; break; } } }
  shots = shots.filter(s => !s.dead && s.life > 0);
  enemies = enemies.filter(e => !e.dead);
}

// ---------- 진행 ----------
function finish(win) {
  if (ended) return; ended = true; endT = win ? 1.6 : 1.0;
  ended = win ? 'win' : 'lose';
}
// 보스를 잡으면 구역 통과: 열린 구역이 더 있으면 다음 구역 역 1로, 없으면 막차에 타고 끝난다
function zoneClear() {
  if (stage.zi + 1 < stage.order.length) { say(P.x, P.y - 50, `구역 ${stage.zone + 1} 통과`, 'heal', 'big'); zoneNext = 1.8; }
  else finish(true);
}
let zoneNext = 0;
function step() {
  if (!running) return;
  if (crafting || choosing || viewingTree || infoOpen) return; // 조합대·능력 고르기·스킬 트리·상태 창이 열려 있으면 기록 시계도 함께 멈춘다
  if (!ended) time += DT;
  if (trans > 0) { trans -= DT; if (trans <= 0) { stage.st++; enterStation(); } return; }
  updateStatus();
  if (zoneNext > 0) { zoneNext -= DT; if (zoneNext <= 0) { stage = { order: stage.order, zi: stage.zi + 1, zone: stage.order[stage.zi + 1], st: 0 }; enterStation(); return; } }
  updatePlayer();
  for (const e of enemies) updateEnemy(e);
  updateBullets(); updateSkills(); updateFx(); updateRooms(); updateTexts(); updateTimers(); updateHazards(); updateBossExtras();
  shake = Math.max(0, shake - DT * 30);
  cam.x += (P.x - W / 2 - cam.x) * 0.16; cam.y += (P.y - 20 - H / 2 - cam.y) * 0.16;
  cam.x = Math.max(0, Math.min(MW * T - W, cam.x)); cam.y = Math.max(0, Math.min(MH * T - H, cam.y));
  if (ended) { endT -= DT; if (endT <= 0) showResult(); }
}

// ---------- 그리기 ----------
const STRATA = ['#6b4f36', '#8a6a45', '#a88a5e', '#5c4a3a', '#7a6447', '#94754e', '#a2896a', '#6e5a43'];
function drawTiles(cx, cy) {
  const x0 = Math.floor(cx / T), y0 = Math.floor(cy / T), x1 = x0 + Math.ceil(W / T) + 1, y1 = y0 + Math.ceil(H / T) + 1;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const v = tile(tx, ty), X = tx * T, Y = ty * T; if (v === 0) continue;
    const h = hash(tx, ty);
    if (v === 2) {
      const below = tile(tx, ty + 1);
      if (below !== 0 && !SOLID.has(below) || (tile(tx, ty + 2) !== 0 && !SOLID.has(tile(tx, ty + 2)) && below === 2)) {
        const TH = THEME[stage.zone];
        for (let j = 0; j < T; j += 4) px(ctx, X, Y + j, T, 4, TH.face[((Y + j) / 4 + (tx >> 3)) % TH.face.length]);
        if (!SOLID.has(below) && below !== 0) { px(ctx, X, Y + T - 2, T, 2, TH.edge); TH.decor(X, Y, h); }
      } else { px(ctx, X, Y, T, T, THEME[stage.zone].top); if (h % 5 === 0) px(ctx, X + (h % 11), Y + (h % 13), 2, 1, '#2e2722'); }
    } else if (v === 1 || v === 6) {
      const TH = THEME[stage.zone];
      px(ctx, X, Y, T, T, (tx + ty) % 2 ? TH.floor[0] : TH.floor[1]);
      if (h % 7 === 0) px(ctx, X + (h % 12) + 1, Y + ((h >> 4) % 12) + 1, 2, 2, TH.speck[0]);
      if (h % 11 === 0) px(ctx, X + ((h >> 3) % 12) + 1, Y + ((h >> 6) % 12) + 1, TH.speck[2] || 1, 1, TH.speck[1]);
    } else if (v === 4 || v === 5) {
      px(ctx, X, Y, T, T, '#2f2b28');
      const mid = v === 4 ? (tile(tx, ty - 1) === 4 && tile(tx, ty + 1) === 4) : (tile(tx - 1, ty) === 5 && tile(tx + 1, ty) === 5);
      if (v === 4) { px(ctx, X + 6, Y, 4, T, '#4a3a2a'); if (mid) { px(ctx, X, Y + 3, T, 2, '#8d96a3'); px(ctx, X, Y + 11, T, 2, '#8d96a3'); } }
      else { px(ctx, X, Y + 6, T, 4, '#4a3a2a'); if (mid) { px(ctx, X + 3, Y, 2, T, '#8d96a3'); px(ctx, X + 11, Y, 2, T, '#8d96a3'); } }
    } else if (v === 3) {
      px(ctx, X, Y, T, T, '#2a1414'); for (let i = 1; i < T; i += 5) px(ctx, X + i, Y, 2, T, '#c94a3a'); px(ctx, X, Y + 7, T, 2, '#8a2e24');
    } else if (v === 7 || v === 10 || v === 11) { const TH = THEME[stage.zone]; px(ctx, X, Y, T, T, (tx + ty) % 2 ? TH.floor[0] : TH.floor[1]); }
    else if (v === 9) { // 조합대(작업대)
      px(ctx, X, Y, T, T, THEME[stage.zone].floor[0]); px(ctx, X, Y + 3, T, 10, '#1a1512'); px(ctx, X + 1, Y + 4, T - 2, 3, '#a07a4a'); px(ctx, X + 1, Y + 7, T - 2, 5, '#6a4a2a');
      if (tile(tx - 1, ty) !== 9) { px(ctx, X + 3, Y + 1, 4, 3, '#e8e0c8'); px(ctx, X + 9, Y + 2, 3, 2, '#8d96a3'); } }
    else if (v === 8) { // 출구: 다음 역으로 가는 열차 문 바닥 표시 (2×2칸)
      px(ctx, X, Y, T, T, '#2b3440'); px(ctx, X, Y, T, 1, '#f0b429'); px(ctx, X, Y + T - 1, T, 1, '#f0b429');
      if (tile(tx - 1, ty) !== 8) px(ctx, X, Y, 1, T, '#f0b429'); if (tile(tx + 1, ty) !== 8) px(ctx, X + T - 1, Y, 1, T, '#f0b429');
      if (tile(tx - 1, ty) !== 8 && tile(tx, ty - 1) !== 8) { const b = Math.floor(time * 3) % 2; // 위쪽 화살표
        px(ctx, X + 14, Y + 6 - b, 4, 14, '#f0b429'); px(ctx, X + 10, Y + 10 - b, 12, 2, '#f0b429'); px(ctx, X + 12, Y + 8 - b, 8, 2, '#f0b429'); } }
  }
}
// ---------- 부서지지 않는 장애물 (2026-10-27 교사 요청: 많이, 규칙적으로 미로·던전처럼) ----------
function roomConnected(r) { // 방 안 바닥이 모두 이어져 있는지(바닥 한 칸에서 시작해 칠하기)
  let sx = -1, sy = -1;
  for (let y = r.y0 + 2; y < r.y0 + r.h - 1 && sx < 0; y++) for (let x = r.x0 + 1; x < r.x0 + r.w - 1; x++) if (!SOLID.has(tile(x, y))) { sx = x; sy = y; break; }
  if (sx < 0) return false;
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
    if (seen.has(k) || nx <= r.x0 || nx >= r.x0 + r.w - 1 || ny < r.y0 + 2 || ny >= r.y0 + r.h - 1 || SOLID.has(tile(nx, ny))) continue; seen.add(k); q.push([nx, ny]); } }
  for (let y = r.y0 + 2; y < r.y0 + r.h - 1; y++) for (let x = r.x0 + 1; x < r.x0 + r.w - 1; x++) if (!SOLID.has(tile(x, y)) && !seen.has(x + ',' + y)) return false;
  return true;
}
// 규칙적인 방 배치 틀 (2026-10-27 교사 요청: 미로나 던전 같은 느낌). 좌우·상하 대칭으로 세운다
// b(x, y): 방 안쪽 좌표(0..iw-1, 0..ih-1)에 장애물 한 칸. iw·ih: 안쪽 폭·높이
const LAYOUTS = {
  pillars(b, iw, ih) { for (let y = 3; y < ih - 2; y += 4) for (let x = 3; x < iw - 2; x += 4) b(x, y); }, // 기둥 회랑
  maze(b, iw, ih) { const k = Math.max(3, Math.floor(iw / 6)); let i = 0; // 칸막이 미로: 세로벽, 틈이 위·아래로 엇갈린다
    for (let x = k; x < iw - 2; x += k, i++) { const top = i % 2 === 0; for (let y = 0; y < ih; y++) if (top ? y > 2 : y < ih - 3) b(x, y); } },
  roomInRoom(b, iw, ih) { const m = 4, cx = iw >> 1, cy = ih >> 1; // 방 속의 방: 네 변 가운데가 뚫린 안쪽 벽
    for (let x = m; x < iw - m; x++) { if (Math.abs(x - cx) > 1) { b(x, m - 1); b(x, ih - m); } }
    for (let y = m - 1; y <= ih - m; y++) { if (Math.abs(y - cy) > 1) { b(m, y); b(iw - m - 1, y); } }
    b(cx - 3, cy - 2); b(cx + 3, cy - 2); b(cx - 3, cy + 2); b(cx + 3, cy + 2); },
  corners(b, iw, ih) { const L = Math.min(6, (iw >> 2)), H = Math.min(4, (ih >> 2)); // 네 귀퉁이 ㄱ자
    for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x0 = sx ? iw - 4 : 3, y0 = sy ? ih - 4 : 3, dx = sx ? -1 : 1, dy = sy ? -1 : 1;
      for (let i = 0; i < L; i++) b(x0 + dx * i, y0); for (let i = 1; i < H; i++) b(x0, y0 + dy * i); } },
  stagger(b, iw, ih) { let row = 0; for (let y = 2; y < ih - 2; y += 3, row++) { const off = row % 2 ? 0 : 3; // 엇갈린 벽
      for (let x = 2 + off; x < iw - 2; x += 7) for (let i = 0; i < 4 && x + i < iw - 2; i++) b(x + i, y); } },
  checker(b, iw, ih) { for (let by = 0; by * 4 + 3 < ih - 2; by++) for (let bx = 0; bx * 4 + 3 < iw - 2; bx++) if ((bx + by) % 2 === 0) { // 체스판 2×2
      const x = bx * 4 + 3, y = by * 4 + 3; b(x, y); b(x + 1, y); b(x, y + 1); b(x + 1, y + 1); } },
  rings(b, iw, ih) { const cx = iw >> 1, cy = ih >> 1; // 이중 고리: 바깥은 좌우, 안쪽은 위아래가 뚫림
    const ring = (m, gapH) => { for (let x = m; x < iw - m; x++) { if (!gapH || Math.abs(x - cx) > 1) { b(x, m - 1); b(x, ih - m); } }
      for (let y = m - 1; y <= ih - m; y++) { if (gapH || Math.abs(y - cy) > 1) { b(m, y); b(iw - m - 1, y); } } };
    ring(3, false); if (iw > 18 && ih > 13) ring(6, true); },
  cross(b, iw, ih) { const cx = iw >> 1, cy = ih >> 1; // 십자 회랑: 네 귀퉁이 큰 덩어리
    for (let y = 2; y < ih - 2; y++) for (let x = 2; x < iw - 2; x++) if (Math.abs(x - cx) > 2 && Math.abs(y - cy) > 2 && Math.abs(x - cx) < cx - 3 && Math.abs(y - cy) < cy - 2) b(x, y); },
};
const LAYOUT_FIGHT = ['pillars', 'roomInRoom', 'corners', 'checker', 'cross'], // 미로 느낌이 강한 maze·stagger·rings는 뺐다
 LAYOUT_BOSS = ['pillars', 'corners', 'checker', 'cross'];
function placeBlocks(r) {
  if (r.type !== 'fight' && r.type !== 'boss' && r.type !== 'supply') return;
  const ix0 = r.x0 + 1, iy0 = r.y0 + 2, iw = r.w - 2, ih = r.h - 3, cx = r.x0 + (r.w >> 1), cy = r.y0 + (r.h >> 1);
  const list = shuffle((r.type === 'boss' ? LAYOUT_BOSS : r.type === 'supply' ? ['pillars', 'corners'] : LAYOUT_FIGHT).slice());
  for (const name of list) {
    const cells = [];
    LAYOUTS[name]((x, y) => { const tx = ix0 + x, ty = iy0 + y;
      // 문 앞(좌우 가운데 줄·위아래 가운데 줄의 가장자리 3칸)은 비운다
      if ((Math.abs(ty - cy) <= 1 && (x < 3 || x > iw - 4)) || (Math.abs(tx - cx) <= 1 && (y < 3 || y > ih - 4))) return;
      if (tile(tx, ty) === 1) cells.push([tx, ty]); }, iw, ih);
    for (const [x, y] of cells) setT(x, y, 11);
    if (roomConnected(r)) { r.layout = name; return; }
    for (const [x, y] of cells) setT(x, y, 1); // 길이 막히면 다른 틀로
  }
}
// 구역마다 다른 장애물 모양(키 24도트: 바닥 1칸 + 위로 8도트)
function drawBlock(tx, ty) {
  const X = tx * T, Y = ty * T, O = '#1a1512', z = stage.zone, up = tile(tx, ty - 1) === 11, dn = tile(tx, ty + 1) === 11, lf = tile(tx - 1, ty) === 11, rt = tile(tx + 1, ty) === 11, h = hash(tx, ty);
  const top = up ? Y : Y - 8, H = Y + T - top;
  const C = [['#5a4636', '#8a6a48', '#3a2c22', '#a8845a'], ['#7a5a36', '#9a7a4a', '#5a3e22', '#5f8a3a'], ['#6a5048', '#8a6a5a', '#4a3028', '#9a4a26'], ['#9aa0a6', '#c3c8cc', '#6a7076', '#f0b429']][z];
  px(ctx, X, top, T, H, O); px(ctx, X + (lf ? 0 : 1), top + 1, T - (lf ? 0 : 1) - (rt ? 0 : 1), H - 2, C[0]);
  if (!up) px(ctx, X + (lf ? 0 : 1), top + 1, T - (lf ? 0 : 1) - (rt ? 0 : 1), 7, C[1]); // 윗면
  if (!dn) px(ctx, X + 1, Y + T - 3, T - 2, 2, C[2]);
  if (z === 0) { px(ctx, X + 2 + (h % 7), Y + 4, 5, 1, C[2]); px(ctx, X + 3, Y + 9 + (h % 3), 7, 1, C[3]); } // 바위: 지층 줄
  else if (z === 1) { if (!up) { px(ctx, X + 2, top + 2, T - 4, 4, '#4a3426'); if (h % 2) { px(ctx, X + 5, top - 2, 2, 4, C[3]); px(ctx, X + 10, top - 3, 2, 5, C[3]); } } px(ctx, X, Y + 6, T, 1, C[2]); } // 나무 화단
  else if (z === 2) { px(ctx, X + 3, Y + 3, 2, 2, '#c8c8d0'); px(ctx, X + 11, Y + 3, 2, 2, '#c8c8d0'); px(ctx, X + 3, Y + 11, 2, 2, '#c8c8d0'); if (h % 3 === 0) px(ctx, X + 6, Y + 6, 4, 4, C[3]); } // 녹슨 기계 블록
  else { if (!up) for (let i = 0; i < 4; i++) px(ctx, X + 1 + i * 4, top + 2, 2, 4, i % 2 ? '#1a1512' : C[3]); px(ctx, X + 4, Y + 8, 8, 1, C[2]); } // 콘크리트 방호벽: 노랑·검정 띠
}

// ---------- 지형지물: 구역마다 특색 있는, 부서지는 물건 (2026-10-26 교사 요청) ----------
// 바닥 1칸을 막고(이동·탄 모두 막는 엄폐물), 부수면 에너지·체력·재료가 나온다
const PROP = {
  fossilRock: { z: 0, name: '화석 바위', hp: 9, extra: 'mat' }, cart: { z: 0, name: '광차', hp: 6 }, timber: { z: 0, name: '나무 버팀목 더미', hp: 4 },
  pot: { z: 1, name: '화분', hp: 3 }, compost: { z: 1, name: '퇴비 자루', hp: 4, extra: 'nutri' }, hay: { z: 1, name: '짚더미', hp: 3 },
  drum: { z: 2, name: '녹슨 드럼통', hp: 6, extra: 'boom' }, crate: { z: 2, name: '나무 궤짝', hp: 4 }, pipe: { z: 2, name: '녹슨 배관 토막', hp: 7 },
  server: { z: 3, name: '서버 상자', hp: 7, extra: 'energy' }, battery: { z: 3, name: '배터리 묶음', hp: 5 }, cone: { z: 3, name: '공사용 원뿔', hp: 2 },
};
let props = [];
function placeProps(r) {
  const n = r.type === 'fight' ? 5 + Math.floor(rand() * 3) : r.type === 'boss' ? 4 : r.type === 'start' ? 2 : 1;
  const kinds = Object.keys(PROP).filter(k => PROP[k].z === stage.zone), cx = r.x0 + (r.w >> 1), cy = r.y0 + (r.h >> 1);
  for (let i = 0, tries = 0; i < n && tries < 80; tries++) {
    const tx = r.x0 + 2 + Math.floor(rand() * (r.w - 4)), ty = r.y0 + 3 + Math.floor(rand() * (r.h - 5));
    if (Math.abs(tx - cx) <= 2 || Math.abs(ty - cy) <= 2 || tile(tx, ty) !== 1) continue; // 통로 줄과 가운데는 비운다
    if (r.type === 'start' && tx <= r.x0 + 6 && ty <= r.y0 + 4) continue; // 조합대 앞은 비운다
    const k = kinds[Math.floor(rand() * kinds.length)]; setT(tx, ty, 10);
    if (r.doors && !roomConnected(r)) { setT(tx, ty, 1); continue; } // 길을 막으면 놓지 않는다
    props.push({ kind: k, tx, ty, x: tx * T + 8, y: (ty + 1) * T, w: 16, h: 16, hp: PROP[k].hp, flash: 0, isProp: true }); i++;
  }
}
const propAt = (tx, ty) => props.find(p => !p.dead && p.tx === tx && p.ty === ty);
const propAtPx = (x, y) => propAt(Math.floor(x / T), Math.floor(y / T));
function hitProp(p, n) {
  if (!p || p.dead) return; p.hp -= n; p.flash = 0.08; burst(p.x, p.y - 8, '#cfc6b3', 2);
  if (p.hp > 0) return;
  p.dead = true; setT(p.tx, p.ty, 1); burst(p.x, p.y - 8, '#a89a84', 12); shake = Math.max(shake, 2);
  const X = PROP[p.kind].extra, x = p.x, y = p.y - 4;
  if (X === 'boom') explode(x, y, 44, 6); // 녹슨 드럼통: 터지며 둘레 적에게 피해
  if (X === 'nutri') addHazard(x, y, 'nutri');
  const orbs = (n) => { for (let i = 0; i < n; i++) { const a = rand() * Math.PI * 2; pickups.push({ kind: 'energy', x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 45, t: 0 }); } };
  if (X === 'energy') orbs(6); // 서버 상자: 에너지 많이
  if (X === 'mat' && rand() < 0.3) pickups.push({ kind: rand() < 0.5 ? 'cloth' : 'part', x: x + 10, y }); // 화석 바위: 가끔 재료 하나 더
  const d = rand(); // 떨어지는 것: 에너지 85%, 재료 6%, 체력 4% (2026-10-27 교사 요청: 아이템은 드물게, 에너지는 잘)
  if (d < 0.85) orbs(2 + Math.floor(rand() * 2)); else if (d < 0.91) pickups.push({ kind: rand() < 0.5 ? 'cloth' : 'part', x, y }); else if (d < 0.95) pickups.push({ kind: 'heal', x, y });
}
function drawProp(p) {
  const X = p.tx * T, Y = p.ty * T, O = '#1a1512', k = p.kind, dmg = 1 - p.hp / PROP[k].hp;
  const D = {
    fossilRock: () => { ell(ctx, X + 8, Y + 9, 18, 16, O); ell(ctx, X + 8, Y + 9, 16, 14, '#7a746a'); ell(ctx, X + 6, Y + 6, 8, 6, '#9a9387'); px(ctx, X + 7, Y + 9, 6, 4, '#d8c7a4'); px(ctx, X + 8, Y + 10, 4, 1, '#a8916a'); },
    cart: () => { px(ctx, X, Y + 2, 16, 11, O); px(ctx, X + 1, Y + 3, 14, 8, '#6a5a4a'); px(ctx, X + 1, Y + 3, 14, 2, '#8a7a6a'); ell(ctx, X + 4, Y + 14, 5, 5, O); ell(ctx, X + 12, Y + 14, 5, 5, O); px(ctx, X + 3, Y + 1, 10, 2, '#5a4a3a'); },
    timber: () => { for (let i = 0; i < 3; i++) { px(ctx, X, Y + 3 + i * 4, 16, 4, O); px(ctx, X + 1, Y + 4 + i * 4, 14, 2, i % 2 ? '#8a5a2e' : '#a06a38'); } },
    pot: () => { px(ctx, X + 2, Y + 6, 12, 10, O); px(ctx, X + 3, Y + 7, 10, 8, '#a8542e'); px(ctx, X + 3, Y + 7, 10, 2, '#c8743e'); px(ctx, X + 5, Y - 2, 2, 8, '#5f8a3a'); px(ctx, X + 9, Y - 4, 2, 10, '#7ab84a'); px(ctx, X + 3, Y - 1, 4, 3, '#7ab84a'); px(ctx, X + 10, Y - 5, 4, 3, '#5f8a3a'); },
    compost: () => { ell(ctx, X + 8, Y + 9, 16, 14, O); ell(ctx, X + 8, Y + 9, 14, 12, '#8a7a4a'); px(ctx, X + 5, Y + 2, 6, 3, '#6a5a3a'); px(ctx, X + 4, Y + 9, 8, 2, '#6a5a3a'); px(ctx, X + 6, Y + 11, 2, 2, '#4a6a2a'); },
    hay: () => { ell(ctx, X + 8, Y + 10, 18, 13, O); ell(ctx, X + 8, Y + 10, 16, 11, '#d8b84a'); for (let i = 0; i < 5; i++) px(ctx, X + 2 + i * 3, Y + 6 + (i % 2), 1, 7, '#a88a2a'); },
    drum: () => { px(ctx, X + 1, Y - 4, 14, 20, O); px(ctx, X + 2, Y - 3, 12, 18, '#9a4a26'); px(ctx, X + 2, Y + 1, 12, 2, '#6a2a12'); px(ctx, X + 2, Y + 9, 12, 2, '#6a2a12'); px(ctx, X + 2, Y - 3, 12, 2, '#c26a3a'); px(ctx, X + 4, Y + 4, 3, 3, '#e8d040'); },
    crate: () => { px(ctx, X, Y, 16, 16, O); px(ctx, X + 1, Y + 1, 14, 14, '#9c6b3c'); px(ctx, X + 1, Y + 7, 14, 2, '#6e4826'); px(ctx, X + 7, Y + 1, 2, 14, '#6e4826'); },
    pipe: () => { px(ctx, X - 1, Y + 4, 18, 10, O); px(ctx, X, Y + 5, 16, 8, '#7a5a4a'); px(ctx, X, Y + 5, 16, 2, '#9a7a6a'); px(ctx, X, Y + 4, 3, 10, '#5a4038'); px(ctx, X + 13, Y + 4, 3, 10, '#5a4038'); px(ctx, X + 6, Y + 8, 3, 3, '#9a4a26'); },
    server: () => { px(ctx, X + 1, Y - 6, 14, 22, O); px(ctx, X + 2, Y - 5, 12, 20, '#2a3440'); for (let i = 0; i < 4; i++) { px(ctx, X + 3, Y - 3 + i * 5, 10, 3, '#14202c'); px(ctx, X + 11, Y - 2 + i * 5, 1, 1, (Math.floor(time * 3) + i) % 2 ? '#7ee07e' : '#f0b429'); } },
    battery: () => { for (let i = 0; i < 3; i++) { px(ctx, X + i * 5, Y + 2, 6, 14, O); px(ctx, X + 1 + i * 5, Y + 3, 4, 12, i === 1 ? '#3f7fd0' : '#2a2a30'); px(ctx, X + 2 + i * 5, Y, 2, 3, '#c3cad3'); px(ctx, X + 1 + i * 5, Y + 6, 4, 2, '#f0b429'); } },
    cone: () => { px(ctx, X + 1, Y + 13, 14, 3, O); px(ctx, X + 2, Y + 13, 12, 2, '#e05a2a'); for (let j = 0; j < 12; j++) { const w = 2 + Math.floor(j / 2); px(ctx, X + 8 - w / 2 - 1, Y + 1 + j, w + 2, 1, O); px(ctx, X + 8 - w / 2, Y + 1 + j, w, 1, j % 5 > 2 ? '#f3f3f3' : '#e05a2a'); } },
  };
  px(ctx, X + 1, Y + T - 2, T - 2, 3, 'rgba(0,0,0,0.3)');
  D[k]();
  if (dmg > 0.4) { px(ctx, X + 4, Y + 4, 1, 5, O); px(ctx, X + 5, Y + 8, 3, 1, O); } // 금이 간다
  if (dmg > 0.7) { px(ctx, X + 10, Y + 3, 1, 6, O); px(ctx, X + 8, Y + 9, 3, 1, O); }
  if (p.flash > 0) { ctx.globalAlpha = 0.6; px(ctx, X, Y - 4, T, T + 4, '#ffffff'); ctx.globalAlpha = 1; }
}
function drawPillar(tx, ty) { const X = tx * T, Y = ty * T, [b, l, d, s] = THEME[stage.zone].pillar;
  px(ctx, X, Y - T, T, T * 2, '#1b1916'); px(ctx, X + 1, Y - T + 1, T - 2, T * 2 - 2, b);
  px(ctx, X + 1, Y - T + 1, T - 2, 3, l); px(ctx, X + 3, Y - T + 5, 1, T * 2 - 8, d); px(ctx, X + 1, Y + T - 4, T - 2, 3, s); }
// 구역마다 확연히 다른 벽 단면·바닥·기둥 색 (교사 요청: 구역마다 컨셉이 확연히 다르게)
const THEME = [
  { face: STRATA, edge: '#2b2117', top: '#221d19', floor: ['#3f3a34', '#433d37'], speck: ['#35302b', '#5a534b'], pillar: ['#7a746a', '#9a9387', '#666056', '#5c574f'],
    decor: (X, Y, h) => { if (h % 9 === 0) { px(ctx, X + 4, Y + 4, 8, 5, '#d8c7a4'); px(ctx, X + 5, Y + 5, 6, 1, '#a8916a'); px(ctx, X + 5, Y + 7, 6, 1, '#a8916a'); }
      else if (h % 9 === 1) { px(ctx, X + 5, Y + 3, 6, 6, '#d8c7a4'); px(ctx, X + 7, Y + 5, 2, 2, '#a8916a'); } } }, // 지층과 화석
  { face: ['#6b8a3a', '#5a7a34', '#4a6a2a', '#7a5a3a', '#6a4a30', '#5e7e36'], edge: '#2a2214', top: '#1e1a12', floor: ['#3e3326', '#423629'], speck: ['#34401e', '#7ab84a', 2], pillar: ['#7a5a36', '#9a7a4a', '#5a3e22', '#4a3a22'],
    decor: (X, Y, h) => { if (h % 7 === 0) { px(ctx, X + 4, Y + 6, 8, 6, '#8a4a2a'); px(ctx, X + 5, Y + 2, 2, 4, '#7ab84a'); px(ctx, X + 9, Y + 1, 2, 5, '#7ab84a'); } // 화분
      else if (h % 7 === 1) { px(ctx, X + 2, Y + 3, 12, 1, '#c8b88a'); px(ctx, X + 4, Y + 4, 3, 4, '#e8e0c8'); px(ctx, X + 9, Y + 4, 3, 5, '#a8c0d8'); } } }, // 빨랫줄
  { face: ['#7a3a1e', '#5a2a16', '#8a4a26', '#4a3a36', '#6a3a2a', '#3e3a3a'], edge: '#1e1410', top: '#1a1614', floor: ['#373b40', '#3b3f44'], speck: ['#2a4a5a', '#7a8a96'], pillar: ['#6a5048', '#8a6a5a', '#4a3028', '#9a4a26'],
    decor: (X, Y, h) => { if (h % 6 === 0) { px(ctx, X + 3, Y + 4, 2, 2, '#c8c8d0'); px(ctx, X + 11, Y + 4, 2, 2, '#c8c8d0'); } // 리벳
      else if (h % 6 === 1) { px(ctx, X + 7, Y + 2, 2, 10, '#5a8aa8'); px(ctx, X + 7, Y + 12, 2, 2, '#8ac0e0'); } } }, // 물 새는 자국
  { face: ['#3a4a5a', '#2e3c4a', '#46566a', '#2a3644'], edge: '#141c24', top: '#141a20', floor: ['#45474b', '#494b4f'], speck: ['#3a3c40', '#f0b429'], pillar: ['#7a8490', '#9aa4b0', '#5a6470', '#4a5460'],
    decor: (X, Y, h) => { if (h % 5 === 0) { px(ctx, X + 2, Y + 3, 12, 8, '#0e1a26'); px(ctx, X + 3, Y + 4, 10, 6, h % 2 ? '#2a5a3a' : '#2a3a5a'); px(ctx, X + 4, Y + 6, 6, 1, '#7ee07e'); } // 관제 화면
      else if (h % 5 === 1) px(ctx, X + 6, Y + 5, 4, 4, '#f0b429'); } }, // 표시등
];
function line(x0, y0, x1, y1, col, th) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy, n = 0;
  ctx.fillStyle = col; const o = Math.floor(th / 2);
  while (n++ < 2000) { ctx.fillRect(x0 - o, y0 - o, th, th); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function bang(x, y) { x = Math.round(x); y = Math.round(y); px(ctx, x - 2, y - 1, 5, 11, '#1a0c0c'); px(ctx, x - 1, y, 3, 6, '#ff3b3b'); px(ctx, x - 1, y + 7, 3, 2, '#ff3b3b'); }
function ringPx(x, y, r, col) { ctx.fillStyle = col; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), 2, 2); } }
function rayEnd(x, y, a) { let ex = x, ey = y; for (let i = 0; i < 80; i++) { const nx = ex + Math.cos(a) * 8, ny = ey + Math.sin(a) * 8; if (solidAt(nx, ny)) break; ex = nx; ey = ny; } return [ex, ey]; }

function render() {
  const sx = shake > 0 ? Math.round((rand() - 0.5) * shake) : 0, sy = shake > 0 ? Math.round((rand() - 0.5) * shake) : 0;
  const cx = Math.round(cam.x) + sx, cy = Math.round(cam.y) + sy; camDraw = { x: cx, y: cy };
  px(ctx, 0, 0, W, H, '#000');
  ctx.save(); ctx.translate(-cx, -cy);
  drawTiles(cx, cy);
  // 바닥 표시: 낙석 자리, 등장 자리, 조준선
  for (const m of marks) {
    const k = 1 - m.life / m.max;
    if (m.t === 'rock') { ringPx(m.x, m.y, 16, 'rgba(255,60,60,0.8)'); ell(ctx, Math.round(m.x), Math.round(m.y), Math.round(32 * k) | 1, Math.round(19 * k) | 1, 'rgba(255,60,60,0.35)'); }
    else if (m.t === 'haz') { const R = m.big ? 80 : 24; ringPx(m.x, m.y, R, 'rgba(255,140,60,0.85)'); ell(ctx, Math.round(m.x), Math.round(m.y), Math.round(R * 2 * k) | 1, Math.round(R * 1.2 * k) | 1, 'rgba(255,140,60,0.3)'); }
    else if (m.t === 'land') { ringPx(m.x, m.y, 46, 'rgba(255,60,60,0.85)'); ell(ctx, Math.round(m.x), Math.round(m.y), Math.round(92 * k) | 1, Math.round(56 * k) | 1, 'rgba(255,60,60,0.3)'); }
    else ringPx(m.x, m.y - 4, 6 + 8 * (1 - k), 'rgba(255,220,140,0.8)');
  }
  for (const e of enemies) {
    const ai = EDEF[e.kind].ai;
    if (ai === 'shoot' && e.st === 'tell') { for (const o of EDEF[e.kind].side ? [e.side * 0.3, e.side * 0.6] : [0]) { const [x2, y2] = rayEnd(e.x, e.y - e.h / 2, e.aim + o); line(e.x, e.y - e.h / 2, x2, y2, 'rgba(255,60,60,0.7)', 1); } }
    if (ai === 'charge' && e.st === 'tell') line(e.x, e.y - 6, e.x + Math.cos(e.aim) * 44, e.y - 6 + Math.sin(e.aim) * 44, 'rgba(255,60,60,0.75)', 1);
    if ((e.kind === 'owl' && e.st === 'featherTell') || (e.kind === 'furnace' && (e.st === 'flameTell' || e.st === 'pourTell'))) { const ey2 = e.y - e.h / 2, a = e.st === 'pourTell' ? e.aim : Math.atan2(P.y - 16 - ey2, P.x - e.x);
      for (const o of e.st === 'pourTell' ? [0] : [-0.45, 0, 0.45]) { const [x2, y2] = rayEnd(e.x, ey2, a + o); line(e.x, ey2, x2, y2, 'rgba(255,60,60,0.55)', e.st === 'pourTell' ? 5 : 1); } }
    if (e.st === 'patTell' && e.pat) { const p = e.pat, ey2 = e.y - e.h / 2; // 새 보스 예고선
      if (p.t === 'fan') for (const o of [-0.45, 0, 0.45]) { const [x2, y2] = rayEnd(e.x, ey2, e.aim + o); line(e.x, ey2, x2, y2, 'rgba(255,60,60,0.5)', 1); }
      if (p.t === 'charge') { const [x2, y2] = rayEnd(e.x, e.y - 10, e.aim); line(e.x, e.y - 10, x2, y2, 'rgba(255,60,60,0.55)', 5); }
      if (e.lines) for (const L of e.lines) line(L.x1, L.y1, L.x2, L.y2, Math.floor(time * 12) % 2 ? 'rgba(255,60,60,0.8)' : 'rgba(255,160,60,0.6)', 2); }
    if (e.kind === 'amm' && e.st === 'tell') { const [x2, y2] = rayEnd(e.x, e.y - e.h / 2, e.aim); line(e.x, e.y - e.h / 2, x2, y2, 'rgba(255,60,60,0.75)', 1); }
    if (e.kind === 'tri' && e.st === 'tell') line(e.x, e.y - 6, e.x + Math.cos(e.aim) * 40, e.y - 6 + Math.sin(e.aim) * 40, 'rgba(255,60,60,0.75)', 1);
    if (e.kind === 'mam' && e.st === 'fanTell') { const ey2 = e.y - e.h / 2, a = Math.atan2(P.y - 16 - ey2, P.x - e.x);
      for (const o of [-0.65, 0, 0.65]) { const [x2, y2] = rayEnd(e.x, ey2, a + o); line(e.x, ey2, x2, y2, 'rgba(255,60,60,0.45)', 1); } }
    if (e.kind === 'mam' && e.st === 'chargeTell') { const [x2, y2] = rayEnd(e.x, e.y - 10, e.aim); line(e.x, e.y - 10, x2, y2, 'rgba(255,60,60,0.55)', 5); }
  }
  for (const p of pickups) {
    if (p.kind === 'relic') { const x = Math.round(p.x), y = Math.round(p.y - 12 + Math.sin(time * 3 + p.x) * 2); ringPx(p.x, p.y - 1, 12, '#ffd23f'); // 유물: 금빛 상자
      px(ctx, x - 7, y - 6, 14, 12, '#1a1512'); px(ctx, x - 6, y - 5, 12, 10, '#c8963a'); px(ctx, x - 6, y - 5, 12, 3, '#ffd23f'); px(ctx, x - 1, y - 2, 2, 4, '#1a1512');
      if (Math.floor(time * 4) % 3 === 0) px(ctx, x + 5, y - 9, 2, 2, '#fff6a0'); }
    else if (p.kind === 'cloth') { const x = Math.round(p.x), y = Math.round(p.y - 8 + Math.sin(time * 4 + p.x)); // 가죽 조각
      px(ctx, x - 6, y - 4, 12, 9, '#1a1512'); px(ctx, x - 5, y - 3, 10, 7, '#9a6438'); px(ctx, x - 5, y - 3, 10, 2, '#b8804a'); for (let i = -4; i < 5; i += 2) px(ctx, x + i, y + 2, 1, 1, '#e8c890'); }
    else if (p.kind === 'part') { const x = Math.round(p.x), y = Math.round(p.y - 8 + Math.sin(time * 4 + p.x)); px(ctx, x - 5, y - 5, 10, 10, '#1a1512'); px(ctx, x - 4, y - 4, 8, 8, '#8d96a3'); px(ctx, x - 2, y - 2, 4, 4, '#3a3f46'); px(ctx, x - 1, y - 6, 2, 2, '#8d96a3'); px(ctx, x - 1, y + 4, 2, 2, '#8d96a3'); }
    else if (p.kind === 'energy') { const x = Math.round(p.x), y = Math.round(p.y) - 6; px(ctx, x - 2, y - 3, 5, 7, '#0b2340'); px(ctx, x - 3, y - 2, 7, 5, '#0b2340'); px(ctx, x - 1, y - 2, 3, 5, '#5fb8ff'); px(ctx, x - 2, y - 1, 5, 3, '#5fb8ff'); px(ctx, x, y - 1, 1, 1, '#e6f6ff'); }
    else if (p.kind === 'heal') { const y = p.y - 10 + Math.round(Math.sin(time * 4)); px(ctx, p.x - 6, y, 12, 10, '#1a1512'); px(ctx, p.x - 5, y + 1, 10, 8, '#e04848'); px(ctx, p.x - 1, y + 2, 2, 6, '#fff'); px(ctx, p.x - 3, y + 4, 6, 2, '#fff'); }
    else { const y = Math.round(p.y - 12 + Math.sin(time * 4)); ell(ctx, Math.round(p.x), Math.round(p.y) - 1, 22, 7, 'rgba(0,0,0,0.3)'); // 바닥 무기: 등급 색 고리
      ringPx(p.x, p.y - 1, 12, RARITY[WEAP[p.kind].r]); drawSpr(SPR.wf[p.kind][0], p.x - WC, y - WC, false, false); }
  }
  drawHazards();
  for (const c of clouds) { const a = Math.min(1, c.t / 0.5) * 0.55; ctx.globalAlpha = a; ell(ctx, Math.round(c.x), Math.round(c.y), 64, 40, '#d8c840'); ell(ctx, Math.round(c.x - 14), Math.round(c.y - 8), 30, 22, '#e8d860'); ctx.globalAlpha = 1; }
  for (const e of enemies) if (e.kind === 'ai' && e.st === 'gridTell' && e.grid) { const r = e.room; for (const g of e.grid) { // 격자 조준선
      if (g.v) for (let y = r.y0 * T; y < (r.y0 + r.h) * T; y += 4) px(ctx, Math.round(g.x), y, 1, 2, 'rgba(255,60,60,0.8)'); else for (let x = r.x0 * T; x < (r.x0 + r.w) * T; x += 4) px(ctx, x, Math.round(g.y), 2, 1, 'rgba(255,60,60,0.8)'); } }
  drawSkillsUnder();
  // 깊이 정렬
  const list = [];
  const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1;
  for (let ty = ty0; ty < ty0 + 32; ty++) for (let tx = tx0; tx < tx0 + 53; tx++) { const v = tile(tx, ty); if (v === 7) list.push({ y: (ty + 1) * T, f: () => drawPillar(tx, ty) }); else if (v === 11) list.push({ y: (ty + 1) * T, f: () => drawBlock(tx, ty) }); }
  for (const p of props) if (!p.dead && p.tx >= tx0 - 1 && p.tx < tx0 + 54 && p.ty >= ty0 - 1 && p.ty < ty0 + 33) list.push({ y: p.y, f: () => drawProp(p) });
  for (const e of enemies) list.push({ y: e.y, f: () => {
    const s = sprFor(e), alt = Math.round(e.alt || 0);
    px(ctx, Math.round(e.x - e.bw / 2), Math.round(e.y) - 2, e.bw, 3, 'rgba(0,0,0,0.3)');
    const flash = e.flash > 0 || (isBoss(e) && isTell(e) && e.st !== 'chargeTell' && Math.floor(time * 16) % 2 === 0);
    if (e.battOut) ctx.globalAlpha = 0.5;
    drawSpr(s, e.x - s.w / 2, e.y - s.h - alt, e.face < 0, flash); ctx.globalAlpha = 1;
    if (e.batt !== undefined && !e.battOut) { const k = Math.max(0, e.batt / 10); px(ctx, Math.round(e.x - 8), Math.round(e.y - e.h - 5), 16, 3, '#0c0c0c'); px(ctx, Math.round(e.x - 7), Math.round(e.y - e.h - 4), Math.round(14 * k), 1, k > 0.3 ? '#7ee07e' : '#ff5a3c'); }
  } });
  list.push({ y: P.y, f: drawPlayer });
  for (const a of allies) if (a.kind !== 'hawk') list.push({ y: a.y, f: () => drawAlly(a) });
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  // 자동 조준 표시: 노리는 적의 네 모서리
  if (target && !target.dead && !ended) { const l = Math.round(target.x - target.w / 2) - 3, t = Math.round(target.y - target.h) - 3, r = l + target.w + 5, b = Math.round(target.y) + 2, c = target.isProp ? '#cfc6b3' : '#f0b429'; // 지형지물은 회색 모서리
    for (const [x, y, sx, sy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]]) { px(ctx, sx > 0 ? x : x - 4, y, 5, 1, c); px(ctx, x, sy > 0 ? y : y - 4, 1, 5, c); } }
  // 혼란 표시: 머리 위에서 도는 보라 점
  for (const e of enemies) if (e.conf > 0 && !(e.stun > 0)) { const hx = e.x, hy = e.y - e.h - 6;
    for (let i = 0; i < 4; i++) { const a = -time * 5 + i * 1.57; px(ctx, Math.round(hx + Math.cos(a) * 7), Math.round(hy + Math.sin(a) * 3), 2, 2, i % 2 ? '#d7a6ff' : '#9a5ae0'); } }
  // 기절 표시: 머리 위에서 도는 별 3개
  for (const e of enemies) if (e.stun > 0 || (isBoss(e) && e.st === 'stun')) {
    const hx = e.x, hy = e.y - e.h - 6, rx = Math.max(8, e.w * 0.3);
    for (let i = 0; i < 3; i++) { const a = time * 7 + i * 2.09, x = Math.round(hx + Math.cos(a) * rx), y = Math.round(hy + Math.sin(a) * 3);
      px(ctx, x - 1, y, 3, 1, '#ffe66b'); px(ctx, x, y - 1, 1, 3, '#ffe66b'); } }
  // 「!」 예고
  for (const e of enemies) if (isTell(e)) bang(e.x, e.y - e.h - 14);
  // 탄
  for (const b of ebul) { const x = Math.round(b.x), y = Math.round(b.y), d = b.r * 2;
    ell(ctx, x, y, d + 2, d + 2, '#3a0d0d'); ell(ctx, x, y, d, d, b.r >= 7 ? '#ff7a2a' : '#ff5a3c'); ell(ctx, x, y, Math.max(2, d - 6), Math.max(2, d - 6), '#ffd2a8');
    px(ctx, x - Math.floor(b.r / 2), y - Math.floor(b.r / 2), 2, 2, '#fff4e0'); }
  for (const s of shots) { const x = Math.round(s.x), y = Math.round(s.y), d = Math.max(3, Math.round(s.r * 2));
    if (s.wave) { const a = Math.atan2(s.vy, s.vx), vx = -Math.sin(a), vy = Math.cos(a); ctx.globalAlpha = Math.min(1, s.life / 0.3); // 베기 파동: 진행 방향에 수직인 초승달
      for (let i = -9; i <= 9; i++) { const bend = (1 - (i * i) / 81) * 5; px(ctx, Math.round(s.x + vx * i - Math.cos(a) * bend), Math.round(s.y + vy * i - Math.sin(a) * bend), 2, 2, i % 3 ? '#ffe9a8' : '#ffffff'); }
      ctx.globalAlpha = 1; continue; }
    const col = s.deflect ? '#fff3b0' : s.tag === 'base' ? '#f4f4f0' : s.tag === 'red' ? '#9ad08a' : s.tag === 'pack' ? (s.mode === 'hot' ? '#ff7a2a' : '#7fc8ff') : s.coil ? '#ffd23f' : s.rocket ? '#ff7a2a' : '#b9b2a3';
    ell(ctx, x, y, d + 2, d + 2, '#2a2520'); ell(ctx, x, y, d, d, col); }
  drawSkillsOver(cx, cy);
  // 망치 휘두름
  if (P.swing > 0) { const c = pCenter(), k = P.swing / 0.16, W0 = P.swingW || WEAP[P.weapons[P.wi]], R = W0.range || 38, ad = Math.round((W0.arc || 1.2) * 180 / Math.PI * 0.85);
    ctx.fillStyle = `rgba(255,247,194,${0.4 + 0.6 * k})`;
    for (let d = -ad; d <= ad; d += 4) for (const r of [R * 0.75, R * 0.95, R * 1.15]) { const a = P.swingA + d * Math.PI / 180; ctx.fillRect(Math.round(c.x + Math.cos(a) * r), Math.round(c.y + Math.sin(a) * r), 2, 2); } }
  if (P.chg > 0) { const c = pCenter(), w = 24; px(ctx, Math.round(c.x - w / 2), Math.round(P.y + 4), w, 4, '#0c0c0c'); px(ctx, Math.round(c.x - w / 2) + 1, Math.round(P.y + 5), Math.round((w - 2) * P.chg), 2, P.chg >= 1 ? '#ffd23f' : '#c8783a'); }
  for (const f of fx) {
    if (f.t === 'bit') px(ctx, Math.round(f.x), Math.round(f.y), 2, 2, f.col);
    else if (f.t === 'dust') px(ctx, Math.round(f.x), Math.round(f.y - (1 - f.life / f.max) * 6), 3, 3, 'rgba(160,145,125,0.6)');
    else if (f.t === 'boom') { const k = 1 - f.life / f.max, R = f.r || 48; ringPx(f.x, f.y - 4, R * k + 8, 'rgba(255,190,90,0.9)'); if (k < 0.5) { ctx.globalAlpha = 0.5 * (1 - k * 2); ell(ctx, Math.round(f.x), Math.round(f.y - 4), Math.round(R * 1.4 * k + 10) | 1, Math.round(R * 0.9 * k + 8) | 1, '#ffd27a'); ctx.globalAlpha = 1; } }
    else if (f.t === 'zap') { const mx = (f.x + f.x2) / 2 + (rand() - 0.5) * 14, my = (f.y + f.y2) / 2 + (rand() - 0.5) * 14; line(f.x, f.y, mx, my, '#9fd8ff', 2); line(mx, my, f.x2, f.y2, '#9fd8ff', 2); line(f.x, f.y, mx, my, '#ffffff', 1); }
    else if (f.t === 'beam') { const k = f.life / f.max; line(f.x, f.y, f.x2, f.y2, `rgba(255,246,160,${0.5 + 0.5 * k})`, 3); line(f.x, f.y, f.x2, f.y2, '#ffffff', 1); }
    else if (f.t === 'laser2') { const k = f.life / f.max; line(f.x1, f.y1, f.x2, f.y2, `rgba(255,120,90,${0.5 + 0.5 * k})`, 6); line(f.x1, f.y1, f.x2, f.y2, '#fff4e0', 2); }
    else if (f.t === 'laser') { const r = f.r; ctx.fillStyle = 'rgba(255,90,90,0.85)'; if (f.v) ctx.fillRect(Math.round(f.x) - 3, r.y0 * T, 6, r.h * T); else ctx.fillRect(r.x0 * T, Math.round(f.y) - 3, r.w * T, 6); }
  }
  ctx.restore();
  if (dark > 0) { // 전력 차단: 플레이어 둘레만 보인다
    const px0 = Math.round(P.x - cx), py0 = Math.round(P.y - 16 - cy), rr = 90, a = Math.min(0.9, dark * 2, 0.9);
    ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.ellipse(px0, py0, rr, rr * 0.8, 0, 0, Math.PI * 2, true); ctx.fill('evenodd'); }
  if (trans > 0) { ctx.fillStyle = `rgba(0,0,0,${1 - trans / 0.6})`; ctx.fillRect(0, 0, W, H); }
  drawHud(); drawTexts();
  vctx.drawImage(buf, 0, 0, view.width, view.height);
}
function drawPlayer() {
  if (P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0) return;
  const hs = SPR.hero[P.job], s = P.moving ? hs.walk[P.ph % 4] : hs.idle[P.ph % 2];
  const x = Math.round(P.x), y = Math.round(P.y);
  px(ctx, x - 13, y - 2, 26, 3, 'rgba(0,0,0,0.35)');
  // 무기는 조준 방향 쪽 몸 둘레에 붙고, 그 방향에 가장 가까운 방향별 그림을 쓴다. 위를 겨누면 몸 뒤에 그린다
  const wk = P.weapons[P.wi], c = pCenter(), m = aimPoint();
  let a = Math.atan2(m.y - c.y, m.x - c.x);
  if ((WEAP[wk].type === 'melee' || P.swingW) && P.swing > 0) { // 휘두르기: 무기마다 휘두르는 폭이 다르다(쇠봉은 짧게 찌른다)
    const k = 1 - P.swing / 0.16, side = Math.cos(P.swingA) >= 0 ? 1 : -1, s = Math.min(1.2, (P.swingW || WEAP[wk]).arc); a = P.swingA + side * (-s + 2 * s * k); }
  const pose = weaponPose(a), pv = weaponPivot(a), fr = SPR.wf[wk][pose.k];
  const drawW = () => drawSpr(fr, pose.flip ? pv.x - (40 - WC) : pv.x - WC, pv.y - WC, pose.flip, false);
  const behind = Math.sin(a) < -0.35;
  if (behind) drawW();
  drawSpr(s, x - 17, y - 39, P.face < 0, false);
  if (!behind) drawW();
}
function heart(x, y, full) { const c = full ? '#e04848' : '#3a2a2a';
  px(ctx, x, y + 1, 9, 4, '#120a0a'); px(ctx, x + 1, y, 3, 7, '#120a0a'); px(ctx, x + 5, y, 3, 7, '#120a0a'); px(ctx, x + 2, y + 6, 5, 2, '#120a0a');
  px(ctx, x + 1, y + 1, 3, 4, c); px(ctx, x + 5, y + 1, 3, 4, c); px(ctx, x + 2, y + 4, 5, 3, c); px(ctx, x + 4, y + 2, 1, 2, c); }
const SLOT = { skill: { x: W - 38, y: H - 40, r: 24 }, dash: { x: W - 38, y: H - 86, r: 14 } };
const txtCache = {};
function setTxt(id, v) { if (txtCache[id] === v) return; txtCache[id] = v; const el = document.getElementById(id); if (el) el.textContent = v; }
// 원형 쿨타임: k = 준비된 비율(0~1). 위에서 시작해 시계 방향으로 밝게 차오른다
function cdCircle(cx, cy, r, k, fill, dim) {
  const ready = k >= 1, ring = ready ? '#f0b429' : '#4a4234';
  for (let y = -r; y < r; y++) for (let x = -r; x < r; x++) {
    const dx = x + 0.5, dy = y + 0.5, d2 = dx * dx + dy * dy; if (d2 > r * r) continue;
    let col;
    if (d2 > (r - 2) * (r - 2)) col = d2 > (r - 1) * (r - 1) ? '#050505' : ring;
    else { let a = Math.atan2(dx, -dy) / (Math.PI * 2); if (a < 0) a += 1; col = a <= k ? fill : dim; }
    ctx.fillStyle = col; ctx.fillRect(cx + x, cy + y, 1, 1);
  }
}
function dashIcon(cx, cy, on) { const c = on ? '#e9f5d0' : '#6c7a62';
  for (const o of [-4, 2]) for (let i = 0; i < 4; i++) { px(ctx, cx + o + i, cy - 4 + i, 2, 1, c); px(ctx, cx + o + i, cy + 3 - i, 2, 1, c); } }
function skillIcon(cx, cy, on) { (SKILL_ICON[P.job] || SKILL_ICON.geo)(cx, cy, on ? 1 : 0.45); }
const SKILL_ICON = {
  geo: (cx, cy, a) => { ctx.globalAlpha = a; for (let i = 0; i < 5; i++) px(ctx, cx - 10, cy - 9 + i * 4, 20, 3, ['#a88a5e', '#6b4f36', '#94754e', '#5c4a3a', '#7a6447'][i]); px(ctx, cx - 3, cy - 2, 7, 4, '#e8dcc0'); ctx.globalAlpha = 1; },
  driver: (cx, cy, a) => { ctx.globalAlpha = a; px(ctx, cx - 9, cy - 6, 18, 12, '#1a1512'); px(ctx, cx - 8, cy - 5, 16, 10, '#2e4470'); px(ctx, cx - 2, cy - 8, 5, 8, '#f0d040'); px(ctx, cx - 3, cy - 1, 4, 3, '#f0d040'); px(ctx, cx, cy + 1, 3, 6, '#f0d040'); ctx.globalAlpha = 1; },
  eco: (cx, cy, a) => { ctx.globalAlpha = a; // 생태 피라미드, 맨 위(최종 소비자)만 금색
    for (const [i, w] of [[0, 6], [1, 12], [2, 18]]) { px(ctx, cx - w / 2 - 1, cy - 9 + i * 6, w + 2, 6, '#1a1512'); px(ctx, cx - w / 2, cy - 8 + i * 6, w, 4, i === 0 ? '#f0b429' : '#7ee07e'); }
    ctx.globalAlpha = 1; },
  chem: (cx, cy, a) => { ctx.globalAlpha = a; px(ctx, cx - 3, cy - 10, 6, 6, '#1a1512'); px(ctx, cx - 8, cy - 4, 16, 13, '#1a1512'); px(ctx, cx - 2, cy - 9, 4, 5, '#e6f6ff'); px(ctx, cx - 7, cy - 3, 14, 4, '#e8d040'); px(ctx, cx - 7, cy + 1, 14, 3, '#4fbf5a'); px(ctx, cx - 7, cy + 4, 14, 4, '#3f7fd0'); ctx.globalAlpha = 1; },
  weather: (cx, cy, a) => { ctx.globalAlpha = a; // 회오리: 위가 넓고 아래로 좁아지는 띠
    for (const [y, w, o] of [[-9, 18, 0], [-5, 14, 2], [-1, 10, 1], [3, 7, 3], [7, 4, 2]]) px(ctx, cx - w / 2 + o - 1, cy + y, w, 2, y % 2 ? '#dcefff' : '#9fc8ea');
    ctx.globalAlpha = 1; },
  medic: (cx, cy, a) => { ctx.globalAlpha = a; px(ctx, cx - 4, cy - 10, 8, 20, '#1a1512'); px(ctx, cx - 10, cy - 4, 20, 8, '#1a1512'); px(ctx, cx - 3, cy - 9, 6, 18, '#f3f3f3'); px(ctx, cx - 9, cy - 3, 18, 6, '#f3f3f3'); px(ctx, cx - 2, cy - 8, 4, 16, '#d9483b'); px(ctx, cx - 8, cy - 2, 16, 4, '#d9483b'); ctx.globalAlpha = 1; },
};
const BARS = [
  { v: 'hp', m: 'maxHp', col: '#d9483b', hi: '#f27a6a', bg: '#3a1515', icon: (x, y) => heart(x - 1, y + 1, true) },
  { v: 'sh', m: 'maxSh', col: '#8a97a6', hi: '#c3cdd8', bg: '#1d2228', icon: (x, y) => { px(ctx, x, y, 9, 10, '#0c1218'); px(ctx, x + 1, y + 1, 7, 6, '#9fb0c2'); px(ctx, x + 2, y + 7, 5, 1, '#9fb0c2'); px(ctx, x + 3, y + 8, 3, 1, '#9fb0c2'); } },
  { v: 'en', m: 'maxEn', col: '#3f8fe0', hi: '#7fc0ff', bg: '#10203a', icon: (x, y) => { px(ctx, x + 3, y, 3, 10, '#0b2340'); px(ctx, x + 1, y + 2, 7, 6, '#0b2340'); px(ctx, x + 4, y + 1, 1, 8, '#5fb8ff'); px(ctx, x + 2, y + 3, 5, 4, '#5fb8ff'); } },
];
function drawHud() {
  // 체력·방어막·에너지 막대 (숫자는 화면 위 글자로 겹쳐 띄운다)
  px(ctx, 6, 6, 150, 46, 'rgba(10,8,6,0.72)');
  BARS.forEach((b, i) => {
    const y = 10 + i * 13, v = P[b.v], m = P[b.m];
    b.icon(20 - 6, y);
    px(ctx, 25, y, 127, 10, '#050505'); px(ctx, 26, y + 1, 125, 8, b.bg);
    const fw = Math.round(125 * Math.max(0, Math.min(1, v / m)));
    px(ctx, 26, y + 1, fw, 8, v > m ? '#9fd8ff' : b.col); px(ctx, 26, y + 1, fw, 2, b.hi);
    const el = document.getElementById('bar' + i); if (el) el.textContent = `${Math.floor(v)} / ${m}`;
  });
  // 오른쪽 아래: 스킬 칸(큰 원)과 그 위 구르기(작은 원). 쿨타임 동안 시계 방향으로 차오른다
  const dk = Math.max(0, Math.min(1, 1 - P.dashCd / dashCdMax())), sk = Math.max(0, Math.min(1, 1 - P.skillCd / P.skillMax));
  cdCircle(SLOT.skill.x, SLOT.skill.y, SLOT.skill.r, sk, '#3a3226', '#16130f');
  skillIcon(SLOT.skill.x, SLOT.skill.y, sk >= 1);
  cdCircle(SLOT.dash.x, SLOT.dash.y, SLOT.dash.r, dk, '#2c3a2a', '#121612');
  dashIcon(SLOT.dash.x, SLOT.dash.y, dk >= 1);
  setTxt('skillCd', sk < 1 ? Math.ceil(P.skillCd) : ''); setTxt('dashCd', '');
  // 미니맵
  const mx = W - 10 - GW * 18, my = 10;
  for (const [a, b] of links) { const A = rooms.find(r => r.id === a), B = rooms.find(r => r.id === b); if (!A.seen && !B.seen) continue;
    line(mx + A.gx * 18 + 6, my + A.gy * 14 + 4, mx + B.gx * 18 + 6, my + B.gy * 14 + 4, '#6b6458', 1); }
  const cur = roomAt(P.x, P.y - 3, 0);
  for (const r of rooms) { if (!r.seen) continue; const x = mx + r.gx * 18, y = my + r.gy * 14;
    px(ctx, x, y, 13, 9, '#0d0d0d'); px(ctx, x + 1, y + 1, 11, 7, r === cur ? '#f0b429' : r.type === 'boss' ? '#7a2e2e' : r.type === 'exit' ? '#3f7fb8' : r.type === 'supply' ? '#4f8f4a' : r.state === 'clear' || r.type === 'start' ? '#6b6458' : '#4a443c'); }
  // 보스 체력
  const bn = document.getElementById('bossname');
  if (bossRef && !bossRef.dead) { const bw = 300, x = (W - bw) / 2, y = H - 18;
    px(ctx, x - 1, y - 1, bw + 2, 8, '#000'); px(ctx, x, y, bw, 6, '#3a1d1d'); px(ctx, x, y, Math.round(bw * bossRef.hp / bossRef.maxHp), 6, '#d9483b'); bn.textContent = EDEF[bossRef.kind].name; }
  else bn.textContent = '';
  document.getElementById('timer').textContent = fmt(time);
  { const k = P.weapons[P.wi], W0 = WEAP[k], s = P.stars[k] || 1, el = document.getElementById('weapon');
    setTxt('weapon', W0.name + (s > 1 ? ' ' + '★'.repeat(s) : '') + (k === 'pack' ? (P.packMode === 'cold' ? ' · 흡열(F)' : ' · 발열(F)') : '') + (W0.en ? ' · 에너지 ' + W0.en : '') + (P.weapons.length > 1 ? '  (Q 바꾸기)' : ''));
    el.style.color = RARITY[W0.r]; }
  const near = nearWeapon(), owned = near && P.weapons.includes(near.kind);
  setTxt('prompt', nearExit() ? 'E 다음 역으로' : nearBench() ? 'E 조합대' : near ? 'E ' + WEAP[near.kind].name + (owned ? ' 강화 ★' : P.weapons.length >= MAX_WEAPONS ? ' 바꾸기' : ' 줍기') : '');
  // 재료·상태 이상·장비 줄
  setTxt('mat', `가죽 ${P.mat.cloth} · 부품 ${P.mat.part}`);
  const sts = Object.keys(P.st).map(k => k === 'infect' ? `<span style="color:${STATUS.infect.col}">감염${P.st.infect.known ? '(' + P.st.infect.type + ')' : ''}</span>` : `<span style="color:${STATUS[k].col}">${STATUS[k].name} ${Math.ceil(P.st[k])}</span>`).join(' ');
  if (txtCache.st !== sts) { txtCache.st = sts; document.getElementById('status').innerHTML = sts; }
  setTxt('bag', (P.gear ? 'G 장비 · ' + GEAR[P.gear].name : '') + (P.solarT > 0 ? '   태양광 충전 ' + Math.ceil(P.solarT) + '초' : '') + Object.keys(P.guard).filter(g => P.guard[g] > 0).map(g => '   ' + STATUS[g].name + ' 막음 ' + Math.ceil(P.guard[g]) + '초').join(''));
  document.getElementById('prompt').style.color = near ? RARITY[WEAP[near.kind].r] : '#ffe08a';
}
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0'); };

// ---------- 화면 전환 ----------
function start() { reset(); applyLoadout(); running = true; setTxt('skillLab', JOBS[P.job].skill + ' · 우클릭'); document.getElementById('title').classList.add('hide'); document.getElementById('result').classList.add('hide'); }
function showResult() {
  if (!running) return; running = false;
  // 판에서 모은 가죽·부품은 이기든 지든 창고에 남는다(2026-10-27 교사 결정). 들고 간 장비와 판에서 주운 유물은 사라진다
  save.mat.cloth += P.mat.cloth; save.mat.part += P.mat.part; writeSave();
  document.getElementById('resTitle').textContent = ended === 'win' ? '막차에 탔다' : '쓰러졌다';
  document.getElementById('resText').textContent = (ended === 'win' ? `걸린 시간 ${fmt(time)}` : `${stationName()} · 버틴 시간 ${fmt(time)}`) + ` · 창고에 가죽 +${P.mat.cloth} · 부품 +${P.mat.part}`;
  document.getElementById('result').classList.remove('hide');
}
function toLobby() { running = false; document.getElementById('result').classList.add('hide'); renderLobby(); document.getElementById('title').classList.remove('hide'); }
document.getElementById('startBtn').onclick = start;
document.getElementById('againBtn').onclick = toLobby;
document.getElementById('jobBtn').onclick = toLobby;

// ---------- 대기실: 직업, 들고 갈 유물(3개까지), 미리 만들 장비(1개) ----------
let loadout = { relics: [], gear: null };
function applyLoadout() {
  for (const k of loadout.relics) if (save.relics.includes(k)) { P.relics.push(k); const R = RELIC[k];
    if (R.stat === 'shield') { P.maxSh += R.v; P.sh += R.v; } if (R.stat === 'hp') { P.maxHp += R.v; P.hp += R.v; } if (R.stat === 'skillcd') P.skillMax = Math.round(P.skillMax * (1 + R.v) * 10) / 10; }
  if (loadout.gear) { P.gear = loadout.gear; loadout.gear = null; } // 장비는 그 판에서만
}
function renderLobby() {
  const rb = document.getElementById('lobbyRelics'); rb.innerHTML = '';
  if (!save.relics.length) rb.innerHTML = '<i>아직 없다 · 연구소 재화로 얻는다(연결 예정)</i>';
  for (const k of save.relics) { const b = document.createElement('button'); b.className = 'lob' + (loadout.relics.includes(k) ? ' on' : ''); b.textContent = RELIC[k].name;
    b.onclick = () => { const i = loadout.relics.indexOf(k); if (i >= 0) loadout.relics.splice(i, 1); else if (loadout.relics.length < 3) loadout.relics.push(k); renderLobby(); }; rb.appendChild(b); }
  document.getElementById('lobbyRelicN').textContent = `${loadout.relics.length} / 3`;
  document.getElementById('lobbyMat').textContent = `창고 가죽 ${save.mat.cloth} · 부품 ${save.mat.part}`;
  const gb = document.getElementById('lobbyGear'); gb.innerHTML = '';
  const back = loadout.gear ? GEAR[loadout.gear] : { cloth: 0, part: 0 }; // 바꿔 고르면 앞의 장비 재료를 되돌려 받는다
  for (const k in GEAR) { const G = GEAR[k], on = loadout.gear === k, ok = on || (save.mat.cloth + back.cloth >= G.cloth && save.mat.part + back.part >= G.part);
    const b = document.createElement('button'); b.className = 'lob' + (on ? ' on' : '') + (ok ? '' : ' off');
    b.innerHTML = `${G.name}<small>${gearCost(G)}</small>`;
    b.onmouseenter = () => { document.getElementById('lobbyGearDesc').textContent = G.name + ' · ' + G.desc; };
    b.onclick = () => { // 하나만 만들어 들고 간다. 다른 것을 고르면 앞의 것을 되돌린다
      if (on) { save.mat.cloth += G.cloth; save.mat.part += G.part; loadout.gear = null; }
      else if (ok) { if (loadout.gear) { const O = GEAR[loadout.gear]; save.mat.cloth += O.cloth; save.mat.part += O.part; } save.mat.cloth -= G.cloth; save.mat.part -= G.part; loadout.gear = k; }
      writeSave(); renderLobby(); };
    gb.appendChild(b); }
  document.getElementById('lobbyGearDesc').textContent = loadout.gear ? GEAR[loadout.gear].name + ' · ' + GEAR[loadout.gear].desc : '장비에 마우스를 올리면 설명이 나온다 · 한 판에 한 번 쓰면 사라진다';
}
// 직업 고르기: 카드에는 이름만 적는다
function jobPicker() {
  const box = document.getElementById('jobs');
  for (const k in JOBS) {
    const b = document.createElement('button'); b.className = 'job'; b.dataset.k = k;
    const cv = document.createElement('canvas'); cv.width = 34; cv.height = 40; cv.getContext('2d').drawImage(SPR.hero[k].idle[0].c, 0, 0);
    const nm = document.createElement('span'); nm.textContent = JOBS[k].name;
    b.append(cv, nm); b.onclick = () => { jobKey = k; mark(); }; box.appendChild(b);
  }
  const mark = () => box.querySelectorAll('.job').forEach(b => b.classList.toggle('on', b.dataset.k === jobKey));
  mark();
}

let acc = 0, last = performance.now();
function loop(now) { acc += Math.min(0.25, (now - last) / 1000); last = now;
  while (acc >= DT) { step(); acc -= DT; }
  render(); requestAnimationFrame(loop); }
buildSprites(); jobPicker(); renderLobby(); reset(); fit(); requestAnimationFrame(loop);
