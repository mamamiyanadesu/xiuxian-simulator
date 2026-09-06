import { RULES } from './config.ts';
import { EVENT_MAP } from './events.ts';
import { hazardKinds } from './engine.ts';
import type { Game } from './types.ts';

export const SAVE_KEY = 'cijienandu.save.rules4';
export const LEGACY_SAVE_KEY = 'cijienandu.save.v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type LoadResult = { kind: 'empty'; message?: string } | { kind: 'valid'; game: Game } |
  { kind: 'invalid' | 'unavailable'; message: string };
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown, max = 10000): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
const str = (v: unknown): v is string => typeof v === 'string' && v.length <= 3000;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 100 && v.every(str);
const eventId = (v: unknown): v is string => typeof v === 'string' && Object.hasOwn(EVENT_MAP, v);
function encounterState(v: unknown, id: string) {
  return obj(v) && typeof v.investigated === 'boolean' && typeof v.impulseRoll === 'number' &&
    Number.isFinite(v.impulseRoll) && v.impulseRoll >= 0 && v.impulseRoll < 1 && obj(v.rolls) &&
    Object.keys(v.rolls).length === EVENT_MAP[id].choices.length && EVENT_MAP[id].choices.every(c => {
      const roll = (v.rolls as Record<string, unknown>)[c.id];
      return typeof roll === 'number' && Number.isFinite(roll) && roll >= 0 && roll < 1;
    });
}
export function validGame(v: unknown): v is Game {
  if (!obj(v) || v.version !== RULES.version || v.rulesVersion !== RULES.rulesVersion ||
    !int(v.seed, 4294967295) || !int(v.rngState, 4294967295) || !int(v.revision) ||
    !int(v.cultivation) || !int(v.life, RULES.startLife) || !int(v.heartDemon, RULES.heartLimit) ||
    !int(v.investigations, RULES.investigationCap) || !int(v.safeStreak, RULES.investigationRecovery - 1) || typeof v.impulseNext !== 'boolean' ||
    !int(v.encounterCount, 1000) || !eventId(v.encounterId) || !encounterState(v.encounterState, v.encounterId) ||
    !strings(v.flags) || !strings(v.seenEvents) || !v.seenEvents.every(eventId)) return false;
  if (!Array.isArray(v.hazards) || v.hazards.length > 3 || !v.hazards.every(h =>
    obj(h) && hazardKinds.includes(h.kind as never) && eventId(h.source) && typeof h.diagnosed === 'boolean' && str(h.action)) ||
    new Set(v.hazards.map(h => h.kind)).size !== v.hazards.length) return false;
  if (v.pending !== null && (!obj(v.pending) || !int(v.pending.due, 1000) || v.pending.gain !== 22 || typeof v.pending.investigated !== 'boolean')) return false;
  if (v.interrupted !== null && (!obj(v.interrupted) || !eventId(v.interrupted.id) || !encounterState(v.interrupted.state, v.interrupted.id))) return false;
  if (v.encounterId === 'fire' && !v.pending && v.phase === 'encounter') return false;
  if (v.interrupted && !v.pending && v.phase === 'encounter') return false;
  if (!Array.isArray(v.history) || v.history.length > 300 || !v.history.every(h => obj(h) && eventId(h.event) &&
    str(h.title) && str(h.action) && str(h.result) && str(h.truth) && (h.symptom === undefined || str(h.symptom)) && obj(h.delta) &&
    ['cultivation', 'life', 'heart'].every(k => typeof h.delta === 'object' && h.delta !== null &&
      Number.isInteger((h.delta as Record<string, unknown>)[k]) && Math.abs((h.delta as Record<string, number>)[k]) <= 10000))) return false;
  if (v.feedback !== null && (!obj(v.feedback) || !str(v.feedback.title) || !str(v.feedback.text) || typeof v.feedback.advance !== 'boolean')) return false;
  if (v.ending !== null && (!obj(v.ending) || !['成功结丹', '寿尽坐化', '心魔失控', '渡劫失败'].includes(v.ending.title as string) || !strings(v.ending.reasons))) return false;
  if (v.phase === 'encounter') return v.feedback === null && v.ending === null && (v.life as number) > 0 && (v.heartDemon as number) < 100;
  if (v.phase === 'feedback') return v.feedback !== null && v.ending === null && (v.life as number) > 0 && (v.heartDemon as number) < 100 && v.history.length > 0;
  if (v.phase === 'ended') return v.ending !== null && v.history.length > 0;
  return false;
}
export function loadGame(storage: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
    if (raw === null && [LEGACY_SAVE_KEY, 'cijienandu.save.rules2', 'cijienandu.save.rules3'].some(key => storage.getItem(key) !== null)) return { kind: 'empty', message: '新版从零修为、随机机缘起步，心魔超过 70 后交替失控。旧版行笺另存保留，启程将开始新版的一局。' };
  } catch { return { kind: 'unavailable', message: '浏览器未允许本地存档。本局仍可修行，关闭页面后无法恢复。' }; }
  if (raw === null) return { kind: 'empty' };
  try {
    if (raw.length > 300000) throw new Error('oversize');
    const value: unknown = JSON.parse(raw);
    if (obj(value) && (value.version !== RULES.version || value.rulesVersion !== RULES.rulesVersion)) return { kind: 'invalid', message: '旧存档与当前版本不兼容。旧记录仍保留，确认另起一世后才会替换。' };
    if (!validGame(value)) throw new Error('invalid');
    return { kind: 'valid', game: value };
  } catch { return { kind: 'invalid', message: '无法读取这份存档。旧记录仍保留，确认另起一世后才会替换。' }; }
}
export function saveGame(storage: StorageLike, game: Game): boolean {
  try { storage.setItem(SAVE_KEY, JSON.stringify(game)); return true; } catch { return false; }
}
