import { EVENTS, ENCHANTMENT_STACK_MULTIPLIERS } from '../constants';
import type {
  ITower,
  IEnchantmentInstance,
  EnchantmentComboRule,
} from '../types';
import { TowerType } from '../types';
import { getEnchantmentDefinition, getComboRulesForTower } from '../data/EnchantmentRegistry';
import { EventBus } from '../core/EventBus';

/**
 * EnchantmentManager — 附魔系统
 *
 * 职责：
 *   - 附魔施加/移除（槽位管理、叠加规则）
 *   - 属性修正计算
 *   - 组合规则检测与激活
 *   - 提供附魔对塔属性的最终修正
 */
export class EnchantmentManager {
  // Track active combos per tower to avoid duplicate activation
  private activeCombos: Map<string, Set<string>> = new Map(); // towerId -> Set<comboId>

  /**
   * 尝试将附魔施加到塔上。
   * 返回 true 表示成功。
   */
  applyEnchantment(
    tower: ITower,
    enchantmentId: string,
  ): { success: boolean; message: string } {
    const def = getEnchantmentDefinition(enchantmentId);
    if (!def) {
      return { success: false, message: '未知附魔' };
    }

    // Check tower type compatibility
    if (def.applicableTowerTypes.length > 0 &&
        !def.applicableTowerTypes.includes(tower.towerType)) {
      return { success: false, message: `此附魔不适用于${tower.definition.name}` };
    }

    // Check slot availability
    const currentSlots = tower.getEnchantmentSlotCount();
    const maxSlots = tower.definition.maxEnchantmentSlots;

    // Check if enchantment already exists on this tower
    const existingIndex = tower.enchantments.findIndex(
      inst => inst.definitionId === enchantmentId,
    );

    if (existingIndex >= 0) {
      // Stack onto existing
      const existing = tower.enchantments[existingIndex];
      if (existing.stackCount >= def.maxStacks) {
        return { success: false, message: `${def.name}已达到最大层数` };
      }

      existing.stackCount++;
      EventBus.emit(EVENTS.ENCHANT_APPLIED, { tower, enchantId: enchantmentId });
      this.checkCombos(tower);
      return { success: true, message: `${def.name} 层数 +1 (${existing.stackCount}/${def.maxStacks})` };
    }

    // New enchantment — check slot
    if (currentSlots >= maxSlots) {
      return { success: false, message: '附魔槽已满，请先移除一个附魔' };
    }

    // Add new enchantment instance
    const instance: IEnchantmentInstance = {
      definitionId: enchantmentId,
      definition: def,
      stackCount: 1,
    };

    tower.enchantments.push(instance);
    EventBus.emit(EVENTS.ENCHANT_APPLIED, { tower, enchantId: enchantmentId });

    // Refresh tower range circle if visible
    (tower as any).refreshRangeCircle?.();

    this.checkCombos(tower);
    return { success: true, message: `已施加 ${def.name}` };
  }

  /**
   * 从塔上移除指定槽位的附魔
   */
  removeEnchantment(tower: ITower, slotIndex: number): { success: boolean; message: string } {
    if (slotIndex < 0 || slotIndex >= tower.enchantments.length) {
      return { success: false, message: '无效的附魔槽位' };
    }

    const removed = tower.enchantments.splice(slotIndex, 1)[0];
    EventBus.emit(EVENTS.ENCHANT_REMOVED, {
      tower,
      enchantId: removed.definitionId,
    });

    // Clear combos for this tower and re-check
    this.activeCombos.delete(tower.id);
    this.checkCombos(tower);

    // Refresh tower range circle if visible
    (tower as any).refreshRangeCircle?.();

    return { success: true, message: `已移除 ${removed.definition.name}` };
  }

  /**
   * 计算附魔叠加后的属性修正
   */
  getStackMultiplier(stackCount: number): number {
    return ENCHANTMENT_STACK_MULTIPLIERS[stackCount] ?? 1.0;
  }

  /**
   * 检查并激活附魔组合规则
   */
  private checkCombos(tower: ITower): void {
    const rules = getComboRulesForTower(tower.towerType);
    const activeEnchantIds = new Set(
      tower.enchantments.map(inst => inst.definitionId),
    );

    if (!this.activeCombos.has(tower.id)) {
      this.activeCombos.set(tower.id, new Set());
    }
    const towerCombos = this.activeCombos.get(tower.id)!;

    for (const rule of rules) {
      const allRequired = rule.requiredEnchantments.every(
        reqId => activeEnchantIds.has(reqId),
      );

      if (allRequired && !towerCombos.has(rule.id)) {
        // Combo activated!
        towerCombos.add(rule.id);
        EventBus.emit(EVENTS.COMBO_ACTIVATED, {
          tower,
          comboId: rule.id,
          comboName: rule.name,
        });
      } else if (!allRequired && towerCombos.has(rule.id)) {
        // Combo deactivated
        towerCombos.delete(rule.id);
      }
    }
  }

  /**
   * Get active combo IDs for a tower
   */
  getActiveCombos(towerId: string): string[] {
    const combos = this.activeCombos.get(towerId);
    return combos ? Array.from(combos) : [];
  }
}
