import Phaser from 'phaser';
import { COLORS, DEPTH } from '../constants';
import type { Card as CardData } from '../types';
import { CardType } from '../types';

export class CardSprite extends Phaser.GameObjects.Container {
  readonly cardData: CardData;
  index: number = -1;
  private bg: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Text;
  private nameLabel: Phaser.GameObjects.Text;
  private costBadge: Phaser.GameObjects.Graphics;
  private badgeText: Phaser.GameObjects.Text;
  private rarityDot: Phaser.GameObjects.Graphics;
  private selected: boolean = false;
  private startY: number;

  static readonly WIDTH = 104;
  static readonly HEIGHT = 130;

  constructor(scene: Phaser.Scene, x: number, y: number, card: CardData) {
    super(scene, x, y);
    this.cardData = card;
    this.startY = y;

    this.bg = scene.add.graphics();
    this.add(this.bg);

    // Rarity dot (top-left)
    this.rarityDot = scene.add.graphics();
    this.add(this.rarityDot);

    // Icon (emoji)
    this.icon = scene.add.text(0, -18, this.getIconChar(card), {
      fontSize: '28px',
    }).setOrigin(0.5);
    this.add(this.icon);

    // Name label
    this.nameLabel = scene.add.text(0, 28, this.truncate(card.name, 8), {
      fontSize: '12px',
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#3A2E1E',
      align: 'center',
      stroke: '#FFFFFF',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    this.add(this.nameLabel);

    // Cost badge (top-right)
    const isEnchant = card.type === CardType.ENCHANTMENT;
    const costStr = isEnchant ? '✦' : String(card.cost);

    this.costBadge = scene.add.graphics();
    this.add(this.costBadge);

    this.badgeText = scene.add.text(
      CardSprite.WIDTH / 2 - 14, -CardSprite.HEIGHT / 2 + 10, costStr, {
        fontSize: isEnchant ? '12px' : '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5);
    this.add(this.badgeText);

    this.drawBackground(false, false);
    this.setSize(CardSprite.WIDTH, CardSprite.HEIGHT);
    this.setInteractive({ useHandCursor: true });
    this.setDepth(DEPTH.CARD_HAND);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  private getIconChar(card: CardData): string {
    if (card.type === CardType.TOWER && card.towerType) {
      switch (card.towerType) {
        case 'ARROW' as any: return '🏹';
        case 'MAGIC' as any: return '🔮';
        case 'CANNON' as any: return '💣';
        case 'SLOW' as any: return '❄️';
        default: return '🛡';
      }
    }
    if (card.type === CardType.ENCHANTMENT && card.enchantmentId) {
      switch (card.enchantmentId) {
        case 'poison': return '☠️';
        case 'multishot': return '🏹';
        case 'frost': return '🧊';
        case 'splash': return '💥';
        case 'stun': return '⚡';
        default: return '✨';
      }
    }
    return '🃏';
  }

  private getRarityColor(): number {
    const rarity = (this.cardData as any).rarity as string || 'common';
    switch (rarity) {
      case 'rare': return 0x4488FF;
      case 'epic': return 0xAA44FF;
      case 'boss': return 0xFF4444;
      default: return 0x88CC44; // common
    }
  }

  private getBorderColor(): number {
    if (this.cardData.type === CardType.TOWER) {
      return COLORS.CARD_BORDER_TOWER;
    }
    return COLORS.CARD_BORDER_ENCHANT;
  }

  private truncate(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  private drawBackground(hovered: boolean, sel: boolean): void {
    const g = this.bg;
    g.clear();
    const w = CardSprite.WIDTH, h = CardSprite.HEIGHT;
    const hw = w / 2, hh = h / 2;
    const bodyY = -hh;
    const borderColor = sel ? COLORS.CARD_SELECTED_GLOW : this.getBorderColor();
    const isEnchant = this.cardData.type === CardType.ENCHANTMENT;

    // Shadow (deeper when selected)
    g.fillStyle(0x000000, sel ? 0.3 : 0.15);
    g.fillRoundedRect(-hw + 3, bodyY + 4, w, h, 12);

    // Card body — gradient-like effect using layered rects
    const bodyColor = isEnchant ? 0xF8F0FF : 0xFFFFFF;
    const accentColor = isEnchant ? 0xE8D8FF : 0xD8ECFF;

    // Main body
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(-hw, bodyY, w, h, 12);

    // Accent gradient stripe at top
    g.fillStyle(accentColor, 0.6);
    g.fillRoundedRect(-hw + 1, bodyY + 1, w - 2, 28, { tl: 11, tr: 11, bl: 0, br: 0 });

    // Bottom accent stripe
    g.fillStyle(accentColor, 0.3);
    g.fillRoundedRect(-hw + 1, bodyY + h - 24, w - 2, 23, { tl: 0, tr: 0, bl: 11, br: 11 });

    // Border
    g.lineStyle(sel ? 3 : 1.5, borderColor, 1);
    g.strokeRoundedRect(-hw, bodyY, w, h, 12);

    // Inner glow when selected
    if (sel) {
      g.lineStyle(6, borderColor, 0.2);
      g.strokeRoundedRect(-hw - 2, bodyY - 2, w + 4, h + 4, 14);
      // Gold glow
      g.lineStyle(2, COLORS.CARD_SELECTED_GLOW, 0.5);
      g.strokeRoundedRect(-hw - 1, bodyY - 1, w + 2, h + 2, 13);
    }

    // Hover highlight
    if (hovered && !sel) {
      g.fillStyle(0xFFFFFF, 0.3);
      g.fillRoundedRect(-hw + 3, bodyY + 3, w - 6, h - 6, 10);
    }

    // ── Cost badge (top-right circle) ────
    this.costBadge.clear();
    const bx = CardSprite.WIDTH / 2 - 14;
    const by = bodyY + 10;
    const badgeR = 12;
    if (isEnchant) {
      // Purple badge for enchantments
      this.costBadge.fillStyle(0x8B5AB8, 1);
      this.costBadge.fillCircle(bx, by, badgeR);
      this.costBadge.fillStyle(0xFFFFFF, 0.2);
      this.costBadge.fillCircle(bx - 2, by - 2, badgeR * 0.6);
      this.costBadge.lineStyle(1.5, 0xAA77DD, 0.8);
      this.costBadge.strokeCircle(bx, by, badgeR);
    } else {
      // Gold badge for tower cost
      this.costBadge.fillStyle(0xD4891A, 1);
      this.costBadge.fillCircle(bx, by, badgeR);
      this.costBadge.fillStyle(0xFFD700, 0.3);
      this.costBadge.fillCircle(bx - 2, by - 2, badgeR * 0.6);
      this.costBadge.lineStyle(1.5, 0xFFD700, 0.6);
      this.costBadge.strokeCircle(bx, by, badgeR);
    }

    // ── Rarity dot ──────────────────────
    this.rarityDot.clear();
    const rarityColor = this.getRarityColor();
    this.rarityDot.fillStyle(rarityColor, 1);
    this.rarityDot.fillCircle(-hw + 10, bodyY + 10, 4);
    this.rarityDot.fillStyle(0xFFFFFF, 0.4);
    this.rarityDot.fillCircle(-hw + 9, bodyY + 9, 2);

    // 保持 badge 文字与圆圈同步
    this.badgeText.setPosition(bx, by);
  }

  setHovered(h: boolean): void {
    this.drawBackground(h, this.selected);
    if (h && !this.selected) {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: 1.08 },
        scaleY: { from: 1, to: 1.08 },
        y: this.startY - 6,
        duration: 100,
        ease: 'Power2',
      });
    } else if (!h && !this.selected) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        y: this.startY,
        duration: 100,
        ease: 'Power2',
      });
    }
  }

  setSelected(s: boolean): void {
    this.selected = s;
    this.drawBackground(false, s);
    if (s) {
      this.scene.tweens.add({
        targets: this,
        y: this.startY - 18,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 150,
        ease: 'Back.easeOut',
      });
    } else {
      this.scene.tweens.add({
        targets: this,
        y: this.startY,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2',
      });
    }
  }

  get isSelected(): boolean { return this.selected; }
}
