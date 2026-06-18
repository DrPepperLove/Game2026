import type { IEffect } from './IEffect';

// ─── Enemy Types ────────────────────────────────────────

export enum EnemyType {
  SCOUT = 'SCOUT',
  TANK = 'TANK',
  BASIC = 'BASIC',
  SUMMONER = 'SUMMONER',
  VENOM = 'VENOM',
  FLYING = 'FLYING',
  SPLITTER = 'SPLITTER',
  SWAMP_BOSS = 'SWAMP_BOSS',
  MOUNTAIN_BOSS = 'MOUNTAIN_BOSS',
  CHAOS_BOSS = 'CHAOS_BOSS',
}

// ─── Stats ──────────────────────────────────────────────

export interface EnemyStats {
  maxHP: number;
  speed: number;            // px/s
  armor: number;            // flat damage reduction
  rewardEssence: number;    // essence granted on kill
  cardDropChance: number;   // 0..1 probability
  baseReachPenalty: number; // lives lost when reaching base
  rarity?: 'normal' | 'elite' | 'boss';  // drop tier
}

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  stats: EnemyStats;
  color: number;            // hex color for placeholder rendering
  radius: number;           // collision / visual radius
  flying?: boolean;         // true = only Arrow/Magic towers can target
}

// ─── Enemy Interface ────────────────────────────────────

export interface IEnemy {
  readonly id: string;
  readonly enemyType: EnemyType;
  readonly definition: EnemyDefinition;
  readonly maxHP: number;
  currentHP: number;
  baseSpeed: number;
  armor: number;
  activeEffects: IEffect[];
  waypointIndex: number;
  x: number;
  y: number;
  alive: boolean;

  /** Returns baseSpeed * (1 - slow%), clamped to minimum */
  getEffectiveSpeed(): number;

  /** Returns effective armor, factoring in effects */
  getEffectiveArmor(): number;

  /** Apply a status effect (replaces existing effect of same type) */
  applyEffect(effect: IEffect): void;

  /** Remove an effect by type id */
  removeEffect(effectType: string): void;

  /** Returns true if the enemy has an effect of the given type */
  hasEffect(effectType: string): boolean;

  /** Take damage, accounting for armor */
  takeDamage(amount: number, armorPenetration: boolean, source: string): void;

  /** Enemy reached the end of the path — deduct lives */
  onReachedBase(): number;  // returns the penalty amount

  /** Get a copy of waypoints for spawning minions */
  getWaypoints(): Array<{ x: number; y: number }>;
}
