/**
 * ServiceLocator — Scene 级 IoC 容器
 *
 * 用于在 GameScene 中注册和获取系统服务（Manager 实例）。
 * 避免 Manager 之间的直接 import 依赖，便于：
 *   - 单元测试 mock
 *   - 未来替换实现
 *   - 解耦系统间依赖
 *
 * 生命周期绑定到单个 Scene：scene 启动时注册，关闭时清空。
 */
export class ServiceLocator {
  private services: Map<string, unknown> = new Map();

  register<T>(key: string, instance: T): void {
    if (this.services.has(key)) {
      console.warn(`ServiceLocator: overwriting existing service '${key}'`);
    }
    this.services.set(key, instance);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`ServiceLocator: service '${key}' not registered`);
    }
    return service as T;
  }

  tryGet<T>(key: string): T | null {
    return (this.services.get(key) as T) ?? null;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }

  remove(key: string): void {
    this.services.delete(key);
  }

  clear(): void {
    this.services.clear();
  }
}
