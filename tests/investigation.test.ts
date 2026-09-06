import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../src/config.ts';
import { EVENT_MAP } from '../src/events.ts';
import { createGame, transition, actionBlock } from '../src/engine.ts';
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
    let s = at(createGame(8), loss === 'extra' ? 'cave_return' : 'last_batch');
    s.investigations = 0; s.safeStreak = 2;
    if (loss === 'risk') s.encounterState.rolls.one = 0;
    if (loss === 'existing') s.hazards = [{ kind: '丹毒', source: 'last_batch', diagnosed: false, action: '温炉，取一瓶' }];
    s = transition(s, { type: 'choose', id: loss === 'extra' ? 'rotate' : 'one' });
    assert.equal(s.investigations, loss === 'none' ? 1 : 0);
    assert.equal(s.safeStreak, 0);
  }
});

test('crossing the heart threshold stops recovery; meditation does not refund charges', () => {
  let s = createGame(8); s.investigations = 0; s.safeStreak = 2; s.heartDemon = 38;
  s = quiet(s); assert.equal(s.heartDemon, 40); assert.equal(s.safeStreak, 0); assert.equal(s.investigations, 0);
  s = transition(s, { type: 'continue' }); s = transition(s, { type: 'meditate' });
  assert.equal(s.heartDemon, 20); assert.equal(s.investigations, 0); assert.equal(s.safeStreak, 0);
});

test('clouded investigation executes only a currently legal choice and records both costs', () => {
  for (const [roll, id] of [[0, 'one'], [.5, 'all'], [.999, 'leave']] as const) {
    const s = createGame(8); s.heartDemon = RULES.cloudedHeart; s.safeStreak = 2;
    s.encounterState.impulseRoll = roll; s.encounterState.rolls[id] = 0;
    const c = EVENT_MAP.last_batch.choices.find(c => c.id === id)!;
    const n = transition(s, { type: 'investigate' });
    assert.equal(n.cultivation, s.cultivation + c.gain);
    assert.equal(n.life, 10); assert.equal(n.investigations, 1); assert.equal(n.safeStreak, 0);
    assert.equal(n.encounterState.investigated, false);
    assert.equal(n.history.length, 2); assert.equal(n.history[1].action, c.label);
    assert.equal(n.history[0].delta.life + n.history[1].delta.life, -2);
    assert.equal(n.hazards.length, c.risk ? 1 : 0);
    assert.equal(n.feedback!.advance, true); assert.equal(validGame(n), true);
    assert.deepEqual(transition(s, { type: 'investigate' }), n);
    assert.equal(transition(n, { type: 'investigate' }, s.revision), n);
  }
});

test('forced contracts retain their consequences and scenes without investigation stay blocked', () => {
  let s = at(createGame(8), 'elder'); s.heartDemon = 40; s.encounterState.impulseRoll = .5;
  let n = transition(s, { type: 'investigate' });
  assert.ok(n.pending); assert.equal(n.pending.investigated, false); assert.equal(n.life, 10);
  s = at(createGame(8), 'fire'); s.heartDemon = 40; s.pending = { due: 1, gain: 22, investigated: false };
  assert.match(actionBlock(s, { type: 'investigate' })!, /没有/);
  n = transition(s, { type: 'investigate' });
  assert.equal(n, s); assert.equal(n.life, 12); assert.ok(n.pending);
});

test('last life pays investigation only; two lives execute the choice before death', () => {
  for (const life of [1, 2]) {
    const s = createGame(8); s.life = life; s.heartDemon = 40; s.encounterState.impulseRoll = 0;
    const n = transition(s, { type: 'investigate' });
    assert.equal(n.ending!.title, '寿尽坐化'); assert.equal(n.investigations, 1);
    assert.equal(n.history.length, life); assert.equal(n.cultivation, life === 1 ? 40 : 56);
    assert.equal(validGame(n), true);
  }
});

test('reload preserves charges, progress and impulse result while rules2 stays untouched', () => {
  const records = new Map([['cijienandu.save.rules2', 'old-save']]);
  const store = { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
  assert.equal(loadGame(store).kind, 'empty');
  const s = createGame(8); s.heartDemon = 40; s.investigations = 1; s.safeStreak = 0;
  saveGame(store, s); const loaded = loadGame(store); assert.equal(loaded.kind, 'valid');
  if (loaded.kind === 'valid') assert.deepEqual(transition(loaded.game, { type: 'investigate' }), transition(s, { type: 'investigate' }));
  assert.equal(records.get('cijienandu.save.rules2'), 'old-save'); assert.ok(records.has(SAVE_KEY));
  for (const bad of [{ investigations: 3 }, { safeStreak: 3 }, { encounterState: { ...s.encounterState, impulseRoll: 1 } }]) assert.equal(validGame({ ...s, ...bad }), false);
});
