import { pathToFileURL } from 'node:url';
import { RULES } from '../src/config.ts';
import { createGame, transition, actionBlock, choiceBlock, choiceCost, currentEvent } from '../src/engine.ts';
import { validGame } from '../src/storage.ts';
import type { Action, Game, Choice } from '../src/types.ts';

export const POLICIES = {
  skip: '只取低风险、不调查',
  all: '逢事必调查',
  selective: '比较成本后调查',
  'one-risk': '开局赌一次，其后规划',
  greedy: '只追即时收益',
  repair: '持续冒险并补救',
} as const;
export type Policy = keyof typeof POLICIES;

// Policies only use visible choices/costs and symptoms. Never inspect rolls, RNG or future events.
export function strategy(s: Game, policy: Policy): Action {
  if (s.phase === 'feedback') return { type: 'continue' };
  if (policy !== 'greedy' && s.heartDemon >= 55) return { type: 'meditate' };
  if (policy !== 'greedy' && s.hazards.length) {
    if (s.hazards.some(h => !h.diagnosed)) return { type: 'diagnose' };
    if (!actionBlock(s, { type: 'remedy', kind: s.hazards[0].kind })) return { type: 'remedy', kind: s.hazards[0].kind };
  }
  if (!actionBlock(s, { type: 'tribulate' })) return { type: 'tribulate' };
  const e = currentEvent(s);
  const value = (c: Choice) => (c.gain - choiceCost(s, c).cultivation) / choiceCost(s, c).life;
  const available = e.choices.filter(c => !choiceBlock(s, c));
  const safe = available.filter(c => !c.risk && c.contract !== 'accept' && !c.cure).sort((a, b) => value(b) - value(a));
  if (policy === 'all' && !actionBlock(s, { type: 'investigate' })) return { type: 'investigate' };
  if (policy === 'one-risk' && e.id === 'last_batch' && !s.encounterState.investigated) return { type: 'choose', id: 'one' };
  if (policy === 'greedy' || policy === 'repair') return { type: 'choose', id: available.sort((a, b) => value(b) - value(a))[0].id };
  if (policy !== 'skip' && !actionBlock(s, { type: 'investigate' })) {
    if (s.heartDemon >= RULES.cloudedHeart) return { type: 'meditate' };
    const afterResearch = e.choices.filter(c => c.investigated && !c.risk && !c.refund);
    if (afterResearch.some(c => c.gain / ((c.life ?? 1) + 1) > value(safe[0]))) return { type: 'investigate' };
  }
  return { type: 'choose', id: safe[0].id };
}
export function play(seed: number, policy: Policy): Game {
  let s = createGame(seed);
  for (let step = 0; s.phase !== 'ended' && step < 200; step++) {
    const next = transition(s, strategy(s, policy));
    if (next === s) throw new Error(`Blocked ${policy} seed ${seed}`);
    if (!validGame(next)) throw new Error(`Invalid state ${policy} seed ${seed}`);
    s = next;
  }
  if (!s.ending) throw new Error(`Not ended ${policy} seed ${seed}`);
  return s;
}
export function comparePolicies(runs = 1000) {
  return Object.entries(POLICIES).map(([policy, label]) => {
    const endings: Record<string, number> = {};
    const winningLife: number[] = [];
    let actions = 0, maxSaveBytes = 0, investigations = 0;
    for (let seed = 1; seed <= runs; seed++) {
      const s = play(seed, policy as Policy);
      endings[s.ending!.title] = (endings[s.ending!.title] ?? 0) + 1;
      if (s.ending!.title === '成功结丹') winningLife.push(s.life);
      actions += s.history.length;
      investigations += s.history.filter(h => h.action === '调查线索').length;
      maxSaveBytes = Math.max(maxSaveBytes, Buffer.byteLength(JSON.stringify(s)));
    }
    return { policy, label, runs, endings, averageActions: +(actions / runs).toFixed(2),
      averageInvestigations: +(investigations / runs).toFixed(2),
      winningLife: winningLife.length ? {
        average: +(winningLife.reduce((a, b) => a + b, 0) / winningLife.length).toFixed(2),
        min: Math.min(...winningLife), max: Math.max(...winningLife),
      } : null, maxSaveBytes };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify({ seeds: '1..1000', rulesVersion: RULES.rulesVersion,
    note: '固定启发式策略，不读取隐藏结果，不代表真实玩家胜率。胜局余寿只统计成功结丹者。', results: comparePolicies() }, null, 2));
}
