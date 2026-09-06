import test from 'node:test';
import assert from 'node:assert/strict';
import { closingBudget, createGame, transition, riskLabel } from '../src/engine.ts';
import { loadGame, saveGame, SAVE_KEY, LEGACY_SAVE_KEY } from '../src/storage.ts';
import { comparePolicies } from '../scripts/balance.ts';

test('closing budget reserves a surviving tribulation, diagnoses together and includes treatment losses', () => {
  const s = createGame(1);
  assert.deepEqual(closingBudget(s), { reserve: 2, spendable: 10, diagnose: 0, remedy: 0, meditate: 0, cultivationGap: 60 });
  s.cultivation = 100; s.life = 6; s.heartDemon = 60;
  s.hazards = [
    { kind: '丹毒', source: 'last_batch', diagnosed: false, action: '温炉，取一瓶' },
    { kind: '经脉暗伤', source: 'cave', diagnosed: false, action: '相信道友，先守阵' },
  ];
  assert.deepEqual(closingBudget(s), { reserve: 8, spendable: -2, diagnose: 1, remedy: 4, meditate: 1, cultivationGap: 12 });
  s.hazards.forEach(h => h.diagnosed = true); s.heartDemon = 59;
  assert.equal(closingBudget(s).reserve, 6);
});

test('a moderate gamble saves investigation time but its stored outcome can consume the safety margin', () => {
  const safe = createGame(1);
  safe.encounterState.rolls.one = .26;
  const unsafe = structuredClone(safe); unsafe.encounterState.rolls.one = .24;
  const good = transition(safe, { type: 'choose', id: 'one' });
  const bad = transition(unsafe, { type: 'choose', id: 'one' });
  assert.equal(good.cultivation, 56); assert.equal(bad.cultivation, 56);
  assert.equal(good.life, 11); assert.equal(bad.life, 11);
  assert.equal(good.hazards.length, 0); assert.equal(bad.hazards.length, 1);
  assert.equal(closingBudget(good).spendable - closingBudget(bad).spendable, 3);
  assert.equal(riskLabel(.25), '风险中');
  assert.equal(riskLabel(.6), '风险高');
});

test('starting or saving a current run preserves the old rules-1 save byte for byte', () => {
  const old = JSON.stringify({ ...createGame(1), rulesVersion: 1, life: 18 });
  const records = new Map([[LEGACY_SAVE_KEY, old]]);
  const store = { getItem: (k: string) => records.get(k) ?? null, setItem: (k: string, v: string) => { records.set(k, v); } };
  const first = loadGame(store);
  assert.equal(first.kind, 'empty');
  if (first.kind === 'empty') assert.match(first.message!, /旧版行笺另存保留/);
  assert.equal(records.has(SAVE_KEY), false);
  const s = transition(createGame(2), { type: 'investigate' });
  assert.ok(saveGame(store, s));
  assert.equal(records.get(LEGACY_SAVE_KEY), old);
  const restored = loadGame(store);
  assert.equal(restored.kind, 'valid');
  if (restored.kind === 'valid') assert.deepEqual(restored.game, s);
});

test('resource tradeoffs survive a fixed-seed cohort instead of rewarding automatic full investigation', () => {
  const results = comparePolicies(300);
  const all = results.find(r => r.policy === 'all')!;
  const selective = results.find(r => r.policy === 'selective')!;
  const risk = results.find(r => r.policy === 'one-risk')!;
  assert.ok(all.endings['寿尽坐化'] > 60, 'full investigation must actually exhaust the budget in many runs');
  assert.ok(selective.endings['成功结丹'] > 250, 'a considered low-risk route must remain viable');
  assert.ok(selective.endings['成功结丹'] > all.endings['成功结丹']);
  assert.ok(selective.winningLife!.average <= 3, 'planned wins should not retain excessive slack');
  assert.ok(risk.endings['成功结丹'] > 0 && risk.endings['寿尽坐化'] > 0, 'moderate risk must have a real upside and downside');
  assert.ok(risk.winningLife!.average > selective.winningLife!.average, 'successful gambles should buy usable time');
});
