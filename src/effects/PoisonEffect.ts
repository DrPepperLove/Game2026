import type { IEffect, IEnemy } from '../types';

/**
 * PoisonEffect — 中毒效果
 * 周期性造成伤害，持续 duration 秒，每 tickInterval 秒触发一次
 */
export class PoisonEffect implements IEffect {
  readonly type = 'poison';
  readonly source: string;
  remainingDuration: number;
  tickInterval: number;
  elapsedSinceTick: number = 0;

  private damagePerTick: number;

  constructor(
    source: string,
    damagePerTick: number,
    duration: number,
    tickInterval: number = 1000,
  ) {
    this.source = source;
    this.damagePerTick = damagePerTick;
    this.remainingDuration = duration;
    this.tickInterval = tickInterval;
  }

  onApply(enemy: IEnemy): void {
    // Visual feedback handled by the entity renderer
  }

  onTick(enemy: IEnemy, delta: number): void {
    if (this.remainingDuration <= 0) return;

    this.elapsedSinceTick += delta;

    while (this.elapsedSinceTick >= this.tickInterval) {
      this.elapsedSinceTick -= this.tickInterval;
      enemy.takeDamage(this.damagePerTick, true, this.source);
    }

    this.remainingDuration -= delta;
    if (this.remainingDuration < 0) {
      this.remainingDuration = 0;
    }
  }

  onRemove(enemy: IEnemy): void {
    // Effect cleanup — no action needed for poison
  }

  shouldOverride(newEffect: IEffect): boolean {
    // Stronger poison overrides weaker
    if (newEffect.type !== this.type) return false;
    const newPoison = newEffect as PoisonEffect;
    return newPoison.damagePerTick >= this.damagePerTick;
  }
}
