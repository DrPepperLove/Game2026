import Phaser from 'phaser';
import { DEPTH, EVENTS, COLORS } from '../constants';
import type { Card } from '../types';
import { CardType } from '../types';
import { CardSprite } from '../entities/CardSprite';
import { EventBus } from '../core/EventBus';
import { getTowerDefinition } from '../data/TowerRegistry';
import { getEnchantmentDefinition } from '../data/EnchantmentRegistry';

/**
 * CardHandUI — 手牌区域 + 底部信息条（不遮挡地图）
 *
 * 布局：
 *   地图区域 ……
 *   ─────────────────────  (y ≈ height - 105)
 *   卡牌手牌 (130px)
 *   ─────────────────────  (y ≈ height - 25)
 *   选卡信息条 (28px)        ← 仅在选中卡牌时出现
 *   ─────────────────────  (y = height)
 */
export class CardHandUI {
  private scene: Phaser.Scene;
  private sprites: CardSprite[] = [];
  private selectedIndex: number = -1;
  private infoStrip: Phaser.GameObjects.Container | null = null;

  // Layout constants
  private static readonly CARD_Y_OFFSET = 105;  // cards center from bottom
  private static readonly STRIP_HEIGHT = 28;     // info strip height
  private static readonly STRIP_Y_OFFSET = 14;   // strip center from bottom

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.listen();
  }

  private listen(): void {
    EventBus.on(EVENTS.HAND_CHANGED, (data: { hand: Card[] }) => {
      this.selectedIndex = -1;
      this.hideInfoStrip();
      this.render(data.hand);
    });
  }

  // ─── Rendering ────────────────────────────────────

  render(hand: readonly Card[]): void {
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
    this.sprites = [];
    this.hideInfoStrip();

    if (hand.length === 0) return;

    const { width, height } = this.scene.cameras.main;
    const totalWidth = hand.length * CardSprite.WIDTH + (hand.length - 1) * 6;
    const startX = width / 2 - totalWidth / 2 + CardSprite.WIDTH / 2;
    // ★ 卡牌位置上移，给底部信息条留空间
    const y = height - CardHandUI.CARD_Y_OFFSET;

    for (let i = 0; i < hand.length; i++) {
      const x = startX + i * (CardSprite.WIDTH + 6);
      const sprite = new CardSprite(this.scene, x, y, hand[i]);
      sprite.index = i;

      sprite.on('pointerover', () => {
        if (sprite.index !== this.selectedIndex) {
          sprite.setHovered(true);
        }
      });

      sprite.on('pointerout', () => {
        sprite.setHovered(false);
      });

      sprite.on('pointerdown', () => {
        this.onCardClicked(sprite);
      });

      this.sprites.push(sprite);
    }
  }

  // ─── Card Click ───────────────────────────────────

  private onCardClicked(sprite: CardSprite): void {
    const index = sprite.index;

    if (this.selectedIndex === index) {
      this.deslectAll();
      this.hideInfoStrip();
      EventBus.emit(EVENTS.CARD_DESELECTED, {});
      return;
    }

    this.deslectAll();
    this.selectedIndex = index;
    sprite.setSelected(true);
    this.showInfoStrip(sprite);

    EventBus.emit(EVENTS.CARD_SELECTED, {
      card: sprite.cardData,
      index,
    });
  }

  // ─── Bottom Info Strip ────────────────────────────
  //  完全在卡牌下方，不侵占地图任何像素

  private showInfoStrip(sprite: CardSprite): void {
    this.hideInfoStrip();

    const card = sprite.cardData;
    const { width: sw, height: sh } = this.scene.cameras.main;
    const stripY = sh - CardHandUI.STRIP_Y_OFFSET;

    this.infoStrip = this.scene.add.container(sw / 2, stripY);
    this.infoStrip.setDepth(DEPTH.PANEL);

    // Full-width background — warm tone matching cartoon palette
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x3A2E1E, 0.94);
    bg.fillRoundedRect(-sw / 2, -CardHandUI.STRIP_HEIGHT / 2, sw, CardHandUI.STRIP_HEIGHT, 0);
    bg.lineStyle(1, card.type === CardType.TOWER
      ? COLORS.CARD_BORDER_TOWER : COLORS.CARD_BORDER_ENCHANT, 0.5);
    bg.beginPath();
    bg.moveTo(-sw / 2, -CardHandUI.STRIP_HEIGHT / 2);
    bg.lineTo(sw / 2, -CardHandUI.STRIP_HEIGHT / 2);
    bg.strokePath();
    this.infoStrip.add(bg);

    // Left side: type badge + name + key info (single line)
    const typeIcon = card.type === CardType.TOWER ? '🛡' : '✨';
    let leftText = `${typeIcon} ${card.name} — ${card.description}`;

    // Truncate if too long (rough: ~55 chars at 11px font for 800px width)
    if (leftText.length > 50) {
      leftText = leftText.substring(0, 47) + '…';
    }

    const infoText = this.scene.add.text(
      -sw / 2 + 14, 0, leftText,
      {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#dddddd',
        stroke: '#000000',
        strokeThickness: 1,
      },
    ).setOrigin(0, 0.5);
    this.infoStrip.add(infoText);

    // Right side: sell button
    const sellValue = card.type === CardType.TOWER ? Math.ceil(card.cost * 0.5) : 1;
    const sellX = sw / 2 - 80;

    const sellBg = this.scene.add.graphics();
    sellBg.fillStyle(0x553322, 0.9);
    sellBg.fillRoundedRect(sellX - 38, -12, 76, 24, 4);
    this.infoStrip.add(sellBg);

    const sellText = this.scene.add.text(sellX, 0, `💰出售 返${sellValue}`, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ddaa66',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.infoStrip.add(sellText);

    sellText.setInteractive({ useHandCursor: true });
    sellText.on('pointerover', () => {
      sellBg.clear();
      sellBg.fillStyle(0x774422, 1);
      sellBg.fillRoundedRect(sellX - 38, -12, 76, 24, 4);
      sellText.setColor('#ffcc88');
    });
    sellText.on('pointerout', () => {
      sellBg.clear();
      sellBg.fillStyle(0x553322, 0.9);
      sellBg.fillRoundedRect(sellX - 38, -12, 76, 24, 4);
      sellText.setColor('#ddaa66');
    });
    sellText.on('pointerdown', () => {
      EventBus.emit(EVENTS.CARD_SELL, {
        card,
        index: this.selectedIndex,
        value: sellValue,
      });
    });
  }

  private hideInfoStrip(): void {
    if (this.infoStrip) {
      this.infoStrip.destroy();
      this.infoStrip = null;
    }
  }

  // ─── Selection management ────────────────────────

  private deslectAll(): void {
    for (const s of this.sprites) {
      if (s.isSelected) s.setSelected(false);
    }
    this.selectedIndex = -1;
  }

  removeCardAt(index: number): void {
    if (index < 0 || index >= this.sprites.length) return;
    this.sprites[index].destroy();
    this.sprites.splice(index, 1);
    this.selectedIndex = -1;
    this.hideInfoStrip();
  }

  getSelectedCard(): Card | null {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.sprites.length) return null;
    return this.sprites[this.selectedIndex].cardData;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  clearSelection(): void {
    this.deslectAll();
    this.hideInfoStrip();
  }

  destroy(): void {
    this.hideInfoStrip();
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
    this.sprites = [];
  }
}
