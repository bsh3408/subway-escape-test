// 한 판: 은신처 역에서 출발해 호선 5개를 지나 지상 출구로. 환승역마다 열린 호선 중 3개를 보여 주고 하나를 고른다
// 난이도는 호선 번호가 아니라 몇 번째로 들어갔는지로 정한다. 걸린 시간(틱)을 모두 더해 기록한다
import { createRng } from './rng.js';
import { createWorld } from './world.js';

export const RUN_LINES = 5, OFFER = 3;

export function createRun({ seed, job }) { return { seed: seed >>> 0, job, visited: [], ticks: 0, keep: null, escaped: false, dead: false }; }

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
  const w = createWorld({ seed: (run.seed + run.visited.length * 7919 + line * 104729) >>> 0, job: run.job, line, order: run.visited.length });
  if (run.keep) Object.assign(w.player, run.keep);
  return w;
}

export function finishLine(run, w) {
  run.ticks += w.tick;
  if (w.done === 'dead') { run.dead = true; return run; }
  const p = w.player; run.keep = { hp: p.hp, shield: p.shield, energy: p.energy };
  run.visited.push(w.line);
  if (run.visited.length >= RUN_LINES) run.escaped = true;
  return run;
}
