# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Start dev server (Vite HMR on :5173)
npm run build       # TypeScript check + production build
npm run preview     # Preview production build
npm run typecheck   # tsc --noEmit (no output files)
```

There are no tests yet. This is a P0 prototype.

## Architecture

This is a **card-driven tower defense game** built with TypeScript + Phaser 3 + Vite. The game is web-based, 2D top-down, using tile-based maps with Craftpix assets.

### Dependency layers (strict — no circular dependencies)

```
types/ + constants.ts + EventBus + utils/     ← zero internal deps, safe to import from anywhere
       ↓
data/ + core/                                 ← depends only on layer above
       ↓
entities/ + factories/ + systems/ + effects/  ← game logic, depends on types + data + EventBus
       ↓
ui/                                           ← display layer, depends on types + EventBus
       ↓
scenes/                                       ← top-level orchestration (Boot→Menu→LevelSelect→Game)
```

### Core design patterns

- **Event-driven communication**: Systems never call each other directly. Everything goes through `EventBus` (a `Phaser.Events.EventEmitter` singleton at `src/core/EventBus.ts`). Events are defined as string constants in `src/constants.ts` → `EVENTS`.
- **Registry pattern**: All content (towers, enemies, enchantments) is registered in `src/data/*Registry.ts` via `register()` calls. The rest of the code reads from these maps — new content only needs a new `register()` entry.
- **Factory pattern**: Entities are created through factories (`TowerFactory`, `EnemyFactory`, `ProjectileFactory`), never directly `new`'d. The projectile factory uses an `ObjectPool`.
- **Interface-based**: All entities implement interfaces from `src/types/`. Components depend on `ITower`, `IEnemy`, etc., not concrete classes.

### Scene flow

```
BootScene (preload assets + level JSONs)
  → MenuScene (title screen)
    → LevelSelectScene (level cards from levels.json cache)
      → GameScene (main game, accepts { levelId } scene data)
```

### GameScene lifecycle (critical)

`GameScene` is the main orchestrator. Key lifecycle:

1. `create()` — clears EventBus listeners, creates GameStateManager, loads level config from preloaded cache, calls `initGame()`
2. `initGame()` — creates all systems (Map, Wave, Hand, Combat, Enchantment managers) + all UI components + wires up events
3. `update(time, delta)` — only runs `CombatManager.update()` during COMBAT phase
4. `shutdown` event → `cleanupGame()` — destroys all objects, removes EventBus listeners. This fires on scene switch (e.g. back to LevelSelectScene) OR restart.
5. `restartGame()` → `cleanupGame()` + `scene.restart()`

UI components must implement `destroy()` that unsubscribes from EventBus (`EventBus.off(...)`) and destroys Phaser objects. GameScene's `cleanupGame()` calls destroy on every system/UI instance.

### Game phase state machine

```
PREPARATION → (player clicks "开始波次") → COMBAT → all enemies dead/killed → WAVE_TRANSITION
                                                                                    ↓
                                                                         (player clicks "下一波")
                                                                                    ↓
                                                                              COMBAT → ... → ALL_WAVES_DONE → GAME_OVER
```

No waves auto-start. Player manually triggers each wave (like PvZ).

### Tile / path system

- **Tile size**: 32px display (source assets are 256px, scaled down on render)
- **Path width**: 2 tiles — `buildPathMask()` in `MapManager.ts` oversamples waypoints into a skeleton mask, then widens: self + right + down + diagonal(right-down)
- **Tile selection**: `selectPathTile()` checks 4 orthogonal neighbors for edges/corners, then 4 diagonals for inner corners. Grass-only diagonal neighbors use corner tiles 01/03/07/09 — these MUST NOT be overridden.
- **Enemy centering**: `EnemyFactory` offsets all waypoints by `TILE_SIZE` (32px) so enemies walk center of the 2-tile-wide path. MapManager offsets spawn/base markers identically.
- **Waypoints in level JSON**: Define the skeleton line (top-left corner of the 2-wide corridor). Actual path is skeleton + right/down expansion. Enemies walk skeleton + 32px offset.

### Tower interaction rules (in GameScene.setupInteraction)

When a player has a card selected and clicks something:

| Selected card | Click target | Action |
|---------------|-------------|--------|
| Tower card | Empty build spot | Deploy tower |
| Tower card | Same-type tower (Lv<3) | Upgrade tower |
| Tower card | Different-type tower | Deselect card (show tower info) |
| Tower card | Same-type tower (Lv=3) | Deselect card |
| Enchantment card | Compatible tower | Apply enchantment |
| Enchantment card | Incompatible tower | Nothing |
| Any card | Sell button in info strip | Sell card |

### Key gotchas

- **Enum imports**: Always import enums (`TowerType`, `EnemyType`, `CardType`, `GamePhase`) from `'../types'` or `'../types/index'`, **never** from `'../constants'`. Constants re-exports some but not all enums.
- **ESM only**: No `require()`. Use `import ... from '...'`.
- **Projectile hit detection**: `CombatManager.update()` does a single loop over active projectiles, checks distance to target, and calls `handleProjectileHit()` + `recycle()`. `Projectile.preUpdate()` only handles movement — it does NOT set `alive=false` on proximity. The manager is the sole authority on hits.
- **Level JSON preloading**: All level JSONs must be loaded in `BootScene.preload()`. GameScene's `create()` reads from cache via `this.cache.json.get('level_<id>')` — it cannot dynamically load.
- **Container.body conflict**: Phaser's `Container` has a built-in `body` property (for physics). `Enemy` and `Tower` extend Container but don't use Arcade physics. Avoid naming properties `body`.
- **Graphics redraw**: Always call `g.clear()` before redrawing a `Phaser.GameObjects.Graphics` — otherwise strokes/fills accumulate.

### Extension points (see DEVELOPMENT.md for full details)

- New tower type: `TowerRegistry.ts` + `TowerType` enum + visual in `Tower.ts` + projectile color in `Projectile.ts` + icon in `CardSprite.ts` + card in `CardLibrary.ts`
- New enemy: `EnemyRegistry.ts` + `EnemyType` enum + face drawing in `Enemy.ts`
- New enchantment: `EnchantmentRegistry.ts` + hit hook case in `CombatManager.executeHitHook()`
- New effect: implement `IEffect` in `src/effects/` + create it in `CombatManager.executeHitHook()`
- New level: JSON in `public/assets/data/levels/` + register in `levels.json` + preload in `BootScene.ts`
- New targeting strategy: add function to `TargetFilter.ts` + register in the strategies map
- New scene: create Scene class + add to `config.ts` scene array

### Key files for orientation

| File | Role |
|------|------|
| `src/main.ts` | Entry point — creates `new Phaser.Game(gameConfig)` |
| `src/config.ts` | Phaser game config (1024×768, Arcade physics, FIT scaling) |
| `src/constants.ts` | All enums, event names, colors, depth layers, tile textures |
| `src/types/*.ts` | All interfaces and type definitions |
| `src/scenes/GameScene.ts` | Main game orchestrator (~380 lines) |
| `src/systems/MapManager.ts` | Tile rendering, path mask, build spots |
| `src/systems/CombatManager.ts` | Tower attack loop, projectile hit detection, enchantment effects |
| `src/systems/WaveManager.ts` | Wave spawning, enemy tracking, card drops |
| `src/systems/HandManager.ts` | Hand card array, overflow buffer, draw-to-max |
| `src/systems/EnchantmentManager.ts` | Apply/remove enchantments, slot management, combo detection |
| `src/entities/Tower.ts` | Tower entity — visual body, upgrade, range circle, highlight |
| `src/entities/Enemy.ts` | Enemy entity — movement, effects, HP bar, death animation |
| `src/entities/Projectile.ts` | Projectile — pooled, flies toward target, movement only |
| `src/ui/CardHandUI.ts` | Bottom card hand + info strip with sell button |
| `src/ui/TowerInfoPanel.ts` | Right-side panel: stats, enchantment slots, demolish button |
| `src/ui/HUD.ts` | Top bar: wave info, essence, lives, start-wave/restart buttons |
| `src/ui/GameOverOverlay.ts` | Victory/defeat card with level-select and restart buttons |
| `DEVELOPMENT.md` | Full development guide with detailed extension instructions |
| `plan.md` | Original game design document (Chinese) |
