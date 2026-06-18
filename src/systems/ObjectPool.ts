/**
 * ObjectPool — 泛型对象池
 *
 * 用于频繁创建/销毁的对象（如 Projectile），避免 GC 压力。
 *
 * ★ 扩展点：可用于任何需要池化的 GameObjects，不限于弹射物。
 */
export class ObjectPool<T extends { alive: boolean; activate: (...args: any[]) => void; deactivate: () => void }> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number = 10, maxSize: number = 50) {
    this.factory = factory;
    this.maxSize = maxSize;

    // Pre-populate
    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      obj.deactivate();
      this.pool.push(obj);
    }
  }

  /** Get an inactive object, or create a new one if pool not exhausted */
  get(): T | null {
    // Find inactive
    for (const obj of this.pool) {
      if (!obj.alive) return obj;
    }

    // Create new if under max
    if (this.pool.length < this.maxSize) {
      const obj = this.factory();
      obj.deactivate();
      this.pool.push(obj);
      return obj;
    }

    console.warn('ObjectPool: exhausted, no available objects');
    return null;
  }

  /** Get all currently alive objects */
  getActive(): T[] {
    return this.pool.filter(obj => obj.alive);
  }

  /** Return the total number of objects (alive + inactive) */
  get totalSize(): number {
    return this.pool.length;
  }

  /** Return the count of alive objects */
  get activeCount(): number {
    return this.pool.filter(obj => obj.alive).length;
  }
}
