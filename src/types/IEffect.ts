import type { IEnemy } from './IEnemy';

/**
 * IEffect — 统一的状态效果接口
 *
 * ★ 核心扩展点：所有状态效果（中毒、减速、眩晕、恐惧等）都实现此接口。
 * 新增效果类型只需：
 *   1) 创建新的 Effect 类实现此接口
 *   2) 在附魔的 hooks 中附加该效果
 * — 核心代码零修改。
 */
export interface IEffect {
  /** Unique type identifier, e.g. 'poison', 'slow', 'stun' */
  readonly type: string;

  /** Source enchantment ID, for debugging and stacking */
  readonly source: string;

  /** Remaining duration in ms. Set to 0 to trigger removal. */
  remainingDuration: number;

  /** Interval between ticks in ms. 0 = non-periodic (applied once). */
  tickInterval: number;

  /** Internal: elapsed time since last tick, for periodic effects */
  elapsedSinceTick: number;

  /** Called when effect is first applied to an enemy */
  onApply(enemy: IEnemy): void;

  /** Called each frame. For periodic effects, manages tick timing internally. */
  onTick(enemy: IEnemy, delta: number): void;

  /** Called when effect expires or is removed */
  onRemove(enemy: IEnemy): void;

  /** Whether this effect should be overridden by a new effect of the same type */
  shouldOverride(newEffect: IEffect): boolean;
}
