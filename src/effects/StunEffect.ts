import type { IEffect, IEnemy } from '../types';

/**
 * StunEffect — 眩晕效果
 * 阻止敌人移动，短暂持续（0.5s）
 */
export class StunEffect implements IEffect {
  readonly type = 'stun';
  readonly source: string;
  remainingDuration: number;
  tickInterval: number = 0;
  elapsedSinceTick: number = 0;

  constructor(source: string, duration: number) {
    this.source = source;
    this.remainingDuration = duration;
  }

  onApply(_enemy: IEnemy): void {
    // Speed is handled by enemy.getEffectiveSpeed() which checks for stun
  }

  onTick(_enemy: IEnemy, delta: number): void {
    this.remainingDuration -= delta;
  }

  onRemove(_enemy: IEnemy): void {
    // Movement resumes
  }

  shouldOverride(newEffect: IEffect): boolean {
    if (newEffect.type !== this.type) return false;
    const newStun = newEffect as StunEffect;
    // Longer stun overrides shorter
    return newStun.remainingDuration >= this.remainingDuration;
  }
}
