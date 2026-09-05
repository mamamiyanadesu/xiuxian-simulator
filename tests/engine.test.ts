import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition, currentEvent, actionBlock } from '../src/engine.ts';
import { EVENTS, EVENT_MAP } from '../src/events.ts';
import { validGame, loadGame, saveGame, SAVE_KEY } from '../src/storage.ts';
import type { Game, Action } from '../src/types.ts';

function at(id: string, rolls = .01): Game {
  const s = createGame(7); s.encounterId = id; s.seenEvents = [id];
  s.encounterState = { investigated: false, rolls: Object.fromEntries(EVENT_MAP[id].choices.map(c => [c.id, rolls])) };
  return s;
}
function step(s: Game, action: Action) { const n = transition(s, action); return n.phase === 'feedback' ? transition(n, { type: 'continue' }) : n; }

test('12 authored nodes, meaningful investigation and four-tier choice data', () => {
  assert.equal(EVENTS.length, 12);
  assert.equal(new Set(EVENTS.map(e => e.id)).size, 12);
  EVENTS.forEach(e => {
    assert.ok(e.truth && e.paragraphs.length && e.clues.length);
    e.choices.filter(c => c.investigated).forEach(() => assert.ok(e.investigation || e.followup));
  });
});
test('same seed and actions reproduce exact game including all action rolls', () => {
  let a = createGame(190), b = createGame(190);
  const commands: Action[] = [{ type: 'investigate' }, { type: 'continue' }, { type: 'choose', id: 'refine' }, { type: 'continue' }, { type: 'meditate' }, { type: 'continue' }];
  for (const c of commands) { a = transition(a, c); b = transition(b, c); }
  assert.deepEqual(a, b);
});
test('investigation preserves rolls, costs once, retains encounter and does not move contract deadline', () => {
  const s = createGame(1); s.pending = { due: 3, gain: 22, investigated: false };
  const original = structuredClone(s);
  const n = step(s, { type: 'investigate' });
  assert.equal(n.life, 17); assert.equal(n.encounterId, s.encounterId); assert.equal(n.encounterCount, 1);
  assert.deepEqual(n.encounterState.rolls, s.encounterState.rolls); assert.deepEqual(n.pending, s.pending);
  assert.equal(transition(n, { type: 'investigate' }), n); assert.deepEqual(s, original);
});
test('hazard is visible, diagnostic identifies source, remedy consumes exact costs', () => {
  let s = at('last_batch'); s = transition(s, { type: 'choose', id: 'all' });
  assert.equal(s.hazards[0].kind, '丹毒'); assert.ok(s.history[0].symptom); assert.equal(s.cultivation, 62);
  s = transition(s, { type: 'continue' }); const id = s.encounterId;
  s = step(s, { type: 'diagnose' }); assert.equal(s.hazards[0].diagnosed, true);
  assert.match(s.history.at(-1)!.result, /最后一炉/);
  const before = structuredClone(s); s = step(s, { type: 'remedy', kind: '丹毒' });
  assert.equal(s.hazards.length, 0); assert.equal(s.cultivation, before.cultivation - 10); assert.equal(s.life, before.life - 2); assert.equal(s.encounterId, id);
  assert.match(s.history.at(-1)!.truth, /最后一炉/);
});
test('same hazard retains first cause and does not stack', () => {
  const s = at('herb'); s.hazards = [{ kind: '丹毒', source: 'last_batch', diagnosed: true, action: '封好旧丹，全拿走' }];
  const n = transition(s, { type: 'choose', id: 'leaves' });
  assert.equal(n.hazards.length, 1); assert.equal(n.hazards[0].source, 'last_batch'); assert.ok(n.hazards[0].diagnosed);
});
test('stale revisions and feedback phase prevent duplicate deductions and encounter skips', () => {
  const s = createGame(4); const n = transition(s, { type: 'choose', id: 'all' }, s.revision);
  assert.equal(transition(n, { type: 'choose', id: 'all' }, s.revision), n);
  assert.equal(transition(n, { type: 'choose', id: 'all' }), n);
  const next = transition(n, { type: 'continue' }, n.revision);
  assert.equal(transition(next, { type: 'continue' }, n.revision), next);
});
test('contract followup arrives within next 1–2 encounters for 100 seeds', () => {
  for (let seed = 0; seed < 100; seed++) {
    let s = at('elder'); s.rngState = seed;
    s = step(s, { type: 'choose', id: 'accept' });
    assert.ok(s.pending);
    if (s.encounterId !== 'fire') { const e = currentEvent(s); s = step(s, { type: 'choose', id: e.choices.find(c => !c.investigated && !c.flag && !c.contract && !c.cure)!.id }); }
    assert.equal(s.encounterId, 'fire'); assert.ok(s.encounterCount <= 3);
  }
});
test('contract refund uses original received amount, negotiated exit requires actual investigation', () => {
  let s = at('elder'); s = step(s, { type: 'investigate' }); s = step(s, { type: 'choose', id: 'accept' });
  if (s.encounterId !== 'fire') s = transition(s, { type: 'settle' });
  const before = s.cultivation; s = step(s, { type: 'choose', id: 'negotiate' });
  assert.equal(s.cultivation, before - 11); assert.equal(s.pending, null);
});
test('early settlement preserves interrupted encounter rolls and research', () => {
  let s = createGame(13); s.pending = { due: 3, gain: 22, investigated: false };
  s = step(s, { type: 'investigate' }); const encounter = structuredClone(s.encounterState);
  s = transition(s, { type: 'settle' }); assert.equal(s.encounterId, 'fire');
  s = step(s, { type: 'choose', id: 'refund' });
  assert.equal(s.encounterId, 'last_batch'); assert.deepEqual(s.encounterState, encounter); assert.equal(s.interrupted, null);
});
test('pending contract blocks tribulation and unfinished contract appears in terminal epilogue', () => {
  const s = at('elder'); s.life = 1;
  const n = transition(s, { type: 'choose', id: 'accept' });
  assert.equal(n.ending?.title, '寿尽坐化'); assert.match(n.ending!.reasons.join(''), /约定未了/); assert.equal(n.history.length, 1);
  const t = createGame(1); t.cultivation = 100; t.pending = { due: 3, gain: 22, investigated: false };
  assert.match(actionBlock(t, { type: 'tribulate' })!, /约定/);
});
test('all four endings are determined after full action and record its cost', () => {
  const win = createGame(10); win.cultivation = 100; win.heartDemon = 59; win.life = 2;
  let n = transition(win, { type: 'tribulate' }); assert.equal(n.ending?.title, '成功结丹'); assert.equal(n.life, 1); assert.equal(n.history.length, 1);
  assert.equal(transition(n, { type: 'meditate' }), n);
  win.heartDemon = 60; n = transition(win, { type: 'tribulate' }); assert.equal(n.ending?.title, '渡劫失败');
  win.life = 1; n = transition(win, { type: 'tribulate' }); assert.equal(n.ending?.title, '寿尽坐化');
  const lost = at('last_batch'); lost.heartDemon = 80;
  n = transition(lost, { type: 'choose', id: 'all' }); assert.equal(n.ending?.title, '心魔失控'); assert.equal(n.cultivation, 62); assert.equal(n.heartDemon, 100);
});
test('every unresolved hazard fails tribulation and cites actual source', () => {
  for (const kind of ['丹毒', '经脉暗伤', '功法缺陷'] as const) {
    const s = createGame(10); s.cultivation = 100; s.hazards = [{ kind, source: 'last_batch', diagnosed: false, action: '试验' }];
    const n = transition(s, { type: 'tribulate' }); assert.equal(n.ending?.title, '渡劫失败'); assert.match(n.ending!.reasons[0], /最后一炉/);
  }
});
test('no meaningless diagnosis or meditation and no unaffordable remedy', () => {
  const s = createGame(4); assert.ok(actionBlock(s, { type: 'diagnose' })); assert.ok(actionBlock(s, { type: 'meditate' }));
  s.cultivation = 9; s.hazards = [{ kind: '丹毒', source: 'last_batch', diagnosed: true, action: '取药' }];
  assert.match(actionBlock(s, { type: 'remedy', kind: '丹毒' })!, /还缺 1/);
});
test('event pool exhaustion uses repeatable lowest-tier quiet cultivation', () => {
  const s = createGame(5); s.seenEvents = EVENTS.map(e => e.id);
  let n = step(s, { type: 'choose', id: 'leave' }); assert.equal(n.encounterId, 'quiet');
  n = step(n, { type: 'choose', id: 'practice' }); assert.equal(n.encounterId, 'quiet'); assert.equal(n.cultivation, 46);
});
test('save and reload preserve feedback, pending contract and action outcome', () => {
  const s = transition(at('elder'), { type: 'choose', id: 'accept' });
  const values = new Map<string, string>();
  const store = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  assert.ok(saveGame(store, s)); const result = loadGame(store); assert.equal(result.kind, 'valid');
  if (result.kind === 'valid') { assert.deepEqual(result.game, s); assert.deepEqual(transition(result.game, { type: 'continue' }), transition(s, { type: 'continue' })); }
  assert.ok((values.get(SAVE_KEY)?.length ?? Infinity) < 100000);
});
test('corrupt, structurally malformed, incompatible and blocked storage handled without overwriting', () => {
  let writes = 0;
  for (const raw of ['{', '{}', JSON.stringify({ ...createGame(2), encounterState: {} }), JSON.stringify({ ...createGame(2), version: 999 }), JSON.stringify({ ...createGame(2), hazards: [null] })]) {
    const result = loadGame({ getItem: () => raw, setItem: () => { writes++; } }); assert.equal(result.kind, 'invalid');
  }
  assert.equal(writes, 0);
  const denied = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  assert.equal(loadGame(denied).kind, 'unavailable'); assert.equal(saveGame(denied, createGame(1)), false);
  assert.equal(validGame({ ...createGame(1), phase: 'ended' }), false);
});

test('every authored choice settles with exact displayed costs and serializes valid state', () => {
  for (const e of EVENTS) for (const c of e.choices) {
    const s = at(e.id); s.encounterState.investigated = true; s.cultivation = 100;
    if (c.flag) s.flags.push(c.flag);
    if (e.id === 'fire') s.pending = { due: 1, gain: 22, investigated: true };
    if (c.cure) s.hazards.push({ kind: c.cure, source: 'last_batch', diagnosed: false, action: '取药' });
    assert.equal(actionBlock(s, { type: 'choose', id: c.id }), null, `${e.id}/${c.id}`);
    const n = transition(s, { type: 'choose', id: c.id });
    const refund = c.refund === 'half' ? 11 : c.refund === 'full' ? 22 : 0;
    assert.equal(n.cultivation, 100 + c.gain - refund);
    assert.equal(n.life, 18 - (c.life ?? 1)); assert.equal(n.heartDemon, c.heart);
    assert.ok(validGame(n), `${e.id}/${c.id} invalid save`);
    if (c.cure) assert.equal(n.hazards.length, 0);
    if (c.contract === 'settle') assert.equal(n.pending, null);
  }
});
