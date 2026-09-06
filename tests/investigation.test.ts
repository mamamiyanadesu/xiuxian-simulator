import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, FALLBACK, EVENT_MAP } from '../src/events.ts';
import { createGame, transition, actionBlock, isUncontrolled } from '../src/engine.ts';
import { validGame, loadGame, saveGame, SAVE_KEY } from '../src/storage.ts';
import type { Game } from '../src/types.ts';

function at(s: Game, id: string) {
  s.phase = 'encounter'; s.feedback = null; s.encounterId = id;
  s.encounterState = { investigated: false, impulseRoll: 0, rolls: Object.fromEntries(EVENT_MAP[id].choices.map(c => [c.id, .99])) };
  return s;
}
function quiet(s: Game) { return transition(at(s, 'quiet'), { type: 'choose', id: 'practice' }); }

test('investigation spends one charge and life, and exhaustion blocks without mutation', () => {
  let s = transition(createGame(8), { type: 'investigate' });
  assert.equal(s.investigations, 1); assert.equal(s.life, 11);
  s = transition(at(s, 'cave'), { type: 'investigate' });
  assert.equal(s.investigations, 0); assert.equal(s.life, 10);
  at(s, 'ferry'); assert.match(actionBlock(s, { type: 'investigate' })!, /用尽/);
  assert.equal(transition(s, { type: 'investigate' }), s);
});

test('three clean gains restore one charge, cap cannot bank progress, leaving cannot farm it', () => {
  let s = createGame(8); s.investigations = 0;
  s = quiet(s); s = quiet(s);
  assert.equal(s.safeStreak, 2); assert.equal(s.investigations, 0);
  s = quiet(s); assert.equal(s.safeStreak, 0); assert.equal(s.investigations, 1);
  assert.match(s.feedback!.text, /调查次数 \+1/);
  s.investigations = 2; s = quiet(s);
  assert.equal(s.safeStreak, 0); assert.equal(s.investigations, 2);
  s.investigations = 0; s = transition(at(s, 'last_batch'), { type: 'choose', id: 'leave' });
  assert.equal(s.safeStreak, 0);
});

test('lucky risks qualify, but a bad outcome, existing injury or extra cost breaks the streak', () => {
  for (const loss of ['none', 'risk', 'existing', 'extra']) {
    let s = at(createGame(8), loss === 'extra' ? 'fire' : 'last_batch');
    s.investigations = 0; s.safeStreak = 2;
    if (loss === 'extra') s.pending = { due: 1, gain: 22, investigated: false };
    if (loss === 'risk') s.encounterState.rolls.one = 0;
    if (loss === 'existing') s.hazards = [{ kind: '丹毒', source: 'last_batch', diagnosed: false, action: '温炉，取一瓶' }];
    s = transition(s, { type: 'choose', id: loss === 'extra' ? 'finish' : 'one' });
    assert.equal(s.investigations, loss === 'none' ? 1 : 0);
    assert.equal(s.safeStreak, 0);
  }
});

test('crossing the heart threshold stops recovery; meditation does not refund charges', () => {
  let s = createGame(8); s.investigations = 0; s.safeStreak = 2; s.heartDemon = 39;
  s = quiet(s); assert.equal(s.heartDemon, 41); assert.equal(s.safeStreak, 0); assert.equal(s.investigations, 0);
  s = transition(s, { type: 'continue' }); s = transition(s, { type: 'meditate' });
  assert.equal(s.heartDemon, 21); assert.equal(s.investigations, 0); assert.equal(s.safeStreak, 0);
});


test('zero starts vary across all eligible openings and every event has exactly one hidden option', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 1000; seed++) {
    const s = createGame(seed); seen.add(s.encounterId);
    assert.equal(s.cultivation, 0); assert.equal(s.encounterCount, 1); assert.ok(validGame(s));
    assert.ok(!EVENT_MAP[s.encounterId].followup && !EVENT_MAP[s.encounterId].eligibleFlag);
    assert.deepEqual(s, createGame(seed));
  }
  assert.equal(seen.size, EVENTS.filter(e => !e.followup && !e.eligibleFlag).length);
  for (const e of [...EVENTS, FALLBACK]) {
    assert.equal(e.choices.filter(c => c.investigated).length, 1, e.id);
    assert.ok(e.investigation);
  }
});

test('40 allows recovery and 41 through 70 still permits normal investigation', () => {
  let s = createGame(8); s.investigations = 0; s.safeStreak = 2; s.heartDemon = 38;
  s = quiet(s); assert.equal(s.heartDemon, 40); assert.equal(s.investigations, 1);
  for (const heart of [41, 70]) {
    s = at(createGame(8), 'last_batch'); s.heartDemon = heart;
    const n = transition(s, { type: 'investigate' });
    assert.equal(n.cultivation, 0); assert.equal(n.life, 11); assert.equal(n.investigations, 1);
    assert.equal(n.encounterState.investigated, true); assert.equal(n.feedback!.advance, false);
  }
});

test('above 70 alternates forced-normal-forced choices and forbids bypass by tools or investigation', () => {
  let s = at(createGame(8), 'last_batch'); s.heartDemon = 71; s.encounterState.impulseRoll = .999;
  assert.ok(isUncontrolled(s));
  for (const type of ['investigate', 'meditate', 'diagnose', 'tribulate', 'settle'] as const) assert.ok(actionBlock(s, { type }));
  assert.ok(actionBlock(s, { type: 'choose', id: 'one' }));
  s = transition(s, { type: 'impulse' });
  assert.equal(s.life, 11); assert.equal(s.investigations, 2); assert.equal(s.impulseNext, false);
  assert.match(s.history.at(-1)!.action, /心魔代选/);
  s = transition(s, { type: 'continue' }); assert.equal(isUncontrolled(s), false);
  s = quiet(s); assert.equal(s.impulseNext, true);
  s = transition(s, { type: 'continue' }); assert.equal(isUncontrolled(s), true);
});

test('forced choices only select legal options, retain costs and risks, and cannot reroll or double-submit', () => {
  for (const [roll, id] of [[0, 'one'], [.5, 'all'], [.999, 'leave']] as const) {
    const s = at(createGame(8), 'last_batch'); s.heartDemon = 71;
    s.encounterState.impulseRoll = roll; s.encounterState.rolls[id] = 0;
    const c = EVENT_MAP.last_batch.choices.find(c => c.id === id)!;
    const n = transition(s, { type: 'impulse' });
    assert.equal(n.cultivation, c.gain); assert.equal(n.life, 11); assert.equal(n.investigations, 2);
    assert.equal(n.hazards.length, c.risk ? 1 : 0); assert.ok(validGame(n));
    assert.deepEqual(transition(s, { type: 'impulse' }), n);
    assert.equal(transition(n, { type: 'impulse' }, s.revision), n);
  }
  const s = at(createGame(8), 'elder'); s.heartDemon = 71;
  const n = transition(s, { type: 'impulse' }); assert.ok(n.pending); assert.equal(n.pending.gain, 22);
  const broke = at(createGame(8), 'fire'); broke.heartDemon = 71; broke.pending = { due: 1, gain: 22, investigated: false };
  const paid = transition(broke, { type: 'impulse' });
  assert.equal(paid.life, 9); assert.equal(paid.cultivation, 12); assert.equal(paid.pending, null);
});

test('calming during a normal turn releases control, and re-entering high heart starts forced', () => {
  let s = at(createGame(8), 'last_batch'); s.heartDemon = 71; s.impulseNext = false;
  s = transition(s, { type: 'meditate' }); assert.equal(s.heartDemon, 51); assert.equal(s.impulseNext, true);
  s = transition(s, { type: 'continue' });
  s = transition(s, { type: 'choose', id: 'all' });
  assert.equal(s.heartDemon, 73); assert.equal(s.impulseNext, true);
});

test('final-life forced choice settles once; saves preserve control phase and old rules3 data', () => {
  const s = at(createGame(8), 'last_batch'); s.life = 1; s.heartDemon = 71;
  const n = transition(s, { type: 'impulse' });
  assert.equal(n.ending!.title, '寿尽坐化'); assert.equal(n.investigations, 2);
  assert.equal(n.history.length, 1); assert.equal(n.cultivation, 20); assert.ok(validGame(n));
  const records = new Map([['cijienandu.save.rules3', 'old-save']]);
  const store = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  assert.equal(loadGame(store).kind, 'empty');
  for (const source of [s, n]) {
    saveGame(store, source); const loaded = loadGame(store); assert.equal(loaded.kind, 'valid');
    if (loaded.kind === 'valid') assert.deepEqual(loaded.game, source);
  }
  assert.equal(records.get('cijienandu.save.rules3'), 'old-save'); assert.ok(records.has(SAVE_KEY));
  for (const bad of [{ impulseNext: 1 }, { investigations: 3 }, { safeStreak: 3 }, { encounterState: { ...s.encounterState, impulseRoll: 1 } }]) assert.equal(validGame({ ...s, ...bad }), false);
});
