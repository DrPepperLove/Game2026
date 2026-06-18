import type { EnemyType } from './IEnemy';
import type { CardType, Card } from './ICard';
import type { TowerType } from './ITower';

// ─── Level Types ────────────────────────────────────────

export interface BuildSpot {
  gridX: number;
  gridY: number;
}

export interface WaveConfig {
  enemyType: EnemyType;
  count: number;
  spawnInterval: number;   // ms between spawns
  startDelay: number;      // ms before first spawn of this wave
}

export interface StartingCardConfig {
  type: CardType;
  towerType?: TowerType;
  enchantmentId?: string;
}

export interface LevelConfig {
  id: string;
  name: string;
  chapter: number;         // 章节编号 1-4
  gridWidth: number;       // in tiles
  gridHeight: number;      // in tiles
  tileSize: number;        // pixels per tile
  theme: 'grassland' | 'swamp' | 'mountain' | 'chaos';  // 视觉主题
  pathWaypoints: Array<{ x: number; y: number }>; // pixel coords
  buildSpots: BuildSpot[];
  startingHand: StartingCardConfig[];
  waves: WaveConfig[];
  startingEssence: number;
  baseLives: number;
  maxHandSize: number;
}
