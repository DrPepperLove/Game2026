import Phaser from 'phaser';
import { COLORS, DEPTH, EVENTS } from '../constants';
import { TowerType } from '../types';
import type {
  ITower,
  IEnemy,
  IEnchantmentInstance,
  TowerDefinition,
  TowerStats,
} from '../types';
import { MAX_TOWER_LEVEL, UPGRADE_MULTIPLIERS } from '../types';
import { getTowerDefinition } from '../data/TowerRegistry';
import { getEnchantmentDefinition } from '../data/EnchantmentRegistry';
import { getTargetStrategy } from '../systems/TargetFilter';
import { EventBus } from '../core/EventBus';

let towerIdCounter = 0;

export class Tower extends Phaser.GameObjects.Container implements ITower {
  readonly id: string;
  readonly towerType: TowerType;
  readonly definition: TowerDefinition;
  readonly baseStats: TowerStats;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  enchantments: IEnchantmentInstance[] = [];
  lastAttackTime: number = 0;
  currentTarget: IEnemy | null = null;
  level: number = 1;
  attackCount: number = 0;

  private bodyGfx: Phaser.GameObjects.Graphics;
  private levelLabel: Phaser.GameObjects.Text;
  private rangeCircle: Phaser.GameObjects.Graphics;
  private rangeVisible: boolean = false;
  private highlightRing: Phaser.GameObjects.Graphics | null = null;
  private targetStrategy: (tower: ITower, enemies: IEnemy[]) => IEnemy | null;

  constructor(
    scene: Phaser.Scene,
    towerType: TowerType,
    gridX: number,
    gridY: number,
    pixelX: number,
    pixelY: number,
  ) {
    super(scene, pixelX, pixelY);
    this.id = `tower_${++towerIdCounter}_${Date.now()}`;
    this.towerType = towerType;
    this.definition = getTowerDefinition(towerType);
    this.baseStats = { ...this.definition.baseStats };
    this.gridX = gridX;
    this.gridY = gridY;
    this.pixelX = pixelX;
    this.pixelY = pixelY;

    // Cartoon tower body
    this.bodyGfx = scene.add.graphics();
    this.drawBody();
    this.add(this.bodyGfx);

    // Level badge
    this.levelLabel = scene.add.text(16, -17, '', {
      fontSize: '12px', fontFamily: 'monospace',
      color: '#FFD700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add(this.levelLabel);
    this.updateLevelVisual();

    // Range circle
    this.rangeCircle = scene.add.graphics();
    this.rangeCircle.setDepth(DEPTH.RANGE_CIRCLES);
    this.drawRangeCircle(false);

    this.targetStrategy = getTargetStrategy(this.definition.targetStrategy);
    this.setDepth(DEPTH.TOWERS);
    this.setSize(52, 52);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerdown', () => {
      EventBus.emit(EVENTS.TOWER_SELECTED, { tower: this });
    });

    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  // ─── Cartoon Body Drawing ────────────────────────

  private drawBody(): void {
    const g = this.bodyGfx;
    g.clear();
    const s = this.getBodySize();
    const color = this.definition.color;
    const dark = this.getDarkColor();

    switch (this.towerType) {
      case TowerType.ARROW:
        this.drawArrowBody(g, s, color, dark);
        break;
      case TowerType.MAGIC:
        this.drawMagicBody(g, s, color, dark);
        break;
      case TowerType.CANNON:
        this.drawCannonBody(g, s, color, dark);
        break;
      case TowerType.SLOW:
        this.drawSlowBody(g, s, color, dark);
        break;
    }
  }

  private getBodySize(): number {
    return 18 + this.level * 2;
  }

  private getDarkColor(): number {
    switch (this.towerType) {
      case TowerType.ARROW: return COLORS.ARROW_TOWER_DARK;
      case TowerType.MAGIC: return COLORS.MAGIC_TOWER_DARK;
      case TowerType.CANNON: return COLORS.CANNON_TOWER_DARK;
      case TowerType.SLOW: return COLORS.SLOW_TOWER_DARK;
    }
  }

  // Arrow: upward-pointing triangle (arrowhead shape)
  private drawArrowBody(g: Phaser.GameObjects.Graphics, s: number, c: number, d: number): void {
    // Shadow
    g.fillStyle(0x000000, 0.15);
    g.fillTriangle(2, -s + 2, -s + 2, s * 0.6 + 2, s - 2, s * 0.6 + 2);
    // Main triangle
    g.fillStyle(c, 1);
    g.fillTriangle(0, -s, -s, s * 0.6, s, s * 0.6);
    // Outline
    g.lineStyle(2, d, 1);
    g.beginPath();
    g.moveTo(0, -s); g.lineTo(-s, s * 0.6); g.lineTo(s, s * 0.6); g.closePath();
    g.strokePath();
    // Base platform
    g.fillStyle(d, 1);
    g.fillRoundedRect(-s - 2, s * 0.5, s * 2 + 4, 5, 2);
  }

  // Magic: diamond shape with sparkle
  private drawMagicBody(g: Phaser.GameObjects.Graphics, s: number, c: number, d: number): void {
    g.fillStyle(0x000000, 0.15);
    g.fillCircle(2, 2, s);
    g.fillStyle(c, 1);
    g.fillCircle(0, 0, s);
    g.lineStyle(2, d, 1);
    g.strokeCircle(0, 0, s);
    // Inner diamond
    const hs = s * 0.55;
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(-hs, -hs, hs * 2, hs * 2);
    g.lineStyle(1, 0xffffff, 0.6);
    g.strokeRect(-hs, -hs, hs * 2, hs * 2);
  }

  // Cannon: rounded hexagon/bulbous shape
  private drawCannonBody(g: Phaser.GameObjects.Graphics, s: number, c: number, d: number): void {
    g.fillStyle(0x000000, 0.15);
    g.fillCircle(2, 3, s + 3);
    g.fillStyle(c, 1);
    g.fillCircle(0, 0, s + 3);
    g.lineStyle(2, d, 1);
    g.strokeCircle(0, 0, s + 3);
    // Barrel indicator
    g.fillStyle(d, 1);
    g.fillRect(-3, -s - 6, 6, 10);
    g.lineStyle(1, d, 1);
    g.strokeRect(-3, -s - 6, 6, 10);
  }

  // Slow: snowflake-like hexagram
  private drawSlowBody(g: Phaser.GameObjects.Graphics, s: number, c: number, d: number): void {
    g.fillStyle(0x000000, 0.15);
    g.fillCircle(2, 2, s + 1);
    g.fillStyle(c, 1);
    g.fillCircle(0, 0, s + 1);
    g.lineStyle(2, d, 1);
    g.strokeCircle(0, 0, s + 1);
    // Inner snowflake lines
    g.lineStyle(1.5, 0xffffff, 0.5);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      g.beginPath();
      g.moveTo(Math.cos(angle) * s * 0.3, Math.sin(angle) * s * 0.3);
      g.lineTo(Math.cos(angle) * s * 0.8, Math.sin(angle) * s * 0.8);
      g.strokePath();
    }
  }

  // ─── Level ───────────────────────────────────────

  upgrade(): boolean {
    if (this.level >= MAX_TOWER_LEVEL) return false;
    this.level++;
    this.drawBody();
    this.updateLevelVisual();

    this.scene.tweens.add({
      targets: this, scaleX: 1.2, scaleY: 1.2,
      duration: 150, yoyo: true, ease: 'Back.easeOut',
    });
    return true;
  }

  getTotalInvestedCost(): number { return this.definition.cost * this.level; }
  getMaxEnchantmentSlots(): number {
    return this.definition.maxEnchantmentSlots + (this.level >= 3 ? 1 : 0);
  }

  private updateLevelVisual(): void {
    if (this.level > 1) {
      this.levelLabel.setText(`Lv${this.level}`);
      this.levelLabel.setVisible(true);
    } else {
      this.levelLabel.setVisible(false);
    }
  }

  // ─── Stats ───────────────────────────────────────

  getEffectiveStats(): TowerStats {
    const base = { ...this.baseStats };
    const mult = UPGRADE_MULTIPLIERS[this.level] || {};
    if (mult.damage) base.damage = Math.round(base.damage * mult.damage);
    if (mult.attackSpeed) base.attackSpeed = +(base.attackSpeed * mult.attackSpeed).toFixed(2);
    if (mult.range) base.range = Math.round(base.range * mult.range);
    for (const inst of this.enchantments) {
      const m = inst.definition.statModifiers;
      if (m.damage) base.damage += m.damage * inst.stackCount;
      if (m.attackSpeed) base.attackSpeed += m.attackSpeed * inst.stackCount * 0.7;
      if (m.range) base.range += m.range * inst.stackCount;
      if (m.areaRadius) base.areaRadius *= (1 + (m.areaRadius * inst.stackCount));
      if (m.slowAmount) base.slowAmount += m.slowAmount * inst.stackCount;
      if (m.slowDuration) base.slowDuration += m.slowDuration * inst.stackCount;
    }
    return base;
  }

  // ─── Enchantments ────────────────────────────────

  canAcceptEnchantment(enchantId: string): boolean {
    if (this.enchantments.length >= this.getMaxEnchantmentSlots()) return false;
    const def = getEnchantmentDefinition(enchantId);
    if (!def) return false;
    if (def.applicableTowerTypes.length > 0 &&
        !def.applicableTowerTypes.includes(this.towerType)) return false;
    return true;
  }

  getEnchantmentSlotCount(): number { return this.enchantments.length; }

  // ─── Combat ──────────────────────────────────────

  findTarget(enemies: IEnemy[]): IEnemy | null { return this.targetStrategy(this, enemies); }
  attack(target: IEnemy): void {
    this.lastAttackTime = this.scene.time.now;
    this.currentTarget = target;
    this.attackCount++;
  }
  getCooldownMs(): number { return 1000 / this.getEffectiveStats().attackSpeed; }
  isReady(): boolean { return this.scene.time.now - this.lastAttackTime >= this.getCooldownMs(); }

  // ─── Range Circle ────────────────────────────────

  showRange(visible: boolean): void { this.rangeVisible = visible; this.drawRangeCircle(visible); }
  getRangeVisible(): boolean { return this.rangeVisible; }

  private drawRangeCircle(visible: boolean): void {
    this.rangeCircle.clear();
    if (!visible) return;
    const stats = this.getEffectiveStats();
    this.rangeCircle.lineStyle(1.5, COLORS.TOWER_RANGE_CIRCLE, 0.25);
    this.rangeCircle.fillStyle(COLORS.TOWER_RANGE_CIRCLE, COLORS.TOWER_RANGE_ALPHA);
    this.rangeCircle.fillCircle(this.pixelX, this.pixelY, stats.range);
    this.rangeCircle.strokeCircle(this.pixelX, this.pixelY, stats.range);
  }

  refreshRangeCircle(): void { if (this.rangeVisible) this.drawRangeCircle(true); }

  // ─── Highlight ───────────────────────────────────

  setHighlight(enabled: boolean): void {
    if (enabled && !this.highlightRing) {
      this.highlightRing = this.scene.add.graphics();
      this.highlightRing.setDepth(DEPTH.TOWERS - 1);
      this.highlightRing.lineStyle(4, 0xFFD700, 0.8);
      this.highlightRing.strokeCircle(this.pixelX, this.pixelY, this.getBodySize() + 14);
      this.scene.tweens.add({
        targets: this.highlightRing, alpha: { from: 1, to: 0.3 },
        duration: 500, yoyo: true, repeat: -1,
      });
    } else if (!enabled && this.highlightRing) {
      this.scene.tweens.killTweensOf(this.highlightRing);
      this.highlightRing.destroy();
      this.highlightRing = null;
    }
  }

  destroy(fromScene?: boolean): void {
    this.rangeCircle.destroy();
    this.highlightRing?.destroy();
    super.destroy(fromScene);
  }
}
