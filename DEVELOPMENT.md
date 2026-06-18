# 开发指南 — Card Tower Defense

本文档面向后续开发者，说明如何在现有架构上扩展新内容、修改 UI、调整数据模型。所有扩展均遵循**数据驱动 + 接口隔离 + 事件通信**原则，不修改核心逻辑。

---

## 目录

1. [项目架构概览](#1-项目架构概览)
2. [添加新防御塔](#2-添加新防御塔)
3. [添加新怪物](#3-添加新怪物)
4. [添加新附魔卡](#4-添加新附魔卡)
5. [添加新状态效果](#5-添加新状态效果)
6. [添加新关卡](#6-添加新关卡)
7. [添加新场景](#7-添加新场景)
8. [添加新寻敌策略](#8-添加新寻敌策略)
9. [添加新卡牌类型](#9-添加新卡牌类型)
10. [修改 UI](#10-修改-ui)
11. [修改背景贴图（草地/路径）](#11-修改背景贴图草地路径)
12. [修改数据模型](#12-修改数据模型)
13. [添加新资源类型](#13-添加新资源类型)
14. [添加新游戏模式](#14-添加新游戏模式)
15. [添加国际化 / 多语言](#15-添加国际化--多语言)
16. [添加存档系统](#16-添加存档系统)
17. [添加音效系统](#17-添加音效系统)
18. [添加新手引导 / 教程](#18-添加新手引导--教程)
19. [添加数据统计 / 埋点](#19-添加数据统计--埋点)
20. [添加关卡编辑器](#20-添加关卡编辑器)
21. [添加单元测试](#21-添加单元测试)
22. [事件系统参考](#22-事件系统参考)
23. [常用开发命令](#23-常用开发命令)
24. [文件检查清单](#24-文件检查清单)

---

## 1. 项目架构概览

```
src/
├── types/         ← 接口定义层（所有模块的契约）
├── constants.ts   ← 全局常量、事件名、颜色、深度
├── core/          ← EventBus、GameState、ServiceLocator
├── data/          ← 静态配置数据（Registry 模式）
├── entities/      ← 游戏实体（Tower、Enemy、Projectile、CardSprite）
├── effects/       ← 状态效果（Poison、Slow、Stun）
├── factories/     ← 实体工厂（统一创建入口）
├── systems/       ← 游戏系统（Map、Wave、Hand、Combat、Enchantment）
├── ui/            ← UI 组件（HUD、CardHand、TowerPanel、GameOver）
├── utils/         ← 工具函数（Grid、Math、Color）
└── scenes/        ← Phaser 场景（Boot、Menu、LevelSelect、Game）
```

### 核心设计原则

| 原则 | 实践 |
|------|------|
| **数据驱动** | 新内容通过追加 Registry 数据实现，不修改核心逻辑 |
| **接口隔离** | 所有模块依赖 `types/` 中的接口，而非具体实现 |
| **事件通信** | 系统间通过 `EventBus` 通信，事件名统一在 `constants.ts` |
| **工厂创建** | 实体通过 Factory 创建，不直接 `new` |

### 依赖层次图

```
                    ┌─────────────┐
                    │  constants  │  ← 枚举、事件名、颜色、深度
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              v            v            v
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │  types/  │ │ EventBus │ │  utils/  │  ← 接口 + 基础工具（被所有模块安全依赖）
       └────┬─────┘ └────┬─────┘ └────┬─────┘
            │            │            │
       ┌────v────┐  ┌────v────┐  ┌────v────┐
       │  data/  │  │  core/  │  │factories│  ← 数据 + 基础设施
       └────┬────┘  └────┬────┘  └────┬────┘
            │            │            │
            └────────────┼────────────┘
                         │
              ┌──────────┼──────────┐
              v          v          v
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │entities │ │ systems │ │   ui/   │  ← 实体 + 逻辑 + 视图（同层，通过 EventBus 通信）
        └─────────┘ └─────────┘ └─────────┘
                         │
                    ┌────v────┐
                    │ scenes/ │  ← 场景（顶层编排）
                    └─────────┘
```

**依赖规则：**
- `types/`、`constants.ts`、`EventBus.ts`、`utils/` — **零内部依赖**，可被任何模块安全引用
- `data/` 只依赖 `types/`
- `factories/` 依赖 `types/` + `data/` + `entities/`
- `entities/` 依赖 `types/` + `constants.ts` + `EventBus`
- `systems/` 依赖 `types/` + `constants.ts` + `EventBus` + `factories/` + `entities/`
- `ui/` 依赖 `types/` + `constants.ts` + `EventBus` + `core/GameStateManager`
- `scenes/` 依赖所有模块（顶层编排）
- **禁止循环依赖**：若出现则提取共同依赖到 `types/` 或 `core/`

### 关键文件速查

| 想做什么 | 改哪个文件 |
|----------|-----------|
| 加新塔类型 | `src/data/TowerRegistry.ts` |
| 加新怪物类型 | `src/data/EnemyRegistry.ts` |
| 加新附魔 | `src/data/EnchantmentRegistry.ts` |
| 加新关卡 | `public/assets/data/levels/` 新建 JSON + `levels.json` 索引 |
| 加新状态效果 | `src/effects/` 新建类 |
| 加新寻敌策略 | `src/systems/TargetFilter.ts` |
| 改塔的数值 | `src/data/TowerRegistry.ts` |
| 改怪的数值 | `src/data/EnemyRegistry.ts` |
| 改 UI 布局 | `src/ui/` 对应组件 |
| 改颜色 | `src/constants.ts` → `COLORS` |
| 改游戏数值 | `src/constants.ts` → 顶部平衡常量 |
| 改升级倍率 | `src/types/ITower.ts` → `UPGRADE_MULTIPLIERS` |
| 改附魔叠加倍率 | `src/types/IEnchantment.ts` → `getStackMultiplier()` |

---

## 2. 添加新防御塔

只需在 `src/data/TowerRegistry.ts` 中调用 `register()` 追加一条记录。

### 示例：添加一个"雷电塔"

```typescript
// src/data/TowerRegistry.ts — 在文件末尾追加

register({
  type: TowerType.LIGHTNING,        // ① 先在 types/ITower.ts 的 TowerType 枚举中添加
  name: '雷电塔',
  description: '连锁闪电，弹射伤害',
  cost: 2,
  baseStats: {
    damage: 20,
    attackSpeed: 1.2,
    range: 180,
    armorPenetration: false,
    areaDamage: true,              // 连锁 = 范围伤害
    areaRadius: 60,
    slowAmount: 0,
    slowDuration: 0,
    projectileSpeed: 500,
  },
  maxEnchantmentSlots: 3,
  targetStrategy: TargetStrategyType.CLOSEST_TO_BASE,
  color: 0xffff44,                 // 黄色
});
```

### 需要同步修改的文件（共 6 处）

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | `src/types/ITower.ts` | 在 `TowerType` 枚举中添加 `LIGHTNING = 'LIGHTNING'` |
| 2 | `src/data/TowerRegistry.ts` | 调用 `register({...})` |
| 3 | `src/data/CardLibrary.ts` | 在 `getAllTowerCards()` 数组中加入 `TowerType.LIGHTNING` |
| 4 | `src/entities/Tower.ts` | 添加 `drawLightningBody()` 绘制方法，在 `drawBody()` 和 `getDarkColor()` 的 switch 中添加 case |
| 5 | `src/entities/Projectile.ts` | 在 `getProjectileColor()` 和 `getProjectileRadius()` 的 switch 中添加 case |
| 6 | `src/entities/CardSprite.ts` | 在 `getIconChar()` 的 TOWER switch 中添加图标 |

### Tower.ts 中添加视觉绘制的详细步骤

在 `drawBody()` 的 switch 中追加：

```typescript
case TowerType.LIGHTNING:
  this.drawLightningBody(g, s, color, dark);
  break;
```

然后实现绘制方法：

```typescript
private drawLightningBody(g: Phaser.GameObjects.Graphics, s: number, c: number, d: number): void {
  g.fillStyle(0x000000, 0.15);
  g.fillCircle(2, 2, s);
  g.fillStyle(c, 1);
  g.fillCircle(0, 0, s);
  g.lineStyle(2, d, 1);
  g.strokeCircle(0, 0, s);
  // 闪电标记
  g.lineStyle(1.5, 0xffffff, 0.7);
  g.beginPath();
  g.moveTo(-2, -s * 0.6); g.lineTo(2, 0); g.lineTo(-2, 0); g.lineTo(2, s * 0.6);
  g.strokePath();
}
```

在 `getDarkColor()` 的 switch 中追加：

```typescript
case TowerType.LIGHTNING: return 0xCCBB00;
```

### TowerStats 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `damage` | `number` | 每次攻击的基础伤害 |
| `attackSpeed` | `number` | 每秒攻击次数（内部转为冷却 ms = 1000/攻速） |
| `range` | `number` | 攻击范围（像素） |
| `armorPenetration` | `boolean` | 是否无视护甲 |
| `areaDamage` | `boolean` | 是否范围伤害 |
| `areaRadius` | `number` | 范围伤害半径（像素） |
| `slowAmount` | `number` | 减速比例 0~1（0=无减速） |
| `slowDuration` | `number` | 减速持续时间（毫秒） |
| `projectileSpeed` | `number` | 弹射物飞行速度（px/s） |

### 塔的升级系统

塔最多升级到 3 级（`MAX_TOWER_LEVEL`）。升级倍率定义在 `src/types/ITower.ts`：

```typescript
export const UPGRADE_MULTIPLIERS: Record<number, Partial<TowerStats>> = {
  1: {},                                                       // Lv1 = 基准
  2: { damage: 1.3, attackSpeed: 1.15, range: 1.1 },          // Lv2
  3: { damage: 1.6, attackSpeed: 1.3, range: 1.2 },           // Lv3
};
```

升级方式：手中选中同类型塔卡 → 点击已部署的同类型塔 → 自动升级（不消耗建造点）。升级后塔视觉放大（`getBodySize()` 返回 `18 + level * 2`），并显示等级标签。

满级塔有 1 个额外附魔槽（`getMaxEnchantmentSlots()` 返回 `base + (level >= 3 ? 1 : 0)`）。

拆除塔时返还 `getTotalInvestedCost() * 0.5`（总投入 = 基础费用 × 等级）。

### 寻敌策略（TargetStrategyType）

| 策略 | 行为 | 适合塔类型 |
|------|------|-----------|
| `CLOSEST_TO_BASE` | 优先攻击路径进度最远的敌人 | 箭塔、魔法塔 |
| `FASTEST` | 优先攻击有效速度最快的敌人 | 凝滞塔 |
| `MOST_DENSE` | 优先攻击周围敌人最多的位置 | 炮塔 |

---

## 3. 添加新怪物

只需在 `src/data/EnemyRegistry.ts` 中调用 `register()`。

### 示例：添加"飞行石像鬼"

```typescript
// src/data/EnemyRegistry.ts

register({
  type: EnemyType.FLYING,        // ① 先在 types/IEnemy.ts 的 EnemyType 枚举中添加
  name: '飞行石像鬼',
  stats: {
    maxHP: 60,
    speed: 90,
    armor: 5,
    rewardEssence: 12,
    cardDropChance: 0.7,
    baseReachPenalty: 2,         // 到达基地扣 2 血
  },
  color: 0x9966cc,               // 紫色
  radius: 13,
});
```

### 需要同步修改的文件（共 4 处）

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | `src/types/IEnemy.ts` | 在 `EnemyType` 枚举中添加 `FLYING = 'FLYING'` |
| 2 | `src/data/EnemyRegistry.ts` | 调用 `register({...})` |
| 3 | `src/entities/Enemy.ts` | 在 `drawBody()` 的 switch 中添加新类型的视觉（脸部表情）；在 `getDarkColor()` 中添加对应 case |
| 4 | `src/constants.ts` | 在 `COLORS` 中添加新颜色常量（如 `FLYING: 0x9966cc, FLYING_DARK: 0x7744aa`） |

### Enemy.ts 中添加视觉

在 `drawBody()` 的 switch 中追加：

```typescript
case EnemyType.FLYING:
  // Wings-shaped eyes + small beak
  g.lineStyle(1.5, dark, 1);
  g.beginPath();
  g.moveTo(-eyeGap - 4, eyeY - 2); g.lineTo(-eyeGap + 4, eyeY);
  g.strokePath();
  g.beginPath();
  g.moveTo(eyeGap + 4, eyeY - 2); g.lineTo(eyeGap - 4, eyeY);
  g.strokePath();
  break;
```

### EnemyStats 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `maxHP` | `number` | 最大生命值 |
| `speed` | `number` | 移动速度（px/s） |
| `armor` | `number` | 护甲（固定减伤，`takeDamage` 时减去此值，最低伤害为 1） |
| `rewardEssence` | `number` | 击杀奖励的魔力 |
| `cardDropChance` | `number` | 卡牌掉落概率（0~1） |
| `baseReachPenalty` | `number` | 到达基地时扣除的血量 |

### 怪物移动系统

敌人在 `preUpdate()` 中逐帧向 waypoints 移动：
- 到达一个 waypoint（`dist < 3`）后切换到下一个
- 眩晕期间（`hasEffect('stun')`）速度归零
- 减速效果取所有 slow 效果中的最大值
- 最低速度受 `MIN_ENEMY_SPEED`（20px/s）限制
- waypoints 在 EnemyFactory 中自动偏移 `TILE_SIZE`(32px)，使敌人走在 2 格宽路径的中央

### 怪物死亡/到达基地流程

死亡：`die()` → 发 `ENEMY_KILLED` → 缩放到 0 的动画 → destroy
到达基地：`reachedBase()` → 发 `ENEMY_BASE_REACHED` → destroy（GameScene 监听此事件扣血）

---

## 4. 添加新附魔卡

只需在 `src/data/EnchantmentRegistry.ts` 中调用 `register()`，如需特殊命中逻辑在 `CombatManager.ts` 的 `executeHitHook()` 中添加 case。

### 示例：添加"燃烧"附魔

```typescript
// src/data/EnchantmentRegistry.ts

register({
  id: 'burning',
  name: '燃烧',
  description: '攻击附带灼烧，每秒 8 伤害，持续 2 秒',
  applicableTowerTypes: [TowerType.ARROW, TowerType.MAGIC],
  maxStacks: 3,
  rarity: 'common',
  statModifiers: {
    damage: 3,                    // +3 基础伤害
  },
  hooks: [
    h_projectileHit((_proj, _enemy) => {
      // 实际效果由 CombatManager.executeHitHook 处理
    }),
  ],
  color: 0xff6600,
});
```

### 需要同步修改的文件（共 3 处）

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | `src/data/EnchantmentRegistry.ts` | 调用 `register({...})` |
| 2 | `src/systems/CombatManager.ts` | 在 `executeHitHook()` 的 switch 中添加 case |
| 3 | `src/entities/CardSprite.ts` | 在 `getIconChar()` 的 ENCHANTMENT switch 中添加图标 |

### CombatManager.executeHitHook 中的处理

```typescript
// src/systems/CombatManager.ts → executeHitHook()
case 'burning': {
  const burnDmg = 8 * stackCount;
  const burn = new BurnEffect('enchant_burning', burnDmg, 2000, 800);
  enemy.applyEffect(burn);
  break;
}
```

### statModifiers 可用字段

所有 `TowerStats` 字段均可使用（`Partial<TowerStats>`）。对于**百分比类**字段（如 `areaRadius`），使用乘法（0.3 = +30%）。对于**绝对值**字段（如 `damage`），使用加法。

```typescript
statModifiers: {
  damage: 5,              // +5 伤害
  attackSpeed: 0.2,       // +0.2 攻速
  range: 30,              // +30 射程
  slowAmount: 0.1,        // +10% 减速
  slowDuration: 500,      // +500ms 减速时间
  areaRadius: 0.3,        // 范围 ×1.3（乘法）
}
```

附魔叠加计算在 `Tower.getEffectiveStats()` 中：
- 加法属性：`base.damage += m.damage * stackCount`
- 攻速：`base.attackSpeed += m.attackSpeed * stackCount * 0.7`（0.7 是衰减系数）
- 范围倍率：`base.areaRadius *= (1 + m.areaRadius * stackCount)`

### Hook 事件类型

| Hook 事件 | 触发时机 | handler 签名 |
|-----------|----------|-------------|
| `onProjectileCreated` | 弹射物生成时 | `(proj: IProjectile) => void` — 用于多射等修改弹射物属性 |
| `onProjectileHit` | 弹射物命中时 | `(proj: IProjectile, enemy: IEnemy) => void` — 用于施加效果 |
| `onEnemyKilled` | 敌人被击杀时 | `(tower: ITower, enemy: IEnemy) => void` — 用于击杀效果 |

### 添加组合规则

```typescript
// 在 EnchantmentRegistry.ts COMBO_RULES 数组中追加
COMBO_RULES.push({
  id: 'fire_and_ice',
  name: '冰火两重天',
  requiredEnchantments: ['burning', 'frost'],  // 需要的附魔 ID
  applicableTowerTypes: [TowerType.MAGIC],
  description: '灼烧+寒冰：敌人同时受到额外 50% 伤害',
  bonusHooks: [],
});
```

组合规则在附魔施加/移除时由 `EnchantmentManager.checkCombos()` 自动检测。满足条件时发出 `COMBO_ACTIVATED` 事件，不满足时自动取消。

### 附魔叠加公式

叠加倍率定义在 `src/types/IEnchantment.ts` → `getStackMultiplier()`：

```typescript
1层 → 1.0x
2层 → 1.7x
3层 → 2.2x
```

修改此函数即可调整全游戏的叠加收益曲线。

### 附魔适用性

`applicableTowerTypes` 为空数组 `[]` 表示通用附魔，可施加到任意塔类型。指定类型则只对指定的 `TowerType[]` 生效。

---

## 5. 添加新状态效果

### 步骤 1：创建 Effect 类

在 `src/effects/` 下新建文件，实现 `IEffect` 接口：

```typescript
// src/effects/BurnEffect.ts
import type { IEffect, IEnemy } from '../types';

export class BurnEffect implements IEffect {
  readonly type = 'burn';
  readonly source: string;
  remainingDuration: number;
  tickInterval: number;
  elapsedSinceTick: number = 0;

  private damagePerTick: number;

  constructor(source: string, damagePerTick: number, duration: number, tickInterval = 800) {
    this.source = source;
    this.damagePerTick = damagePerTick;
    this.remainingDuration = duration;
    this.tickInterval = tickInterval;
  }

  onApply(_enemy: IEnemy): void {
    // 视觉效果在 Enemy 的 applyEffect() 中处理
  }

  onTick(enemy: IEnemy, delta: number): void {
    if (this.remainingDuration <= 0) return;
    this.elapsedSinceTick += delta;
    while (this.elapsedSinceTick >= this.tickInterval) {
      this.elapsedSinceTick -= this.tickInterval;
      enemy.takeDamage(this.damagePerTick, true, this.source);
    }
    this.remainingDuration -= delta;
  }

  onRemove(_enemy: IEnemy): void {
    // 清理逻辑
  }

  shouldOverride(newEffect: IEffect): boolean {
    if (newEffect.type !== this.type) return false;
    const newBurn = newEffect as BurnEffect;
    return newBurn.damagePerTick >= this.damagePerTick;
  }
}
```

### 步骤 2：在 CombatManager 中接入

```typescript
// src/systems/CombatManager.ts → executeHitHook()
case 'burning': {
  const burnDmg = 8 * stackCount;
  enemy.applyEffect(new BurnEffect('enchant_burning', burnDmg, 2000, 800));
  break;
}
```

### 步骤 3（可选）：在 Enemy 中添加视觉效果

```typescript
// src/entities/Enemy.ts → applyEffect() 方法
if (effect.type === 'burn') {
  this.visualBody?.setStrokeStyle?.(2, 0xff6600, 0.8);
}
```

### IEffect 接口详解

| 成员 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 唯一标识，如 `'poison'`、`'slow'`、`'stun'` |
| `source` | `string` | 来源附魔ID，便于调试 |
| `remainingDuration` | `number` | 剩余时间（ms），归零时自动移除 |
| `tickInterval` | `number` | tick 间隔（ms），0 = 非周期性（如减速、眩晕） |
| `elapsedSinceTick` | `number` | 内部计时器，由 effect 自行管理 |
| `onApply()` | 方法 | 效果首次施加时调用 |
| `onTick(enemy, delta)` | 方法 | 每帧调用，delta 为帧间隔 ms |
| `onRemove()` | 方法 | 效果过期/被移除时调用 |
| `shouldOverride(newEffect)` | 方法 | 同类型新效果是否覆盖当前效果 |

### 现有效果参考

| 效果 | type | tickInterval | 行为 |
|------|------|-------------|------|
| PoisonEffect | `'poison'` | 1000ms | 每秒造成伤害 |
| SlowEffect | `'slow'` | 0 (非周期) | 降低百分比速度，取最大值 |
| StunEffect | `'stun'` | 0 (非周期) | 速度归零，持续时间短 |

---

## 6. 添加新关卡

### 步骤 1：创建关卡 JSON

在 `public/assets/data/levels/` 目录新建 JSON 文件（如 `level_02.json`）：

```jsonc
{
  "id": "forest_01",           // 唯一 ID，与文件名前缀保持一致
  "name": "幽暗森林",           // 关卡名称
  "gridWidth": 32,             // 网格宽度（格），建议 32
  "gridHeight": 24,            // 网格高度（格），建议 24
  "tileSize": 32,              // 每格像素，必须与 TILE_SIZE 常量一致

  // ★ 敌人路径（像素坐标），首点=出生点，末点=基地
  // 路径会被自动扩宽为 2 格（向右+向下+对角线膨胀）
  // 敌人实际行走路线会偏移 TILE_SIZE(32px) 到路径中央
  "pathWaypoints": [
    { "x": 0, "y": 160 },
    { "x": 256, "y": 160 },
    { "x": 256, "y": 448 },
    { "x": 512, "y": 448 },
    { "x": 512, "y": 128 },
    { "x": 768, "y": 128 },
    { "x": 768, "y": 544 },
    { "x": 1024, "y": 544 }
  ],

  // 建造点（网格坐标），放置塔的位置
  "buildSpots": [
    { "gridX": 3, "gridY": 1 },
    { "gridX": 10, "gridY": 3 }
    // ...更多建造点
  ],

  // 初始手牌配置
  "startingHand": [
    { "type": "TOWER", "towerType": "ARROW" },
    { "type": "TOWER", "towerType": "MAGIC" },
    { "type": "ENCHANTMENT", "enchantmentId": "poison" }
  ],

  // 波次定义
  "waves": [
    {
      "enemyType": "BASIC",      // 怪物类型（EnemyType 枚举值）
      "count": 5,                // 该波怪物数量
      "spawnInterval": 1500,     // 生成间隔（ms）
      "startDelay": 2000         // 首只延迟（ms）
    },
    {
      "enemyType": "SCOUT",
      "count": 8,
      "spawnInterval": 1000,
      "startDelay": 3000
    }
    // ...更多波次
  ],

  "startingEssence": 30,       // 初始魔力
  "baseLives": 20,             // 基地血量
  "maxHandSize": 7             // 手牌上限
}
```

### 步骤 2：在关卡索引中注册

编辑 `public/assets/data/levels.json`，追加条目：

```json
{
  "id": "forest_01",
  "name": "幽暗森林",
  "description": "穿过幽暗密林，消灭潜伏的怪物",
  "difficulty": 2,
  "waves": 5,
  "unlocked": true
}
```

| 索引字段 | 说明 |
|----------|------|
| `id` | 关卡唯一 ID，与 JSON 文件名一致 |
| `name` | 显示在关卡选择界面 |
| `description` | 关卡描述文字 |
| `difficulty` | 难度 1~4，显示对应数量 ⭐ |
| `waves` | 波次总数（显示用） |
| `unlocked` | 是否已解锁（P0 阶段全部 true） |

### 步骤 3：在 BootScene 中预加载

编辑 `src/scenes/BootScene.ts`，在 `preload()` 中添加：

```typescript
this.load.json('level_forest_01', 'assets/data/levels/forest_01.json');
```

> **为什么需要预加载？** GameScene 的 `create()` 阶段不能动态 load，必须在此阶段
> 提前把 JSON 加载到 Phaser 缓存中。GameScene 通过 `this.cache.json.get('level_forest_01')` 读取。

### 设计关卡的技巧

- `pathWaypoints` 定义敌人路径，建议 `y` 保持为 `TILE_SIZE` 的整数倍（如 128, 160, 448, 544）
- 路径会自动扩宽到 2 格宽：向右 + 向下 + 右下对角线各加 1 格
- `buildSpots` 放在路径拐角处最佳（塔可攻击更长时间）
- 建造点不要放在路径格子上
- 前几波用基础怪让玩家熟悉，后几波混合兵种增加挑战
- `startingHand` 至少给 2 张塔卡，保证玩家能部署

---

## 7. 添加新场景

### 创建场景类

```typescript
// src/scenes/ShopScene.ts
import Phaser from 'phaser';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 40, '商店', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#F5DEB3',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 返回按钮
    this.add.text(24, 20, '← 返回', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#9999AA',
      stroke: '#000',
      strokeThickness: 2,
    }).setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.scene.start('LevelSelectScene'));
  }
}
```

### 注册场景

```typescript
// src/config.ts
import { ShopScene } from './scenes/ShopScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  // ...
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, ShopScene],
};
```

### 场景间导航

```typescript
// 方式 1：替换当前场景（不保留状态）
this.scene.start('ShopScene');

// 方式 2：叠加到当前场景上方
this.scene.launch('ShopScene');

// 方式 3：传递数据
this.scene.start('GameScene', { levelId: 'forest_01' });
// 在目标场景中读取：
const levelId = (this.scene.settings.data as any)?.levelId;
```

### 场景生命周期

```
constructor → init(data) → preload() → create() → update(time, delta) → shutdown/destroy
```

- 在 `create()` 中初始化系统、创建 UI
- 在 `shutdown` 事件中清理资源（`this.events.on('shutdown', () => this.cleanup())`）
- 场景切换时旧场景被 destroy，所有 GameObject 被释放

---

## 8. 添加新寻敌策略

在 `src/systems/TargetFilter.ts` 中添加新策略函数并注册。

### 步骤 1：添加枚举值

```typescript
// src/types/ITower.ts → TargetStrategyType
export enum TargetStrategyType {
  CLOSEST_TO_BASE = 'CLOSEST_TO_BASE',
  FASTEST = 'FASTEST',
  MOST_DENSE = 'MOST_DENSE',
  LOWEST_HP = 'LOWEST_HP',       // ★ 新增：优先攻击血量最低的敌人
}
```

### 步骤 2：注册策略

```typescript
// src/systems/TargetFilter.ts

strategies.set(TargetStrategyType.LOWEST_HP, (_tower, enemies) => {
  const alive = enemies.filter(e => e.alive && e.currentHP > 0);
  if (alive.length === 0) return null;

  const range = _tower.getEffectiveStats().range;
  const inRange = alive.filter(e => {
    const dist = MathUtils.distance(_tower.pixelX, _tower.pixelY, e.x, e.y);
    return dist <= range;
  });
  if (inRange.length === 0) return null;

  inRange.sort((a, b) => a.currentHP - b.currentHP);
  return inRange[0];
});
```

### 步骤 3：在 TowerRegistry 中使用

```typescript
register({
  type: TowerType.ARROW,
  // ...
  targetStrategy: TargetStrategyType.LOWEST_HP,  // ★ 使用新策略
});
```

### 策略签名

```typescript
type TargetStrategy = (tower: ITower, enemies: IEnemy[]) => IEnemy | null;
```

- 接受塔实例和所有存活敌人
- 返回最优目标，或 null（无有效目标）
- 通常先按射程过滤，再按策略排序
- 是纯函数，无副作用

---

## 9. 添加新卡牌类型

当前卡牌类型只有 `TOWER` 和 `ENCHANTMENT`。如需添加（如消耗品、技能卡等）：

### 步骤 1：扩展类型定义

```typescript
// src/types/ICard.ts
export enum CardType {
  TOWER = 'TOWER',
  ENCHANTMENT = 'ENCHANTMENT',
  CONSUMABLE = 'CONSUMABLE',   // ★ 新增
}

export interface Card {
  id: string;
  type: CardType;
  towerType?: TowerType;
  enchantmentId?: string;
  consumableId?: string;       // ★ 新增字段
  name: string;
  description: string;
  cost: number;
  color: number;
}
```

### 步骤 2：在 CardLibrary 中创建

```typescript
// src/data/CardLibrary.ts

export function createConsumableCard(consumableId: string): Card {
  const def = getConsumableDefinition(consumableId);
  return {
    id: generateCardId(),
    type: CardType.CONSUMABLE,
    consumableId,
    name: def.name,
    description: def.description,
    cost: 0,
    color: def.color,
  };
}
```

### 步骤 3：在 GameScene.setupInteraction 中处理

```typescript
// src/scenes/GameScene.ts → setupInteraction()

EventBus.on(EVENTS.BUILD_SPOT_CLICKED, (data) => {
  if (!this.selectedCard) return;
  if (this.selectedCard.type === CardType.CONSUMABLE) {
    // 消耗品逻辑：如恢复血量、临时增益等
    this.handleConsumable(this.selectedCard, data);
    this.consumeSelectedCard();
    return;
  }
  // ... 原有逻辑
});
```

### 步骤 4：更新 CardSprite 图标

```typescript
// src/entities/CardSprite.ts → getIconChar()
if (card.type === CardType.CONSUMABLE && card.consumableId) {
  switch (card.consumableId) {
    case 'heal': return '💚';
    default: return '🧪';
  }
}
```

---

## 10. 修改 UI

### 10.1 修改颜色配色

所有颜色集中在 `src/constants.ts` → `COLORS` 对象中。修改一处即可全局生效。

```typescript
// src/constants.ts
export const COLORS = {
  // Map
  GRASS: 0x8CC63F,
  PATH: 0xF5DEB3,
  BUILD_SPOT_EMPTY: 0xFFD700,
  // Towers
  ARROW_TOWER: 0x5BA0D9,
  // Cards
  CARD_BG: 0xFFFFFF,
  CARD_BORDER_TOWER: 0x5BA0D9,
  CARD_BORDER_ENCHANT: 0xC090E8,
  // UI
  HUD_BG: 0x3A2E1E,
  PANEL_BG: 0xFFF8F0,
  BUTTON_NORMAL: 0x6DB840,
  BUTTON_DANGER: 0xFF6B6B,
  TEXT_PRIMARY: '#3A2E1E',
  TEXT_SECONDARY: '#7A6B5C',
  // ... 等
};
```

颜色分为 CSS 字符串（用于 Text）和 0x 数值（用于 Graphics）两类。优先使用常量而非硬编码。

### 10.2 修改 HUD（顶部栏）

编辑 `src/ui/HUD.ts`：

- 背景栏：`fillRoundedRect(8, 6, W - 16, 38, 14)` — 位置和大小
- 字体：`FONT` / `FONT_BTN` 常量
- 按钮：`makePillBtn(x, y, label, color, callback)` — 圆角胶囊按钮
- 添加新信息：创建新的 `Text` 对象，监听 `RESOURCE_CHANGED` / `WAVE_START` 事件

```typescript
// 示例：添加"击杀数"显示
private killText: Phaser.GameObjects.Text;

// 在 constructor 中：
this.killText = this.makeText(350, 14, '💀 0', '#FFAA44');
EventBus.on(EVENTS.ENEMY_KILLED, () => {
  this.kills++;
  this.killText.setText(`💀 ${this.kills}`);
}, this);
```

### 10.3 修改卡牌外观

编辑 `src/entities/CardSprite.ts`：

| 属性 | 位置 | 说明 |
|------|------|------|
| `WIDTH = 104` / `HEIGHT = 130` | 静态属性 | 卡牌尺寸 |
| `drawBackground()` | 私有方法 | 绘制背景+边框+选中光晕 |
| `icon` | 文字对象 | 图标 emoji（`getIconChar()`） |
| `nameLabel` | 文字对象 | 名称，truncate 在 8 字符 |
| `costBadge` | 文字对象 | 费用数字/附魔标记 |

卡牌选中时上移 8px（`bodyY = -hh - 8`），绘制金色光晕（`CARD_SELECTED_GLOW`）。

### 10.4 修改塔信息面板

编辑 `src/ui/TowerInfoPanel.ts`：

- **面板大小**：`PANEL_W = 250`, `PANEL_H = 400`
- **位置**：`sw - PANEL_W/2 - 12`（右上角）
- **内容区**：从 `yOff` 开始逐行追加文字，分"标题"→"属性"→"附魔槽"→"拆除按钮"四块
- **添加新属性行**：在 `stats.lines` 数组中追加字符串
- **拆除返还**：`tower.getTotalInvestedCost() * 0.5`

### 10.5 修改游戏结束覆盖层

编辑 `src/ui/GameOverOverlay.ts`：

- 卡片尺寸：`cardW = 380, cardH = 240`
- 按钮使用 `makeBtn(x, y, w, h, label, color, callback)`
- 添加额外按钮：调用 `makeBtn()` 传入新坐标和回调

### 10.6 修改卡牌手牌区

编辑 `src/ui/CardHandUI.ts`：

- **卡牌 Y 位置**：`height - CARD_Y_OFFSET(105px)`
- **信息条位置**：`height - STRIP_Y_OFFSET(14px)`，高度 28px
- **信息条内容**：类型图标 + 名称 + 描述 + 出售按钮
- **出售价值**：塔卡 = `ceil(cost * 0.5)`，附魔卡 = 1

### 10.7 修改波次横幅

编辑 `src/ui/WaveBanner.ts`：

- 横幅位置：屏幕中央
- 显示时长：`duration` 参数（ms）
- 动画：淡入 → 保持 → 淡出（Phaser tweens `yoyo: true`）

### 10.8 添加新的 UI 组件

参照现有组件的模式：

```
1. 创建类，接收 scene: Phaser.Scene
2. 使用 Phaser.GameObjects 绘制（Graphics, Text, Container, Zone）
3. 通过 EventBus.on() 监听事件更新
4. 实现 destroy() 方法清理资源 + EventBus.off() 取消订阅
5. 在 GameScene.initGame() 中实例化
6. 在 GameScene.cleanupGame() 中调用 destroy()
```

---

## 11. 修改背景贴图（草地/路径）

贴图素材来自 Craftpix "Simple Summer Top-Down" tileset，存放在 `public/assets/images/tiles/`，共 56 张地面 tile（256×256 PNG）。

### 11.1 核心配置文件

所有贴图映射在 `src/constants.ts` 的 `TILE_TEXTURES` 中定义：

```typescript
export const TILE_TEXTURES = {
  GRASS: 'tile_grass',
  PATH_EDGE_UP:    'tile_path_up',     // 上方是草地
  PATH_EDGE_LEFT:  'tile_path_left',   // 左侧是草地
  PATH_EDGE_RIGHT: 'tile_path_right',  // 右侧是草地
  PATH_EDGE_DOWN:  'tile_path_down',   // 下方是草地
  PATH_CORNER_TL:  'tile_path_tl',     // 左上方草地(转角)
  PATH_CORNER_TR:  'tile_path_tr',     // 右上方草地(转角)
  PATH_CORNER_BL:  'tile_path_bl',     // 左下方草地(转角)
  PATH_CORNER_BR:  'tile_path_br',     // 右下方草地(转角)
  PATH_INNER:      'tile_path_inner',  // 内部路径(四周都是路)
  PATH_INNER_DIAG_BR: 'tile_inner_diag_br', // 仅右下角草地
  PATH_INNER_DIAG_BL: 'tile_inner_diag_bl', // 仅左下角草地
  PATH_INNER_DIAG_TR: 'tile_inner_diag_tr', // 仅右上角草地
  PATH_INNER_DIAG_TL: 'tile_inner_diag_tl', // 仅左上角草地

  SOURCES: {
    // 逻辑名 → PNG 文件名映射
    tile_grass:     'Top-Down Simple Summer_Ground 43.png',
    tile_path_up:   'Top-Down Simple Summer_Ground 08.png',
    tile_path_left: 'Top-Down Simple Summer_Ground 06.png',
    tile_path_right:'Top-Down Simple Summer_Ground 04.png',
    tile_path_down: 'Top-Down Simple Summer_Ground 02.png',
    tile_path_tl:   'Top-Down Simple Summer_Ground 10.png',
    tile_path_tr:   'Top-Down Simple Summer_Ground 12.png',
    tile_path_bl:   'Top-Down Simple Summer_Ground 16.png',
    tile_path_br:   'Top-Down Simple Summer_Ground 18.png',
    tile_path_inner:'Top-Down Simple Summer_Ground 10.png',
    tile_inner_diag_br: 'Top-Down Simple Summer_Ground 01.png',
    tile_inner_diag_bl: 'Top-Down Simple Summer_Ground 03.png',
    tile_inner_diag_tr: 'Top-Down Simple Summer_Ground 07.png',
    tile_inner_diag_tl: 'Top-Down Simple Summer_Ground 09.png',
  },
} as const;
```

### 11.2 更换草地贴图

修改 `SOURCES` 中 `tile_grass` 对应的文件名：

```typescript
tile_grass: 'Top-Down Simple Summer_Ground 01.png',
```

草地全部使用同一张贴图（非随机），所有非路径格子都会铺这张。

### 11.3 更换路径贴图

路径使用**邻居检测**自动选择贴图。每个路径格子检查上下左右四个邻居是否为草地：

```
      上方草地 → tile_path_up    (Ground 08)
      下方草地 → tile_path_down  (Ground 02)
      左侧草地 → tile_path_left  (Ground 06)
      右侧草地 → tile_path_right (Ground 04)

  左上方草地 → tile_path_tl      (Ground 10) ← 转角
  右上方草地 → tile_path_tr      (Ground 12) ← 转角
  左下方草地 → tile_path_bl      (Ground 16) ← 转角
  右下方草地 → tile_path_br      (Ground 18) ← 转角

  四周都是路 → tile_path_inner   (Ground 10) ← 内部填充

  ★ 内侧转角（四边是路，仅一个对角是草地）：
  仅右下是草地 → tile_inner_diag_br (Ground 01)
  仅左下是草地 → tile_inner_diag_bl (Ground 03)
  仅右上是草地 → tile_inner_diag_tr (Ground 07)
  仅左上是草地 → tile_inner_diag_tl (Ground 09)
```

要更换某类边缘贴图，只需改 `SOURCES` 中对应项的 PNG 文件名。

**注意：** Ground 01/03/07/09 用于内侧转角（对角草地），这四个映射不应随意修改。

### 11.4 添加新贴图素材

1. 将新 PNG 文件放入 `public/assets/images/tiles/`
2. 在 `TILE_TEXTURES.SOURCES` 中建立映射
3. 在 `TILE_TEXTURES` 顶层添加逻辑名引用（如果需要在代码中使用）
4. 贴图会在 `BootScene.preload()` 中自动加载（遍历 `SOURCES` 的所有条目）

### 11.5 贴图加载流程

```
BootScene.preload()
  → 遍历 TILE_TEXTURES.SOURCES
  → this.load.image(key, `assets/images/tiles/${filename}`)
  → 加载完成后 key 即可通过 this.add.image(x, y, key) 使用
```

MapManager 在 `loadLevel()` 时调用 `drawTiles(mask)`：
1. 先调用 `buildPathMask()` 生成 `boolean[][]`（path=true, grass=false）
2. 遍历每个格子，草地贴 `GRASS`，路径调用 `selectPathTile()` 根据邻居选择对应贴图
3. 所有贴图通过 `.setDisplaySize(TILE_SIZE, TILE_SIZE)` 缩放（源素材 256×256 → 显示 32×32）

### 11.6 路径宽度调整

路径宽度由 `buildPathMask()` 中的膨胀逻辑控制：

```typescript
// src/systems/MapManager.ts — buildPathMask()
// 当前：向右 + 向下 + 右下对角线各加 1 格 → 路径宽 2 格
if (mask[gx][gy]) {
  widened[gx][gy] = true;
  if (gx + 1 < gridWidth)  widened[gx + 1][gy] = true;        // 右
  if (gy + 1 < gridHeight) widened[gx][gy + 1] = true;        // 下
  if (gx + 1 < gridWidth && gy + 1 < gridHeight)
    widened[gx + 1][gy + 1] = true;                            // 右下对角线
}
```

- **扩宽到 3 格**：增加 `-1` 方向（上、左、左上对角线）
- **扩宽到 4 格**：把邻域改为 `-2..2` 范围
- **缩窄为 1 格**：去掉膨胀循环，直接用 `mask`

### 11.7 贴图编号速查

| 编号 | 用途 |
|------|------|
| 01 | 内侧转角 — 仅右下角草地 |
| 02 | 下边缘 → `tile_path_down` |
| 03 | 内侧转角 — 仅左下角草地 |
| 04 | 右边缘 → `tile_path_right` |
| 06 | 左边缘 → `tile_path_left` |
| 07 | 内侧转角 — 仅右上角草地 |
| 08 | 上边缘 → `tile_path_up` |
| 09 | 内侧转角 — 仅左上角草地 |
| 10 | 内部路径 / 左上转角 → `tile_path_inner` / `tile_path_tl` |
| 12 | 右上转角 → `tile_path_tr` |
| 16 | 左下转角 → `tile_path_bl` |
| 18 | 右下转角 → `tile_path_br` |
| 43 | 纯草地 → `tile_grass` |
| 其他 | 泥土路、石路、水边、沙地等变体 |

---

## 12. 修改数据模型

### 12.1 给 Tower 加新属性

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | `src/types/ITower.ts` | 在 `TowerStats` 或 `ITower` 接口中添加字段 |
| 2 | `src/data/TowerRegistry.ts` | 在 `register()` 的 baseStats 中填入新字段的值 |
| 3 | `src/entities/Tower.ts` | 在 `getEffectiveStats()` 中处理附魔修正计算 |
| 4 | `src/ui/TowerInfoPanel.ts` | 在面板中展示新属性 |
| 5 | `src/systems/CombatManager.ts` | 如需新的战斗行为（如连锁、反弹） |

### 12.2 给 Enemy 加新属性

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | `src/types/IEnemy.ts` | 在 `EnemyStats` 或 `IEnemy` 接口中添加字段 |
| 2 | `src/data/EnemyRegistry.ts` | 在 `register()` 中填入新字段值 |
| 3 | `src/entities/Enemy.ts` | 处理新属性的运行时行为 |
| 4 | `src/ui/` | 如需展示（血条旁加图标等） |

### 12.3 给 Card 加新属性

| 步骤 | 文件 | 操作 |
|------|------|------|
| 1 | `src/types/ICard.ts` | 在 `Card` 接口中添加字段 |
| 2 | `src/data/CardLibrary.ts` | 在 `createTowerCard()` / `createEnchantmentCard()` 中生成新字段 |
| 3 | `src/entities/CardSprite.ts` | 如需在卡牌上显示，添加对应 UI 元素 |

### 12.4 修改游戏平衡数值

集中在以下文件：

```typescript
// src/constants.ts — 全局平衡常量
export const MAX_HAND_SIZE = 7;              // 手牌上限
export const DEFAULT_LIVES = 20;             // 基地血量
export const DEFAULT_ESSENCE = 30;           // 初始魔力
export const WAVE_TRANSITION_DELAY = 3000;   // 波间间隔（ms）
export const PRE_GAME_DELAY = 2000;          // 开局等待（ms）
export const MIN_ENEMY_SPEED = 20;           // 最低速度（防减速到 0）
export const BASE_CARD_DROP_CHANCE = 0.6;    // 基础掉卡概率
```

```typescript
// src/data/TowerRegistry.ts — 塔属性（damage, attackSpeed, range, cost 等）
// src/data/EnemyRegistry.ts — 怪物属性（maxHP, speed, armor 等）
// src/data/EnchantmentRegistry.ts — 附魔属性（statModifiers, maxStacks）
```

```typescript
// src/types/ITower.ts — 升级倍率
export const UPGRADE_MULTIPLIERS: Record<number, Partial<TowerStats>> = {
  1: {},
  2: { damage: 1.3, attackSpeed: 1.15, range: 1.1 },
  3: { damage: 1.6, attackSpeed: 1.3, range: 1.2 },
};

// src/types/IEnchantment.ts — 附魔叠加倍率
export function getStackMultiplier(stackCount: number): number {
  switch (stackCount) {
    case 1: return 1.0;
    case 2: return 1.7;
    case 3: return 2.2;
    default: return 1.0;
  }
}
```

---

## 13. 添加新资源类型

当前只有两种资源：**魔力（essence）** 和 **血量（lives）**。如需添加第三种（如金币、体力等）：

### 步骤 1：扩展接口

```typescript
// src/types/IGameState.ts
export interface PlayerResources {
  essence: number;
  lives: number;
  gold: number;          // ★ 新增
}
```

### 步骤 2：扩展 GameStateManager

```typescript
// src/core/GameStateManager.ts
addGold(amount: number): void {
  this._resources = { ...this._resources, gold: this._resources.gold + amount };
  EventBus.emit(EVENTS.RESOURCE_CHANGED, { ...this._resources });
}
```

### 步骤 3：添加 HUD 显示

```typescript
// src/ui/HUD.ts
this.goldText = this.makeText(350, 14, '🪙 0', '#FFD700');
```

### 步骤 4：关联掉落

```typescript
// 在 EnemyRegistry 中追加字段，在 WaveManager.onEnemyKilled 中触发
EventBus.emit(EVENTS.RESOURCE_CHANGED, { goldGained: def.stats.rewardGold });
```

---

## 14. 添加新游戏模式

### 添加肉鸽模式

```
1. 创建 src/scenes/RoguelikeScene.ts
2. 复用所有 entities/、systems/、ui/ 组件
3. 在 GameStateManager 中添加 roguelike 特有状态（如路线节点、永久天赋）
4. 创建新 UI 组件：
   - RouteMapUI.ts（路线选择）
   - ShopUI.ts（商店界面）
   - TalentUI.ts（天赋选择）
5. 在 config.ts 中注册新场景
6. 从 MenuScene 添加入口
```

### 添加无尽模式

```
1. 创建 EndlessScene 或复用 GameScene + EndlessMode 标识
2. 修改 WaveManager 从预设波次表改为程序化生成
3. 难度递增公式：enemyHP *= 1.1^wave, enemySpeed *= 1.05^wave
4. 分数系统 + 排行榜
```

---

## 15. 添加国际化 / 多语言

当前所有文字硬编码在源码中。如需支持多语言：

### 步骤 1：创建翻译表

```typescript
// src/i18n/zh-CN.ts
export const zhCN = {
  'tower.arrow.name': '箭塔',
  'tower.arrow.desc': '攻速快、射程远、单体输出',
  'enemy.scout.name': '快速斥候',
  'ui.startWave': '▶ 开始波次',
  'ui.nextWave': '▶ 下一波',
  'ui.victory': '胜 利 !',
  'ui.defeat': '防 线 失 守',
  // ...
};

// src/i18n/index.ts
const translations: Record<string, Record<string, string>> = {
  'zh-CN': zhCN,
  'en': en,
};

export function t(key: string, locale = 'zh-CN'): string {
  return translations[locale]?.[key] ?? key;
}
```

### 步骤 2：替换硬编码文字

在所有 UI 和 data 模块中将硬编码中文替换为 `t('key')` 调用。

---

## 16. 添加存档系统

### 存档数据结构

```typescript
interface SaveData {
  version: number;
  timestamp: number;
  unlockedLevels: string[];
  completedLevels: string[];
  currency: { essence: number; };
  settings: { volume: number; locale: string; };
}
```

### 实现方式

```typescript
// src/core/SaveManager.ts
export class SaveManager {
  private static readonly KEY = 'ctd_save';

  static save(data: SaveData): void {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  static load(): SaveData | null {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : null;
  }

  static clear(): void {
    localStorage.removeItem(this.KEY);
  }
}
```

在 `GameStateManager.endGame()` 中触发存档。在 `BootScene` 中读取存档初始化进度。在 `LevelSelectScene` 中根据存档更新关卡解锁状态。

---

## 17. 添加音效系统

当前项目无音效。音效系统完全通过事件驱动，不侵入核心逻辑：

### 创建 AudioManager

```typescript
// src/systems/AudioManager.ts
import { EVENTS } from '../constants';
import { EventBus } from '../core/EventBus';

export class AudioManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    EventBus.on(EVENTS.TOWER_DEPLOYED, () => this.play('sfx_place_tower'));
    EventBus.on(EVENTS.ENEMY_KILLED, () => this.play('sfx_enemy_die'));
    EventBus.on(EVENTS.WAVE_START, () => this.play('sfx_wave_start'));
    EventBus.on(EVENTS.GAME_OVER, (d) => {
      this.play(d.victory ? 'sfx_victory' : 'sfx_defeat');
    });
  }

  private play(key: string): void {
    try { this.scene.sound.play(key); } catch {}
  }

  destroy(): void { /* 取消所有事件订阅 */ }
}
```

### 素材预加载

```typescript
// src/scenes/BootScene.ts → preload()
this.load.audio('sfx_place_tower', 'assets/audio/place_tower.mp3');
this.load.audio('sfx_enemy_die', 'assets/audio/enemy_die.mp3');
```

所有音效触发通过 EventBus 监听现有事件，不修改任何核心代码。

---

## 18. 添加新手引导 / 教程

### 引导系统架构

```typescript
// src/systems/TutorialManager.ts
export class TutorialManager {
  // 监听游戏事件，在特定时机弹出提示
  // 引导步骤序列：部署第一座塔 → 开始波次 → 给塔附魔 → 升级塔
}
```

### 引导步骤设计

```
步骤 1: "点击底部卡牌选择箭塔，再点击金色圆圈建造点放置"（监听 HAND_CHANGED）
步骤 2: "点击 ▶ 开始波次 按钮开始战斗"（监听 PHASE_CHANGED → PREPARATION）
步骤 3: "选中附魔卡牌，再点击已部署的塔施加附魔"（监听 ENCHANT_APPLIED）
步骤 4: "选中同类塔卡，点击已部署塔可以升级"（监听 tower upgrade）
```

实现方式：
1. 添加高亮遮罩 + 箭头提示
2. 阻止非引导步骤的操作
3. 引导数据从 JSON 加载（可配置）
4. 在 GameScene 中添加 `tutorialManager` 实例

---

## 19. 添加数据统计 / 埋点

通过监听 EventBus 事件采集数据，不侵入核心逻辑：

```typescript
// src/systems/AnalyticsManager.ts
export class AnalyticsManager {
  private stats = {
    towersDeployed: 0,
    enemiesKilled: 0,
    cardsPlayed: 0,
    enchantmentsApplied: 0,
    wavesCompleted: 0,
    totalDamageDealt: 0,
    playTime: 0,
  };

  constructor() {
    EventBus.on(EVENTS.TOWER_DEPLOYED, () => this.stats.towersDeployed++);
    EventBus.on(EVENTS.ENEMY_KILLED, () => this.stats.enemiesKilled++);
    EventBus.on(EVENTS.CARD_PLAYED, () => this.stats.cardsPlayed++);
    EventBus.on(EVENTS.ENCHANT_APPLIED, () => this.stats.enchantmentsApplied++);
    EventBus.on(EVENTS.WAVE_COMPLETE, () => this.stats.wavesCompleted++);
  }

  getReport(): object { return { ...this.stats }; }
}
```

---

## 20. 添加关卡编辑器

### 方向一：游戏内编辑器

```
1. 创建 src/scenes/EditorScene.ts
2. 网格点击切换地块类型（草地/路径/建造点）
3. waypoints 可视化拖拽编辑
4. 波次配置表单
5. 导出为 JSON（Blob download）
```

### 方向二：外部工具

使用 Tiled Map Editor（`.tmx` 格式）或自定义 Web 编辑器，生成符合 `LevelConfig` 接口的 JSON。

---

## 21. 添加单元测试

### 可测试的纯逻辑模块

| 模块 | 可测试内容 |
|------|-----------|
| `MathUtils` | 距离、归一化、随机、clamp、lerp |
| `GridUtils` | pixelToGrid、gridToPixel 互转 |
| `TargetFilter` | 各策略在 mock 数据上的返回结果 |
| `TowerRegistry` | 注册/查询返回正确数据 |
| `EnemyRegistry` | 注册/查询返回正确数据 |
| `EnchantmentRegistry` | 注册/查询/过滤按塔类型正确 |
| `GameStateManager` | 状态转移、资源增减、游戏结束逻辑 |
| `HandManager` | 手牌增删、上限控制、暂存区逻辑 |
| `EnchantmentManager` | 附魔施加/移除、槽位管理、组合检测 |
| Effect 类 | onTick 伤害计算、shouldOverride 逻辑 |

### 测试框架建议

```bash
npm install --save-dev vitest
```

```typescript
// src/utils/__tests__/MathUtils.test.ts
import { describe, it, expect } from 'vitest';
import { MathUtils } from '../MathUtils';

describe('MathUtils', () => {
  it('distance calculates correctly', () => {
    expect(MathUtils.distance(0, 0, 3, 4)).toBe(5);
  });

  it('clamp works', () => {
    expect(MathUtils.clamp(15, 0, 10)).toBe(10);
    expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
  });
});
```

---

## 22. 事件系统参考

所有事件在 `src/constants.ts` 的 `EVENTS` 对象中定义。系统间只能通过 EventBus 通信。

### 完整事件列表

| 事件名 | 触发时机 | payload |
|--------|----------|---------|
| `enemy:spawned` | 敌人生成 | `{ enemy: IEnemy }` |
| `enemy:killed` | 敌人死亡 | `{ enemy: IEnemy }` |
| `enemy:base-reached` | 敌人到达基地 | `{ enemy: IEnemy }` |
| `wave:start` | 波次开始 | `{ waveIndex: number, total: number }` |
| `wave:complete` | 波次完成 | `{ waveIndex: number, total: number }` |
| `wave:all-done` | 全部波次完成 | `{}` |
| `wave:start-requested` | 玩家点击"开始波次"按钮 | `{}` |
| `card:drawn` | 抽到卡牌 | `{ card: Card, fromDrop: boolean }` |
| `card:played` | 打出卡牌 | `{ card: Card }` |
| `card:discarded` | 弃牌 | `{ card: Card }` |
| `card:sell` | 出售卡牌 | `{ card: Card, index: number, value: number }` |
| `hand:changed` | 手牌变更 | `{ hand: Card[] }` |
| `tower:deployed` | 塔部署 | `{ tower: ITower }` |
| `tower:selected` | 选中塔 | `{ tower: ITower }` |
| `tower:deselected` | 取消选中 | `{}` |
| `tower:demolish` | 拆除塔 | `{ tower: ITower, refund: number }` |
| `enchant:applied` | 附魔施加 | `{ tower: ITower, enchantId: string }` |
| `enchant:removed` | 附魔移除 | `{ tower: ITower, slotIndex: number }` |
| `enchant:combo` | 组合激活 | `{ tower: ITower, comboId: string, comboName: string }` |
| `build-spot:clicked` | 点击建造点 | `{ gridX: number, gridY: number }` |
| `resource:changed` | 资源变更 | `{ essence?: number, lives?: number, essenceGained?: number }` |
| `phase:changed` | 阶段变更 | `{ phase: GamePhase }` |
| `game:over` | 游戏结束 | `{ victory: boolean }` |
| `game:restart` | 重新开始 | `{}` |
| `input:card-selected` | 选中手牌 | `{ card: Card, index: number }` |
| `input:card-deselected` | 取消选中手牌 | `{}` |

### 使用方式

```typescript
import { EventBus } from '../core/EventBus';
import { EVENTS } from '../constants';

// 订阅事件
EventBus.on(EVENTS.ENEMY_KILLED, (data) => {
  console.log(`Enemy ${data.enemy.id} killed`);
});

// 发布事件
EventBus.emit(EVENTS.GAME_OVER, { victory: true });

// 取消订阅（在 destroy 中必须调用，避免内存泄漏）
EventBus.off(EVENTS.ENEMY_KILLED, myHandler, this);
```

### 事件命名规范

格式：`module:action`（如 `enemy:killed`、`tower:deployed`、`game:over`）

---

## 23. 常用开发命令

```bash
# 启动开发服务器（热更新）
npm run dev

# 类型检查
npm run typecheck
# 或
npx tsc --noEmit

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 调试技巧

```javascript
// 浏览器控制台访问游戏实例
const game = window.__PHASER_GAME__;
const gameScene = game.scene.getScene('GameScene');

// 查看当前状态
gameScene.gameState.resources;   // { essence, lives }
gameScene.handManager.getHand(); // 当前手牌
gameScene.towers;                // 已部署的塔
```

---

## 24. 文件检查清单

添加新文件/修改后的自查清单：

- [ ] `npx tsc --noEmit` 无错误
- [ ] 新文件放在正确的目录下
- [ ] import 语句使用 ESM 语法（`import ... from '...'`），不使用 `require()`
- [ ] 不要从 `constants.ts` 导入类型（枚举如 `TowerType`、`EnemyType`、`CardType` 应从 `../types` 导入）
- [ ] UI 组件实现了 `destroy()` 方法
- [ ] 订阅了 EventBus 的组件在 `destroy()` 中调用 `EventBus.off()` 取消订阅
- [ ] 新实体通过 Factory 创建，不直接 `new`
- [ ] 新数据通过 Registry 的 `register()` 函数添加
- [ ] Phaser Container 的子对象通过 `this.add(child)` 添加到容器
- [ ] Graphics 对象在重新绘制前调用 `g.clear()`
- [ ] 关卡 JSON 中的 `tileSize` 与 `TILE_SIZE` 常量一致
- [ ] 新增关卡 JSON 已在 `BootScene.preload()` 中预加载
- [ ] 新增关卡已在 `levels.json` 中注册索引

---

## 附录 A：游戏阶段状态机

```
GamePhase:
  PREPARATION → (玩家点击"开始波次") → COMBAT → 波完成 → WAVE_TRANSITION
       ↑                                                              │
       └──────────────────────────────────────────────────────────────┘
                                      (循环至所有波次完成)
                                               ↓
                                       GAME_OVER (victory/lose)
                                               ↓
                                       重新开始 → 重置回到 PREPARATION
                                       返回关卡列表 → 切换到 LevelSelectScene
```

## 附录 B：目录职责一览

| 目录 | 职责 | 依赖 |
|------|------|------|
| `types/` | 纯接口定义，零实现 | 无 |
| `constants.ts` | 枚举、事件名、颜色、深度 | 无 |
| `core/` | EventBus、GameStateManager、ServiceLocator | types, constants |
| `utils/` | 工具函数（纯函数） | constants |
| `data/` | 静态配置注册表（Registry 模式） | types, constants |
| `effects/` | IEffect 实现类 | types |
| `entities/` | 游戏实体（Phaser Container / Arc 子类） | types, constants, data, EventBus |
| `factories/` | 实体工厂（统一创建入口 + 对象池） | types, data, entities |
| `systems/` | 游戏逻辑系统（Map、Wave、Hand、Combat、Enchantment） | types, constants, EventBus, entities, factories |
| `ui/` | 界面组件（HUD、CardHand、TowerPanel、GameOver、WaveBanner） | types, constants, EventBus |
| `scenes/` | Phaser 场景（顶层编排） | 所有模块 |

## 附录 C：扩展预留汇总

| 扩展方向 | 如何添加 | 不改核心代码 |
|----------|----------|-------------|
| 新防御塔类型 | `TowerRegistry.ts` 追加定义 + `Tower.ts` 添加绘制方法 | ✅ 仅追加 |
| 新怪物类型 | `EnemyRegistry.ts` 追加定义 + `Enemy.ts` 添加脸部表情 | ✅ 仅追加 |
| 新状态效果 | 实现 `IEffect` 接口，在 `CombatManager.executeHitHook` 中创建 | ✅ 仅追加 |
| 新附魔卡 | `EnchantmentRegistry.ts` 追加条目 + `CombatManager` 添加 hit hook case | ✅ 仅追加 |
| 新组合规则 | `EnchantmentRegistry.COMBO_RULES` 追加规则 | ✅ 仅追加 |
| 新关卡 | `public/assets/data/levels/` 新增 JSON + `levels.json` 注册 + `BootScene` 预加载 | ✅ 纯数据 |
| 新寻敌策略 | `TargetFilter.ts` 追加策略函数 + 注册 | ✅ 仅追加 |
| 新场景 | 创建 Scene 类 + `config.ts` 注册 | ✅ 仅追加 |
| 新游戏模式 | 新 Scene 复用所有 Entity/System | ✅ |
| 新 UI 组件 | 创建类，监听 EventBus，在 GameScene 中实例化 | ✅ 仅追加 |
| 新资源类型 | 扩展 `PlayerResources` 接口 + `GameStateManager` 方法 | 小改 |
| 图鉴系统 | 新 `CardCollectionUI.ts`，监听 `CARD_DRAWN` 事件 | ✅ 不修改核心 |
| 局外成长 | 新 `ProgressionManager.ts`，监听 `GAME_OVER` | ✅ 不修改核心 |
| 音效 | 新 `AudioManager.ts`，监听战斗事件播放 | ✅ 不修改核心 |
| 存档 | 新 `SaveManager.ts`，在关键节点读写 localStorage | ✅ 不修改核心 |
| 成就系统 | 新 `AchievementManager.ts`，监听各类事件累积进度 | ✅ 不修改核心 |
| 统计/埋点 | 新 `AnalyticsManager.ts`，监听事件采集数据 | ✅ 不修改核心 |
| 关卡编辑器 | 新 `EditorScene.ts`，可视化编辑 + JSON 导出 | ✅ 新增场景 |
