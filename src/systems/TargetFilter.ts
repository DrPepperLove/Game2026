import { TargetStrategyType } from '../types';
import type { IEnemy } from '../types';
import type { ITower } from '../types';
import { MathUtils } from '../utils/MathUtils';

/**
 * TargetFilter — 寻敌策略集合
 *
 * ★ 扩展点：新增寻敌策略只需在此注册新函数。
 *   每种策略是一个纯函数：给定塔 + 敌人列表 → 最优目标
 */
export type TargetStrategy = (tower: ITower, enemies: IEnemy[]) => IEnemy | null;

const strategies = new Map<TargetStrategyType, TargetStrategy>();

// ─── Strategy: Closest to Base ────────────────────
// 优先攻击路径进度最远的敌人（waypointIndex 最大，距离下一路径点最近）
strategies.set(TargetStrategyType.CLOSEST_TO_BASE, (_tower, enemies) => {
  const alive = enemies.filter(e => e.alive && e.currentHP > 0);
  if (alive.length === 0) return null;

  // Filter enemies in range
  const inRange = alive.filter(e => {
    const dist = MathUtils.distance(_tower.pixelX, _tower.pixelY, e.x, e.y);
    return dist <= _tower.getEffectiveStats().range;
  });
  if (inRange.length === 0) return null;

  // Sort by waypoint progress (descending — closest to base first)
  inRange.sort((a, b) => b.waypointIndex - a.waypointIndex);
  return inRange[0];
});

// ─── Strategy: Fastest ────────────────────────────
// 优先攻击有效速度最快的敌人（慢塔专用）
strategies.set(TargetStrategyType.FASTEST, (_tower, enemies) => {
  const alive = enemies.filter(e => e.alive && e.currentHP > 0);
  if (alive.length === 0) return null;

  const inRange = alive.filter(e => {
    const dist = MathUtils.distance(_tower.pixelX, _tower.pixelY, e.x, e.y);
    return dist <= _tower.getEffectiveStats().range;
  });
  if (inRange.length === 0) return null;

  inRange.sort((a, b) => b.getEffectiveSpeed() - a.getEffectiveSpeed());
  return inRange[0];
});

// ─── Strategy: Most Dense ─────────────────────────
// 优先攻击周围敌人最多的目标（炮塔专用，最大化范围伤害价值）
strategies.set(TargetStrategyType.MOST_DENSE, (_tower, enemies) => {
  const alive = enemies.filter(e => e.alive && e.currentHP > 0);
  if (alive.length === 0) return null;

  const range = _tower.getEffectiveStats().range;
  const inRange = alive.filter(e => {
    const dist = MathUtils.distance(_tower.pixelX, _tower.pixelY, e.x, e.y);
    return dist <= range;
  });
  if (inRange.length === 0) return null;

  // Score each enemy by how many other enemies are within splash radius (default 70px)
  const splashRadius = _tower.getEffectiveStats().areaRadius || 70;
  let bestTarget: IEnemy | null = null;
  let bestScore = -1;

  for (const enemy of inRange) {
    let score = 0;
    for (const other of inRange) {
      if (other.id === enemy.id) continue;
      const dist = MathUtils.distance(enemy.x, enemy.y, other.x, other.y);
      if (dist <= splashRadius) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTarget = enemy;
    }
  }

  // Fallback to closest-to-base
  if (!bestTarget && inRange.length > 0) {
    inRange.sort((a, b) => b.waypointIndex - a.waypointIndex);
    bestTarget = inRange[0];
  }

  return bestTarget;
});

// ─── Public API ──────────────────────────────────

export function getTargetStrategy(type: TargetStrategyType): TargetStrategy {
  const strategy = strategies.get(type);
  if (!strategy) {
    throw new Error(`TargetFilter: unknown strategy '${type}'`);
  }
  return strategy;
}

export function findTarget(tower: ITower, enemies: IEnemy[]): IEnemy | null {
  const strategy = getTargetStrategy(tower.definition.targetStrategy);
  return strategy(tower, enemies);
}
