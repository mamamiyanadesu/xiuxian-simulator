import type { HazardKind } from './types.ts';

export const RULES = {
  version: 1, rulesVersion: 2, startCultivation: 40, startLife: 12,
  threshold: 100, heartLimit: 100, tribulationHeart: 60,
  rewardTiers: [6, 10, 16, 22], heartTiers: [2, 5, 10, 22],
  remedyLife: 2, remedyCultivation: 6, meditationReduction: 20,
} as const;
export const SYMPTOMS: Record<HazardKind, string> = {
  丹毒: '运功时，你闻到一丝焦甜味。洗过两回衣裳，那味道还在。',
  经脉暗伤: '此后每次收功，你的右手都要慢半拍才能松开。',
  功法缺陷: '真气每到周天最后一转，便空落一拍。你越熟练，那处空缺越分明。',
};
export const HAZARD_CAUSES: Record<HazardKind, string> = {
  丹毒: '丹中杂质随真气入脉，劫雷催动时无法化开。',
  经脉暗伤: '受损经脉不能承受劫雷，护体真气在伤处断开。',
  功法缺陷: '残缺周天无法闭合，凝丹时真气从缺口散去。',
};
