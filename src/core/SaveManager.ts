/**
 * SaveManager — 生涯模式存档系统
 *
 * 使用 localStorage 保存玩家通关进度，持久化到浏览器。
 */

const SAVE_KEY = 'card_td_campaign';

export interface CampaignSave {
  completedLevels: string[];
}

/** 所有关卡的全局顺序（用于生涯解锁判断） */
export const CAMPAIGN_ORDER: string[] = [
  'ch1_01', 'ch1_02', 'ch1_03',
  'ch2_01', 'ch2_02', 'ch2_03', 'ch2_04',
  'ch3_01', 'ch3_02', 'ch3_03', 'ch3_04',
  'ch4_01', 'ch4_02', 'ch4_03',
];

export function loadCampaignSave(): CampaignSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw) as CampaignSave;
  } catch {
    // Ignore parse errors
  }
  return { completedLevels: [] };
}

export function saveCampaignProgress(levelId: string): void {
  const save = loadCampaignSave();
  if (!save.completedLevels.includes(levelId)) {
    save.completedLevels.push(levelId);
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }
}

/** 生涯模式中，关卡是否解锁（前置关卡必须已通关） */
export function isLevelUnlocked(levelId: string, completedLevels: string[]): boolean {
  const idx = CAMPAIGN_ORDER.indexOf(levelId);
  if (idx === -1) return false;   // unknown level
  if (idx === 0) return true;     // first level always unlocked
  // Check if previous level in the sequence is completed
  return completedLevels.includes(CAMPAIGN_ORDER[idx - 1]);
}

export function isLevelCompleted(levelId: string, completedLevels: string[]): boolean {
  return completedLevels.includes(levelId);
}

/** 获取下一关的 ID（用于胜利后跳转） */
export function getNextLevel(levelId: string): string | null {
  const idx = CAMPAIGN_ORDER.indexOf(levelId);
  if (idx === -1 || idx >= CAMPAIGN_ORDER.length - 1) return null;
  return CAMPAIGN_ORDER[idx + 1];
}

/** 重置全部存档 */
export function resetCampaignSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
