import type { IEnchantmentInstance } from './IEnchantment';
import type { IEnemy } from './IEnemy';

// ─── Tower Types ────────────────────────────────────────

export enum TowerType {
  ARROW = 'ARROW',
  MAGIC = 'MAGIC',
  CANNON = 'CANNON',
  SLOW = 'SLOW',
}

export enum TargetStrategyType {
  CLOSEST_TO_BASE = 'CLOSEST_TO_BASE',
  FASTEST = 'FASTEST',
  MOST_DENSE = 'MOST_DENSE',
}

// ─── Stats ──────────────────────────────────────────────

export interface TowerStats {
  damage: number;
  attackSpeed: number;       // attacks per second → cooldown = 1000 / attackSpeed ms
  range: number;             // pixels
  armorPenetration: boolean;
  areaDamage: boolean;
  areaRadius: number;
  slowAmount: number;        // 0..1, 0 = no slow
  slowDuration: number;      // ms
  projectileSpeed: number;   // px/s
}

export interface TowerDefinition {
  type: TowerType;
  name: string;
  description: string;
  cost: number;              // card cost to deploy
  baseStats: TowerStats;
  maxEnchantmentSlots: number;
  targetStrategy: TargetStrategyType;
  color: number;             // hex color for placeholder rendering
}

// ─── Tower Interface ────────────────────────────────────

/** Max upgrade level for any tower */
export const MAX_TOWER_LEVEL = 3;

/** Upgrade multipliers per level (applied to baseStats) */
export const UPGRADE_MULTIPLIERS: Record<number, Partial<TowerStats>> = {
  1: {},
  2: { damage: 1.3, attackSpeed: 1.15, range: 1.1 },
  3: { damage: 1.6, attackSpeed: 1.3, range: 1.2 },
};

export interface ITower {
  readonly id: string;
  readonly towerType: TowerType;
  readonly definition: TowerDefinition;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  baseStats: TowerStats;
  enchantments: IEnchantmentInstance[];
  lastAttackTime: number;
  currentTarget: IEnemy | null;
  level: number;
  attackCount: number;

  /** Returns stats with upgrade + enchantment modifiers applied */
  getEffectiveStats(): TowerStats;

  /** Whether this tower can accept the given enchantment */
  canAcceptEnchantment(enchantId: string): boolean;

  /** Current number of filled enchantment slots */
  getEnchantmentSlotCount(): number;

  /** Total enchantment slots (base + upgrade bonus) */
  getMaxEnchantmentSlots(): number;

  /** Consume a matching tower card to upgrade. Returns false if already max level. */
  upgrade(): boolean;

  /** Total card cost invested in this tower (1 base + N upgrades) */
  getTotalInvestedCost(): number;

  /** Execute attack against a target */
  attack(target: IEnemy): void;

  /** Find the best target from a list of enemies */
  findTarget(enemies: IEnemy[]): IEnemy | null;

  /** Whether the tower is off cooldown and can attack */
  isReady(): boolean;

  /** Get the effective cooldown duration in ms */
  getCooldownMs(): number;

  /** Refresh visual range circle (called after stat changes) */
  refreshRangeCircle(): void;

  /** Show/hide the attack range circle on the map */
  showRange(visible: boolean): void;

  /** Whether the range circle is currently visible */
  getRangeVisible(): boolean;

  /** Highlight this tower as a valid target (for enchantment compatibility) */
  setHighlight(enabled: boolean): void;
}
