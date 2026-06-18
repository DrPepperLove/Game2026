import Phaser from 'phaser';
import { DEPTH, EVENTS, COLORS } from '../constants';
import type { Card } from '../types';
import { CardType } from '../types';
import { EventBus } from '../core/EventBus';

const CARD_W = 80;
const CARD_H = 100;

/**
 * HandReplaceUI — 手牌替换选择界面
 *
 * ★ 交互zone直接放在场景层级，避免Container内交互冲突
 */
export class HandReplaceUI {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Container | null = null;
  private pendingCard: Card | null = null;
  private zones: Phaser.GameObjects.Zone[] = [];
  private backdropZone: Phaser.GameObjects.Zone | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    EventBus.on(EVENTS.HAND_REPLACE_SHOW, this.onShow, this);
  }

  private onShow = (data: { newCard: Card; hand: Card[] }): void => {
    if (this.overlay) return;
    this.pendingCard = data.newCard;
    this.zones = [];
    const { width: W, height: H } = this.scene.cameras.main;

    // ── 视觉容器 ──────────────────────────────────────
    this.overlay = this.scene.add.container(0, 0).setDepth(DEPTH.OVERLAY_CONTENT);

    // Darken backdrop (仅视觉)
    const bd = this.scene.add.graphics();
    bd.fillStyle(0x000000, 0.55);
    bd.fillRect(0, 0, W, H);
    this.overlay.add(bd);

    // Title
    this.overlay.add(this.scene.add.text(W / 2, H / 2 - 90, '🃏 手牌已满 — 选择要替换的卡牌', {
      fontSize: '18px', fontFamily: 'Arial, sans-serif',
      color: '#F5DEB3', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5));

    // "New card" label
    this.overlay.add(this.scene.add.text(W / 2 - 100, H / 2 - 60, '新卡 →', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif',
      color: '#FFD700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(1, 0.5));

    // Draw the new card (highlighted)
    this.drawMiniCard(W / 2 - 25, H / 2 - 55, data.newCard, true, -1);

    // Draw current hand cards
    const totalW = data.hand.length * (CARD_W + 8) - 8;
    const startX = W / 2 - totalW / 2 + CARD_W / 2;
    const cardY = H / 2 + 30;

    for (let i = 0; i < data.hand.length; i++) {
      const cx = startX + i * (CARD_W + 8);
      this.drawMiniCard(cx, cardY, data.hand[i], false, i);
    }

    // ── 跳过按钮（在容器内，也是交互的 ─ 但text本身就可以响应交互）
    const skipBtn = this.scene.add.text(W / 2, H / 2 + 120, '⏭ 跳过（暂存新卡）', {
      fontSize: '14px', fontFamily: 'Arial, sans-serif',
      color: '#9999AA', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerover', () => skipBtn.setColor('#CCCCDD'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#9999AA'));
    skipBtn.on('pointerdown', () => this.skip());
    this.overlay.add(skipBtn);

    // ── 空白区域点击跳过（场景层级zone） ──────────────
    this.backdropZone = this.scene.add.zone(W / 2, H / 2, W, H)
      .setInteractive({ useHandCursor: false })
      .setDepth(DEPTH.OVERLAY_CONTENT - 1);
    this.backdropZone.on('pointerdown', () => this.skip());
  };

  private drawMiniCard(
    x: number, y: number, card: Card,
    isNew: boolean, handIndex: number,
  ): void {
    const hw = CARD_W / 2, hh = CARD_H / 2;
    const isTower = card.type === CardType.TOWER;
    const borderColor = isNew ? 0xFFD700 : (isTower ? 0x5BA0D9 : 0xC090E8);
    const bgColor = isNew ? 0x5A4A2E : (isTower ? 0x3A4A5E : 0x4A3A5E);

    // Shadow
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillRoundedRect(x - hw + 3, y - hh + 3, CARD_W, CARD_H, 8);
    this.overlay!.add(shadow);

    // Card body
    const g = this.scene.add.graphics();
    g.fillStyle(bgColor, 0.95);
    g.fillRoundedRect(x - hw, y - hh, CARD_W, CARD_H, 8);
    g.lineStyle(isNew ? 3 : 2, borderColor, 1);
    g.strokeRoundedRect(x - hw, y - hh, CARD_W, CARD_H, 8);
    this.overlay!.add(g);

    // Name
    const name = card.name.length > 5 ? card.name.slice(0, 4) + '…' : card.name;
    this.overlay!.add(this.scene.add.text(x, y - hh + 18, name, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif',
      color: '#F5DEB3', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5));

    // Icon
    const icon = isTower ? '🏗️' : '✨';
    this.overlay!.add(this.scene.add.text(x, y + 2, icon, {
      fontSize: '20px',
    }).setOrigin(0.5));

    // Cost
    const costStr = isTower ? `💰${card.cost}` : '';
    this.overlay!.add(this.scene.add.text(x, y + hh - 18, costStr, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif',
      color: '#FFD700', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5));

    // Clickable zone (for existing hand cards only) — 场景层级
    if (handIndex >= 0) {
      const zone = this.scene.add.zone(x, y, CARD_W, CARD_H)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH.OVERLAY_CONTENT + 1);
      this.zones.push(zone);

      zone.on('pointerover', () => {
        g.clear();
        g.fillStyle(bgColor, 1);
        g.fillRoundedRect(x - hw, y - hh, CARD_W, CARD_H, 8);
        g.lineStyle(3, 0xFFD700, 1);
        g.strokeRoundedRect(x - hw, y - hh, CARD_W, CARD_H, 8);
      });
      zone.on('pointerout', () => {
        g.clear();
        g.fillStyle(bgColor, 0.95);
        g.fillRoundedRect(x - hw, y - hh, CARD_W, CARD_H, 8);
        g.lineStyle(2, borderColor, 1);
        g.strokeRoundedRect(x - hw, y - hh, CARD_W, CARD_H, 8);
      });
      zone.on('pointerdown', () => {
        if (this.pendingCard) {
          EventBus.emit(EVENTS.HAND_REPLACE_DONE, {
            handIndex,
            newCard: this.pendingCard,
          });
          this.close();
        }
      });
    }
  }

  /** 如果点击跳过：将新卡放入暂存区 */
  private skip(): void {
    if (this.pendingCard) {
      EventBus.emit(EVENTS.HAND_REPLACE_DONE, {
        handIndex: -1,  // -1 = skip, keep in overflow
        newCard: this.pendingCard,
      });
    }
    this.close();
  }

  private close(): void {
    // 销毁场景层级zone
    for (const z of this.zones) {
      z.destroy();
    }
    this.zones = [];
    if (this.backdropZone) {
      this.backdropZone.destroy();
      this.backdropZone = null;
    }

    this.overlay?.destroy();
    this.overlay = null;
    this.pendingCard = null;
  }

  destroy(): void {
    this.close();
    EventBus.off(EVENTS.HAND_REPLACE_SHOW, this.onShow, this);
  }
}
