import type { IEffect, IEnemy } from '../types';

/**
 * SlowEffect — 减速效果
 * 降低敌方速度百分比（0~1），持续 duration 秒
 * 最高减速取 max（多个减速效果同时存在时）
 */
export class SlowEffect implements IEffect {
  readonly type = 'slow';
  readonly source: string;
  remainingDuration: number;
  tickInterval: number = 0; // non-periodic — applied once
  elapsedSinceTick: number = 0;

  slowPercent: number; // 0~1, e.g. 0.3 = 30% slow

  constructor(source: string, slowPercent: number, duration: number) {
    this.source = source;
    this.slowPercent = slowPercent;
    this.remainingDuration = duration;
  }

  onApply(enemy: IEnemy): void {
    // Enemy speed is recalculated via getEffectiveSpeed()
  }

  onTick(_enemy: IEnemy, delta: number): void {
    this.remainingDuration -= delta;
  }

  onRemove(_enemy: IEnemy): void {
    // Speed auto-recovers because effect is removed from activeEffects
  }

  shouldOverride(newEffect: IEffect): boolean {
    if (newEffect.type !== this.type) return false;
    const newSlow = newEffect as SlowEffect;
    return newSlow.slowPercent >= this.slowPercent;
  }
}
