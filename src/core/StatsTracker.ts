/**
 * StatsTracker — 关卡战斗统计
 *
 * 在 GameScene 生命周期内收集各项数据，
 * 关卡结束时由 LevelSummaryUI 读取展示。
 */
export interface LevelStats {
  // 击杀
  killsPerType: Record<string, number>;  // enemyType → count
  totalKills: number;

  // 损失
  livesLost: number;
  totalBaseDamage: number;  // 累计 baseReachPenalty

  // 经济
  essenceEarned: number;
  essenceSpent: number;
  cardsSold: number;
  essenceFromSells: number;

  // 卡牌使用
  towerCardsUsed: number;
  enchantCardsUsed: number;
  cardsDrawn: number;       // 怪物掉落补牌

  // 其他
  towersUpgraded: number;
  towersDemolished: number;
  totalDamageDealt: number;  // 对所有敌人造成的总伤害

  // 波次
  wavesCompleted: number;
}

export class StatsTracker {
  private stats: LevelStats;

  constructor() {
    this.stats = this.createEmptyStats();
  }

  reset(): void {
    this.stats = this.createEmptyStats();
  }

  getStats(): LevelStats {
    return { ...this.stats, killsPerType: { ...this.stats.killsPerType } };
  }

  /** 记录击杀 */
  recordKill(enemyType: string, baseReachPenalty: number, essenceReward: number): void {
    this.stats.totalKills++;
    this.stats.killsPerType[enemyType] = (this.stats.killsPerType[enemyType] || 0) + 1;
    this.stats.essenceEarned += essenceReward;
    this.stats.totalBaseDamage += baseReachPenalty; // track potential damage
  }

  /** 记录敌人到达基地（损失生命） */
  recordLifeLost(penalty: number): void {
    this.stats.livesLost += penalty;
  }

  /** 记录精华消耗 */
  recordEssenceSpent(amount: number): void {
    this.stats.essenceSpent += amount;
  }

  /** 记录卡牌出售 */
  recordCardSold(value: number): void {
    this.stats.cardsSold++;
    this.stats.essenceFromSells += value;
  }

  /** 记录塔卡使用 */
  recordTowerCardUsed(): void {
    this.stats.towerCardsUsed++;
  }

  /** 记录附魔卡使用 */
  recordEnchantCardUsed(): void {
    this.stats.enchantCardsUsed++;
  }

  /** 记录怪物掉落补牌 */
  recordCardDrawn(): void {
    this.stats.cardsDrawn++;
  }

  /** 记录塔升级 */
  recordTowerUpgrade(): void {
    this.stats.towersUpgraded++;
  }

  /** 记录塔拆除 */
  recordTowerDemolish(): void {
    this.stats.towersDemolished++;
  }

  /** 记录伤害 */
  recordDamageDealt(amount: number): void {
    this.stats.totalDamageDealt += amount;
  }

  /** 记录波次完成 */
  recordWaveComplete(): void {
    this.stats.wavesCompleted++;
  }

  private createEmptyStats(): LevelStats {
    return {
      killsPerType: {},
      totalKills: 0,
      livesLost: 0,
      totalBaseDamage: 0,
      essenceEarned: 0,
      essenceSpent: 0,
      cardsSold: 0,
      essenceFromSells: 0,
      towerCardsUsed: 0,
      enchantCardsUsed: 0,
      cardsDrawn: 0,
      towersUpgraded: 0,
      towersDemolished: 0,
      totalDamageDealt: 0,
      wavesCompleted: 0,
    };
  }
}
