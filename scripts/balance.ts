import { createGame, transition, actionBlock, choiceBlock, choiceCost, currentEvent } from '../src/engine.ts';
import { validGame } from '../src/storage.ts';
import type { Action, Game } from '../src/types.ts';

export function strategy(s: Game, policy: string): Action {
  if (s.phase === 'feedback') return { type: 'continue' };
  if (policy !== 'greedy' && s.heartDemon >= 55) return { type: 'meditate' };
  if (policy === 'repair' && s.hazards.length) {
    if (s.hazards.some(h => !h.diagnosed)) return { type: 'diagnose' };
    const h = s.hazards[0];
    if (!actionBlock(s, { type: 'remedy', kind: h.kind })) return { type: 'remedy', kind: h.kind };
  }
  if (!actionBlock(s, { type: 'tribulate' })) return { type: 'tribulate' };
  const e = currentEvent(s);
  if (policy === 'clues' && e.investigation && !s.encounterState.investigated && s.life > 3) return { type: 'investigate' };
  let choices = e.choices.filter(c => !choiceBlock(s, c));
  if (policy === 'safe' || policy === 'clues') choices = choices.filter(c => !c.risk && c.contract !== 'accept');
  choices.sort((a, b) => {
    const value = (c: typeof a) => (c.gain - choiceCost(s, c).cultivation) / choiceCost(s, c).life;
    return value(b) - value(a);
  });
  return { type: 'choose', id: choices[0].id };
}
const policies = { safe: '保守取稳', greedy: '只看最高收益', clues: '调查后选择', repair: '冒险后补救' };
const output = [];
for (const [policy, label] of Object.entries(policies)) {
  const endings: Record<string, number> = {}; let life = 0, actions = 0, maxSaveBytes = 0;
  for (let seed = 1; seed <= 1000; seed++) {
    let s = createGame(seed);
    for (let step = 0; s.phase !== 'ended' && step < 200; step++) {
      const next = transition(s, strategy(s, policy));
      if (next === s) throw new Error(`Blocked ${policy} seed ${seed}`);
      if (!validGame(next)) throw new Error(`Invalid state ${policy} seed ${seed} ${JSON.stringify(next)}`);
      s = next;
    }
    if (!s.ending) throw new Error(`Not ended ${seed}`);
    endings[s.ending.title] = (endings[s.ending.title] ?? 0) + 1;
    life += s.life; actions += s.history.length;
    maxSaveBytes = Math.max(maxSaveBytes, Buffer.byteLength(JSON.stringify(s)));
  }
  output.push({ policy: label, runs: 1000, endings, averageActions: +(actions / 1000).toFixed(2), averageLifeLeft: +(life / 1000).toFixed(2), maxSaveBytes });
}
console.log(JSON.stringify({ seeds: '1..1000', rulesVersion: 1, note: '脚本策略对比，不代表真实玩家胜率或阅读时长。', results: output }, null, 2));
