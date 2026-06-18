import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { EnemyType } from '../types';
import type { EnemyDefinition } from '../types';
import { getEnemyDefinition } from '../data/EnemyRegistry';
import { Enemy } from '../entities/Enemy';

const PATH_CENTER_OFFSET = TILE_SIZE; // 32px — 2格宽路径的正中央

/**
 * EnemyFactory — 敌人工厂
 *
 * 自动将 waypoints 偏移半个 tile，使敌人走在 2 格宽路径的中央。
 * 当指定 spawn 位置（x, y）时，自动裁剪 waypoints 从最近的前方路径点开始，
 * 避免分裂/召唤的敌人先回头走到起点。
 */
export class EnemyFactory {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 创建单个敌人
   * @param x 可选：指定生成位置（分裂/召唤时使用）
   * @param y 可选：指定生成位置
   */
  create(
    type: EnemyType,
    waypoints: Array<{ x: number; y: number }>,
    x?: number,
    y?: number,
  ): Enemy {
    const def = getEnemyDefinition(type);

    // ★ 偏移 waypoints 使敌人走在路径中央
    const centeredWaypoints = waypoints.map(wp => ({
      x: wp.x + PATH_CENTER_OFFSET,
      y: wp.y + PATH_CENTER_OFFSET,
    }));

    // ★ 指定了生成位置 → 裁剪 waypoints，从最近的前方路径点开始
    let adjustedWaypoints = centeredWaypoints;
    if (x !== undefined && y !== undefined) {
      adjustedWaypoints = this.truncateWaypoints(centeredWaypoints, x, y);
    }

    const spawnX = x ?? centeredWaypoints[0]?.x ?? 0;
    const spawnY = y ?? centeredWaypoints[0]?.y ?? 0;
    return new Enemy(this.scene, def, adjustedWaypoints, spawnX, spawnY);
  }

  createFromDefinition(
    def: EnemyDefinition,
    waypoints: Array<{ x: number; y: number }>,
    x?: number,
    y?: number,
  ): Enemy {
    const centeredWaypoints = waypoints.map(wp => ({
      x: wp.x + PATH_CENTER_OFFSET,
      y: wp.y + PATH_CENTER_OFFSET,
    }));

    let adjustedWaypoints = centeredWaypoints;
    if (x !== undefined && y !== undefined) {
      adjustedWaypoints = this.truncateWaypoints(centeredWaypoints, x, y);
    }

    const spawnX = x ?? centeredWaypoints[0]?.x ?? 0;
    const spawnY = y ?? centeredWaypoints[0]?.y ?? 0;
    return new Enemy(this.scene, def, adjustedWaypoints, spawnX, spawnY);
  }

  /**
   * 从 spawn 位置开始，找到最近的路径点，裁掉之前的所有点
   */
  private truncateWaypoints(
    waypoints: Array<{ x: number; y: number }>,
    spawnX: number,
    spawnY: number,
  ): Array<{ x: number; y: number }> {
    let closestIdx = 0;
    let minDistSq = Infinity;

    for (let i = 0; i < waypoints.length; i++) {
      const dx = waypoints[i].x - spawnX;
      const dy = waypoints[i].y - spawnY;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestIdx = i;
      }
    }

    // 从最近点开始，确保敌人往前走，不走回头路
    return waypoints.slice(closestIdx);
  }
}
