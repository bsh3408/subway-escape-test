// 한 판: 은신처 역에서 출발해 호선 5개를 지나 지상 출구로. 환승역마다 열린 호선 중 3개를 보여 주고 하나를 고른다
// 난이도는 호선 번호가 아니라 몇 번째로 들어갔는지로 정한다. 걸린 시간(틱)을 모두 더해 기록한다
// 환승역에서는 특수능력 1개 고르기, 무기 강화(부품), 장비 만들기(재료)를 한다
import { createRng } from './rng.js';
import { createWorld } from './world.js';
import { JOBS } from './data.js';

export const RUN_LINES = 5, OFFER = 3;

export function createRun({ seed, job }) {
  const J = JOBS[job];
  return { seed: seed >>> 0, job, visited: [], ticks: 0, escaped: false, dead: false,
    hp: J.hp, maxHp: J.hp, shield: J.shield, maxShield: J.shield, energy: J.energy, maxEnergy: J.energy,
    weapons: [{ id: J.weapon, lv: 0 }], cur: 0, skillLv: 1, parts: 0, mats: {}, gear: { head: null, body: null, feet: null }, abilities: [] };
}

export function difficulty(order) { return { hpMul: 1 + 0.25 * order, extra: Math.floor(order / 2) }; }

// 열린 호선 중 아직 안 간 호선에서 3개. 모자라면 이미 간 호선도 다시 섞는다(교사가 호선을 적게 열었을 때)
export function offerLines(run, open) {
  const rng = createRng(run.seed).fork('offer' + run.visited.length), pick = arr => arr.splice(rng.int(arr.length), 1)[0];
  const fresh = open.filter(n => !run.visited.includes(n)), again = open.filter(n => run.visited.includes(n)), out = [];
  while (out.length < OFFER && fresh.length) out.push(pick(fresh));
  while (out.length < OFFER && again.length) out.push(pick(again));
  return out.sort((a, b) => a - b);
}

export function enterLine(run, line) {
  return createWorld({ seed: (run.seed + run.visited.length * 7919 + line * 104729) >>> 0, job: run.job, line, order: run.visited.length,
    loadout: { weapons: run.weapons, cur: run.cur, gear: run.gear, abilities: run.abilities, skillLv: run.skillLv,
      stats: { hp: run.hp, maxHp: run.maxHp, shield: run.shield, maxShield: run.maxShield, energy: run.energy, maxEnergy: run.maxEnergy } } });
}

export function finishLine(run, w) {
  run.ticks += w.tick;
  run.parts += w.loot.parts; for (const [k, v] of Object.entries(w.loot.mats)) run.mats[k] = (run.mats[k] || 0) + v;
  if (w.done === 'dead') { run.dead = true; return run; }
  const p = w.player;
  Object.assign(run, { hp: p.hp, shield: Math.min(p.shield, run.maxShield), energy: p.energy, weapons: p.weapons.map(x => ({ ...x })), cur: p.cur });
  run.visited.push(w.line);
  if (run.visited.length >= RUN_LINES) run.escaped = true;
  return run;
}

// ---------- 무기 강화: 부품으로 단계를 올린다(최대 3단계). 단계마다 피해 +30%, 연사 +8% ----------
export const MAX_LV = 3, ENHANCE_COST = lv => 6 + 6 * lv;
export function enhanceWeapon(run, slot) {
  const wpn = run.weapons[slot]; if (!wpn || wpn.lv >= MAX_LV) return false;
  const c = ENHANCE_COST(wpn.lv); if (run.parts < c) return false;
  run.parts -= c; wpn.lv++; return true;
}

// ---------- 스킬 레벨업: 부품으로 2·3레벨. 레벨마다 효과 +30%, 대기 시간 −15% ----------
export const SKILL_MAX = 3, SKILL_COST = lv => 8 * lv;
export function upgradeSkill(run) {
  if (run.skillLv >= SKILL_MAX || run.parts < SKILL_COST(run.skillLv)) return false;
  run.parts -= SKILL_COST(run.skillLv); run.skillLv++; return true;
}

// ---------- 장비 만들기: 재료로 머리·몸·발 장비를 만든다. 재난 막기는 호선 재난을 넣을 때 연결한다 ----------
export const GEAR = {
  dustMask:    { name: '방진 마스크', slot: 'head', recipe: { cloth: 2 }, text: '낙석·먼지를 막는다', hazard: 'dust' },
  gasMask:     { name: '방독면', slot: 'head', recipe: { filter: 1, rubber: 1 }, text: '감염 구름·매연을 막는다', hazard: 'gas' },
  goggles:     { name: '고글', slot: 'head', recipe: { glass: 1, rubber: 1 }, text: '모래 폭풍 속에서도 잘 보인다', hazard: 'sand' },
  armorVest:   { name: '방호 조끼', slot: 'body', recipe: { scrap: 2, leather: 1 }, text: '최대 방어막 +1', shield: 1 },
  coolVest:    { name: '냉각 조끼', slot: 'body', recipe: { cloth: 1, glass: 1 }, text: '폭염을 막는다', hazard: 'heat' },
  winterCoat:  { name: '방한복', slot: 'body', recipe: { cloth: 2, leather: 1 }, text: '한파를 막는다', hazard: 'cold' },
  raincoat:    { name: '우비', slot: 'body', recipe: { cloth: 1, rubber: 1 }, text: '산성비를 막는다', hazard: 'acidRain' },
  rubberBoots: { name: '고무장화', slot: 'feet', recipe: { rubber: 2 }, text: '침수·감전을 막는다', hazard: 'flood' },
  gripShoes:   { name: '미끄럼 방지 신발', slot: 'feet', recipe: { rubber: 1, leather: 1 }, text: '얼음 바닥에서 미끄러지지 않는다', hazard: 'ice' },
};
export function canCraft(run, id) { return Object.entries(GEAR[id].recipe).every(([k, v]) => (run.mats[k] || 0) >= v); }
export function craftGear(run, id) {
  if (!canCraft(run, id)) return false;
  for (const [k, v] of Object.entries(GEAR[id].recipe)) run.mats[k] -= v;
  run.gear[GEAR[id].slot] = id; return true;
}

// ---------- 특수능력: 환승역마다 3개 중 1개. 총을 바꾸는 것, 캐릭터 강화, 스킬 강화 ----------
export const ABILITIES = {
  extraShot:  { kind: 'gun', name: '갈래탄', text: '한 번에 탄이 1발 더 나간다' },
  pierceUp:   { kind: 'gun', name: '관통탄', text: '탄이 적을 하나 더 뚫는다' },
  bounce:     { kind: 'gun', name: '튕김탄', text: '탄이 벽에 맞으면 한 번 튕긴다' },
  homing:     { kind: 'gun', name: '유도탄', text: '탄이 가까운 적 쪽으로 휜다' },
  boom:       { kind: 'gun', name: '폭발탄', text: '맞은 자리에서 작은 폭발이 일어난다' },
  focus:      { kind: 'gun', name: '집탄', text: '탄이 덜 퍼지고 한곳으로 모인다' },
  rapid:      { kind: 'gun', name: '속사', text: '연사 속도 +25%' },
  bigShot:    { kind: 'gun', name: '강한 탄', text: '모든 무기 피해 +30%' },
  maxHp:      { kind: 'body', name: '튼튼한 몸', text: '최대 체력 +2' },
  shieldUp:   { kind: 'body', name: '두꺼운 방어막', text: '최대 방어막 +1' },
  energyUp:   { kind: 'body', name: '큰 배터리', text: '최대 에너지 +60' },
  swift:      { kind: 'body', name: '날렵한 발', text: '이동 속도 +12%' },
  rollMaster: { kind: 'body', name: '구르기 달인', text: '구르기 대기 시간 절반' },
  scavenger:  { kind: 'body', name: '전리품 사냥꾼', text: '적을 쓰러뜨리면 에너지 +6, 부품이 더 잘 나온다' },
  skillCd:    { kind: 'skill', name: '스킬 숙련', text: '스킬 대기 시간 −30%' },
  skillPower: { kind: 'skill', name: '스킬 강화', text: '스킬 효과 1.5배(피해·회복·시간·마릿수)' },
  skillCharge:{ kind: 'skill', name: '스킬 충전기', text: '스킬을 쓰면 에너지 +40, 방어막 +1' },
};
export function offerAbilities(run) {
  const rng = createRng(run.seed).fork('ability' + run.visited.length);
  const left = Object.keys(ABILITIES).filter(id => !run.abilities.includes(id)), out = [];
  while (out.length < 3 && left.length) out.push(left.splice(rng.int(left.length), 1)[0]);
  return out;
}
export function applyAbility(run, id) {
  run.abilities.push(id);
  if (id === 'maxHp') { run.maxHp += 2; run.hp += 2; }
  if (id === 'shieldUp') { run.maxShield += 1; run.shield += 1; }
  if (id === 'energyUp') { run.maxEnergy += 60; run.energy += 60; }
}
