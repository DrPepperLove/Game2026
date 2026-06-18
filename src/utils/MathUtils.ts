/**
 * MathUtils — 通用数学工具函数
 */
export class MathUtils {
  /**
   * 两点之间的欧几里得距离
   */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 两点之间的平方距离（避免开根号的性能开销）
   */
  static distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  /**
   * 归一化方向向量
   */
  static normalize(x: number, y: number): { x: number; y: number } {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
  }

  /**
   * 随机整数 [min, max]
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 根据概率返回 true/false
   */
  static chance(probability: number): boolean {
    return Math.random() < probability;
  }

  /**
   * 从数组中随机选取一个元素
   */
  static randomPick<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 限制值在 [min, max] 范围内
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 线性插值
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
