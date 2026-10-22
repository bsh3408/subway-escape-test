// 직업 6명, 스킬(마우스 오른쪽, cd는 대기 시간 초), 시작 무기, 구역 1(지층 터널) 몬스터. 수치는 첫 판 기준
export const JOBS = {
  driver:    { name: '지하철 기관사', hp: 7, shield: 5, energy: 160, weapon: 'flare', sprite: 0, skill: { id: 'regen', name: '회생 제동', cd: 8 } },
  geologist: { name: '지질학자', hp: 6, shield: 4, energy: 180, weapon: 'drill', sprite: 1, skill: { id: 'strata', name: '지층 판독', cd: 14 } },
  ecologist: { name: '생태학자', hp: 6, shield: 4, energy: 180, weapon: 'dart', sprite: 2, skill: { id: 'biocontrol', name: '생물적 방제', cd: 16 } },
  chemist:   { name: '화학 연구원', hp: 5, shield: 4, energy: 200, weapon: 'reagent', sprite: 3, skill: { id: 'neutral', name: '중화제 투척', cd: 9 } },
  meteo:     { name: '기상 연구원', hp: 5, shield: 5, energy: 200, weapon: 'rod', sprite: 4, skill: { id: 'warning', name: '기상 경보', cd: 15 } },
  medic:     { name: '응급 구조사', hp: 6, shield: 3, energy: 180, weapon: 'defib', sprite: 5, skill: { id: 'firstaid', name: '응급 처치', cd: 18 } },
};
export const JOB_ORDER = ['driver', 'geologist', 'ecologist', 'chemist', 'meteo', 'medic'];
// 무기: 직업이 실제로 쓰는 도구. trait 직업 특색(burn 불붙음, pierce 관통, slow 느리게·잠듦, acid 산성 웅덩이, chain 연쇄 번개, shock 기절·처치 시 회복), rate 초당 발사, count 한 번에 나가는 탄, spread 퍼짐(라디안), speed 픽셀/초, range 픽셀, energy 한 발 에너지
export const WEAPONS = {
  flare:   { name: '비상 신호탄총', trait: 'burn', traitText: '맞은 적에 불이 붙어 3초 동안 타오름(열차 비상 신호용 홍염)', sprite: 0, dmg: 6, rate: 1.8, count: 1, spread: 0.04, speed: 360, range: 260, energy: 2, kick: 1, size: 4 },
  drill:   { name: '시추 드릴총', trait: 'pierce', traitText: '드릴 날이 적과 상자를 여럿 뚫고 지나감', sprite: 1, dmg: 4, rate: 4, count: 1, spread: 0.04, speed: 460, range: 300, energy: 1, kick: 0.6, size: 3 },
  dart:    { name: '마취 다트총', trait: 'slow', traitText: '맞은 적이 느려지고, 3번 맞으면 잠깐 잠듦(야생동물 조사용)', sprite: 2, dmg: 3, rate: 5, count: 1, spread: 0.06, speed: 560, range: 320, energy: 1, kick: 0.35, size: 2 },
  reagent: { name: '시약 분사기', trait: 'acid', traitText: '맞은 자리에 산성 웅덩이(적에게 피해)', sprite: 3, dmg: 2, rate: 6, count: 2, spread: 0.25, speed: 360, range: 160, energy: 1, kick: 0.4, size: 3 },
  rod:     { name: '피뢰침 번개총', trait: 'chain', traitText: '맞은 적 옆으로 번개가 한 번 더 튐', sprite: 4, dmg: 4, rate: 5, count: 1, spread: 0, speed: 700, range: 340, energy: 1, kick: 0.5, size: 3 },
  defib:   { name: '제세동 충격기', trait: 'shock', traitText: '가까운 거리 전기 충격 3갈래, 맞은 적 잠깐 기절, 쓰러뜨리면 가끔 체력 회복, 에너지 안 씀', sprite: 5, dmg: 3, rate: 3, count: 3, spread: 0.6, speed: 380, range: 120, energy: 0, kick: 0.5, size: 3 },
};
// cy: 발밑에서 몸 가운데까지 높이(총알이 맞는 곳)
// 구역 1 몬스터: 근접(삼엽충, 고생대 표준화석), 돌진(암모나이트, 중생대 표준화석), 원거리(내성균 덩어리), 보스(화석 짜깁기 공룡)
export const MONSTERS = {
  trilobite: { name: '삼엽충', hp: 10, speed: 70, r: 9, cy: 6, kind: 'melee', atk: 1,
    attack: { type: 'lunge', wind: 0.4, dash: 0.3, dashSpeed: 210, reach: 90, cd: 1.6 }, attackText: '웅크렸다가 짧게 뛰어든다' },
  germ:      { name: '내성균 덩어리', hp: 12, speed: 40, r: 9, cy: 8, kind: 'ranged', atk: 1, range: 170, split: 'germlet', inflict: ['infect', 0.35],
    attack: { type: 'shoot', n: 3, spread: 0.55, speed: 90, size: 5, wind: 0.5, cd: 2.4 }, attackText: '느리고 큰 균 덩어리를 3방향으로, 쓰러지면 둘로 나뉜다(살아남은 내성균이 늘어남)' },
  germlet:   { name: '작은 내성균', hp: 4, speed: 75, r: 6, cy: 5, kind: 'ranged', atk: 1, range: 130, small: true, inflict: ['infect', 0.2],
    attack: { type: 'shoot', n: 1, spread: 0, speed: 175, size: 3, wind: 0.3, cd: 1.5 }, attackText: '작고 빠른 균 한 발' },
  ammonite:  { name: '암모나이트', hp: 9, speed: 50, r: 9, cy: 10, kind: 'roller', atk: 1, dashSpeed: 260,
    attack: { type: 'roll', wind: 0.45, dash: 0.6, reach: 220, cd: 2.2, ink: { n: 8, speed: 120, size: 4 } }, attackText: '웅크렸다 굴러오고, 멈추면 먹물을 사방으로 뿜는다' },
  fossilrex: { name: '화석 짜깁기 공룡', hp: 330, speed: 45, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 140,
    attack: { type: 'boss', speed: 140 }, patterns: ['ring', 'double', 'spiral', 'fan', 'charge', 'summon', 'meteor'], minions: ['trilobite', 'ammonite', 'germ'], attackText: '원형·이중 탄막, 회오리 탄, 부채꼴 사격, 돌진, 화석 소환, 운석 낙하' },
  magmagolem: { name: '용암 바위 거인', hp: 360, speed: 35, r: 24, cy: 34, kind: 'boss', atk: 2, shotSpeed: 120, inflict: ['burn', 0.3], sprite: 'fossilrex', tint: 'hue-rotate(-30deg) saturate(2) brightness(.8)',
    attack: { type: 'boss', speed: 120 }, patterns: ['erupt', 'slam', 'ring', 'meteor', 'charge'], minions: ['germ'], attackText: '분화구 분출, 땅 내려치기 충격파, 원형 탄막, 운석, 돌진' },
  trilomother: { name: '거대 삼엽충 어미', hp: 300, speed: 55, r: 24, cy: 20, kind: 'boss', atk: 2, shotSpeed: 150, sprite: 'fossilrex', tint: 'sepia(1) hue-rotate(10deg) saturate(1.5)',
    attack: { type: 'boss', speed: 150 }, patterns: ['brood', 'fan', 'spiral', 'shell', 'charge'], minions: ['trilobite', 'trilobite', 'ammonite'], attackText: '새끼 떼 소환, 부채꼴 사격, 회오리 탄, 껍데기 웅크리기(무적 뒤 사방 발사), 돌진' },
};
// 방마다 물결 목록, 물결은 [몬스터, 마리 수] 묶음 목록
export const WAVES = { battle: [[['trilobite', 3]], [['ammonite', 2], ['germ', 1]]], elite: [[['trilobite', 4], ['ammonite', 1]], [['germ', 3], ['ammonite', 2]]], boss: [[['BOSS', 1]]] };   // BOSS는 그 호선 보스 중 하나로 바뀐다
// 9개 호선(혼합안). 실내 모습·몬스터·보스·재난은 1호선부터 차례로 채운다. 지금은 1호선 몬스터를 모든 호선에 임시로 쓴다
export const LINES = {
  1: { name: '지층 공사선', color: '#0052A4', unit: '지질시대, 대멸종', hazard: '낙석·먼지', traps: ['vent', 'meteor', 'sewage'], trapText: '화산 분화구가 경고 뒤 분출해 용암을 남기고, 표시된 자리에 운석이 떨어진다(대멸종의 원인 가설). 오염된 지하수 웅덩이는 감염시킨다', ready: true, bosses: ['fossilrex', 'magmagolem', 'trilomother'] },
  2: { name: '진화 실험선', color: '#00A84D', unit: '자연선택, 생물다양성', hazard: '감염 구름', traps: ['gas', 'spark', 'sewage'], trapText: '배양 탱크에서 감염 구름이 새어 나오고, 고장 난 실험 장비 바닥에 전기가 흐른다. 오염된 배양액 웅덩이', bosses: ['fossilrex'] },
  3: { name: '텃밭 마을선', color: '#EF7C1C', unit: '생태계 구성, 먹이 관계', hazard: '생태 교란', traps: ['vine', 'puddle'], trapText: '밟으면 덩굴이 발을 묶고, 연못에서는 느려진다', bosses: ['fossilrex'] },
  4: { name: '녹슨 침수선', color: '#00A5DE', unit: '산화·환원', hazard: '침수·부식', traps: ['puddle', 'drip'], trapText: '물웅덩이에서 느려지고, 녹슨 천장에서 쇳물이 떨어진다', bosses: ['fossilrex'] },
  5: { name: '산성비 매연선', color: '#996CAC', unit: '산·염기, 중화', hazard: '산성비', traps: ['acidrain', 'smog'], trapText: '표시된 자리에 산성비가 떨어져 웅덩이를 남기고, 매연이 뿜어 나온다', bosses: ['fossilrex'] },
  6: { name: '냉동 창고선', color: '#CD7C2F', unit: '에너지 출입', hazard: '한파', traps: ['icicle', 'ice'], trapText: '천장에서 고드름이 떨어지고, 얼음 바닥에서 동상에 걸린다', bosses: ['fossilrex'] },
  7: { name: '폭염 지상선', color: '#747F00', unit: '온난화, 엘니뇨, 사막화', hazard: '폭염·모래 폭풍', traps: ['heat', 'meteor'], trapText: '뜨거운 지면이 분출하고, 모래 폭풍에 돌이 날아든다', bosses: ['fossilrex'] },
  8: { name: '정전 발전소선', color: '#E6186C', unit: '태양 에너지, 발전, 효율', hazard: '정전', traps: ['spark', 'heat'], trapText: '전기 바닥이 번갈아 켜지고, 과열된 발전기가 열기를 뿜는다', bosses: ['fossilrex'] },
  9: { name: '관제 센터선', color: '#BDB092', unit: '감염병, 빅데이터·AI', hazard: '감염병·데이터 교란', traps: ['spark', 'gas'], trapText: '보안 전기 바닥과 오염된 공기 정화 장치', bosses: ['fossilrex'] },
};
// 장비 재료(아이템 방·상자·적에게서 나옴)
export const MATS = { cloth: '천', rubber: '고무', glass: '유리', filter: '필터', scrap: '고철', leather: '가죽' };
// 함정 종류: vent 분출구(경고 뒤 분출, 자리에 장판), drop 떨어짐(플레이어 근처 표시 뒤 충돌), pool 상시 바닥(밟으면 상태 이상), pulse 깜빡이는 전기 바닥
// status: 맞거나 밟으면 걸리는 상태 이상
export const TRAPS = {
  vent: { mode: 'vent', name: '화산 분화구', zone: 'lava' }, gas: { mode: 'vent', name: '감염 구름 분출구', zone: 'gas' }, smog: { mode: 'vent', name: '매연 분출구', zone: 'smog' }, heat: { mode: 'vent', name: '뜨거운 지면', zone: 'fire' },
  meteor: { mode: 'drop', name: '운석' }, acidrain: { mode: 'drop', name: '산성비', zone: 'acidpool', status: 'corrode' }, icicle: { mode: 'drop', name: '고드름', status: 'frost' }, drip: { mode: 'drop', name: '쇳물', status: 'burn' },
  puddle: { mode: 'pool', name: '물웅덩이', status: 'wet' }, sewage: { mode: 'pool', name: '오염된 물웅덩이', status: 'infect' }, ice: { mode: 'pool', name: '얼음 바닥', status: 'frost' }, vine: { mode: 'pool', name: '덩굴', status: 'root' },
  spark: { mode: 'pulse', name: '전기 바닥', status: 'shock' },
};
// 장판(분출 뒤 남는 바닥)에 서 있으면 걸리는 상태 이상
export const ZONE_STATUS = { lava: 'burn', fire: 'burn', gas: 'infect', smog: 'poison', acidpool: 'corrode' };
// 상태 이상: t 기본 지속(초). 감염 2초마다 피해 1·방어막 안 참, 화상 1초마다 피해 1, 젖음 느려짐·감전 피해 2배·불이 꺼짐,
// 부식 1.5초마다 방어막 1 깎임·방어막 안 참, 동상 이동·연사 느려짐, 감전 잠깐 못 움직이고 못 쏨, 묶임 못 움직임, 중독 에너지가 빠짐
export const STATUS = {
  infect:  { name: '감염', icon: '🦠', t: 7, color: '#8ad050' },
  burn:    { name: '화상', icon: '🔥', t: 3, color: '#ff8a3a' },
  wet:     { name: '젖음', icon: '💧', t: 4, color: '#6ab0ff' },
  corrode: { name: '부식', icon: '🧪', t: 5, color: '#c8f040' },
  frost:   { name: '동상', icon: '🥶', t: 4, color: '#bfe8ff' },
  shock:   { name: '감전', icon: '⚡', t: 0.6, color: '#ffe860' },
  root:    { name: '묶임', icon: '🌿', t: 0.7, color: '#6ac050' },
  poison:  { name: '중독', icon: '😵', t: 5, color: '#b08ad8' },
};

// ---------- 유물: 역무실 뽑기로 얻고, 한 판에 2개까지 끼운다. 등급이 높을수록 드물고 강하다 ----------
export const GRADES = {
  C: { name: '일반', color: '#b8b8b8', p: 0.55, refund: 5 },
  B: { name: '희귀', color: '#5aa8ff', p: 0.30, refund: 10 },
  A: { name: '영웅', color: '#c070ff', p: 0.12, refund: 20 },
  S: { name: '전설', color: '#ffc040', p: 0.03, refund: 40 },
};
const ALL_STATUS_HALF = Object.fromEntries(Object.keys(STATUS).map(k => [k, 0.5]));
// fx: 판 전체(parts 시작 부품, maxHp·maxShield·maxEnergy, costMul 비용, lineOffer·abilityOffer 후보 수, revive 부활)와
//     호선 안(…Mul 곱하기, immune 면역, statusMul 상태 이상 시간, 나머지는 더하기·켜기)
export const RELICS = {
  oldCard:    { grade: 'C', name: '낡은 교통카드', text: '시작할 때 부품 +6', fx: { parts: 6 } },
  snack:      { grade: 'C', name: '비상 건빵', text: '최대 체력 +1', fx: { maxHp: 1 } },
  powerbank:  { grade: 'C', name: '보조 배터리', text: '최대 에너지 +40', fx: { maxEnergy: 40 } },
  rubberBand: { grade: 'C', name: '고무줄 팔찌', text: '구르기 대기 시간 −15%', fx: { rollCdMul: 0.85 } },
  whistle:    { grade: 'C', name: '역무원 호루라기', text: '이동 속도 +6%', fx: { speedMul: 1.06 } },
  gloves:     { grade: 'C', name: '목장갑', text: '상자·바위를 부수면 재료 1개 더', fx: { matBonus: 1 } },
  magnet:     { grade: 'C', name: '말굽자석', text: '떨어진 물건을 줍는 거리 2배', fx: { pickMul: 2 } },
  tape:       { grade: 'C', name: '절연 테이프', text: '감전되지 않는다', fx: { immune: ['shock'] } },
  mask:       { grade: 'C', name: '보건용 마스크', text: '감염 시간 절반', fx: { statusMul: { infect: 0.5 } } },
  ointment:   { grade: 'C', name: '화상 연고', text: '화상 시간 절반', fx: { statusMul: { burn: 0.5 } } },
  clover:     { grade: 'C', name: '네잎클로버', text: '적이 부품을 더 자주 떨어뜨린다', fx: { partsChance: 0.12 } },
  piggy:      { grade: 'C', name: '돼지 저금통', text: '얻는 토큰 +50%', fx: { coinMul: 1.5 } },
  toolbelt:   { grade: 'B', name: '정비공의 공구 벨트', text: '무기 강화·스킬 레벨업 비용 −25%', fx: { costMul: 0.75 } },
  hammer:     { grade: 'B', name: '지질 망치', text: '상자·바위·드럼통에 주는 피해 3배', fx: { propMul: 3 } },
  lens:       { grade: 'B', name: '돋보기', text: '10% 확률로 치명타(피해 2배)', fx: { crit: 0.1 } },
  thermos:    { grade: 'B', name: '보온병', text: '동상에 걸리지 않고, 방어막이 1초 빨리 차기 시작한다', fx: { immune: ['frost'], regenFaster: 30 } },
  umbrella:   { grade: 'B', name: '장우산', text: '젖지 않고 부식되지 않는다', fx: { immune: ['wet', 'corrode'] } },
  compass:    { grade: 'B', name: '나침반', text: '호선 지도 전체가 보인다', fx: { seeAll: true } },
  vitamin:    { grade: 'B', name: '종합 비타민', text: '방을 정리하면 30% 확률로 체력 +1', fx: { clearHeal: 0.3 } },
  signal:     { grade: 'B', name: '행운의 신호등', text: '보급 상자에서 무기가 나올 확률 75%', fx: { chestWeapon: 0.25 } },
  notebook:   { grade: 'B', name: '기상 관측 노트', text: '함정 경고가 0.4초 일찍 뜬다', fx: { warnPlus: 0.4 } },
  canary:     { grade: 'B', name: '광산 카나리아', text: '중독되지 않고, 감염 시간 절반', fx: { immune: ['poison'], statusMul: { infect: 0.5 }} },
  solar:      { grade: 'B', name: '태양광 패널', text: '에너지가 2배 빨리 찬다', fx: { energyRegenMul: 2 } },
  dice:       { grade: 'B', name: '주사위', text: '특수능력 후보가 4개', fx: { abilityOffer: 1 } },
  watch:      { grade: 'A', name: '기관사의 회중시계', text: '보스를 잡을 때마다 기록 −15초', fx: { bossTime: 15 } },
  amber:      { grade: 'A', name: '호박 속 모기', text: '적을 쓰러뜨리면 8% 확률로 체력 +1', fx: { lifesteal: 0.08 } },
  capacitor:  { grade: 'A', name: '축전기', text: '스킬 대기 시간 −20%, 스킬을 쓰면 에너지 +30', fx: { skillCdMul: 0.8, skillEnergy: 30 } },
  scope:      { grade: 'A', name: '조준경', text: '탄 퍼짐 −40%, 피해 +10%', fx: { spreadMul: 0.6, dmgMul: 1.1 } },
  shell:      { grade: 'A', name: '암모나이트 껍데기', text: '방 문이 잠길 때마다 방어막 +2', fx: { roomShield: 2 } },
  helmet:     { grade: 'A', name: '방폭 헬멧', text: '폭발·운석·분출에 다치지 않는다', fx: { blastImmune: true } },
  antidote:   { grade: 'A', name: '만능 해독제', text: '모든 상태 이상 시간 절반', fx: { statusMul: ALL_STATUS_HALF } },
  mirror:     { grade: 'A', name: '반사경', text: '구르는 동안 스친 적 탄을 되받아 쏜다', fx: { reflect: true } },
  kit:        { grade: 'A', name: '구급 상자', text: '호선에 들어갈 때마다 체력 +2', fx: { lineHeal: 2 } },
  vaccine:    { grade: 'S', name: '백신 앰플', text: '한 판에 한 번, 쓰러지면 체력 절반으로 일어난다', fx: { revive: 1 } },
  stdFossil:  { grade: 'S', name: '표준화석 수집함', text: '모든 피해 +25%, 보스에게는 +25% 더', fx: { dmgMul: 1.25, bossMul: 1.25 } },
  twin:       { grade: 'S', name: '쌍둥이 총열', text: '한 번에 탄이 1발 더 나간다', fx: { extraShot: 1 } },
  rodShard:   { grade: 'S', name: '피뢰침 조각', text: '15% 확률로 치명타, 치명타가 나면 옆 적에게 번개', fx: { crit: 0.15, critChain: true } },
  ticket:     { grade: 'S', name: '막차 승차권', text: '환승역에서 호선 후보 4개, 특수능력 후보 4개', fx: { lineOffer: 1, abilityOffer: 1} },
  blackbox:   { grade: 'S', name: '열차 블랙박스', text: '최대 체력 +2, 최대 방어막 +2', fx: { maxHp: 2, maxShield: 2 } },
};
