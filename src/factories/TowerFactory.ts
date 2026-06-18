import Phaser from 'phaser';
import { TowerType } from '../types';
import { Tower } from '../entities/Tower';
import { GridUtils } from '../utils/GridUtils';

/**
 * TowerFactory — 防御塔工厂
 *
 * Type → Tower 实例的统一创建入口。
 */
export class TowerFactory {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(towerType: TowerType, gridX: number, gridY: number): Tower {
    const { x, y } = GridUtils.gridToPixel(gridX, gridY);
    return new Tower(this.scene, towerType, gridX, gridY, x, y);
  }
}
