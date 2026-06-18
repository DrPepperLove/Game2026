import type { IEnemy } from './IEnemy';
import type { IEffect } from './IEffect';
import type { TowerType } from './ITower';

// ─── Projectile Config ──────────────────────────────────

export interface ProjectileConfig {
  damage: number;
  speed: number;             // px/s
  armorPenetration: boolean;
  areaDamage: boolean;
  areaRadius: number;
  appliedEffects: IEffect[]; // effects to apply on hit
  sourceTowerType: TowerType;
  sourceTowerId: string;
  isBonus: boolean;          // true = secondary projectile (e.g. multishot)
}

// ─── Projectile Interface ───────────────────────────────

export interface IProjectile {
  readonly id: string;
  readonly config: ProjectileConfig;
  targetEnemy: IEnemy | null;
  targetX: number;
  targetY: number;
  alive: boolean;
  x: number;
  y: number;

  /** Activate from pool */
  activate(
    x: number,
    y: number,
    target: IEnemy | null,
    targetX: number,
    targetY: number,
    config: ProjectileConfig,
  ): void;

  /** Deactivate and return to pool */
  deactivate(): void;

  /** Called each frame to move toward target */
  update(delta: number): void;
}
