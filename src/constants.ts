// ─── Canvas ─────────────────────────────────────────────
export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
export const TILE_SIZE = 32;           // display size per tile
export const TILE_ASSET_SIZE = 256;    // source asset size (scaled down)

// ─── Tile Textures ──────────────────────────────────────
// 素材来自 Craftpix "Simple Summer Top-Down" tileset
export const TILE_TEXTURES = {
  // ★ 草地统一使用 Ground 43
  GRASS: 'tile_grass',
  // 路径边缘贴图（方向 = 草地所在侧）
  PATH_EDGE_UP:    'tile_path_up',     // 上方是草地 → Ground 08
  PATH_EDGE_LEFT:  'tile_path_left',   // 左侧是草地 → Ground 06
  PATH_EDGE_RIGHT: 'tile_path_right',  // 右侧是草地 → Ground 04
  PATH_EDGE_DOWN:  'tile_path_down',   // 下方是草地 → Ground 02
  PATH_CORNER_TL:  'tile_path_tl',     // 左上方草地(转角) → Ground 10
  PATH_CORNER_TR:  'tile_path_tr',     // 右上方草地(转角) → Ground 12
  PATH_CORNER_BL:  'tile_path_bl',     // 左下方草地(转角) → Ground 16
  PATH_CORNER_BR:  'tile_path_br',     // 右下方草地(转角) → Ground 18
  PATH_INNER:      'tile_path_inner',  // 内部路径(四周都是路) → Ground 10
  // 内侧转角（四边是路，仅一个对角是草地）→ 对应 Ground 01/03/07/09
  PATH_INNER_DIAG_BR: 'tile_inner_diag_br', // 仅右下角草地
  PATH_INNER_DIAG_BL: 'tile_inner_diag_bl', // 仅左下角草地
  PATH_INNER_DIAG_TR: 'tile_inner_diag_tr', // 仅右上角草地
  PATH_INNER_DIAG_TL: 'tile_inner_diag_tl', // 仅左上角草地
  SOURCES: {
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

// ─── Game Balance ───────────────────────────────────────
export const MAX_HAND_SIZE = 7;
export const DEFAULT_MAX_ENCHANT_SLOTS = 3;
export const DEFAULT_LIVES = 20;
export const DEFAULT_ESSENCE = 30;

// ─── Card Drop ──────────────────────────────────────────
export const BASE_CARD_DROP_CHANCE = 0.6;
export const ENCHANTMENT_DROP_CHANCE = 0.3; // of card drops, % that are enchantments

// ─── Wave ───────────────────────────────────────────────
export const WAVE_TRANSITION_DELAY = 3000;   // ms between waves
export const PRE_GAME_DELAY = 2000;          // ms before first wave auto-starts

// ─── Enemy ──────────────────────────────────────────────
export const MIN_ENEMY_SPEED = 20;           // px/s floor after slow stacking

// ─── Essence Economy ────────────────────────────────────
export const ENCHANT_ESSENCE_COST: Record<string, number> = {
  common: 5,
  rare: 10,
  epic: 15,
};
export const REROLL_ESSENCE_COST = 3;        // cost to reroll hand cards

// ─── Attach ─────────────────────────────────────────────
export const ENCHANTMENT_STACK_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.7,
  3: 2.2,
};

// ─── Projectile ─────────────────────────────────────────
export const PROJECTILE_POOL_MAX = 50;

// ─── Venom Pool ─────────────────────────────────────────
export const VENOM_POOL_DURATION = 5000;   // ms
export const VENOM_POOL_DAMAGE = 8;        // damage per tick
export const VENOM_POOL_TICK = 1000;       // ms between ticks
export const VENOM_POOL_RADIUS = 48;       // px

// ─── Summoner ───────────────────────────────────────────
export const SUMMONER_SPAWN_INTERVAL = 5000;  // ms between spawns
export const SUMMONER_MAX_SPAWNS = 3;         // max total spawns

// ─── Splitter ───────────────────────────────────────────
export const SPLITTER_SPLIT_HP_RATIO = 0.5;   // HP ratio at which split occurs
export const SPLITTER_MAX_SPLITS = 1;          // max number of splits per enemy

// ─── Tile Theme Tints ───────────────────────────────────
// 利用现有 Summer 素材，通过色调区分章节视觉风格
// Phaser setTint 使用乘法混合，0xFFFFFF = 无变化
export const TILE_THEMES: Record<string, { grassTint: number; pathTint: number }> = {
  grassland: { grassTint: 0xFFFFFF, pathTint: 0xFFFFFF },     // 原色（夏季翠绿）
  swamp:     { grassTint: 0xBBEECC, pathTint: 0xDDDDAA },     // 暗绿沼泽
  mountain:  { grassTint: 0xD0D0D0, pathTint: 0xC8C0B0 },     // 灰褐矿山
  chaos:     { grassTint: 0xDDBBAA, pathTint: 0xCCAA99 },     // 暗红混沌
};

// ─── Chapter Background Colors ───────────────────────────
// 全屏背景渐变色（顶部 / 底部）
export const CHAPTER_BG: Record<string, { top: number; bottom: number }> = {
  grassland: { top: 0x7EC850, bottom: 0x5A9E35 },
  swamp:     { top: 0x4A7A55, bottom: 0x2A5A3A },
  mountain:  { top: 0x6A6A7A, bottom: 0x3A3A4A },
  chaos:     { top: 0x5A2A3A, bottom: 0x3A1A2A },
};

// ─── Colors — Cartoon Palette ───────────────────────────
export const COLORS = {
  // Map
  GRASS: 0x8CC63F,
  GRASS_ALT: 0x7EB539,
  PATH: 0xF5DEB3,
  PATH_BORDER: 0xD4B896,
  BUILD_SPOT_EMPTY: 0xFFD700,
  BUILD_SPOT_HOVER: 0xFFEE55,
  BUILD_SPOT_OCCUPIED: 0x999999,
  BASE_MARKER: 0xFF4444,
  SPAWN_MARKER: 0x44CC44,

  // Towers
  ARROW_TOWER: 0x5BA0D9,
  ARROW_TOWER_DARK: 0x3D7AB8,
  MAGIC_TOWER: 0xB07CD8,
  MAGIC_TOWER_DARK: 0x8B5AB8,
  CANNON_TOWER: 0xF0A050,
  CANNON_TOWER_DARK: 0xD08038,
  SLOW_TOWER: 0x50C8A0,
  SLOW_TOWER_DARK: 0x38A080,
  TOWER_RANGE_CIRCLE: 0xffffff,
  TOWER_RANGE_ALPHA: 0.12,

  // Bosses
  SWAMP_BOSS: 0x44AA55,
  SWAMP_BOSS_DARK: 0x227733,
  MOUNTAIN_BOSS: 0xDD5533,
  MOUNTAIN_BOSS_DARK: 0xAA3311,
  CHAOS_BOSS: 0x9922BB,
  CHAOS_BOSS_DARK: 0x661188,

  // Enemies
  SCOUT: 0xFF5555,
  SCOUT_DARK: 0xCC3333,
  TANK: 0x8B6914,
  TANK_DARK: 0x6B4F10,
  BASIC: 0xF5A623,
  BASIC_DARK: 0xD4891A,
  SUMMONER: 0xAA44DD,
  SUMMONER_DARK: 0x8822BB,
  VENOM: 0x44CC55,
  VENOM_DARK: 0x33AA44,
  FLYING: 0x77BBEE,
  FLYING_DARK: 0x5599CC,
  SPLITTER: 0xEE8844,
  SPLITTER_DARK: 0xCC6622,

  // HP bars
  HP_BAR_BG: 0x440000,
  HP_BAR_FG: 0x44DD44,
  HP_BAR_MID: 0xDDA400,
  HP_BAR_LOW: 0xDD3333,

  // Cards
  CARD_BG: 0xFFFFFF,
  CARD_BORDER_TOWER: 0x5BA0D9,
  CARD_BORDER_ENCHANT: 0xC090E8,
  CARD_SELECTED_GLOW: 0xFFCC00,
  CARD_HOVER_TINT: 0xE8E8E8,
  CARD_SHADOW: 0x000000,

  // UI
  HUD_BG: 0x3A2E1E,
  HUD_BG_ALPHA: 0.82,
  PANEL_BG: 0xFFF8F0,
  PANEL_BORDER: 0xD4B896,
  BUTTON_NORMAL: 0x6DB840,
  BUTTON_HOVER: 0x8CC63F,
  BUTTON_DANGER: 0xFF6B6B,
  BUTTON_DANGER_HOVER: 0xFF4444,
  TEXT_PRIMARY: '#3A2E1E',
  TEXT_SECONDARY: '#7A6B5C',
  TEXT_ACCENT: '#D4891A',
  TEXT_DANGER: '#E05050',
  TEXT_SUCCESS: '#5BA838',
  RESTART_BTN: 0xE8A040,
  RESTART_BTN_HOVER: 0xF0B860,

  // Enchantment slots
  SLOT_EMPTY: 0xE8DDD0,
  SLOT_FILLED: 0xB07CD8,
  SLOT_HOVER: 0xD0A0F0,

  // Effects
  POISON_TINT: 0x44DD44,
  SLOW_TINT: 0x66BBFF,
  STUN_TINT: 0xFFDD44,
  DAMAGE_FLASH: 0xFF0000,
} as const;

// ─── Depth Layers ───────────────────────────────────────
export const DEPTH = {
  MAP_BG: 0,
  DECORATIONS: 1,
  PATH: 2,
  BUILD_SPOTS: 3,
  ENEMIES: 10,
  HEALTH_BARS: 11,
  PROJECTILES: 15,
  TOWERS: 20,
  RANGE_CIRCLES: 5,
  UI_BASE: 50,
  CARD_HAND: 60,
  HUD: 70,
  PANEL: 80,
  OVERLAY_BG: 90,
  OVERLAY_CONTENT: 95,
  WAVE_BANNER: 100,
} as const;

// ─── Event Names ────────────────────────────────────────
// Naming convention: module:action
export const EVENTS = {
  // Enemy
  ENEMY_SPAWNED: 'enemy:spawned',
  ENEMY_KILLED: 'enemy:killed',
  ENEMY_BASE_REACHED: 'enemy:base-reached',

  // Wave
  WAVE_START: 'wave:start',
  WAVE_COMPLETE: 'wave:complete',
  ALL_WAVES_DONE: 'wave:all-done',
  WAVE_START_REQUESTED: 'wave:start-requested',  // 玩家点击"开始波次"按钮

  // Card
  CARD_DRAWN: 'card:drawn',
  CARD_PLAYED: 'card:played',
  CARD_DISCARDED: 'card:discarded',
  CARD_SELL: 'card:sell',
  HAND_CHANGED: 'hand:changed',

  // Tower
  TOWER_DEPLOYED: 'tower:deployed',
  TOWER_SELECTED: 'tower:selected',
  TOWER_DESELECTED: 'tower:deselected',
  TOWER_DEMOLISH: 'tower:demolish',

  // Enchantment
  ENCHANT_APPLIED: 'enchant:applied',
  ENCHANT_REMOVED: 'enchant:removed',
  COMBO_ACTIVATED: 'enchant:combo',

  // Build spot
  BUILD_SPOT_CLICKED: 'build-spot:clicked',

  // Game state
  RESOURCE_CHANGED: 'resource:changed',
  PHASE_CHANGED: 'phase:changed',
  GAME_OVER: 'game:over',
  GAME_RESTART: 'game:restart',

  // Input
  CARD_SELECTED: 'input:card-selected',
  CARD_DESELECTED: 'input:card-deselected',

  // Spawn request (summoner, splitter)
  ENEMY_SPAWN_REQUEST: 'enemy:spawn-request',

  // Venom pool
  VENOM_POOL_SPAWN: 'venom:pool-spawn',

  // Card reward
  CARD_REWARD_SHOW: 'card-reward:show',
  CARD_REWARD_SELECTED: 'card-reward:selected',

  // Hand replace
  HAND_REPLACE_SHOW: 'hand-replace:show',
  HAND_REPLACE_DONE: 'hand-replace:done',

  // Shop / reroll
  SHOP_REROLL: 'shop:reroll',

  // Audio events
  TOWER_ATTACK: 'tower:attack',
  PROJECTILE_HIT: 'projectile:hit',
  PROJECTILE_EXPLOSION: 'projectile:explosion',
  ENEMY_DAMAGED: 'enemy:damaged',

  // Boss
  BOSS_ALERT: 'boss:alert',
  BOSS_HP_CHANGED: 'boss:hp-changed',
} as const;
