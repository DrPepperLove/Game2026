import Phaser from 'phaser';
import { DEPTH, COLORS } from '../constants';
import type { IProjectile, IEnemy, ProjectileConfig } from '../types';
import { TowerType } from '../types';

let projIdCounter = 0;

/**
 * Projectile — 弹射物实体
 *
 * 每帧追踪目标或飞向目标位置。抵达后触发命中处理。
 */
export class Projectile extends Phaser.GameObjects.Arc implements IProjectile {
  readonly id: string;
  readonly config: ProjectileConfig;
  targetEnemy: IEnemy | null = null;
  targetX: number = 0;
  targetY: number = 0;
  alive: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 4, 0, 360, false, 0xffffff, 1);
    this.id = `proj_${++projIdCounter}`;
    this.config = {} as ProjectileConfig; // set in activate()
    this.setDepth(DEPTH.PROJECTILES);
    this.setActive(false);
    this.setVisible(false);
    scene.add.existing(this);
  }

  activate(
    x: number,
    y: number,
    target: IEnemy | null,
    targetX: number,
    targetY: number,
    config: ProjectileConfig,
  ): void {
    this.setPosition(x, y);
    this.targetEnemy = target;
    this.targetX = targetX;
    this.targetY = targetY;
    (this.config as ProjectileConfig) = config;
    this.alive = true;
    this.setActive(true);
    this.setVisible(true);
    this.fillColor = this.getProjectileColor(config.sourceTowerType);
    this.setRadius(this.getProjectileRadius(config.sourceTowerType));
  }

  deactivate(): void {
    this.alive = false;
    this.targetEnemy = null;
    this.setActive(false);
    this.setVisible(false);
    this.setPosition(-100, -100);
  }

  preUpdate(_time: number, delta: number): void {
    if (!this.alive) return;
    // ★ 游戏暂停时冻结弹射物
    if (this.scene.time.paused) return;

    // Determine target position
    let tx: number, ty: number;
    if (this.targetEnemy && this.targetEnemy.alive) {
      tx = this.targetEnemy.x;
      ty = this.targetEnemy.y;
    } else {
      tx = this.targetX;
      ty = this.targetY;
    }

    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      // Close enough — stop moving, let CombatManager detect & apply hit next
      // Don't set alive=false here; CombatManager checks distance independently
    } else {
      const step = (this.config.speed * delta) / 1000;
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  private getProjectileColor(type: TowerType): number {
    switch (type) {
      case TowerType.ARROW: return 0x88DDFF;
      case TowerType.MAGIC: return 0xDDA8FF;
      case TowerType.CANNON: return 0xFFAA55;
      case TowerType.SLOW: return 0x88FFCC;
      default: return 0xFFFFFF;
    }
  }

  private getProjectileRadius(type: TowerType): number {
    switch (type) {
      case TowerType.ARROW: return 4;
      case TowerType.MAGIC: return 6;
      case TowerType.CANNON: return 8;
      case TowerType.SLOW: return 5;
      default: return 4;
    }
  }
}
