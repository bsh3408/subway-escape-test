// 한 판: 은신처 역에서 출발해 호선 5개를 지나 지상 출구로. 환승역마다 열린 호선 중 3개를 보여 주고 하나를 고른다
// 난이도는 호선 번호가 아니라 몇 번째로 들어갔는지로 정한다. 걸린 시간(틱)을 모두 더해 기록한다
// 환승역에서는 특수능력 1개 고르기, 무기 강화(부품), 장비 만들기(재료)를 한다
import { createRng } from './rng.js';
import { createWorld } from './world.js';
import { JOBS, RELICS, GRADES } from './data.js';

export const RUN_LINES = 5, OFFER = 3;

// 유물 효과를 하나로 모은다: …Mul은 곱하고, immune는 모으고, statusMul은 상태마다 곱하고, 켜기(true)는 켜고, 나머지 수는 더한다
export function relicFx(ids = []) {
  const o = { immune: [], statusMul: {} };
  for (const id of ids) for (const [k, v] of Object.entries(RELICS[id]?.fx || {})) {
    if (k === 'immune') o.immune.push(...v);
    else if (k === 'statusMul') for (const [st, m] of Object.entries(v)) o.statusMul[st] = (o.statusMul[st] ?? 1) * m;
    else if (k.endsWith('Mul')) o[k] = (o[k] ?? 1) * v;
    else if (v === true) o[k] = true;
    else o[k] = (o[k] || 0) + v;
  }
  return o;
}

export function createRun({ seed, job, relics = [] }) {
  const J = JOBS[job], rl = relics.filter(id => RELICS[id]).slice(0, RELIC_SLOTS), fx = relicFx(rl);
  const hp = J.hp + (fx.maxHp || 0), sh = J.shield + (fx.maxShield || 0), en = J.energy + (fx.maxEnergy || 0);
  return { seed: seed >>> 0, job, visited: [], ticks: 0, escaped: false, dead: false,
    hp, maxHp: hp, shield: sh, maxShield: sh, energy: en, maxEnergy: en,
    weapons: [{ id: J.weapon, lv: 0 }], cur: 0, skillLv: 1, parts: fx.parts || 0, mats: {}, gear: { head: null, body: null, feet: null }, abilities: [],
    relics: rl, revive: fx.revive || 0, coins: 0, lastCoins: 0, splits: [], picks: 0 };
}
const fxOf = run => relicFx(run.relics);

export function difficulty(order) { return { hpMul: 1.2 + 0.3 * order, extra: Math.floor(order / 2) }; }   // 난이도 높게: 첫 호선부터 적 체력 1.2배, 순서마다 +30%

// 열린 호선 중 아직 안 간 호선에서 3개. 모자라면 이미 간 호선도 다시 섞는다(교사가 호선을 적게 열었을 때)
export function offerLines(run, open) {
  const rng = createRng(run.seed).fork('offer' + run.visited.length), pick = arr => arr.splice(rng.int(arr.length), 1)[0];
  const fresh = open.filter(n => !run.visited.includes(n)), again = open.filter(n => run.visited.includes(n)), out = [], n = OFFER + (fxOf(run).lineOffer || 0);
  while (out.length < n && fresh.length) out.push(pick(fresh));
  while (out.length < n && again.length) out.push(pick(again));
  return out.sort((a, b) => a - b);
}

export function enterLine(run, line) {
  return createWorld({ seed: (run.seed + run.visited.length * 7919 + line * 104729) >>> 0, job: run.job, line, order: run.visited.length,
    loadout: { weapons: run.weapons, cur: run.cur, gear: run.gear, abilities: run.abilities, skillLv: run.skillLv, relics: run.relics || [], revive: run.revive || 0,
      stats: { hp: run.hp, maxHp: run.maxHp, shield: run.shield, maxShield: run.maxShield, energy: run.energy, maxEnergy: run.maxEnergy } } });
}

// 토큰: 호선 안에서 모은 것(적 1, 보스 15)에 호선을 지나면 10을 더한다. 유물 뽑기에 쓴다
export const LINE_COINS = 10;
export function finishLine(run, w) {
  const t = w.clearTick ?? w.tick;   // 보스를 잡은 순간 시계가 멈춘다
  run.ticks = Math.max(0, run.ticks + t - (w.bonusTicks || 0)); (run.splits ||= []).push({ line: w.line, ticks: t });
  run.picks = 1 + (w.loot.picks || 0);   // 환승역에서 고를 특수능력 수: 기본 1 + 정예 방을 정리한 수
  run.lastCoins = Math.floor(((w.loot.coins || 0) + (w.done === 'dead' ? 0 : LINE_COINS)) * (fxOf(run).coinMul || 1)); run.coins = (run.coins || 0) + run.lastCoins;
  run.revive = w.player.revive || 0;
  run.maxShield += w.puzzleBonus || 0;   // 보스방 퍼즐을 맞히면 최대 방어막이 판 끝까지 늘어난다
  run.parts += w.loot.parts; for (const [k, v] of Object.entries(w.loot.mats)) run.mats[k] = (run.mats[k] || 0) + v;
  if (w.done === 'dead') { run.dead = true; return run; }
  const p = w.player;
  Object.assign(run, { hp: p.hp, shield: Math.min(p.shield, run.maxShield), energy: p.energy, weapons: p.weapons.map(x => ({ ...x })), cur: p.cur });
  run.visited.push(w.line);
  if (run.visited.length >= RUN_LINES) run.escaped = true;
  return run;
}

// ---------- 무기 강화: 부품으로 단계를 올린다(최대 3단계). 단계마다 피해 +30%, 연사 +8% ----------
export const MAX_LV = 3, ENHANCE_COST = lv => 4 + 3 * lv;
export const enhanceCost = (run, lv) => Math.ceil(ENHANCE_COST(lv) * (fxOf(run).costMul || 1));   // 공구 벨트면 싸진다
export function enhanceWeapon(run, slot) {
  const wpn = run.weapons[slot]; if (!wpn || wpn.lv >= MAX_LV) return false;
  const c = enhanceCost(run, wpn.lv); if (run.parts < c) return false;
  run.parts -= c; wpn.lv++; return true;
}

// ---------- 스킬 레벨업: 부품으로 2·3레벨. 레벨마다 효과 +30%, 대기 시간 −15% ----------
export const SKILL_MAX = 3, SKILL_COST = lv => 6 * lv;
export const skillCost = run => Math.ceil(SKILL_COST(run.skillLv) * (fxOf(run).costMul || 1));
export function upgradeSkill(run) {
  if (run.skillLv >= SKILL_MAX || run.parts < skillCost(run)) return false;
  run.parts -= skillCost(run); run.skillLv++; return true;
}

// ---------- 장비 만들기: 재료로 머리·몸·발 장비를 만든다. 재난 막기는 호선 재난을 넣을 때 연결한다 ----------
export const GEAR = {
  // 재료는 헝겊과 부품 두 가지: 천 장비는 헝겊 위주, 단단한 장비는 부품 위주, 둘을 섞으면 막는 것이 많아진다
  dustMask:    { name: '방진 마스크', slot: 'head', recipe: { cloth: 2 }, text: '중독을 막는다', block: ['poison'] },
  gasMask:     { name: '방독면', slot: 'head', recipe: { cloth: 1, parts: 3 }, text: '감염·중독을 막는다', block: ['infect', 'poison'] },
  goggles:     { name: '고글', slot: 'head', recipe: { parts: 3 }, text: '부식을 막는다', block: ['corrode'] },
  armorVest:   { name: '방호 조끼', slot: 'body', recipe: { cloth: 1, parts: 5 }, text: '최대 방어막 +1', shield: 1 },
  coolVest:    { name: '냉각 조끼', slot: 'body', recipe: { cloth: 2, parts: 1 }, text: '화상을 막는다', block: ['burn'] },
  winterCoat:  { name: '방한복', slot: 'body', recipe: { cloth: 3 }, text: '동상을 막는다', block: ['frost'] },
  raincoat:    { name: '우비', slot: 'body', recipe: { cloth: 2, parts: 2 }, text: '젖음·부식을 막는다', block: ['wet', 'corrode'] },
  rubberBoots: { name: '고무장화', slot: 'feet', recipe: { cloth: 1, parts: 2 }, text: '젖음·감전을 막는다', block: ['wet', 'shock'] },
  gripShoes:   { name: '미끄럼 방지 신발', slot: 'feet', recipe: { cloth: 1, parts: 3 }, text: '묶임·동상을 막는다', block: ['root', 'frost'] },
};
const have = (run, k) => k === 'parts' ? run.parts : (run.mats[k] || 0);   // 부품은 run.parts, 헝겊은 run.mats
export function canCraft(run, id) { return Object.entries(GEAR[id].recipe).every(([k, v]) => have(run, k) >= v); }
export function craftGear(run, id) {
  if (!canCraft(run, id)) return false;
  for (const [k, v] of Object.entries(GEAR[id].recipe)) if (k === 'parts') run.parts -= v; else run.mats[k] -= v;
  run.gear[GEAR[id].slot] = id; return true;
}

// ---------- 특수능력: 환승역마다 고른다. req가 있으면 그 능력을 먼저 가져야 나온다(능력 트리) ----------
export const ABILITIES = {
  // 총: 사거리 → 튕김 → 연쇄 튕김 / 관통 → 드릴 관통
  longShot:   { kind: 'gun', name: '장거리탄', text: '탄이 최대 사거리까지 날아간다(사거리 2배, 탄속 +20%)' },
  bounce:     { kind: 'gun', name: '튕김탄', req: 'longShot', text: '탄이 벽에 맞으면 한 번 튕긴다' },
  ricochet:   { kind: 'gun', name: '연쇄 튕김', req: 'bounce', text: '두 번 더 튕기고, 튕길 때마다 피해 +20%' },
  pierceUp:   { kind: 'gun', name: '관통탄', req: 'longShot', text: '탄이 적을 하나 더 뚫는다' },
  drillShot:  { kind: 'gun', name: '드릴 관통', req: 'pierceUp', text: '탄이 적을 둘 더 뚫는다' },
  // 총: 갈래 → 부채 / 집탄
  extraShot:  { kind: 'gun', name: '갈래탄', text: '한 번에 탄이 1발 더 나간다' },
  fan:        { kind: 'gun', name: '부채탄', req: 'extraShot', text: '탄이 2발 더 나가고 넓게 퍼진다' },
  focus:      { kind: 'gun', name: '집탄', text: '탄이 덜 퍼지고 한곳으로 모인다' },
  // 총: 유도 → 추적 강화, 폭발 → 집속, 속사 → 과열, 강한 탄 → 약점 사격
  homing:     { kind: 'gun', name: '유도탄', text: '탄이 가까운 적 쪽으로 휜다' },
  homingPlus: { kind: 'gun', name: '추적 강화', req: 'homing', text: '더 세게 휘고 사거리 +30%' },
  boom:       { kind: 'gun', name: '폭발탄', text: '맞은 자리에서 작은 폭발이 일어난다' },
  cluster:    { kind: 'gun', name: '집속탄', req: 'boom', text: '폭발 범위 2배, 폭발 피해 +50%' },
  rapid:      { kind: 'gun', name: '속사', text: '연사 속도 +20%' },
  overclock:  { kind: 'gun', name: '과열 사격', req: 'rapid', text: '연사 속도 +20% 더' },
  bigShot:    { kind: 'gun', name: '강한 탄', text: '모든 무기 피해 +30%' },
  critShot:   { kind: 'gun', name: '약점 사격', req: 'bigShot', text: '15% 확률로 치명타(피해 2배)' },
  // 몸
  maxHp:      { kind: 'body', name: '튼튼한 몸', text: '최대 체력 +1' },
  regen:      { kind: 'body', name: '회복력', req: 'maxHp', text: '방을 정리할 때마다 체력 +1' },
  shieldUp:   { kind: 'body', name: '두꺼운 방어막', text: '최대 방어막 +1' },
  shieldBurst:{ kind: 'body', name: '방어막 폭발', req: 'shieldUp', text: '방어막이 깨지면 둘레 적을 밀치고 다치게 한다' },
  swift:      { kind: 'body', name: '날렵한 발', text: '이동 속도 +12%' },
  rollMaster: { kind: 'body', name: '구르기 달인', req: 'swift', text: '구르기 대기 시간 절반' },
  rollShot:   { kind: 'body', name: '구르며 쏘기', req: 'rollMaster', text: '구르기가 끝나면 사방으로 탄 8발' },
  energyUp:   { kind: 'body', name: '큰 배터리', text: '최대 에너지 +60' },
  scavenger:  { kind: 'body', name: '전리품 사냥꾼', req: 'energyUp', text: '적을 쓰러뜨리면 에너지 +6, 부품이 더 잘 나온다' },
  // 스킬
  skillCd:    { kind: 'skill', name: '스킬 숙련', text: '스킬 대기 시간 −30%' },
  skillCharge:{ kind: 'skill', name: '스킬 충전기', req: 'skillCd', text: '스킬을 쓰면 에너지 +40, 방어막 +1' },
  skillPower: { kind: 'skill', name: '스킬 강화', text: '스킬 효과 1.5배(피해·회복·시간·마릿수)' },
  skillGuard: { kind: 'skill', name: '스킬 보호막', req: 'skillPower', text: '스킬을 쓰면 1.5초 동안 다치지 않는다' },
};
export function offerAbilities(run) {
  const rng = createRng(run.seed).fork('ability' + run.visited.length + ':' + run.abilities.length);
  const left = Object.keys(ABILITIES).filter(id => !run.abilities.includes(id) && (!ABILITIES[id].req || run.abilities.includes(ABILITIES[id].req))), out = [], n = 3 + (fxOf(run).abilityOffer || 0);
  while (out.length < n && left.length) out.push(left.splice(rng.int(left.length), 1)[0]);
  return out;
}
export function applyAbility(run, id) {
  run.abilities.push(id);
  if (id === 'maxHp') { run.maxHp += 1; run.hp += 1; }
  if (id === 'shieldUp') { run.maxShield += 1; run.shield += 1; }
  if (id === 'energyUp') { run.maxEnergy += 60; run.energy += 60; }
}

// ---------- 유물 뽑기(역무실): 토큰으로 뽑고 판마다 2개까지 끼운다. 기기에 저장하는 평범한 데이터(meta) ----------
export const GACHA_COST = 30, RELIC_SLOTS = 2, START_COINS = 60;
export function newMeta() { return { coins: START_COINS, relics: {}, equip: [] }; }
// r1로 등급, r2로 그 등급 안의 유물을 고른다(0 이상 1 미만). 이미 있으면 등급만큼 토큰을 돌려준다
export function pullRelic(meta, r1, r2) {
  if (meta.coins < GACHA_COST) return null;
  meta.coins -= GACHA_COST;
  const order = ['S', 'A', 'B', 'C']; let acc = 0, grade = 'C';   // 1에 가까운 쪽을 드문 등급으로
  for (const g of order) { acc += GRADES[g].p; if (r1 >= 1 - acc) { grade = g; break; } }
  const pool = Object.keys(RELICS).filter(id => RELICS[id].grade === grade), id = pool[Math.min(pool.length - 1, Math.floor(r2 * pool.length))];
  const dup = !!meta.relics[id];
  if (dup) meta.coins += GRADES[grade].refund; else { meta.relics[id] = 1; if (meta.equip.length < RELIC_SLOTS) meta.equip.push(id); }
  return { id, grade, dup };
}
export function toggleEquip(meta, id) {
  if (meta.equip.includes(id)) meta.equip = meta.equip.filter(x => x !== id);
  else if (meta.relics[id] && meta.equip.length < RELIC_SLOTS) meta.equip.push(id);
  return meta;
}
