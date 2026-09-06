export type HazardKind = '丹毒' | '经脉暗伤' | '功法缺陷';
export interface Choice {
  id: string; label: string; gain: number; heart: number; life?: number;
  result: string; risk?: { kind: HazardKind; chance: number };
  investigated?: boolean; flag?: string; setFlags?: string[];
  contract?: 'accept' | 'settle'; refund?: 'full' | 'half'; cure?: HazardKind;
}
export interface Encounter {
  id: string; title: string; place: string; paragraphs: string[];
  clues: string[]; truth: string; investigation?: string;
  choices: Choice[]; eligibleFlag?: string; followup?: boolean;
}
export interface Hazard { kind: HazardKind; source: string; diagnosed: boolean; action: string }
export interface History {
  event: string; title: string; action: string; result: string; truth: string;
  delta: { cultivation: number; life: number; heart: number };
  symptom?: string;
}
export interface Game {
  version: number; rulesVersion: number; seed: number; rngState: number;
  phase: 'encounter' | 'feedback' | 'ended'; revision: number;
  cultivation: number; life: number; heartDemon: number;
  investigations: number; safeStreak: number;
  encounterId: string; encounterState: { investigated: boolean; impulseRoll: number; rolls: Record<string, number> };
  encounterCount: number; hazards: Hazard[]; flags: string[];
  interrupted: null | { id: string; state: Game['encounterState'] };
  pending: null | { due: number; gain: number; investigated: boolean };
  seenEvents: string[]; history: History[];
  feedback: null | { title: string; text: string; advance: boolean };
  ending: null | { title: string; reasons: string[] };
}
export type Action = { type: 'choose'; id: string } | { type: 'remedy'; kind: HazardKind } |
  { type: 'investigate' | 'diagnose' | 'meditate' | 'tribulate' | 'continue' | 'settle' };
