import Phaser from 'phaser';
import { DEPTH, EVENTS, COLORS } from '../constants';
import type { Card } from '../types';
import { CardType } from '../types';
import { EventBus } from '../core/EventBus';

/**
 * CardRewardUI — 卡牌3选1奖励界面
 *
 * ★ 注意：交互区域（zones）直接添加在场景层级而非容器内，
 *   避免 Phaser Container 内多个交互对象互相冲突的问题。
 */
export class CardRewardUI {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Container | null = null;
  private zones: Phaser.GameObjects.Zone[] = [];
  private skipZone: Phaser.GameObjects.Zone | null = null;
  private selected: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    EventBus.on(EVENTS.CARD_REWARD_SHOW, (data: { cards: Card[] }) => this.show(data.cards));
  }

  private show(cards: Card[]): void {
    if (this.overlay) return;
    this.selected = false;
    this.zones = [];
    const { width: W, height: H } = this.scene.cameras.main;

    // ★ 暂停游戏
    this.scene.time.paused = true;

    // ── 视觉容器（不处理交互） ────────────────────────
    this.overlay = this.scene.add.container(0, 0).setDepth(DEPTH.OVERLAY_CONTENT);

    // 半透明底图（仅视觉，不响应点击）
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.5);
    backdrop.fillRect(0, 0, W, H);
    this.overlay.add(backdrop);

    // Title
    const title = this.scene.add.text(W / 2, 70, '🎴 选择一张卡牌', {
      fontSize: '30px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#FFD700', stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.overlay.add(title);
    this.scene.tweens.add({ targets: title, alpha: 1, y: 75, duration: 300 });

    // Subtitle hint
    const hint = this.scene.add.text(W / 2, 105, '点击卡牌添加到手牌 | 点击空白跳过', {
      fontSize: '12px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#888888', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setAlpha(0);
    this.overlay.add(hint);
    this.scene.tweens.add({ targets: hint, alpha: 1, duration: 400, delay: 200 });

    // ── 绘制卡牌 + 创建点击区（直接在场景层级） ──────
    const count = Math.min(cards.length, 3);
    const cardW = 190;
    const cardH = 240;
    const totalW = count * cardW + (count - 1) * 28;
    const startX = W / 2 - totalW / 2 + cardW / 2;
    const cardY = H / 2;

    for (let i = 0; i < count; i++) {
      const cx = startX + i * (cardW + 28);
      this.drawCard(cx, cardY, cardW, cardH, cards[i], i * 100);
    }

    // ── 空白区域点击跳过（场景层级zone，放在卡牌zone之前以降低优先级） ──
    this.skipZone = this.scene.add.zone(W / 2, H / 2, W, H)
      .setInteractive({ useHandCursor: false })
      .setDepth(DEPTH.OVERLAY_CONTENT - 1);
    this.skipZone.on('pointerdown', () => {
      if (!this.selected) this.close();
    });
  }

  private getIconChar(card: Card): string {
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

  private drawCard(x: number, y: number, w: number, h: number, card: Card, delay: number): void {
    const hw = w / 2, hh = h / 2;
    const isTower = card.type === CardType.TOWER;
    const borderColor = isTower ? 0x5BA0D9 : 0xC090E8;
    const bgColor = isTower ? 0x2A3A4E : 0x3A2A4E;
    const accentColor = isTower ? 0x3A5A7E : 0x5A3A7E;

    // Shadow
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(x - hw + 5, y - hh + 6, w, h, 16);
    shadow.setAlpha(0);
    this.overlay!.add(shadow);

    // Card body
    const bg = this.scene.add.graphics();
    bg.setAlpha(0);
    bg.fillStyle(bgColor, 0.95);
    bg.fillRoundedRect(x - hw, y - hh, w, h, 16);
    bg.fillStyle(accentColor, 0.4);
    bg.fillRoundedRect(x - hw + 2, y - hh + 2, w - 4, 50, { tl: 14, tr: 14, bl: 0, br: 0 });
    bg.lineStyle(2.5, borderColor, 0.9);
    bg.strokeRoundedRect(x - hw, y - hh, w, h, 16);
    this.overlay!.add(bg);

    this.scene.tweens.add({
      targets: [shadow, bg],
      alpha: { from: 0, to: 1 },
      duration: 350, delay, ease: 'Power2',
    });

    // Icon circle
    const iconCircle = this.scene.add.graphics().setAlpha(0);
    const circleColor = card.color || (isTower ? 0x5BA0D9 : 0xB07CD8);
    iconCircle.fillStyle(circleColor, 0.3);
    iconCircle.fillCircle(x, y - 50, 38);
    iconCircle.lineStyle(2, 0xFFFFFF, 0.2);
    iconCircle.strokeCircle(x, y - 50, 38);
    iconCircle.fillStyle(circleColor, 0.6);
    iconCircle.fillCircle(x, y - 50, 28);
    iconCircle.lineStyle(1.5, 0xFFFFFF, 0.3);
    iconCircle.strokeCircle(x, y - 50, 28);
    this.overlay!.add(iconCircle);
    this.scene.tweens.add({ targets: iconCircle, alpha: 1, duration: 300, delay: delay + 100 });

    // Icon emoji
    const iconText = this.scene.add.text(x, y - 50, this.getIconChar(card), {
      fontSize: '26px',
    }).setOrigin(0.5).setAlpha(0);
    this.overlay!.add(iconText);
    this.scene.tweens.add({
      targets: iconText, alpha: 1,
      scaleX: { from: 0, to: 1 }, scaleY: { from: 0, to: 1 },
      duration: 300, delay: delay + 150, ease: 'Back.easeOut',
    });

    // Cost/rarity badge
    const badgeColor = isTower ? 0xD4891A : 0x8B5AB8;
    const badgeIcon = isTower ? `💰${card.cost}` : '✦';
    const badgeBg = this.scene.add.graphics().setAlpha(0);
    badgeBg.fillStyle(badgeColor, 0.9);
    badgeBg.fillRoundedRect(x + hw - 55, y - hh + 8, 48, 22, 11);
    badgeBg.lineStyle(1, 0xFFFFFF, 0.2);
    badgeBg.strokeRoundedRect(x + hw - 55, y - hh + 8, 48, 22, 11);
    this.overlay!.add(badgeBg);
    this.scene.tweens.add({ targets: badgeBg, alpha: 1, duration: 200, delay: delay + 200 });

    const badgeText = this.scene.add.text(x + hw - 31, y - hh + 19, badgeIcon, {
      fontSize: '12px', fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);
    this.overlay!.add(badgeText);
    this.scene.tweens.add({ targets: badgeText, alpha: 1, duration: 200, delay: delay + 250 });

    // Name
    const name = this.scene.add.text(x, y + 20, card.name, {
      fontSize: '18px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#F5DEB3', stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setAlpha(0);
    this.overlay!.add(name);
    this.scene.tweens.add({ targets: name, alpha: 1, duration: 300, delay: delay + 200 });

    // Category label
    const catText = isTower ? '⚔ 防御塔' : '✨ 附魔';
    const cat = this.scene.add.text(x, y + 48, catText, {
      fontSize: '11px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#888899', stroke: '#000', strokeThickness: 1, align: 'center',
    }).setOrigin(0.5).setAlpha(0);
    this.overlay!.add(cat);
    this.scene.tweens.add({ targets: cat, alpha: 1, duration: 300, delay: delay + 250 });

    // Description
    const desc = card.description.length > 22
      ? card.description.slice(0, 20) + '…'
      : card.description;
    const descText = this.scene.add.text(x, y + 68, desc, {
      fontSize: '11px', fontFamily: 'Arial, sans-serif',
      color: '#AAAACC', stroke: '#000', strokeThickness: 1,
      align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5, 0).setAlpha(0);
    this.overlay!.add(descText);
    this.scene.tweens.add({ targets: descText, alpha: 1, duration: 300, delay: delay + 300 });

    // ── 点击区：直接在场景层级，高于遮罩深度 ──────────
    const zone = this.scene.add.zone(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH.OVERLAY_CONTENT + 1);
    this.zones.push(zone);

    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(x - hw, y - hh, w, h, 16);
      bg.fillStyle(accentColor, 0.3);
      bg.fillRoundedRect(x - hw + 2, y - hh + 2, w - 4, 50, { tl: 14, tr: 14, bl: 0, br: 0 });
      bg.lineStyle(3.5, 0xFFD700, 1);
      bg.strokeRoundedRect(x - hw, y - hh, w, h, 16);
      this.scene.tweens.add({
        targets: [shadow, bg, iconCircle, iconText, badgeBg, badgeText, name, cat, descText],
        y: '-=6', duration: 100,
      });
    });

    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 0.95);
      bg.fillRoundedRect(x - hw, y - hh, w, h, 16);
      bg.fillStyle(accentColor, 0.4);
      bg.fillRoundedRect(x - hw + 2, y - hh + 2, w - 4, 50, { tl: 14, tr: 14, bl: 0, br: 0 });
      bg.lineStyle(2.5, borderColor, 0.9);
      bg.strokeRoundedRect(x - hw, y - hh, w, h, 16);
      this.scene.tweens.add({
        targets: [shadow, bg, iconCircle, iconText, badgeBg, badgeText, name, cat, descText],
        y: '+=6', duration: 100,
      });
    });

    zone.on('pointerdown', () => {
      if (this.selected) return;
      this.selected = true;

      // Flash effect on select
      const flash = this.scene.add.graphics();
      flash.fillStyle(0xFFFFFF, 0.6);
      flash.fillRoundedRect(x - hw, y - hh, w, h, 16);
      flash.setDepth(DEPTH.OVERLAY_CONTENT + 2);
      this.overlay!.add(flash);
      this.scene.tweens.add({
        targets: flash, alpha: 0, duration: 200,
        onComplete: () => flash.destroy(),
      });

      EventBus.emit(EVENTS.CARD_REWARD_SELECTED, { card });
      // ★ 立即关闭，不能用 delayedCall — 此时 time.paused = true 导致延迟任务永不触发
      this.close();
    });
  }

  private close(): void {
    // ★ 恢复游戏
    this.scene.time.paused = false;

    // 销毁场景层级的交互zone
    for (const z of this.zones) {
      z.destroy();
    }
    this.zones = [];
    if (this.skipZone) {
      this.skipZone.destroy();
      this.skipZone = null;
    }

    this.overlay?.destroy();
    this.overlay = null;
    this.selected = false;
  }

  hide(): void { this.close(); }

  destroy(): void {
    this.close();
    EventBus.off(EVENTS.CARD_REWARD_SHOW, this.show, this);
  }
}
