// 직업 6명, 시작 무기, 구역 1(지층 터널) 몬스터. 수치는 첫 판 기준
export const JOBS = {
  driver:    { name: '지하철 기관사', hp: 7, shield: 5, energy: 160, weapon: 'shotgun', sprite: 0 },
  geologist: { name: '지질학자', hp: 6, shield: 4, energy: 180, weapon: 'hammer', sprite: 1 },
  ecologist: { name: '생태학자', hp: 6, shield: 4, energy: 180, weapon: 'smg', sprite: 2 },
  chemist:   { name: '화학 연구원', hp: 5, shield: 4, energy: 200, weapon: 'sprayer', sprite: 3 },
  meteo:     { name: '기상 연구원', hp: 5, shield: 5, energy: 200, weapon: 'beam', sprite: 4 },
  medic:     { name: '응급 구조사', hp: 6, shield: 3, energy: 180, weapon: 'medpistol', sprite: 5 },
};
export const JOB_ORDER = ['driver', 'geologist', 'ecologist', 'chemist', 'meteo', 'medic'];
// 무기: rate 초당 발사, count 한 번에 나가는 탄, spread 퍼짐(라디안), speed 픽셀/초, range 픽셀, energy 한 발 에너지
export const WEAPONS = {
  shotgun:   { name: '쌍열 산탄총', sprite: 0, dmg: 3, rate: 2.5, count: 5, spread: 0.5, speed: 420, range: 180, energy: 2, kick: 1 },
  hammer:    { name: '망치 권총', sprite: 1, dmg: 5, rate: 4, count: 1, spread: 0.04, speed: 480, range: 300, energy: 1, kick: 0.6 },
  smg:       { name: '기관단총', sprite: 2, dmg: 2, rate: 9, count: 1, spread: 0.15, speed: 520, range: 260, energy: 1, kick: 0.35 },
  sprayer:   { name: '액체 분사기', sprite: 3, dmg: 2, rate: 6, count: 2, spread: 0.25, speed: 360, range: 160, energy: 1, kick: 0.4 },
  beam:      { name: '손전등 광선총', sprite: 4, dmg: 4, rate: 5, count: 1, spread: 0, speed: 700, range: 340, energy: 1, kick: 0.5 },
  medpistol: { name: '구급 권총', sprite: 5, dmg: 4, rate: 4.5, count: 1, spread: 0.05, speed: 480, range: 280, energy: 0, kick: 0.5 },
};
// cy: 발밑에서 몸 가운데까지 높이(총알이 맞는 곳)
// 구역 1 몬스터: 근접(삼엽충), 원거리(내성균 덩어리), 보스(대멸종의 그림자)
export const MONSTERS = {
  trilobite: { name: '삼엽충', hp: 10, speed: 70, r: 9, cy: 6, kind: 'melee', atk: 1 },
  germ:      { name: '내성균 덩어리', hp: 12, speed: 40, r: 9, cy: 8, kind: 'ranged', atk: 1, range: 170, shotSpeed: 150 },
  shadow:    { name: '대멸종의 그림자', hp: 220, speed: 45, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 140 },
};
export const WAVES = { battle: [['trilobite', 3], ['germ', 2]], elite: [['trilobite', 4], ['germ', 3]], boss: [['shadow', 1]] };
