import Phaser from 'phaser';
import { Projectile } from '../entities/Projectile';
import { ObjectPool } from '../systems/ObjectPool';
import type { IEnemy, IEffect } from '../types';
import type { ProjectileConfig } from '../types';
import { TowerType } from '../types';
import { PROJECTILE_POOL_MAX } from '../constants';

/**
 * ProjectileFactory — 弹射物工厂 + 对象池
 *
 * 负责弹射物的创建、回收和飞行调度。
 * 内部使用 ObjectPool 管理弹射物生命周期。
 */
export class ProjectileFactory {
  private pool: ObjectPool<Projectile>;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.pool = new ObjectPool<Projectile>(
      () => new Projectile(this.scene),
      20,
      PROJECTILE_POOL_MAX,
    );
  }

  /**
   * 发射一个弹射物
   */
  fire(
    fromX: number,
    fromY: number,
    target: IEnemy,
    damage: number,
    armorPenetration: boolean,
    speed: number,
    sourceTowerType: TowerType,
    sourceTowerId: string,
    areaDamage: boolean = false,
    areaRadius: number = 0,
    appliedEffects: IEffect[] = [],
    isBonus: boolean = false,
  ): Projectile | null {
    const proj = this.pool.get();
    if (!proj) return null;

    const config: ProjectileConfig = {
      damage,
      speed,
      armorPenetration,
      areaDamage,
      areaRadius,
      appliedEffects,
      sourceTowerType,
      sourceTowerId,
      isBonus,
    };

    proj.activate(
      fromX,
      fromY,
      target,
      target.x,
      target.y,
      config,
    );

    return proj;
  }

  /**
   * 发射一个飞向地面点的弹射物（炮塔用）
   */
  fireAtGround(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    damage: number,
    armorPenetration: boolean,
    speed: number,
    sourceTowerType: TowerType,
    sourceTowerId: string,
    areaDamage: boolean = false,
    areaRadius: number = 0,
    appliedEffects: IEffect[] = [],
  ): Projectile | null {
    const proj = this.pool.get();
    if (!proj) return null;

    const config: ProjectileConfig = {
      damage,
      speed,
      armorPenetration,
      areaDamage,
      areaRadius,
      appliedEffects,
      sourceTowerType,
      sourceTowerId,
      isBonus: false,
    };

    proj.activate(
      fromX,
      fromY,
      null,       // no homing target
      targetX,
      targetY,
      config,
    );

    return proj;
  }

  /**
   * 回收弹射物
   */
  recycle(proj: Projectile): void {
    proj.deactivate();
  }

  /**
   * 获取所有活跃弹射物
   */
  getActiveProjectiles(): Projectile[] {
    return this.pool.getActive();
  }

  getPoolStats(): { total: number; active: number } {
    return {
      total: this.pool.totalSize,
      active: this.pool.activeCount,
    };
  }
}
