import { CardType, TowerType } from '../types';
import type { Card } from '../types';
import { getTowerDefinition } from './TowerRegistry';
import {
  getEnchantmentDefinition,
  getAllEnchantmentDefinitions,
} from './EnchantmentRegistry';
import { ENCHANT_ESSENCE_COST } from '../constants';
import { MathUtils } from '../utils/MathUtils';

let cardIdCounter = 0;

/**
 * CardLibrary — 卡牌库
 *
 * 提供卡牌的生成、抽取等功能。
 * 卡牌实例 ID 为运行时唯一。
 */
export function generateCardId(): string {
  return `card_${++cardIdCounter}_${Date.now()}`;
}

/**
 * 创建一张塔防卡牌
 */
export function createTowerCard(towerType: TowerType): Card {
  const def = getTowerDefinition(towerType);
  return {
    id: generateCardId(),
    type: CardType.TOWER,
    towerType,
    name: def.name,
    description: def.description,
    cost: def.cost,
    color: def.color,
  };
}

/**
 * 创建一张附魔卡牌
 */
export function createEnchantmentCard(enchantmentId: string): Card {
  const def = getEnchantmentDefinition(enchantmentId);
  if (!def) {
    throw new Error(`CardLibrary: unknown enchantment '${enchantmentId}'`);
  }
  return {
    id: generateCardId(),
    type: CardType.ENCHANTMENT,
    enchantmentId,
    name: def.name,
    description: def.description,
    cost: 0, // 附魔卡花费的是提供的魔力资源
    color: def.color,
  };
}

/**
 * 获取所有可能的塔防卡牌
 */
export function getAllTowerCards(): Card[] {
  return [
    TowerType.ARROW,
    TowerType.MAGIC,
    TowerType.CANNON,
    TowerType.SLOW,
  ].map(createTowerCard);
}

/**
 * 获取所有可能的附魔卡牌
 */
export function getAllEnchantmentCards(): Card[] {
  return getAllEnchantmentDefinitions().map((def) =>
    createEnchantmentCard(def.id),
  );
}

/**
 * 获取附魔卡的精华消耗
 */
export function getEnchantmentEssenceCost(enchantmentId: string): number {
  const def = getEnchantmentDefinition(enchantmentId);
  if (!def) return 0;
  return ENCHANT_ESSENCE_COST[def.rarity] ?? 5;
}

/**
 * 生成卡牌3选1奖励选项（按掉落等级加权）
 */
export function generateCardReward(tier: 'normal' | 'elite' | 'boss'): Card[] {
  const options: Card[] = [];
  const pool: Card[] = [];

  // Build weighted pool based on tier
  const towerTypes = [TowerType.ARROW, TowerType.MAGIC, TowerType.CANNON, TowerType.SLOW];

  if (tier === 'boss') {
    // Boss: guaranteed rare/epic enchantment + 2 tower cards
    const enchants = getAllEnchantmentDefinitions().filter(
      e => e.rarity === 'rare' || e.rarity === 'epic',
    );
    if (enchants.length > 0) {
      pool.push(createEnchantmentCard(MathUtils.randomPick(enchants)!.id));
    }
    // Fill with towers
    for (let i = 0; i < 3; i++) {
      pool.push(createTowerCard(MathUtils.randomPick(towerTypes)!));
    }
  } else if (tier === 'elite') {
    // Elite: 60% chance enchant, rest towers
    for (let i = 0; i < 3; i++) {
      if (MathUtils.chance(0.6)) {
        const enchants = getAllEnchantmentDefinitions().filter(
          e => e.rarity !== 'epic',
        );
        pool.push(createEnchantmentCard(MathUtils.randomPick(enchants)!.id));
      } else {
        pool.push(createTowerCard(MathUtils.randomPick(towerTypes)!));
      }
    }
  } else {
    // Normal: 50/50 tower and common enchantment cards
    for (let i = 0; i < 3; i++) {
      if (MathUtils.chance(0.5)) {
        const commonEnchants = getAllEnchantmentDefinitions().filter(
          e => e.rarity === 'common',
        );
        if (commonEnchants.length > 0) {
          pool.push(createEnchantmentCard(MathUtils.randomPick(commonEnchants)!.id));
        } else {
          pool.push(createTowerCard(MathUtils.randomPick(towerTypes)!));
        }
      } else {
        pool.push(createTowerCard(MathUtils.randomPick(towerTypes)!));
      }
    }
  }

  // Pick 3 unique cards from pool
  const seen = new Set<string>();
  for (const card of pool) {
    if (seen.has(card.name)) continue;
    seen.add(card.name);
    options.push(card);
    if (options.length >= 3) break;
  }
  // Fill if less than 3
  while (options.length < 3) {
    options.push(createTowerCard(MathUtils.randomPick(towerTypes)!));
  }
  return options;
}

/**
 * 随机抽取一张卡牌（按权重）
 * 50% 塔卡, 50% 附魔卡
 */
export function drawRandomCard(): Card {
  if (MathUtils.chance(0.5)) {
    // 附魔卡
    const enchantDefs = getAllEnchantmentDefinitions();
    const def = MathUtils.randomPick(enchantDefs);
    return createEnchantmentCard(def ? def.id : 'poison');
  } else {
    // 塔防卡
    const towerTypes = [TowerType.ARROW, TowerType.MAGIC, TowerType.CANNON, TowerType.SLOW];
    return createTowerCard(MathUtils.randomPick(towerTypes) ?? TowerType.ARROW);
  }
}
