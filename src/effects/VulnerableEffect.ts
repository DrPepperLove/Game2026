import type { IEffect, IEnemy } from '../types';

/**
 * VulnerableEffect — 易伤效果
 * 使敌人受到的所有伤害乘以 multiplier（如 1.1 = +10%）
 * 非周期性效果，持续 duration 毫秒
 */
export class VulnerableEffect implements IEffect {
  readonly type = 'vulnerable';
  readonly source: string;
  remainingDuration: number;
  tickInterval: number = 0; // non-periodic
  elapsedSinceTick: number = 0;

  /** Damage multiplier (1.0 = normal, 1.1 = +10%) */
  readonly multiplier: number;

  constructor(source: string, multiplier: number, duration: number) {
    this.source = source;
    this.multiplier = multiplier;
    this.remainingDuration = duration;
  }

  onApply(_enemy: IEnemy): void {
    // Visual: handled by entity renderer
  }

  onTick(_enemy: IEnemy, delta: number): void {
    this.remainingDuration -= delta;
  }

  onRemove(_enemy: IEnemy): void {
    // Cleanup handled by effect removal
  }

  shouldOverride(newEffect: IEffect): boolean {
    if (newEffect.type !== this.type) return false;
    const newVuln = newEffect as VulnerableEffect;
    return newVuln.multiplier >= this.multiplier;
  }
}
