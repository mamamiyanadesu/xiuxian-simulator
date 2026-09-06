import { RULES, SYMPTOMS, HAZARD_CAUSES } from './config.ts';
import { EVENTS, EVENT_MAP, FALLBACK } from './events.ts';
import type { Action, Choice, Game, HazardKind } from './types.ts';

// RNG only schedules future stories or creates encounters. Stored action rolls survive reads/reloads.
function random(s: Game): number {
  s.rngState = (Math.imul(s.rngState, 1664525) + 1013904223) >>> 0;
  return s.rngState / 4294967296;
}
export function currentEvent(s: Game) { return EVENT_MAP[s.encounterId]; }
function enter(s: Game, id: string) {
  s.encounterId = id;
  s.encounterCount++;
  if (id !== 'quiet' && !s.seenEvents.includes(id)) s.seenEvents.push(id);
  s.encounterState = {
    investigated: id === 'fire' && !!s.pending?.investigated,
    impulseRoll: random(s),
    rolls: Object.fromEntries(EVENT_MAP[id].choices.map(c => [c.id, random(s)])),
  };
}
function next(s: Game) {
  if (s.interrupted && !s.pending) {
    s.encounterId = s.interrupted.id; s.encounterState = s.interrupted.state;
    s.interrupted = null; s.encounterCount++; return;
  }
  if (s.pending && s.encounterCount + 1 >= s.pending.due) return enter(s, 'fire');
  const pool = EVENTS.filter(e => !e.followup && !s.seenEvents.includes(e.id) && (!e.eligibleFlag || s.flags.includes(e.eligibleFlag)));
  enter(s, pool.length ? pool[Math.floor(random(s) * pool.length)].id : FALLBACK.id);
}
export function createGame(seed: number): Game {
  const normalized = seed >>> 0;
  const s: Game = {
    version: RULES.version, rulesVersion: RULES.rulesVersion, seed: normalized, rngState: normalized,
    phase: 'encounter', revision: 0, cultivation: RULES.startCultivation, life: RULES.startLife,
    heartDemon: 0, investigations: RULES.investigationCap, safeStreak: 0, impulseNext: true,
    encounterId: 'last_batch', encounterState: { investigated: false, impulseRoll: 0, rolls: {} },
    encounterCount: 0, hazards: [], flags: [], pending: null, interrupted: null, seenEvents: [], history: [], feedback: null, ending: null,
  };
  // Warm up before selecting the opening so adjacent integer seeds do not cluster by first LCG roll.
  random(s); random(s);
  next(s);
  return s;
}
export function choiceCost(s: Game, c: Choice) {
  return { life: c.life ?? 1, cultivation: c.refund ? (s.pending?.gain ?? 0) / (c.refund === 'half' ? 2 : 1) : 0 };
}
export function choiceBlock(s: Game, c: Choice): string | null {
  if (c.investigated && !s.encounterState.investigated) return '先调查，取得依据';
  if (c.flag && !s.flags.includes(c.flag)) return '需要先前记下的丹号';
  if (c.cure && !s.hazards.some(h => h.kind === c.cure)) return '眼下没有这类隐患';
  if (c.contract === 'accept' && s.pending) return '先了结已有约定';
  const shortage = choiceCost(s, c).cultivation - s.cultivation;
  if (shortage > 0) return `还缺 ${shortage} 修为`;
  return null;
}
export function actionBlock(s: Game, a: Action): string | null {
  if (s.phase === 'ended') return '此世已结束';
  if (a.type === 'continue') return s.phase === 'feedback' ? null : '没有待阅读的结果';
  if (s.phase !== 'encounter') return '请先读完本次结果';
  if (isUncontrolled(s)) return a.type === 'impulse' ? null : '心魔正替你作主，本轮无法自行行动';
  if (a.type === 'impulse') return '本轮由你作主';
  const e = currentEvent(s);
  if (a.type === 'choose') {
    const c = e.choices.find(c => c.id === a.id);
    return c ? choiceBlock(s, c) : '没有这个选择';
  }
  if (a.type === 'investigate') return !e.investigation ? '此处没有可进一步调查的内容' : s.encounterState.investigated ? '此处已调查，不能重复' : s.investigations <= 0 ? '调查次数已用尽' : null;
  if (a.type === 'diagnose') return s.hazards.some(h => !h.diagnosed) ? null : '没有尚未查明的征兆';
  if (a.type === 'remedy') {
    if (!s.hazards.some(h => h.kind === a.kind && h.diagnosed)) return '先内观查明隐患';
    return s.cultivation < RULES.remedyCultivation ? `还缺 ${RULES.remedyCultivation - s.cultivation} 修为` : null;
  }
  if (a.type === 'meditate') return s.heartDemon === 0 ? '心境已平，无需静心' : null;
  if (a.type === 'settle') return !s.pending ? '没有未了约定' : s.encounterId === 'fire' ? '正在处理约定' : null;
  if (a.type === 'tribulate') {
    if (s.pending) return '先了结看炉约定';
    if (s.cultivation < RULES.threshold) return `还需 ${RULES.threshold - s.cultivation} 修为`;
  }
  return null;
}
export function lifeCost(s: Game, a: Action): number {
  if (a.type === 'continue' || a.type === 'settle') return 0;
  if (a.type === 'remedy') return RULES.remedyLife;
  if (a.type === 'impulse') return choiceCost(s, impulsiveChoice(s)).life;
  if (a.type === 'choose') {
    const c = currentEvent(s).choices.find(c => c.id === a.id);
    return c ? choiceCost(s, c).life : 0;
  }
  return 1;
}
function impulsiveChoice(s: Game): Choice {
  const choices = currentEvent(s).choices.filter(c => !choiceBlock(s, c));
  return choices[Math.floor(s.encounterState.impulseRoll * choices.length)];
}
export function isUncontrolled(s: Game): boolean {
  return s.heartDemon > RULES.impulseHeart && s.impulseNext;
}
export function knownTribulationRisks(s: Game): string[] {
  const risks: string[] = [];
  if (s.life <= 1) risks.push('渡劫消耗最后的寿元，将寿尽坐化。');
  if (s.heartDemon >= RULES.tribulationHeart) risks.push(`心魔须低于 ${RULES.tribulationHeart}，眼下为 ${s.heartDemon}。`);
  s.hazards.forEach(h => risks.push(h.diagnosed ? `${h.kind}尚未处理，无法安然渡劫。` : '身体仍有未查明的征兆，带病引雷会失败。'));
  return risks;
}
// A present-state budget, not a forecast: new injuries and contract decisions are not included.
export function closingBudget(s: Game) {
  const diagnose = s.hazards.some(h => !h.diagnosed) ? 1 : 0;
  const remedy = s.hazards.length * RULES.remedyLife;
  const meditate = Math.max(0, Math.ceil((s.heartDemon - RULES.tribulationHeart + 1) / RULES.meditationReduction));
  const reserve = 2 + diagnose + remedy + meditate;
  return { reserve, spendable: s.life - reserve, diagnose, remedy, meditate,
    cultivationGap: Math.max(0, RULES.threshold - s.cultivation + s.hazards.length * RULES.remedyCultivation) };
}
function terminal(s: Game) {
  if (s.life <= 0) s.ending = { title: '寿尽坐化', reasons: ['最后一次行动耗尽了余寿。修为仍在，承载它的人已留不住了。'] };
  else if (s.heartDemon >= RULES.heartLimit) s.ending = { title: '心魔失控', reasons: ['心魔累积到 100。你再听不清行气口诀，耳边尽是还没拿到手的好处。'] };
  if (s.ending) {
    s.phase = 'ended';
    if (s.pending) s.ending.reasons.push('看炉约定未了。许前辈收起你的旧契书，另寻一位愿意守“一夜”的散修。');
  }
}

// expectedRevision rejects a duplicate command from a stale render, including repeated continue.
export function transition(previous: Game, a: Action, expectedRevision = previous.revision): Game {
  if (expectedRevision !== previous.revision || actionBlock(previous, a)) return previous;
  const s: Game = structuredClone(previous);
  s.revision++;
  const forced = a.type === 'impulse';
  if (forced) a = { type: 'choose', id: impulsiveChoice(s).id };
  if (a.type === 'continue') {
    const advance = s.feedback!.advance;
    s.feedback = null; s.phase = 'encounter';
    if (advance) next(s);
    return s;
  }
  if (a.type === 'settle') {
    // Visiting the creditor is a navigation step; only fulfillment/exit consumes a resource.
    // Preserve the interrupted encounter's investigation and rolls, so settling cannot reroll it.
    s.interrupted = { id: s.encounterId, state: s.encounterState };
    enter(s, 'fire');
    return s;
  }
  const e = currentEvent(s);
  let result = '', label = '', advance = false, symptom: string | undefined;
  let truth = e.truth;
  s.life = Math.max(0, s.life - lifeCost(s, a));
  if (a.type === 'choose') {
    const c = e.choices.find(c => c.id === a.id)!;
    const cost = choiceCost(s, c);
    s.cultivation += c.gain - cost.cultivation;
    s.heartDemon = Math.min(RULES.heartLimit, s.heartDemon + c.heart);
    result = c.result; label = c.label; advance = true;
    if (c.setFlags) s.flags = [...new Set([...s.flags, ...c.setFlags])];
    if (c.cure) s.hazards = s.hazards.filter(h => h.kind !== c.cure);
    if (c.risk && s.encounterState.rolls[c.id] < c.risk.chance) {
      symptom = SYMPTOMS[c.risk.kind];
      if (!s.hazards.some(h => h.kind === c.risk!.kind)) {
        s.hazards.push({ kind: c.risk.kind, source: e.id, diagnosed: false, action: c.label });
        result += ' 身体留下了一处异样。';
      } else result += ' 先前的异样仍在；同类隐患不再叠加。';
    } else if (c.risk) result += ' 此番行气未见异样。';
    if (c.contract === 'accept') s.pending = { due: s.encounterCount + 1 + Math.floor(random(s) * 2), gain: c.gain, investigated: s.encounterState.investigated };
    if (c.contract === 'settle') s.pending = null;
    // Only substantive, uncomplicated gains count. Routine one-life fees and small heart gains do not.
    const uneventful = c.gain > cost.cultivation && cost.cultivation === 0 && cost.life === 1 && !symptom &&
      !previous.hazards.length && !previous.pending && !s.hazards.length && !s.pending && !c.cure;
    if (!uneventful || s.heartDemon > RULES.cloudedHeart) s.safeStreak = 0;
    else if (s.investigations < RULES.investigationCap) {
      s.safeStreak++;
      if (s.safeStreak >= RULES.investigationRecovery) {
        s.investigations++; s.safeStreak = 0;
        result += ' 连着三回得了好处，没添别的账。你终于肯再耐下性子查一回。调查次数 +1。';
      }
    } else s.safeStreak = 0;
  } else if (a.type === 'investigate') {
    s.investigations--;
    label = '调查线索'; result = e.investigation!; s.encounterState.investigated = true;
    if (e.id === 'last_batch') s.flags = [...new Set([...s.flags, 'batch_known'])];
  } else if (a.type === 'diagnose') {
    label = '内观查明';
    truth = s.hazards.filter(h => !h.diagnosed).map(h => `“${EVENT_MAP[h.source].title}”中，${EVENT_MAP[h.source].truth}`).join('');
    result = s.hazards.filter(h => !h.diagnosed).map(h => `查明${h.kind}，源于“${EVENT_MAP[h.source].title}”中的“${h.action}”。`).join('');
    s.hazards.forEach(h => h.diagnosed = true);
  } else if (a.type === 'remedy') {
    label = `调息化解${a.kind}`; s.cultivation -= RULES.remedyCultivation;
    const source = EVENT_MAP[s.hazards.find(h => h.kind === a.kind)!.source];
    truth = `“${source.title}”留下的${a.kind}已被清除。${source.truth}`;
    result = `你花去 ${RULES.remedyLife} 寿元，散掉 ${RULES.remedyCultivation} 修为，将${a.kind}清理干净。其余修为仍留在体内。`;
    s.hazards = s.hazards.filter(h => h.kind !== a.kind);
    s.safeStreak = 0;
  } else if (a.type === 'meditate') {
    label = '静心'; s.heartDemon = Math.max(0, s.heartDemon - RULES.meditationReduction);
    truth = '静心降低心魔，不会化解身体隐患，也不会改写已签的约定。';
    result = '你把眼前的机缘暂放一旁，数完自己的呼吸。得失还在，催你立刻伸手的声音轻了。';
  } else if (a.type === 'tribulate') {
    label = '引雷渡劫';
    truth = '渡劫按余寿、修为、心魔与实际隐患结算，没有额外的成败抽签。';
    const reasons: string[] = [];
    if (s.heartDemon >= RULES.tribulationHeart) reasons.push(`心魔为 ${s.heartDemon}，未低于 ${RULES.tribulationHeart}。雷至时杂念先动，心神无法守一。`);
    s.hazards.forEach(h => reasons.push(`“${EVENT_MAP[h.source].title}”留下${h.kind}。${HAZARD_CAUSES[h.kind]}`));
    s.ending = reasons.length ? { title: '渡劫失败', reasons } : { title: '成功结丹', reasons: ['真气周天闭合，心神守住，余寿尚存。劫雷落下时，没有哪一处旧患再向你讨账。'] };
    result = reasons.length ? '劫雷落下，尚未处理的问题一并显现。' : '丹成。你在山路旁坐了片刻，才起身往更远处走。';
  }
  if (a.type === 'choose') {
    s.impulseNext = previous.heartDemon > RULES.impulseHeart ? !previous.impulseNext : true;
    if (forced) {
      result = `你还没决定，手已经伸了出去。心魔替你选了“${label}”。${result} 下一次机缘暂由你作主。`;
      label += '（心魔代选）';
    }
  }
  if (s.heartDemon <= RULES.impulseHeart) s.impulseNext = true;
  s.history.push({ event: e.id, title: e.title, action: label, result, truth,
    delta: { cultivation: s.cultivation - previous.cultivation, life: s.life - previous.life, heart: s.heartDemon - previous.heartDemon },
    ...(symptom ? { symptom } : {}),
  });
  s.feedback = { title: label, text: result, advance };
  s.phase = 'feedback'; terminal(s);
  return s;
}

export function riskLabel(chance: number) { return chance >= .5 ? '风险高' : chance >= .2 ? '风险中' : chance > 0 ? '风险低' : '无新增隐患'; }
export const hazardKinds = Object.keys(SYMPTOMS) as HazardKind[];
