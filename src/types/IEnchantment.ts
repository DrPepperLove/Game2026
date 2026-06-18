import type { TowerType, TowerStats } from './ITower';
import type { IProjectile } from './IProjectile';
import type { IEnemy } from './IEnemy';
import type { ITower } from './ITower';

// ─── Enchantment Hook ───────────────────────────────────

export type EnchantmentHookEvent =
  | 'onProjectileCreated'
  | 'onProjectileHit'
  | 'onEnemyKilled';

export interface EnchantmentHook {
  event: EnchantmentHookEvent;
  handler:
    | ((proj: IProjectile) => void)
    | ((proj: IProjectile, enemy: IEnemy) => void)
    | ((tower: ITower, enemy: IEnemy) => void);
}

// ─── Enchantment Definition ─────────────────────────────

export interface EnchantmentDefinition {
  id: string;
  name: string;
  description: string;
  applicableTowerTypes: TowerType[]; // empty = universal
  maxStacks: number;
  rarity: 'common' | 'rare' | 'epic';
  statModifiers: Partial<TowerStats>;
  hooks: EnchantmentHook[];
  color: number;
}

// ─── Enchantment Instance ───────────────────────────────

export interface IEnchantmentInstance {
  readonly definitionId: string;
  readonly definition: EnchantmentDefinition;
  stackCount: number;  // 1..maxStacks
}

// ─── Combo Rule ─────────────────────────────────────────

export interface EnchantmentComboRule {
  id: string;
  name: string;
  requiredEnchantments: string[]; // definition IDs required on same tower
  applicableTowerTypes: TowerType[];
  description: string;
  bonusHooks: EnchantmentHook[];
}

// ─── Stack Multiplier ───────────────────────────────────

export function getStackMultiplier(stackCount: number): number {
  switch (stackCount) {
    case 1: return 1.0;
    case 2: return 1.7;
    case 3: return 2.2;
    default: return 1.0;
  }
}
