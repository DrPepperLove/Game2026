import { EnemyType } from '../types';
import { COLORS } from '../constants';
import type { EnemyDefinition } from '../types';

/**
 * EnemyRegistry — 怪物静态数据注册表
 *
 * ★ 扩展点：新增怪物类型只需在此 Map 追加一条记录
 */
const ENEMY_REGISTRY = new Map<EnemyType, EnemyDefinition>();

function register(def: EnemyDefinition): void {
  ENEMY_REGISTRY.set(def.type, def);
}

// ─── Scout ───────────────────────────────────────
register({
  type: EnemyType.SCOUT,
  name: '快速斥候',
  stats: {
    maxHP: 200,
    speed: 110,
    armor: 0,
    rewardEssence: 3,
    cardDropChance: 0.2,
    baseReachPenalty: 2,
    rarity: 'normal',
  },
  color: COLORS.SCOUT,
  radius: 12,
});

// ─── Tank ────────────────────────────────────────
register({
  type: EnemyType.TANK,
  name: '装甲巨魔',
  stats: {
    maxHP: 700,
    speed: 45,
    armor: 8,
    rewardEssence: 10,
    cardDropChance: 0.5,
    baseReachPenalty: 4,
    rarity: 'elite',
  },
  color: COLORS.TANK,
  radius: 18,
});

// ─── Basic ───────────────────────────────────────
register({
  type: EnemyType.BASIC,
  name: '普通怪物',
  stats: {
    maxHP: 300,
    speed: 70,
    armor: 0,
    rewardEssence: 5,
    cardDropChance: 0.25,
    baseReachPenalty: 2,
    rarity: 'normal',
  },
  color: COLORS.BASIC,
  radius: 14,
});

// ─── Summoner ────────────────────────────────────
register({
  type: EnemyType.SUMMONER,
  name: '召唤师',
  stats: {
    maxHP: 450,
    speed: 50,
    armor: 2,
    rewardEssence: 12,
    cardDropChance: 0.5,
    baseReachPenalty: 4,
    rarity: 'elite',
  },
  color: COLORS.SUMMONER,
  radius: 16,
});

// ─── Venom ───────────────────────────────────────
register({
  type: EnemyType.VENOM,
  name: '毒液怪',
  stats: {
    maxHP: 280,
    speed: 65,
    armor: 0,
    rewardEssence: 7,
    cardDropChance: 0.3,
    baseReachPenalty: 2,
    rarity: 'normal',
  },
  color: COLORS.VENOM,
  radius: 14,
});

// ─── Flying ──────────────────────────────────────
register({
  type: EnemyType.FLYING,
  name: '飞行单位',
  stats: {
    maxHP: 240,
    speed: 100,
    armor: 0,
    rewardEssence: 6,
    cardDropChance: 0.25,
    baseReachPenalty: 2,
    rarity: 'normal',
  },
  color: COLORS.FLYING,
  radius: 13,
  flying: true,
});

// ─── Splitter ────────────────────────────────────
register({
  type: EnemyType.SPLITTER,
  name: '分裂怪',
  stats: {
    maxHP: 500,
    speed: 55,
    armor: 1,
    rewardEssence: 10,
    cardDropChance: 0.4,
    baseReachPenalty: 4,
    rarity: 'elite',
  },
  color: COLORS.SPLITTER,
  radius: 16,
});

// ─── Swamp Boss — 沼泽巨鳄 ──────────────────────
register({
  type: EnemyType.SWAMP_BOSS,
  name: '沼泽巨鳄',
  stats: {
    maxHP: 1600,
    speed: 55,
    armor: 3,
    rewardEssence: 30,
    cardDropChance: 1.0,
    baseReachPenalty: 10,
    rarity: 'boss',
  },
  color: COLORS.SWAMP_BOSS,
  radius: 22,
});

// ─── Mountain Boss — 熔岩巨像 ───────────────────
register({
  type: EnemyType.MOUNTAIN_BOSS,
  name: '熔岩巨像',
  stats: {
    maxHP: 3000,
    speed: 30,
    armor: 10,
    rewardEssence: 40,
    cardDropChance: 1.0,
    baseReachPenalty: 10,
    rarity: 'boss',
  },
  color: COLORS.MOUNTAIN_BOSS,
  radius: 26,
});

// ─── Chaos Boss — 混沌领主 ──────────────────────
register({
  type: EnemyType.CHAOS_BOSS,
  name: '混沌领主',
  stats: {
    maxHP: 5000,
    speed: 35,
    armor: 5,
    rewardEssence: 50,
    cardDropChance: 1.0,
    baseReachPenalty: 10,
    rarity: 'boss',
  },
  color: COLORS.CHAOS_BOSS,
  radius: 28,
});

// ─── Public API ──────────────────────────────────

export function getEnemyDefinition(type: EnemyType): EnemyDefinition {
  const def = ENEMY_REGISTRY.get(type);
  if (!def) {
    throw new Error(`EnemyRegistry: unknown enemy type '${type}'`);
  }
  return def;
}

export function getAllEnemyDefinitions(): EnemyDefinition[] {
  return Array.from(ENEMY_REGISTRY.values());
}
