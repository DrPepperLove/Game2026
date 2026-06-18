import { TowerType } from '../types';
import { COLORS } from '../constants';
import type {
  EnchantmentDefinition,
  EnchantmentComboRule,
  EnchantmentHook,
} from '../types';
import type { IProjectile, IEnemy, ITower } from '../types';
import { getStackMultiplier } from '../types';

/**
 * EnchantmentRegistry — 附魔卡 + 组合规则注册表
 *
 * ★ 扩展点：新增附魔只需追加 ENCHANTMENTS 记录；
 *   新增组合规则只需追加 COMBO_RULES 记录。
 *
 * 注意：handler 是占位符，实际的 Effect 创建由 EnchantmentManager 负责。
 *   这里的 handler 主要用于标记哪些事件需要 EnchantmentManager 介入。
 */
const ENCHANTMENTS = new Map<string, EnchantmentDefinition>();
const COMBO_RULES: EnchantmentComboRule[] = [];

function register(def: EnchantmentDefinition): void {
  ENCHANTMENTS.set(def.id, def);
}

// Helper to create typed hooks (avoids implicit any)
function h_projectileCreated(handler: (proj: IProjectile) => void): EnchantmentHook {
  return { event: 'onProjectileCreated', handler };
}
function h_projectileHit(handler: (proj: IProjectile, enemy: IEnemy) => void): EnchantmentHook {
  return { event: 'onProjectileHit', handler };
}

// ─── Poison ──────────────────────────────────────
register({
  id: 'poison',
  name: '淬毒',
  description: '攻击附带中毒效果，每秒造成5点伤害，持续3秒',
  applicableTowerTypes: [TowerType.ARROW],
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {},
  hooks: [
    h_projectileHit((_proj, _enemy) => {
      // EnchantmentManager handles PoisonEffect creation on hit
    }),
  ],
  color: COLORS.POISON_TINT,
});

// ─── Multishot ───────────────────────────────────
register({
  id: 'multishot',
  name: '连射',
  description: '每次攻击额外射出一支箭，造成50%伤害',
  applicableTowerTypes: [TowerType.ARROW],
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {},
  hooks: [
    h_projectileCreated((_proj) => {
      // EnchantmentManager creates bonus projectile at 50% damage
    }),
  ],
  color: 0xdd8844,
});

// ─── Frost ───────────────────────────────────────
register({
  id: 'frost',
  name: '寒冰',
  description: '攻击附带减速效果',
  applicableTowerTypes: [TowerType.MAGIC, TowerType.SLOW],
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {
    slowAmount: 0.1,
  },
  hooks: [
    h_projectileHit((_proj, _enemy) => {
      // EnchantmentManager applies SlowEffect on hit
    }),
  ],
  color: COLORS.SLOW_TINT,
});

// ─── Splash ──────────────────────────────────────
register({
  id: 'splash',
  name: '溅射',
  description: '爆炸范围扩大30%',
  applicableTowerTypes: [TowerType.CANNON],
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {
    areaRadius: 0.3, // +30% (multiplied by base areaRadius)
  },
  hooks: [
    h_projectileHit((_proj, _enemy) => {
      // EnchantmentManager applies splash damage to nearby enemies
    }),
  ],
  color: 0xe88444,
});

// ─── Stun ────────────────────────────────────────
register({
  id: 'stun',
  name: '震慑',
  description: '被击中的敌人有15%几率短暂眩晕0.5秒',
  applicableTowerTypes: [TowerType.CANNON, TowerType.MAGIC],
  maxStacks: 3,
  rarity: 'rare',
  statModifiers: {},
  hooks: [
    h_projectileHit((_proj, _enemy) => {
      // EnchantmentManager checks 15% chance and applies StunEffect
    }),
  ],
  color: COLORS.STUN_TINT,
});

// ─── Arcane Focus ────────────────────────────────
register({
  id: 'arcane_focus',
  name: '奥术专注',
  description: '每3次攻击后，下一次攻击伤害翻倍',
  applicableTowerTypes: [TowerType.MAGIC],
  maxStacks: 3,
  rarity: 'rare',
  statModifiers: {},
  hooks: [
    h_projectileCreated((_proj) => {
      // CombatManager handles damage doubling every 3rd attack
    }),
  ],
  color: 0xAA44FF,
});

// ─── Time Distortion ─────────────────────────────
register({
  id: 'time_distortion',
  name: '时间扰动',
  description: '减速效果额外提升20%',
  applicableTowerTypes: [TowerType.SLOW],
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {
    slowAmount: 0.2,  // +20% slow (per stack, with 0.7 decay per add)
  },
  hooks: [],
  color: 0x44CCEE,
});

// ─── Resonance Field ─────────────────────────────
register({
  id: 'resonance_field',
  name: '共振场',
  description: '范围内的敌人受到其他防御塔伤害提升10%',
  applicableTowerTypes: [TowerType.SLOW],
  maxStacks: 3,
  rarity: 'rare',
  statModifiers: {},
  hooks: [],
  color: 0xFF88AA,
});

// ─── Crit (Universal) ────────────────────────────
register({
  id: 'crit',
  name: '暴击',
  description: '攻击有15%几率造成双倍伤害',
  applicableTowerTypes: [],   // universal
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {},
  hooks: [
    h_projectileHit((_proj, _enemy) => {
      // CombatManager handles 15% crit chance per stack
    }),
  ],
  color: 0xFFAA00,
});

// ─── Experience (Universal) ──────────────────────
register({
  id: 'experience',
  name: '经验',
  description: '防御塔击杀怪物时额外获得2点魔力',
  applicableTowerTypes: [],   // universal
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {},
  hooks: [],
  color: 0x88DD88,
});

// ─── Combo Rules ─────────────────────────────────
COMBO_RULES.push({
  id: 'toxic_barrage',
  name: '毒素连击',
  requiredEnchantments: ['poison', 'multishot'],
  applicableTowerTypes: [TowerType.ARROW],
  description: '中毒效果可以叠加多层，每层独立计时',
  bonusHooks: [],
});

COMBO_RULES.push({
  id: 'frost_arcane',
  name: '冰霜专注',
  requiredEnchantments: ['frost', 'arcane_focus'],
  applicableTowerTypes: [TowerType.MAGIC],
  description: '受减速影响的目标被奥术专注攻击时，伤害额外+50%',
  bonusHooks: [],
});

COMBO_RULES.push({
  id: 'blast_shock',
  name: '爆震冲击',
  requiredEnchantments: ['splash', 'stun'],
  applicableTowerTypes: [TowerType.CANNON],
  description: '爆炸范围边缘的敌人也受到眩晕效果',
  bonusHooks: [],
});

// ─── Public API ──────────────────────────────────

export function getEnchantmentDefinition(id: string): EnchantmentDefinition | undefined {
  return ENCHANTMENTS.get(id);
}

export function getAllEnchantmentDefinitions(): EnchantmentDefinition[] {
  return Array.from(ENCHANTMENTS.values());
}

export function getEnchantmentsForTower(towerType: TowerType): EnchantmentDefinition[] {
  return getAllEnchantmentDefinitions().filter(
    def => def.applicableTowerTypes.length === 0 ||
           def.applicableTowerTypes.includes(towerType),
  );
}

export function getComboRules(): EnchantmentComboRule[] {
  return COMBO_RULES;
}

export function getComboRulesForTower(towerType: TowerType): EnchantmentComboRule[] {
  return COMBO_RULES.filter(
    rule => rule.applicableTowerTypes.length === 0 ||
            rule.applicableTowerTypes.includes(towerType),
  );
}

export function getStackMultiplierForLevel(stackCount: number): number {
  return getStackMultiplier(stackCount);
}
