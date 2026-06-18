import { TILE_SIZE } from '../constants';

/**
 * GridUtils — 网格坐标 ↔ 像素坐标互转
 */
export class GridUtils {
  /**
   * 将像素坐标转换为网格坐标
   */
  static pixelToGrid(pixelX: number, pixelY: number): { gridX: number; gridY: number } {
    return {
      gridX: Math.floor(pixelX / TILE_SIZE),
      gridY: Math.floor(pixelY / TILE_SIZE),
    };
  }

  /**
   * 将网格坐标转换为像素坐标（格子中心点）
   */
  static gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * TILE_SIZE + TILE_SIZE / 2,
      y: gridY * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  /**
   * 将网格坐标转换为像素坐标（格子左上角）
   */
  static gridToPixelCorner(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * TILE_SIZE,
      y: gridY * TILE_SIZE,
    };
  }

  /**
   * 判断两个网格坐标是否相同
   */
  static gridEquals(
    a: { gridX: number; gridY: number },
    b: { gridX: number; gridY: number },
  ): boolean {
    return a.gridX === b.gridX && a.gridY === b.gridY;
  }
}
