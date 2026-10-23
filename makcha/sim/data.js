// 직업 6명, 스킬(마우스 오른쪽, cd는 대기 시간 초), 시작 무기, 구역 1(지층 터널) 몬스터. 수치는 첫 판 기준
export const JOBS = {
  driver:    { name: '지하철 기관사', hp: 5, shield: 3, energy: 160, weapon: 'flare', sprite: 0, skill: { id: 'regen', name: '회생 제동', cd: 8 } },
  geologist: { name: '지질학자', hp: 5, shield: 2, energy: 180, weapon: 'drill', sprite: 1, skill: { id: 'strata', name: '지층 판독', cd: 14 } },
  ecologist: { name: '생태학자', hp: 4, shield: 2, energy: 180, weapon: 'dart', sprite: 2, skill: { id: 'biocontrol', name: '생물적 방제', cd: 16 } },
  chemist:   { name: '화학 연구원', hp: 3, shield: 2, energy: 200, weapon: 'reagent', sprite: 3, skill: { id: 'neutral', name: '중화제 투척', cd: 9 } },
  meteo:     { name: '기상 연구원', hp: 3, shield: 3, energy: 200, weapon: 'rod', sprite: 4, skill: { id: 'warning', name: '기상 경보', cd: 15 } },
  medic:     { name: '응급 구조사', hp: 4, shield: 1, energy: 180, weapon: 'defib', sprite: 5, skill: { id: 'firstaid', name: '응급 처치', cd: 18 } },
};
export const JOB_ORDER = ['driver', 'geologist', 'ecologist', 'chemist', 'meteo', 'medic'];
// 무기: 직업이 실제로 쓰는 도구. trait 직업 특색(burn 불붙음, pierce 관통, slow 느리게·잠듦, acid 산성 웅덩이, chain 연쇄 번개, shock 기절·처치 시 회복), rate 초당 발사, count 한 번에 나가는 탄, spread 퍼짐(라디안), speed 픽셀/초, range 픽셀, energy 한 발 에너지
export const WEAPONS = {
  flare:   { name: '비상 신호탄총', trait: 'burn', traitText: '맞은 적에 불이 붙어 3초 동안 타오름(열차 비상 신호용 홍염)', sprite: 0, dmg: 4.5, rate: 1.4, count: 1, spread: 0.04, speed: 360, range: 260, energy: 2, kick: 1, size: 4 },
  drill:   { name: '시추 드릴총', trait: 'pierce', traitText: '드릴 날이 적과 상자를 여럿 뚫고 지나감', sprite: 1, dmg: 4, rate: 2.6, count: 1, spread: 0.04, speed: 460, range: 300, energy: 1, kick: 0.6, size: 3 },
  dart:    { name: '마취 다트총', trait: 'slow', traitText: '맞은 적이 느려지고, 3번 맞으면 잠깐 잠듦(야생동물 조사용)', sprite: 2, dmg: 3, rate: 3, count: 1, spread: 0.06, speed: 560, range: 320, energy: 1, kick: 0.35, size: 2 },
  reagent: { name: '시약 분사기', trait: 'acid', traitText: '맞은 자리에 산성 웅덩이(적에게 피해)', sprite: 3, dmg: 2, rate: 3, count: 2, spread: 0.25, speed: 360, range: 160, energy: 1, kick: 0.4, size: 3 },
  rod:     { name: '피뢰침 번개총', trait: 'chain', traitText: '맞은 적 옆으로 번개가 한 번 더 튐', sprite: 4, dmg: 4, rate: 2.6, count: 1, spread: 0, speed: 700, range: 340, energy: 1, kick: 0.5, size: 3 },
  // 줍는 독특한 무기: 표창(갔다가 돌아오며 두 번 맞힘), 레이저(한 줄을 바로 꿰뚫음), 근접(앞쪽 부채꼴을 휘둘러 치고 적 탄을 쳐냄, 에너지 안 씀)
  shuriken:{ name: '회전 표창', trait: 'boomerang', traitText: '날아갔다가 손으로 돌아오며 오갈 때 모두 맞힌다', sprite: 6, dmg: 4, rate: 1.6, count: 1, spread: 0, speed: 300, range: 220, energy: 2, kick: 0.5, size: 5 },
  laser:   { name: '레이저 측량기', trait: 'beam', traitText: '한 줄에 있는 적을 한꺼번에 꿰뚫는다', sprite: 7, dmg: 5, rate: 1.2, count: 1, spread: 0, speed: 0, range: 320, energy: 4, kick: 0.8, size: 2 },
  crowbar: { name: '쇠지렛대', trait: 'melee', traitText: '앞을 크게 휘둘러 적을 밀치고 적 탄을 쳐낸다', sprite: 8, dmg: 7, rate: 1.4, count: 1, spread: 0, speed: 0, range: 30, arc: 2.2, energy: 0, kick: 1.2, size: 0 },
  pickaxe: { name: '지질 조사 피켈', trait: 'melee', traitText: '빠르게 찍고 적 탄을 쳐낸다', sprite: 9, dmg: 4, rate: 2.6, count: 1, spread: 0, speed: 0, range: 26, arc: 1.6, energy: 0, kick: 0.8, size: 0 },
  defib:   { name: '제세동 충격기', trait: 'shock', traitText: '가까운 거리 전기 충격 3갈래, 맞은 적 잠깐 기절, 쓰러뜨리면 가끔 체력 회복, 에너지 안 씀', sprite: 5, dmg: 3, rate: 2, count: 3, spread: 0.6, speed: 380, range: 120, energy: 0, kick: 0.5, size: 3 },
  // 2026-10-22 추가 무기 16종(그림은 임시로 코드가 그림: look 모양, color 색)
  extinguisher:{ name: '소화기 분사기', trait: 'slow', traitText: '차가운 이산화 탄소를 뿜어 적을 느리게 한다', sprite: 10, look: 'sprayer', color: '#d83a3a', dmg: 1, rate: 3, count: 3, spread: 0.5, speed: 260, range: 120, energy: 1, kick: 0.3, size: 4 },
  nailgun:  { name: '네일건', trait: 'pierce', traitText: '못이 적을 여럿 뚫는다', sprite: 11, look: 'pistol', color: '#e8a030', dmg: 1.5, rate: 3, count: 1, spread: 0.08, speed: 520, range: 260, energy: 1, kick: 0.4, size: 2 },
  boltgun:  { name: '선로 볼트 산탄총', trait: '', traitText: '볼트 5개가 넓게 퍼진다', sprite: 12, look: 'shotgun', color: '#7a7f88', dmg: 1.5, rate: 1, count: 5, spread: 0.7, speed: 380, range: 150, energy: 3, kick: 1.3, size: 3 },
  nitrogen: { name: '액체 질소 분사기', trait: 'freeze', traitText: '두 번 맞은 적이 잠깐 얼어붙는다', sprite: 13, look: 'sprayer', color: '#9ad8ff', dmg: 1.5, rate: 2.5, count: 2, spread: 0.3, speed: 320, range: 150, energy: 2, kick: 0.4, size: 4 },
  thermite: { name: '테르밋 발사기', trait: 'burn', traitText: '아주 뜨겁게 타는 덩어리를 쏜다', sprite: 14, look: 'launcher', color: '#ff8a3a', dmg: 4, rate: 0.9, count: 1, spread: 0.04, speed: 300, range: 240, energy: 4, kick: 1.2, size: 6 },
  railgun:  { name: '자석 레일건', trait: 'beam', traitText: '느리지만 한 줄을 강하게 꿰뚫는다', sprite: 15, look: 'rifle', color: '#5a8ac8', dmg: 8, rate: 0.55, count: 1, spread: 0, speed: 0, range: 400, energy: 6, kick: 1.6, size: 2 },
  solar:    { name: '태양광 집광기', trait: 'beam', burn: true, traitText: '모은 빛줄기가 한 줄을 태운다', sprite: 16, look: 'rifle', color: '#ffd040', dmg: 2, rate: 2.2, count: 1, spread: 0, speed: 0, range: 220, energy: 2, kick: 0.4, size: 2 },
  beedrone: { name: '꿀벌 드론 발사기', trait: 'homing', traitText: '작은 드론이 적을 따라간다', sprite: 17, look: 'launcher', color: '#f2c443', dmg: 2, rate: 2.2, count: 1, spread: 0.3, speed: 220, range: 320, energy: 2, kick: 0.4, size: 3 },
  icestar:  { name: '얼음 표창', trait: 'boomerang', freeze: true, traitText: '돌아오는 표창이 맞은 적을 얼린다', sprite: 18, look: 'thrown', color: '#bfe8ff', dmg: 2.5, rate: 1.4, count: 1, spread: 0, speed: 280, range: 200, energy: 2, kick: 0.5, size: 5 },
  watercannon:{ name: '소방 물대포', trait: 'water', traitText: '적을 세게 밀치고 적신다(젖은 적은 불이 꺼지고 전기에 약해짐)', sprite: 19, look: 'sprayer', color: '#4a9ad8', dmg: 1, rate: 2.5, count: 1, spread: 0.1, speed: 420, range: 200, energy: 1, kick: 0.6, size: 5 },
  staticglove:{ name: '정전기 장갑', trait: 'chain', traitText: '가까운 적 사이로 전기가 튄다', sprite: 20, look: 'glove', color: '#c8a0f0', dmg: 2, rate: 3, count: 1, spread: 0, speed: 500, range: 150, energy: 1, kick: 0.3, size: 3 },
  seedgun:  { name: '씨앗 산탄총', trait: 'slow', traitText: '씨앗 4개가 퍼지며 적을 느리게 한다', sprite: 21, look: 'shotgun', color: '#8ac850', dmg: 1, rate: 1.4, count: 4, spread: 0.6, speed: 340, range: 170, energy: 2, kick: 0.8, size: 3 },
  fireaxe:  { name: '소방 도끼', trait: 'melee', traitText: '느리지만 크게 휘둘러 세게 친다', sprite: 22, look: 'axe', color: '#d83a3a', dmg: 7, rate: 0.9, count: 1, spread: 0, speed: 0, range: 32, arc: 2.6, energy: 0, kick: 1.5, size: 0 },
  hammerdrill:{ name: '해머 드릴', trait: 'melee', traitText: '아주 빠르게 앞을 찍는다', sprite: 23, look: 'tool', color: '#f2c443', dmg: 2.5, rate: 3, count: 1, spread: 0, speed: 0, range: 24, arc: 1.0, energy: 0, kick: 0.4, size: 0 },
  geohammer:{ name: '지질 해머', trait: 'melee', traitText: '바위를 잘 깨고 적을 밀친다', sprite: 24, look: 'tool', color: '#8a6a4a', dmg: 4, rate: 1.8, count: 1, spread: 0, speed: 0, range: 28, arc: 1.8, energy: 0, kick: 1, size: 0 },
  // 2026-10-22 총 11종 더(그림은 임시: look 모양, color 색)
  revolver: { name: '수도관 리볼버', trait: '', traitText: '묵직한 한 발', sprite: 26, look: 'pistol', color: '#8a8f98', dmg: 3, rate: 1.6, count: 1, spread: 0.03, speed: 520, range: 280, energy: 1, kick: 1, size: 3 },
  twinpistol:{ name: '신호기 쌍권총', trait: '', traitText: '두 발을 나란히 쏜다', sprite: 27, look: 'pistol', color: '#d8b040', dmg: 2, rate: 2, count: 2, spread: 0.15, speed: 480, range: 240, energy: 1, kick: 0.6, size: 3 },
  saltsniper:{ name: '소금 결정 저격총', trait: 'pierce', traitText: '멀리까지 꿰뚫는 결정 탄', sprite: 28, look: 'rifle', color: '#e8e8f0', dmg: 6, rate: 0.6, count: 1, spread: 0, speed: 800, range: 420, energy: 3, kick: 1.4, size: 3 },
  batterygun:{ name: '리튬 전지 기관총', trait: '', traitText: '약하지만 쉬지 않고 쏜다', sprite: 29, look: 'rifle', color: '#5ac85a', dmg: 1, rate: 3, count: 1, spread: 0.2, speed: 500, range: 240, energy: 1, kick: 0.3, size: 2 },
  lavashot: { name: '굳은 용암 산탄총', trait: 'burn', traitText: '뜨거운 돌 조각 4개가 퍼진다', sprite: 30, look: 'shotgun', color: '#c8501e', dmg: 1.5, rate: 1, count: 4, spread: 0.6, speed: 340, range: 160, energy: 3, kick: 1.1, size: 3 },
  chlorogun:{ name: '엽록체 광선총', trait: 'beam', traitText: '초록 빛줄기가 한 줄을 꿰뚫는다', sprite: 31, look: 'rifle', color: '#5ab84a', dmg: 2.5, rate: 1.6, count: 1, spread: 0, speed: 0, range: 260, energy: 2, kick: 0.5, size: 2 },
  basesprayer:{ name: '염기성 용액 분사기', trait: 'acid', traitText: '맞은 자리에 웅덩이를 남긴다', sprite: 32, look: 'sprayer', color: '#4a7ae0', dmg: 1.5, rate: 2.5, count: 2, spread: 0.25, speed: 340, range: 160, energy: 1, kick: 0.4, size: 3 },
  coilgun:  { name: '전자석 코일건', trait: 'chain', traitText: '전기가 옆 적으로 튄다', sprite: 33, look: 'rifle', color: '#c87a3a', dmg: 3, rate: 1.5, count: 1, spread: 0, speed: 620, range: 320, energy: 2, kick: 0.7, size: 3 },
  hailgun:  { name: '우박 발사기', trait: 'freeze', traitText: '얼음 알갱이 3개가 퍼진다', sprite: 34, look: 'launcher', color: '#bfe8ff', dmg: 1.5, rate: 1.4, count: 3, spread: 0.4, speed: 360, range: 200, energy: 2, kick: 0.6, size: 3 },
  airgun:   { name: '압축 공기총', trait: 'water', traitText: '공기 덩어리가 적을 세게 밀친다', sprite: 35, look: 'launcher', color: '#d8e0e8', dmg: 1, rate: 2, count: 1, spread: 0.05, speed: 460, range: 200, energy: 1, kick: 0.8, size: 5 },
  bonerang: { name: '화석 뼈 부메랑', trait: 'boomerang', traitText: '날아갔다 돌아오며 두 번 맞힌다', sprite: 36, look: 'thrown', color: '#e8dcc0', dmg: 3, rate: 1.2, count: 1, spread: 0, speed: 280, range: 220, energy: 2, kick: 0.5, size: 5 },
  spanner:  { name: '몽키 스패너', trait: 'melee', traitText: '가볍고 빠르게 휘두른다', sprite: 25, look: 'tool', color: '#c8ccd2', dmg: 3, rate: 2.8, count: 1, spread: 0, speed: 0, range: 24, arc: 1.6, energy: 0, kick: 0.6, size: 0 },
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
  // ---------- 2026-10-22 호선별 몬스터(설계표·통박사 점검 반영). weak: 무기별 피해 배수(과학을 알면 유리), weakTrait: 특색별 배수, rusts: 젖으면 산화되어 약해짐, touchInflict: 닿으면 상태 이상 ----------
  mammoth:   { name: '매머드', hp: 22, speed: 55, r: 11, cy: 11, kind: 'roller', atk: 1, dashSpeed: 230, attack: { type: 'roll', wind: 0.6, dash: 0.7, reach: 200, cd: 2.6 }, attackText: '머리를 숙였다가 엄니로 돌진' },
  finch:     { name: '핀치', hp: 8, speed: 80, r: 7, cy: 7, kind: 'ranged', atk: 1, range: 170, attack: { type: 'shoot', n: 3, spread: 0.35, speed: 200, size: 2, wind: 0.35, cd: 1.6 }, attackText: '부리로 씨앗 3알을 튕긴다' },
  moth:      { name: '회색가지나방', hp: 7, speed: 95, r: 7, cy: 9, kind: 'melee', atk: 1, attack: { type: 'lunge', wind: 0.3, dash: 0.3, dashSpeed: 240, reach: 100, cd: 1.4 }, attackText: '팔랑이다 내리꽂힌다' },
  grasshopper:{ name: '메뚜기', hp: 6, speed: 95, r: 7, cy: 6, kind: 'melee', atk: 1, attack: { type: 'lunge', wind: 0.25, dash: 0.3, dashSpeed: 260, reach: 110, cd: 1.2 }, attackText: '뒷다리로 펄쩍 뛰어든다' },
  frog:      { name: '개구리', hp: 10, speed: 60, r: 8, cy: 7, kind: 'ranged', atk: 1, range: 110, attack: { type: 'shoot', n: 1, spread: 0, speed: 260, size: 3, wind: 0.4, cd: 1.5 }, attackText: '혀를 빠르게 내민다' },
  snake:     { name: '뱀', hp: 12, speed: 60, r: 8, cy: 5, kind: 'roller', atk: 1, dashSpeed: 280, attack: { type: 'roll', wind: 0.45, dash: 0.45, reach: 180, cd: 2 }, attackText: '머리를 들었다가 미끄러지듯 덮친다' },
  vine:      { name: '덩굴 식물', hp: 14, speed: 0, r: 9, cy: 10, kind: 'ranged', atk: 1, range: 220, attack: { type: 'shoot', n: 5, spread: 1.2, speed: 120, size: 3, wind: 0.6, cd: 2.6 }, attackText: '제자리에서 씨앗을 넓게 퍼뜨린다' },
  ironrobot: { name: '철 로봇', hp: 18, speed: 45, r: 9, cy: 9, kind: 'melee', atk: 1, rusts: true, attack: { type: 'lunge', wind: 0.5, dash: 0.3, dashSpeed: 200, reach: 80, cd: 1.8 }, attackText: '녹슨 집게로 내리친다(젖으면 산화되어 약해짐)' },
  copperslime:{ name: '구리 슬라임', hp: 12, speed: 40, r: 8, cy: 6, kind: 'ranged', atk: 1, range: 160, attack: { type: 'shoot', n: 2, spread: 0.3, speed: 130, size: 4, wind: 0.5, cd: 2 }, attackText: '푸른 녹 방울을 뱉는다' },
  charcoal:  { name: '숯 덩어리', hp: 10, speed: 50, r: 8, cy: 7, kind: 'roller', atk: 1, dashSpeed: 240, inflict: ['burn', 0.4], attack: { type: 'roll', wind: 0.4, dash: 0.5, reach: 200, cd: 2.4, ink: { n: 6, speed: 110, size: 3 } }, attackText: '굴러와 불티를 사방으로 튀긴다' },
  acidslime: { name: '산성 용액 슬라임', hp: 12, speed: 45, r: 8, cy: 6, kind: 'ranged', atk: 1, range: 160, inflict: ['corrode', 0.5], weak: { basesprayer: 2 }, attack: { type: 'shoot', n: 3, spread: 0.5, speed: 110, size: 4, wind: 0.5, cd: 2.2 }, attackText: '노란 방울(산성)을 뱉는다' },
  baseslime: { name: '염기성 용액 슬라임', hp: 12, speed: 45, r: 8, cy: 6, kind: 'ranged', atk: 1, range: 160, weak: { reagent: 2 }, attack: { type: 'shoot', n: 3, spread: 0.5, speed: 110, size: 4, wind: 0.5, cd: 2.2 }, attackText: '파란 방울(염기성)을 뱉는다' },
  smog:      { name: '매연 먼지 덩어리', hp: 9, speed: 50, r: 9, cy: 10, kind: 'ranged', atk: 1, range: 180, inflict: ['poison', 0.6], attack: { type: 'shoot', n: 1, spread: 0, speed: 80, size: 7, wind: 0.6, cd: 2.4 }, attackText: '느린 매연 덩어리를 내뿜는다' },
  icechunk:  { name: '얼음 덩어리', hp: 16, speed: 50, r: 9, cy: 8, kind: 'melee', atk: 1, weakTrait: { burn: 2 }, attack: { type: 'lunge', wind: 0.5, dash: 0.4, dashSpeed: 220, reach: 100, cd: 2 }, attackText: '미끄러지듯 부딪친다' },
  coldpack:  { name: '냉각팩 슬라임', hp: 10, speed: 45, r: 8, cy: 6, kind: 'ranged', atk: 1, range: 150, inflict: ['frost', 0.6], attack: { type: 'shoot', n: 2, spread: 0.4, speed: 120, size: 4, wind: 0.5, cd: 2 }, attackText: '차가운 방울을 뱉는다' },
  frostcrystal:{ name: '서리 결정', hp: 8, speed: 60, r: 7, cy: 12, kind: 'ranged', atk: 1, range: 160, inflict: ['frost', 0.3], attack: { type: 'shoot', n: 6, spread: 6.28, speed: 110, size: 3, wind: 0.5, cd: 2.6 }, attackText: '빙글 돌며 얼음 조각을 사방으로' },
  heatblob:  { name: '열기 덩어리', hp: 12, speed: 65, r: 8, cy: 8, kind: 'melee', atk: 1, touchInflict: 'burn', weakTrait: { water: 2, freeze: 2 }, attack: { type: 'lunge', wind: 0.4, dash: 0.3, dashSpeed: 230, reach: 90, cd: 1.6 }, attackText: '뜨겁게 달려든다' },
  sandwhirl: { name: '모래 먼지 회오리', hp: 9, speed: 70, r: 8, cy: 10, kind: 'roller', atk: 1, dashSpeed: 300, attack: { type: 'roll', wind: 0.4, dash: 0.6, reach: 220, cd: 2.2 }, attackText: '빙빙 돌며 휩쓸고 간다' },
  scorpion:  { name: '모래 전갈', hp: 11, speed: 65, r: 8, cy: 6, kind: 'melee', atk: 1, attack: { type: 'lunge', wind: 0.45, dash: 0.25, dashSpeed: 260, reach: 90, cd: 1.5 }, attackText: '꼬리로 찌른다' },
  sparkdrone:{ name: '스파크 드론', hp: 8, speed: 75, r: 7, cy: 12, kind: 'ranged', atk: 1, range: 170, inflict: ['shock', 0.4], attack: { type: 'shoot', n: 1, spread: 0, speed: 220, size: 3, wind: 0.3, cd: 1.4 }, attackText: '전기 불꽃을 쏜다' },
  coil:      { name: '코일 장치', hp: 14, speed: 40, r: 8, cy: 8, kind: 'ranged', atk: 1, range: 200, attack: { type: 'shoot', n: 2, spread: 0.15, speed: 260, size: 3, wind: 0.6, cd: 2 }, attackText: '자석이 움직일 때만 전기를 쏜다' },
  heatflame: { name: '열로 빠져나간 에너지', hp: 7, speed: 80, r: 7, cy: 8, kind: 'melee', atk: 1, touchInflict: 'burn', weakTrait: { water: 2, freeze: 2 }, attack: { type: 'lunge', wind: 0.3, dash: 0.3, dashSpeed: 250, reach: 100, cd: 1.3 }, attackText: '깜빡이며 달려든다' },
  droplet:   { name: '비말 구름', hp: 9, speed: 50, r: 9, cy: 10, kind: 'ranged', atk: 1, range: 150, inflict: ['infect', 0.5], attack: { type: 'shoot', n: 4, spread: 0.7, speed: 100, size: 3, wind: 0.5, cd: 2.2 }, attackText: '작은 물방울을 흩뿌린다' },
  handle:    { name: '오염된 손잡이', hp: 12, speed: 55, r: 8, cy: 7, kind: 'melee', atk: 1, touchInflict: 'infect', attack: { type: 'lunge', wind: 0.4, dash: 0.3, dashSpeed: 220, reach: 90, cd: 1.6 }, attackText: '닿으면 감염된다(접촉)' },
  errordrone:{ name: '오류 데이터 드론', hp: 9, speed: 70, r: 7, cy: 12, kind: 'ranged', atk: 1, range: 190, attack: { type: 'shoot', n: 2, spread: 0.25, speed: 200, size: 3, wind: 0.35, cd: 1.6 }, attackText: '깨진 데이터를 쏜다' },
  // ---------- 2~9호선 보스(각 호선 3종, 무작위 하나) ----------
  b2_colony:     { name: '항생제 내성균 군체', hp: 320, speed: 30, r: 24, cy: 26, kind: 'boss', atk: 2, shotSpeed: 120, attack: { type: 'boss', speed: 120 }, inflict: ['infect', 0.3], patterns: ['brood', 'ring', 'shell', 'double'], minions: ['germ', 'germ', 'germlet'], attackText: '내성균을 퍼뜨리고 막을 두른다' },
  b2_finch_flock:{ name: '부리 변이가 다양한 핀치 무리', hp: 300, speed: 60, r: 24, cy: 28, kind: 'boss', atk: 2, shotSpeed: 170, attack: { type: 'boss', speed: 170 }, patterns: ['fan', 'spiral', 'charge', 'summon'], minions: ['finch', 'finch', 'moth'], attackText: '여러 부리로 씨앗을 쏟아낸다' },
  b2_moth_swarm: { name: '회색가지나방 무리', hp: 290, speed: 70, r: 24, cy: 28, kind: 'boss', atk: 2, shotSpeed: 150, attack: { type: 'boss', speed: 150 }, patterns: ['spiral', 'charge', 'summon', 'ring'], minions: ['moth', 'moth', 'finch'], attackText: '무리가 소용돌이치며 덮친다' },
  b3_bullfrog:   { name: '황소개구리', hp: 330, speed: 45, r: 24, cy: 22, kind: 'boss', atk: 2, shotSpeed: 160, attack: { type: 'boss', speed: 160 }, patterns: ['charge', 'fan', 'slam', 'summon'], minions: ['frog', 'grasshopper'], attackText: '뛰어올라 내리찍고 혀를 쏜다(생태계 교란 생물)' },
  b3_nutria:     { name: '뉴트리아', hp: 310, speed: 55, r: 24, cy: 20, kind: 'boss', atk: 2, shotSpeed: 150, attack: { type: 'boss', speed: 150 }, patterns: ['charge', 'double', 'fan', 'summon'], minions: ['grasshopper', 'snake'], attackText: '물가를 헤집고 돌진한다(생태계 교란 생물)' },
  b3_locust_outbreak:{ name: '메뚜기 떼 대발생', hp: 300, speed: 60, r: 24, cy: 26, kind: 'boss', atk: 2, shotSpeed: 160, attack: { type: 'boss', speed: 160 }, patterns: ['brood', 'spiral', 'ring', 'charge'], minions: ['grasshopper', 'grasshopper', 'grasshopper'], attackText: '개체 수가 급증해 몰려온다' },
  b4_rust_golem: { name: '녹 골렘', hp: 360, speed: 35, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 120, attack: { type: 'boss', speed: 120 }, rusts: true, inflict: ['corrode', 0.3], patterns: ['slam', 'ring', 'charge', 'double'], minions: ['ironrobot', 'copperslime'], attackText: '녹슨 몸으로 내리친다(젖으면 약해짐)' },
  b4_furnace_giant:{ name: '용광로 거인', hp: 350, speed: 35, r: 24, cy: 32, kind: 'boss', atk: 2, shotSpeed: 130, attack: { type: 'boss', speed: 130 }, inflict: ['burn', 0.3], patterns: ['erupt', 'ring', 'slam', 'fan'], minions: ['charcoal', 'ironrobot'], attackText: '쇳물과 숯을 쏟는다(철광석의 환원)' },
  b4_flame_giant:{ name: '불꽃 거인', hp: 320, speed: 50, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 150, attack: { type: 'boss', speed: 150 }, inflict: ['burn', 0.4], weakTrait: { water: 1.5 }, patterns: ['spiral', 'ring', 'erupt', 'charge'], minions: ['charcoal'], attackText: '산소를 빨아들이며 타오른다(연소)' },
  b5_acidrain_cloud:{ name: '산성비 구름 거인', hp: 330, speed: 40, r: 24, cy: 34, kind: 'boss', atk: 2, shotSpeed: 130, attack: { type: 'boss', speed: 130 }, inflict: ['corrode', 0.4], weak: { basesprayer: 1.5 }, patterns: ['meteor', 'ring', 'spiral', 'summon'], minions: ['acidslime', 'smog'], attackText: '산성비를 퍼붓는다' },
  b5_marble_statue:{ name: '대리석 조각상 골렘', hp: 360, speed: 30, r: 24, cy: 32, kind: 'boss', atk: 2, shotSpeed: 120, attack: { type: 'boss', speed: 120 }, patterns: ['slam', 'shell', 'ring', 'charge'], minions: ['acidslime', 'baseslime'], attackText: '굳은 몸으로 내리친다' },
  b5_chimney:    { name: '굴뚝 배출 장치', hp: 340, speed: 30, r: 24, cy: 34, kind: 'boss', atk: 2, shotSpeed: 110, attack: { type: 'boss', speed: 110 }, inflict: ['poison', 0.4], patterns: ['double', 'summon', 'spiral', 'fan'], minions: ['smog', 'smog'], attackText: '매연을 내뿜는다' },
  b6_container:  { name: '냉동 컨테이너 골렘', hp: 370, speed: 30, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 120, attack: { type: 'boss', speed: 120 }, inflict: ['frost', 0.3], weakTrait: { burn: 1.5 }, patterns: ['slam', 'shell', 'ring', 'summon'], minions: ['icechunk', 'coldpack'], attackText: '찬 기운을 뿜으며 내리친다' },
  b6_dryice:     { name: '드라이아이스 거인', hp: 330, speed: 40, r: 24, cy: 32, kind: 'boss', atk: 2, shotSpeed: 130, attack: { type: 'boss', speed: 130 }, inflict: ['frost', 0.4], weakTrait: { burn: 1.5 }, patterns: ['spiral', 'fan', 'charge', 'ring'], minions: ['frostcrystal', 'coldpack'], attackText: '하얀 안개 속에서 얼음 조각을 날린다' },
  b6_refrigerator:{ name: '냉동기 골렘', hp: 350, speed: 35, r: 24, cy: 32, kind: 'boss', atk: 2, shotSpeed: 140, attack: { type: 'boss', speed: 140 }, patterns: ['double', 'erupt', 'slam', 'summon'], minions: ['icechunk', 'frostcrystal'], attackText: '앞은 차갑고 뒤로는 열을 내보낸다' },
  b7_sandstorm:  { name: '모래 폭풍 거인', hp: 340, speed: 50, r: 24, cy: 34, kind: 'boss', atk: 2, shotSpeed: 160, attack: { type: 'boss', speed: 160 }, patterns: ['spiral', 'charge', 'summon', 'fan'], minions: ['sandwhirl', 'scorpion'], attackText: '모래바람으로 휩쓴다' },
  b7_elnino:     { name: '엘니뇨 해류 소용돌이', hp: 330, speed: 40, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 140, attack: { type: 'boss', speed: 140 }, patterns: ['ring', 'double', 'spiral', 'meteor'], minions: ['heatblob'], attackText: '무역풍 약화 → 용승 약화 → 표층 수온 상승 뒤 휘몰아친다' },
  b7_glacier:    { name: '녹는 빙하 거인', hp: 360, speed: 35, r: 24, cy: 32, kind: 'boss', atk: 2, shotSpeed: 130, attack: { type: 'boss', speed: 130 }, patterns: ['slam', 'meteor', 'ring', 'charge'], minions: ['sandwhirl', 'heatblob'], attackText: '녹아내리며 얼음덩이를 떨군다' },
  b8_generator:  { name: '과부하 발전기', hp: 350, speed: 30, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 170, attack: { type: 'boss', speed: 170 }, inflict: ['shock', 0.3], patterns: ['spiral', 'ring', 'double', 'summon'], minions: ['sparkdrone', 'coil'], attackText: '전기를 사방으로 튀긴다' },
  b8_solar:      { name: '태양 전지 장치', hp: 320, speed: 40, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 160, attack: { type: 'boss', speed: 160 }, patterns: ['fan', 'ring', 'charge', 'summon'], minions: ['sparkdrone'], attackText: '모은 빛을 쏜다' },
  b8_boiler:     { name: '화력 발전소 보일러 거인', hp: 370, speed: 30, r: 24, cy: 34, kind: 'boss', atk: 2, shotSpeed: 130, attack: { type: 'boss', speed: 130 }, inflict: ['burn', 0.3], patterns: ['erupt', 'slam', 'ring', 'summon'], minions: ['heatflame', 'heatflame'], attackText: '증기와 열을 뿜는다' },
  b9_ai_system:  { name: '판단 오류 관제 시스템', hp: 340, speed: 30, r: 24, cy: 34, kind: 'boss', atk: 2, shotSpeed: 160, attack: { type: 'boss', speed: 160 }, patterns: ['spiral', 'double', 'fan', 'summon'], minions: ['errordrone', 'errordrone'], attackText: '치우친 학습 데이터로 엉뚱한 곳까지 쏜다' },
  b9_virus:      { name: '변이 바이러스', hp: 320, speed: 45, r: 24, cy: 28, kind: 'boss', atk: 2, shotSpeed: 140, attack: { type: 'boss', speed: 140 }, inflict: ['infect', 0.4], patterns: ['ring', 'brood', 'spiral', 'charge'], minions: ['droplet', 'handle'], attackText: '돌기를 바꾸며 퍼진다(변이)' },
  b9_camera_drone:{ name: '감시 카메라 드론', hp: 310, speed: 60, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 170, attack: { type: 'boss', speed: 170 }, patterns: ['fan', 'spiral', 'charge', 'double'], minions: ['errordrone'], attackText: '사방을 비추며 쏜다' },
};
// 방마다 물결 목록, 물결은 [몬스터, 마리 수] 묶음 목록
export const WAVES = { battle: [[['A', 4]], [['B', 3], ['C', 2]], [['A', 3], ['B', 2], ['C', 1]]],   // A·B·C는 호선마다 다른 몬스터(LINES[n].mobs), 물결 3번
  elite: [[['A', 5], ['B', 2]], [['C', 4], ['B', 3]], [['A', 4], ['C', 2], ['B', 2]]], boss: [[['BOSS', 1]]] };   // BOSS는 그 호선 보스 중 하나로 바뀐다
// 9개 호선(혼합안). 실내 모습·몬스터·보스·재난은 1호선부터 차례로 채운다. 지금은 1호선 몬스터를 모든 호선에 임시로 쓴다
export const LINES = {
  1: { name: '지층 공사선', color: '#0052A4', unit: '지질시대, 대멸종', hazard: '낙석·먼지', traps: ['vent', 'meteor', 'sewage', 'spike'], trapText: '화산 분화구가 경고 뒤 분출해 용암을 남기고, 표시된 자리에 운석이 떨어진다(대멸종의 원인 가설). 오염된 지하수 웅덩이는 감염시킨다', ready: true, bosses: ['fossilrex', 'magmagolem', 'trilomother'], mobs: ['trilobite', 'ammonite', 'mammoth'] },
  2: { name: '진화 실험선', color: '#00A84D', unit: '자연선택, 생물다양성', hazard: '감염 구름', traps: ['gas', 'spark', 'sewage', 'spike'], trapText: '배양 탱크에서 감염 구름이 새어 나오고, 고장 난 실험 장비 바닥에 전기가 흐른다. 오염된 배양액 웅덩이', bosses: ['b2_colony', 'b2_finch_flock', 'b2_moth_swarm'], mobs: ['finch', 'moth', 'germ'] },
  3: { name: '텃밭 마을선', color: '#EF7C1C', unit: '생태계 구성, 먹이 관계', hazard: '생태 교란', traps: ['vine', 'puddle', 'spike'], trapText: '밟으면 덩굴이 발을 묶고, 연못에서는 느려진다', bosses: ['b3_bullfrog', 'b3_nutria', 'b3_locust_outbreak'], mobs: ['grasshopper', 'snake', 'frog', 'vine'] },
  4: { name: '녹슨 침수선', color: '#00A5DE', unit: '산화·환원', hazard: '침수·부식', traps: ['puddle', 'drip', 'spike'], trapText: '물웅덩이에서 느려지고, 녹슨 천장에서 쇳물이 떨어진다', bosses: ['b4_rust_golem', 'b4_furnace_giant', 'b4_flame_giant'], mobs: ['ironrobot', 'charcoal', 'copperslime'] },
  5: { name: '산성비 매연선', color: '#996CAC', unit: '산·염기, 중화', hazard: '산성비', traps: ['acidrain', 'smog', 'spike'], trapText: '표시된 자리에 산성비가 떨어져 웅덩이를 남기고, 매연이 뿜어 나온다', bosses: ['b5_acidrain_cloud', 'b5_marble_statue', 'b5_chimney'], mobs: ['baseslime', 'smog', 'acidslime'] },
  6: { name: '냉동 창고선', color: '#CD7C2F', unit: '에너지 출입', hazard: '한파', traps: ['icicle', 'ice', 'spike'], trapText: '천장에서 고드름이 떨어지고, 얼음 바닥에서 동상에 걸린다', bosses: ['b6_container', 'b6_dryice', 'b6_refrigerator'], mobs: ['icechunk', 'frostcrystal', 'coldpack'] },
  7: { name: '폭염 지상선', color: '#747F00', unit: '온난화, 엘니뇨, 사막화', hazard: '폭염·모래 폭풍', traps: ['heat', 'meteor', 'spike'], trapText: '뜨거운 지면이 분출하고, 모래 폭풍에 돌이 날아든다', bosses: ['b7_sandstorm', 'b7_elnino', 'b7_glacier'], mobs: ['scorpion', 'sandwhirl', 'heatblob'] },
  8: { name: '정전 발전소선', color: '#E6186C', unit: '태양 에너지, 발전, 효율', hazard: '정전', traps: ['spark', 'heat', 'spike'], trapText: '전기 바닥이 번갈아 켜지고, 과열된 발전기가 열기를 뿜는다', bosses: ['b8_generator', 'b8_solar', 'b8_boiler'], mobs: ['heatflame', 'sparkdrone', 'coil'] },
  9: { name: '관제 센터선', color: '#BDB092', unit: '감염병, 빅데이터·AI', hazard: '감염병·데이터 교란', traps: ['spark', 'gas', 'spike'], trapText: '보안 전기 바닥과 오염된 공기 정화 장치', bosses: ['b9_ai_system', 'b9_virus', 'b9_camera_drone'], mobs: ['handle', 'errordrone', 'droplet'] },
};
// 장비 재료(아이템 방·상자·적에게서 나옴)
export const MATS = { cloth: '헝겊' };   // 2026-10-22 재료는 헝겊 하나 + 부품(run.parts)으로만 조합
// 함정 종류: vent 분출구(경고 뒤 분출, 자리에 장판), drop 떨어짐(플레이어 근처 표시 뒤 충돌), pool 상시 바닥(밟으면 상태 이상), pulse 깜빡이는 전기 바닥
// status: 맞거나 밟으면 걸리는 상태 이상
export const TRAPS = {
  vent: { mode: 'vent', name: '화산 분화구', zone: 'lava' }, gas: { mode: 'vent', name: '감염 구름 분출구', zone: 'gas' }, smog: { mode: 'vent', name: '매연 분출구', zone: 'smog' }, heat: { mode: 'vent', name: '뜨거운 지면', zone: 'fire' },
  meteor: { mode: 'drop', name: '운석' }, acidrain: { mode: 'drop', name: '산성비', zone: 'acidpool', status: 'corrode' }, icicle: { mode: 'drop', name: '고드름', status: 'frost' }, drip: { mode: 'drop', name: '쇳물', status: 'burn' },
  puddle: { mode: 'pool', name: '물웅덩이', status: 'wet' }, sewage: { mode: 'pool', name: '오염된 물웅덩이', status: 'infect' }, ice: { mode: 'pool', name: '얼음 바닥', status: 'frost' }, vine: { mode: 'pool', name: '덩굴', status: 'root' },
  spark: { mode: 'pulse', name: '전기 바닥', status: 'shock' },
  spike: { mode: 'spike', name: '솟는 바닥' },   // 바닥에서 솟아오르는 함정(호선마다 모양만 다름): 금이 간 뒤 솟아오름
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
