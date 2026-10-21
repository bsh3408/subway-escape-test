// 직업 6명, 스킬(마우스 오른쪽, cd는 대기 시간 초), 시작 무기, 구역 1(지층 터널) 몬스터. 수치는 첫 판 기준
export const JOBS = {
  driver:    { name: '지하철 기관사', hp: 7, shield: 5, energy: 160, weapon: 'shotgun', sprite: 0, skill: { id: 'regen', name: '회생 제동', cd: 8 } },
  geologist: { name: '지질학자', hp: 6, shield: 4, energy: 180, weapon: 'hammer', sprite: 1, skill: { id: 'strata', name: '지층 판독', cd: 14 } },
  ecologist: { name: '생태학자', hp: 6, shield: 4, energy: 180, weapon: 'smg', sprite: 2, skill: { id: 'biocontrol', name: '생물적 방제', cd: 16 } },
  chemist:   { name: '화학 연구원', hp: 5, shield: 4, energy: 200, weapon: 'sprayer', sprite: 3, skill: { id: 'neutral', name: '중화제 투척', cd: 9 } },
  meteo:     { name: '기상 연구원', hp: 5, shield: 5, energy: 200, weapon: 'beam', sprite: 4, skill: { id: 'warning', name: '기상 경보', cd: 15 } },
  medic:     { name: '응급 구조사', hp: 6, shield: 3, energy: 180, weapon: 'medpistol', sprite: 5, skill: { id: 'firstaid', name: '응급 처치', cd: 18 } },
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
// 구역 1 몬스터: 근접(삼엽충, 고생대 표준화석), 돌진(암모나이트, 중생대 표준화석), 원거리(내성균 덩어리), 보스(화석 짜깁기 공룡)
export const MONSTERS = {
  trilobite: { name: '삼엽충', hp: 10, speed: 70, r: 9, cy: 6, kind: 'melee', atk: 1 },
  germ:      { name: '내성균 덩어리', hp: 12, speed: 40, r: 9, cy: 8, kind: 'ranged', atk: 1, range: 170, shotSpeed: 150 },
  ammonite:  { name: '암모나이트', hp: 9, speed: 50, r: 9, cy: 10, kind: 'roller', atk: 1, dashSpeed: 260 },
  fossilrex: { name: '화석 짜깁기 공룡', hp: 240, speed: 45, r: 24, cy: 30, kind: 'boss', atk: 2, shotSpeed: 140 },
};
// 방마다 물결 목록, 물결은 [몬스터, 마리 수] 묶음 목록
export const WAVES = { battle: [[['trilobite', 3]], [['ammonite', 2], ['germ', 1]]], elite: [[['trilobite', 4], ['ammonite', 1]], [['germ', 3], ['ammonite', 2]]], boss: [[['fossilrex', 1]]] };
// 9개 호선(혼합안). 실내 모습·몬스터·보스·재난은 1호선부터 차례로 채운다. 지금은 1호선 몬스터를 모든 호선에 임시로 쓴다
export const LINES = {
  1: { name: '지층 공사선', color: '#0052A4', unit: '지질시대, 대멸종', hazard: '낙석·먼지', ready: true },
  2: { name: '진화 실험선', color: '#00A84D', unit: '자연선택, 생물다양성', hazard: '감염 구름' },
  3: { name: '텃밭 마을선', color: '#EF7C1C', unit: '생태계 구성, 먹이 관계', hazard: '생태 교란' },
  4: { name: '녹슨 침수선', color: '#00A5DE', unit: '산화·환원', hazard: '침수·부식' },
  5: { name: '산성비 매연선', color: '#996CAC', unit: '산·염기, 중화', hazard: '산성비' },
  6: { name: '냉동 창고선', color: '#CD7C2F', unit: '에너지 출입', hazard: '한파' },
  7: { name: '폭염 지상선', color: '#747F00', unit: '온난화, 엘니뇨, 사막화', hazard: '폭염·모래 폭풍' },
  8: { name: '정전 발전소선', color: '#E6186C', unit: '태양 에너지, 발전, 효율', hazard: '정전' },
  9: { name: '관제 센터선', color: '#BDB092', unit: '감염병, 빅데이터·AI', hazard: '감염병·데이터 교란' },
};
