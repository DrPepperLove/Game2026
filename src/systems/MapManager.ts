import Phaser from 'phaser';
import { COLORS, DEPTH, TILE_SIZE, TILE_ASSET_SIZE, TILE_TEXTURES, TILE_THEMES, CHAPTER_BG, EVENTS } from '../constants';
import type { BuildSpot, LevelConfig } from '../types';
import { GridUtils } from '../utils/GridUtils';
import { EventBus } from '../core/EventBus';

export class MapManager {
  private scene: Phaser.Scene;
  private config!: LevelConfig;
  private tileContainer!: Phaser.GameObjects.Container;
  private spotGraphics!: Phaser.GameObjects.Graphics;
  private decorations: Phaser.GameObjects.Image[] = [];
  private buildSpotZones: Array<{
    spot: BuildSpot; zone: Phaser.GameObjects.Zone; occupied: boolean;
  }> = [];

  constructor(scene: Phaser.Scene) { this.scene = scene; }

  loadLevel(config: LevelConfig): void {
    this.config = config;
    this.buildSpotZones = [];
    this.decorations = [];
    this.tileContainer = this.scene.add.container(0, 0).setDepth(DEPTH.MAP_BG);

    // 0. Draw chapter background
    this.drawChapterBackground();

    // 1. Build path grid mask
    const mask = this.buildPathMask();

    // 2. Draw all tiles
    this.drawTiles(mask);

    // 3. Scatter decorative props (trees, rocks, bushes) on grass
    this.drawDecorations(mask);

    // 4. Draw build spots and markers on top
    this.drawBuildSpots();
    this.drawMarkers();
  }

  // ─── Build path mask ─────────────────────────────
  // Returns a 2D boolean grid: true = path, false = grass

  private buildPathMask(): boolean[][] {
    const { gridWidth, gridHeight } = this.config;
    const mask: boolean[][] = Array.from({ length: gridWidth }, () =>
      Array(gridHeight).fill(false),
    );

    const wp = this.config.pathWaypoints;
    if (wp.length < 2) return mask;

    // For each consecutive pair of waypoints, mark all grid cells along the line
    for (let seg = 0; seg < wp.length - 1; seg++) {
      const from = wp[seg];
      const to = wp[seg + 1];

      // Sample points along the segment
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(len / (TILE_SIZE / 2)); // oversample for coverage

      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const px = from.x + dx * t;
        const py = from.y + dy * t;
        const { gridX, gridY } = GridUtils.pixelToGrid(px, py);
        if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
          mask[gridX][gridY] = true;
        }
      }
    }

    // Widen to 2×2 tiles: mark self + right + down + diagonal
    const widened: boolean[][] = Array.from({ length: gridWidth }, () =>
      Array(gridHeight).fill(false),
    );
    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gy = 0; gy < gridHeight; gy++) {
        if (mask[gx][gy]) {
          widened[gx][gy] = true;
          if (gx + 1 < gridWidth)  widened[gx + 1][gy] = true;
          if (gy + 1 < gridHeight) widened[gx][gy + 1] = true;
          if (gx + 1 < gridWidth && gy + 1 < gridHeight) widened[gx + 1][gy + 1] = true;
        }
      }
    }

    return widened;
  }

  // ─── Chapter background ──────────────────────────
  // 全屏渐变色背景，在地砖之下渲染

  private drawChapterBackground(): void {
    const { width, height } = this.scene.cameras.main;
    const theme = this.config?.theme || 'grassland';
    const colors = CHAPTER_BG[theme] || CHAPTER_BG.grassland;

    const bg = this.scene.add.graphics();
    bg.setDepth(DEPTH.MAP_BG - 1);

    // 用横向色带模拟渐变（Phaser Graphics 不支持原生渐变）
    const bands = 32;
    const bandH = Math.ceil(height / bands);
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const r = ((colors.top >> 16) & 0xFF) * (1 - t) + ((colors.bottom >> 16) & 0xFF) * t;
      const g = ((colors.top >> 8) & 0xFF) * (1 - t) + ((colors.bottom >> 8) & 0xFF) * t;
      const b = (colors.top & 0xFF) * (1 - t) + (colors.bottom & 0xFF) * t;
      const color = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
      bg.fillStyle(color, 1);
      bg.fillRect(0, i * bandH, width, bandH);
    }

    // 额外装饰：顶部加入一圈柔和光晕（浅色半透明条）
    bg.fillStyle(0xFFFFFF, 0.04);
    bg.fillRect(0, 0, width, height * 0.3);
  }

  // ─── Draw tiles ──────────────────────────────────

  private drawTiles(mask: boolean[][]): void {
    const { gridWidth, gridHeight, theme } = this.config;
    const grassKey = TILE_TEXTURES.GRASS as string;
    const themeTint = TILE_THEMES[theme] || TILE_THEMES.grassland;

    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gy = 0; gy < gridHeight; gy++) {
        const px = gx * TILE_SIZE + TILE_SIZE / 2;
        const py = gy * TILE_SIZE + TILE_SIZE / 2;

        if (mask[gx][gy]) {
          // Path tile — choose based on neighbors
          const key = this.selectPathTile(mask, gx, gy);
          this.scene.add.image(px, py, key)
            .setDisplaySize(TILE_SIZE, TILE_SIZE)
            .setDepth(DEPTH.PATH)
            .setTint(themeTint.pathTint);
        } else {
          // Grass tile
          this.scene.add.image(px, py, grassKey)
            .setDisplaySize(TILE_SIZE, TILE_SIZE)
            .setDepth(DEPTH.MAP_BG)
            .setTint(themeTint.grassTint);
        }
      }
    }
  }

  // ─── Path tile selection ─────────────────────────
  // 检查四方向邻居：如果邻居是草地（非路径），则该边缘需要草地边框

  private selectPathTile(mask: boolean[][], gx: number, gy: number): string {
    const isPath = (x: number, y: number): boolean => {
      if (x < 0 || x >= this.config.gridWidth || y < 0 || y >= this.config.gridHeight) {
        return false; // out of bounds = grass (edge of map)
      }
      return mask[x][y];
    };

    const up    = isPath(gx, gy - 1);
    const down  = isPath(gx, gy + 1);
    const left  = isPath(gx - 1, gy);
    const right = isPath(gx + 1, gy);

    // All 4 sides are path → inner tile, check diagonals for inner corners
    if (up && down && left && right) {
      const upLeft    = isPath(gx - 1, gy - 1);
      const upRight   = isPath(gx + 1, gy - 1);
      const downLeft  = isPath(gx - 1, gy + 1);
      const downRight = isPath(gx + 1, gy + 1);

      // Only one diagonal is grass → inner corner
      if (upLeft && upRight && downLeft && !downRight) return TILE_TEXTURES.PATH_INNER_DIAG_BR as string;
      if (upLeft && upRight && !downLeft && downRight) return TILE_TEXTURES.PATH_INNER_DIAG_BL as string;
      if (upLeft && !upRight && downLeft && downRight) return TILE_TEXTURES.PATH_INNER_DIAG_TR as string;
      if (!upLeft && upRight && downLeft && downRight) return TILE_TEXTURES.PATH_INNER_DIAG_TL as string;

      return TILE_TEXTURES.PATH_INNER as string;
    }

    // ── Corners (2 adjacent grass edges) ──
    if (!up && !left && down && right)  return TILE_TEXTURES.PATH_CORNER_TL as string;
    if (!up && !right && down && left)  return TILE_TEXTURES.PATH_CORNER_TR as string;
    if (!down && !left && up && right)  return TILE_TEXTURES.PATH_CORNER_BL as string;
    if (!down && !right && up && left)  return TILE_TEXTURES.PATH_CORNER_BR as string;

    // ── Straight edges (1 grass edge) ──
    if (!up && left && right)    return TILE_TEXTURES.PATH_EDGE_UP as string;
    if (!down && left && right)  return TILE_TEXTURES.PATH_EDGE_DOWN as string;
    if (!left && up && down)     return TILE_TEXTURES.PATH_EDGE_LEFT as string;
    if (!right && up && down)    return TILE_TEXTURES.PATH_EDGE_RIGHT as string;

    // ── Dead ends / single-cell path ──
    // Only one path neighbor → treat as 3-edge grass
    if (up && !down && !left && !right)   return TILE_TEXTURES.PATH_EDGE_DOWN as string;
    if (down && !up && !left && !right)   return TILE_TEXTURES.PATH_EDGE_UP as string;
    if (left && !up && !down && !right)   return TILE_TEXTURES.PATH_EDGE_RIGHT as string;
    if (right && !up && !down && !left)   return TILE_TEXTURES.PATH_EDGE_LEFT as string;

    // Fallback
    return TILE_TEXTURES.PATH_INNER as string;
  }

  // ─── Build Spots ─────────────────────────────────

  private drawBuildSpots(): void {
    this.spotGraphics = this.scene.add.graphics().setDepth(DEPTH.BUILD_SPOTS);
    for (const spot of this.config.buildSpots) {
      const { x, y } = GridUtils.gridToPixel(spot.gridX, spot.gridY);
      this.drawSpotGfx(x, y, false, false);
    }
  }

  private drawSpotGfx(px: number, py: number, hovered: boolean, occupied: boolean): void {
    const g = this.spotGraphics;
    const r = 15;
    if (occupied) {
      g.fillStyle(COLORS.BUILD_SPOT_OCCUPIED, 0.4);
      g.fillCircle(px, py, r);
      return;
    }
    const color = hovered ? COLORS.BUILD_SPOT_HOVER : COLORS.BUILD_SPOT_EMPTY;
    g.fillStyle(0x000000, 0.15);
    g.fillCircle(px + 1, py + 2, r);
    g.fillStyle(color, hovered ? 0.5 : 0.3);
    g.fillCircle(px, py, r);
    g.lineStyle(2, color, hovered ? 0.9 : 0.6);
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const a1 = (i / segs) * Math.PI * 2;
      const a2 = ((i + 0.5) / segs) * Math.PI * 2;
      g.beginPath(); g.arc(px, py, r, a1, a2); g.strokePath();
    }
    g.lineStyle(2.5, 0xffffff, 0.7);
    const s = 6;
    g.beginPath(); g.moveTo(px - s, py); g.lineTo(px + s, py); g.strokePath();
    g.beginPath(); g.moveTo(px, py - s); g.lineTo(px, py + s); g.strokePath();
    if (hovered) { g.lineStyle(2.5, color, 0.5); g.strokeCircle(px, py, r + 4); }
  }

  // ─── Markers ────────────────────────────────────

  private drawMarkers(): void {
    const gfx = this.scene.add.graphics().setDepth(DEPTH.BUILD_SPOTS);
    const wp = this.config.pathWaypoints;
    const offset = TILE_SIZE; // center in 2-tile-wide path
    const first = wp[0], last = wp[wp.length - 1];
    // Offset markers to path center, clamping to screen bounds
    const sx = Math.min(first.x + offset, this.config.gridWidth * TILE_SIZE - 16);
    const sy = first.y + offset;
    const bx = Math.min(last.x + offset, this.config.gridWidth * TILE_SIZE - 16);
    const by = last.y + offset;

    gfx.fillStyle(0x000000, 0.15);
    gfx.fillCircle(sx + 2, sy + 2, 14);
    gfx.fillStyle(COLORS.SPAWN_MARKER, 0.5);
    gfx.fillCircle(sx, sy, 14);
    gfx.lineStyle(2, COLORS.SPAWN_MARKER, 0.8);
    gfx.strokeCircle(sx, sy, 14);
    this.scene.add.text(sx, sy - 22, '出生点', {
      fontSize: '10px', fontFamily: 'monospace', color: '#88FF88',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(DEPTH.BUILD_SPOTS);

    gfx.fillStyle(0x000000, 0.15);
    gfx.fillCircle(bx + 2, by + 2, 16);
    gfx.fillStyle(COLORS.BASE_MARKER, 0.45);
    gfx.fillCircle(bx, by, 16);
    gfx.lineStyle(2.5, COLORS.BASE_MARKER, 0.8);
    gfx.strokeCircle(bx, by, 16);
    this.scene.add.text(bx, by, '🏠', {
      fontSize: '20px',
    }).setOrigin(0.5).setDepth(DEPTH.BUILD_SPOTS);
    this.scene.add.text(bx, by - 24, '基地', {
      fontSize: '10px', fontFamily: 'monospace', color: '#FF8888',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(DEPTH.BUILD_SPOTS);
  }

  // ─── Decorations (trees, rocks, bushes) ───────────

  private drawDecorations(mask: boolean[][]): void {
    const { gridWidth, gridHeight } = this.config;

    // Exclusion mask: path + 2-tile buffer + build spots + spawn/base area
    const excluded: boolean[][] = Array.from({ length: gridWidth }, (_, gx) =>
      Array(gridHeight).fill(false),
    );

    // Mark path tiles with 2-tile buffer
    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gy = 0; gy < gridHeight; gy++) {
        if (!mask[gx][gy]) continue;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const nx = gx + dx, ny = gy + dy;
            if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) excluded[nx][ny] = true;
          }
        }
      }
    }

    // Mark build spots
    for (const spot of this.config.buildSpots) {
      excluded[spot.gridX][spot.gridY] = true;
    }

    // Mark spawn and base area
    const wp = this.config.pathWaypoints;
    if (wp.length >= 2) {
      this.markArea(excluded, wp[0].x, wp[0].y, 2);
      this.markArea(excluded, wp[wp.length - 1].x, wp[wp.length - 1].y, 2);
    }

    // Collect available grass tiles
    const available: Array<{ gx: number; gy: number }> = [];
    for (let gx = 0; gx < gridWidth; gx++) {
      for (let gy = 0; gy < gridHeight; gy++) {
        if (!excluded[gx][gy]) available.push({ gx, gy });
      }
    }
    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    // Prop type pools
    const smallProps = ['prop_bush_small', 'prop_rock_01', 'prop_rock_02'];
    const mediumProps = ['prop_tree_small', 'prop_bush_medium', 'prop_rock_03', 'prop_rock_04'];
    const largeProps = ['prop_tree_medium', 'prop_bush_large', 'prop_rock_05', 'prop_stump_short', 'prop_stump_tall'];
    const rareProps = ['prop_tree_large', 'prop_campfire', 'prop_barrel', 'prop_well'];
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    // Place ~20-35 props per map
    const count = Math.min(available.length, 20 + Math.floor(Math.random() * 15));

    for (let i = 0; i < count && i < available.length; i++) {
      const tile = available[i];
      const px = tile.gx * TILE_SIZE + TILE_SIZE / 2;
      const py = tile.gy * TILE_SIZE + TILE_SIZE / 2;

      // Weighted prop selection
      const roll = Math.random();
      let propKey: string;
      let displaySize: number;
      if (roll < 0.4) {
        propKey = pick(smallProps);
        displaySize = TILE_SIZE * 0.75; // ~24px
      } else if (roll < 0.7) {
        propKey = pick(mediumProps);
        displaySize = TILE_SIZE; // 32px
      } else if (roll < 0.9) {
        propKey = pick(largeProps);
        displaySize = TILE_SIZE * 1.2; // ~38px
      } else {
        propKey = pick(rareProps);
        displaySize = TILE_SIZE * 1.4; // ~45px
      }

      const img = this.scene.add.image(px, py, propKey)
        .setDisplaySize(displaySize, displaySize)
        .setDepth(DEPTH.DECORATIONS)
        .setOrigin(0.5, 0.85);
      this.decorations.push(img);
    }
  }

  private markArea(excluded: boolean[][], px: number, py: number, radius: number): void {
    const { gridWidth, gridHeight } = this.config;
    const cx = Math.floor(px / TILE_SIZE);
    const cy = Math.floor(py / TILE_SIZE);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) excluded[nx][ny] = true;
      }
    }
  }

  // ─── Interaction ─────────────────────────────────

  enableInteraction(): void {
    for (const spot of this.config.buildSpots) {
      const { x, y } = GridUtils.gridToPixel(spot.gridX, spot.gridY);
      const zone = this.scene.add.zone(x, y, 38, 38)
        .setDepth(DEPTH.BUILD_SPOTS + 1)
        .setInteractive({ useHandCursor: true });
      const entry = { spot, zone, occupied: false };
      zone.on('pointerover', () => {
        if (!entry.occupied) { this.redrawSpots(); this.drawSpotGfx(x, y, true, false); }
      });
      zone.on('pointerout', () => { this.redrawSpots(); });
      zone.on('pointerdown', () => {
        if (!entry.occupied) EventBus.emit(EVENTS.BUILD_SPOT_CLICKED, { gridX: spot.gridX, gridY: spot.gridY });
      });
      this.buildSpotZones.push(entry);
    }
  }

  redrawSpots(): void {
    this.spotGraphics.clear();
    for (const e of this.buildSpotZones) {
      const { x, y } = GridUtils.gridToPixel(e.spot.gridX, e.spot.gridY);
      this.drawSpotGfx(x, y, false, e.occupied);
    }
  }

  // ─── Queries ─────────────────────────────────────

  getWaypoints(): Array<{ x: number; y: number }> { return this.config.pathWaypoints; }
  isSpotOccupied(gx: number, gy: number): boolean {
    return this.buildSpotZones.find(e => e.spot.gridX === gx && e.spot.gridY === gy)?.occupied ?? false;
  }
  markSpotOccupied(gx: number, gy: number, occ: boolean): void {
    const e = this.buildSpotZones.find(z => z.spot.gridX === gx && z.spot.gridY === gy);
    if (e) { e.occupied = occ; this.redrawSpots(); }
  }
  getSpawnPoint(): { x: number; y: number } { return this.config.pathWaypoints[0]; }
  getConfig(): LevelConfig { return this.config; }

  destroy(): void {
    for (const e of this.buildSpotZones) e.zone.destroy();
    this.buildSpotZones = [];
    for (const d of this.decorations) d.destroy();
    this.decorations = [];
    this.tileContainer?.destroy();
    this.spotGraphics?.destroy();
  }
}
