import { TowerType, TargetStrategyType } from '../types';
import { COLORS } from '../constants';
import type { TowerDefinition } from '../types';

/**
 * TowerRegistry — 防御塔静态数据注册表
 *
 * ★ 扩展点：新增塔类型只需在此 Map 追加一条记录
 *   核心代码（Tower 实体、CombatManager）无需修改
 */
const TOWER_REGISTRY = new Map<TowerType, TowerDefinition>();

function register(def: TowerDefinition): void {
  TOWER_REGISTRY.set(def.type, def);
}

// ─── Arrow Tower ─────────────────────────────────
register({
  type: TowerType.ARROW,
  name: '箭塔',
  description: '攻速快、射程远、单体输出',
  cost: 1,
  baseStats: {
    damage: 15,
    attackSpeed: 2.0,         // 2 attacks/sec → 500ms cooldown
    range: 200,
    armorPenetration: false,
    areaDamage: false,
    areaRadius: 0,
    slowAmount: 0,
    slowDuration: 0,
    projectileSpeed: 600,
  },
  maxEnchantmentSlots: 3,
  targetStrategy: TargetStrategyType.CLOSEST_TO_BASE,
  color: COLORS.ARROW_TOWER,
});

// ─── Magic Tower ─────────────────────────────────
register({
  type: TowerType.MAGIC,
  name: '魔法塔',
  description: '单体高伤害、无视物理护甲',
  cost: 2,
  baseStats: {
    damage: 40,
    attackSpeed: 0.8,         // 0.8 attacks/sec → 1250ms cooldown
    range: 180,
    armorPenetration: true,
    areaDamage: false,
    areaRadius: 0,
    slowAmount: 0,
    slowDuration: 0,
    projectileSpeed: 400,
  },
  maxEnchantmentSlots: 3,
  targetStrategy: TargetStrategyType.CLOSEST_TO_BASE,
  color: COLORS.MAGIC_TOWER,
});

// ─── Cannon Tower ────────────────────────────────
register({
  type: TowerType.CANNON,
  name: '炮塔',
  description: '范围伤害、攻击速度慢',
  cost: 2,
  baseStats: {
    damage: 25,
    attackSpeed: 0.5,         // 0.5 attacks/sec → 2000ms cooldown
    range: 160,
    armorPenetration: false,
    areaDamage: true,
    areaRadius: 70,
    slowAmount: 0,
    slowDuration: 0,
    projectileSpeed: 350,
  },
  maxEnchantmentSlots: 3,
  targetStrategy: TargetStrategyType.MOST_DENSE,
  color: COLORS.CANNON_TOWER,
});

// ─── Slow Tower ──────────────────────────────────
register({
  type: TowerType.SLOW,
  name: '凝滞塔',
  description: '减速怪物、无伤害能力',
  cost: 1,
  baseStats: {
    damage: 0,
    attackSpeed: 1.0,
    range: 150,
    armorPenetration: false,
    areaDamage: true,
    areaRadius: 80,
    slowAmount: 0.4,          // 40% slow
    slowDuration: 2000,
    projectileSpeed: 0,       // instant effect, no projectile
  },
  maxEnchantmentSlots: 3,
  targetStrategy: TargetStrategyType.FASTEST,
  color: COLORS.SLOW_TOWER,
});

// ─── Public API ──────────────────────────────────

export function getTowerDefinition(type: TowerType): TowerDefinition {
  const def = TOWER_REGISTRY.get(type);
  if (!def) {
    throw new Error(`TowerRegistry: unknown tower type '${type}'`);
  }
  return def;
}

export function getAllTowerDefinitions(): TowerDefinition[] {
  return Array.from(TOWER_REGISTRY.values());
}

export function getTowerTypesByCost(cost: number): TowerType[] {
  return getAllTowerDefinitions()
    .filter(def => def.cost === cost)
    .map(def => def.type);
}
