import Phaser from 'phaser';
import { DEPTH, EVENTS, COLORS } from '../constants';
import { EventBus } from '../core/EventBus';
import { saveCampaignProgress, getNextLevel } from '../core/SaveManager';

export class GameOverOverlay {
  private scene: Phaser.Scene;
  private mode: string;
  private levelId: string;
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, mode: string, levelId: string) {
    this.scene = scene;
    this.mode = mode;
    this.levelId = levelId;
    EventBus.on(EVENTS.GAME_OVER, (data: { victory: boolean }) => this.show(data.victory));
  }

  private show(victory: boolean): void {
    if (this.overlay) return;
    const { width: W, height: H } = this.scene.cameras.main;
    this.overlay = this.scene.add.container(0, 0).setDepth(DEPTH.OVERLAY_CONTENT);

    // Darken backdrop with gradient-like effect
    const bd = this.scene.add.graphics();
    bd.fillStyle(0x000000, 0.7);
    bd.fillRect(0, 0, W, H);
    this.overlay.add(bd);

    // Save campaign progress on victory
    if (victory && this.mode === 'campaign') {
      saveCampaignProgress(this.levelId);
    }

    // Center card
    const cardW = 460, cardH = 330;
    const cx = W / 2, cy = H / 2;
    const card = this.scene.add.graphics();
    // Shadow
    card.fillStyle(0x000000, 0.3);
    card.fillRoundedRect(cx - cardW / 2 + 6, cy - cardH / 2 + 8, cardW, cardH, 24);
    // Main bg
    const bgColor = victory ? 0x1A2A10 : 0x2A1010;
    card.fillStyle(bgColor, 0.95);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 24);
    // Top accent
    const accentColor = victory ? 0x3A6A20 : 0x5A2020;
    card.fillStyle(accentColor, 0.5);
    card.fillRoundedRect(cx - cardW / 2 + 2, cy - cardH / 2 + 2, cardW - 4, 60, { tl: 22, tr: 22, bl: 0, br: 0 });
    // Border glow
    const borderColor = victory ? 0x5BA838 : 0xE05050;
    card.lineStyle(3, borderColor, 0.9);
    card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 24);
    card.lineStyle(1, 0xFFFFFF, 0.1);
    card.strokeRoundedRect(cx - cardW / 2 + 3, cy - cardH / 2 + 3, cardW - 6, cardH - 6, 21);
    this.overlay.add(card);

    // Entrance animation for card
    card.setScale(0.5);
    card.setAlpha(0);
    this.scene.tweens.add({
      targets: card,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 350, ease: 'Back.easeOut',
    });

    // Emoji
    const emoji = this.scene.add.text(cx, cy - 95, victory ? '🎉' : '💀', {
      fontSize: '52px',
    }).setOrigin(0.5).setAlpha(0);
    this.overlay.add(emoji);
    this.scene.tweens.add({ targets: emoji, alpha: 1, y: cy - 95, duration: 400, delay: 200 });

    // Title
    const titleText = victory ? '胜 利 ！' : '防 线 失 守';
    const titleColor = victory ? '#5BA838' : '#E05050';
    const title = this.scene.add.text(cx, cy - 45, titleText, {
      fontSize: '38px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: titleColor, stroke: '#000', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.overlay.add(title);
    this.scene.tweens.add({ targets: title, alpha: 1, duration: 300, delay: 350 });

    // Subtitle
    const subText = victory ? '所有敌人已被消灭！' : '敌人突破了防线...';
    const subtitle = this.scene.add.text(cx, cy - 5, subText, {
      fontSize: '14px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#AAAAAA', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);
    this.overlay.add(subtitle);
    this.scene.tweens.add({ targets: subtitle, alpha: 1, duration: 300, delay: 500 });

    // Decorative horizontal line
    const line = this.scene.add.graphics();
    line.lineStyle(1, 0xFFFFFF, 0.1);
    line.beginPath();
    line.moveTo(cx - 100, cy + 15); line.lineTo(cx + 100, cy + 15);
    line.strokePath();
    line.setAlpha(0);
    this.overlay.add(line);
    this.scene.tweens.add({ targets: line, alpha: 1, duration: 300, delay: 550 });

    // ── Buttons (inside card, centered) ──
    const btnW = 125, btnH = 40, btnY = cy + 65;
    const gap = 16;

    this.scene.time.delayedCall(650, () => {
      const hasNext = victory && this.mode === 'campaign' ? !!getNextLevel(this.levelId) : false;
      const btnCount = hasNext ? 3 : 2;
      const totalW = btnCount * btnW + (btnCount - 1) * gap;
      const startX = cx - totalW / 2 + btnW / 2;

      // "关卡列表"
      this.makeBtn(startX, btnY, btnW, btnH, '📋 关卡列表', 0x3A6A9E, 0x4A8ABE, () => {
        this.hide();
        this.scene.scene.start('LevelSelectScene', { mode: this.mode });
      });

      // "重新开始"
      this.makeBtn(startX + btnW + gap, btnY, btnW, btnH, '🔄 重新开始',
        victory ? 0x4A8E30 : 0xC08030,
        victory ? 0x5AAE40 : 0xE0A040,
        () => { EventBus.emit(EVENTS.GAME_RESTART, {}); },
      );

      // "下一关" (仅战役模式通关且存在下一关)
      if (hasNext) {
        this.makeBtn(startX + (btnW + gap) * 2, btnY, btnW, btnH, '▶ 下一关', 0x3A8A4A, 0x4AAA5A, () => {
          this.hide();
          this.scene.scene.start('GameScene', { levelId: getNextLevel(this.levelId)!, mode: this.mode });
        });
      }
    });
  }

  private makeBtn(x: number, y: number, w: number, h: number, label: string, color: number, hoverColor: number, cb: () => void): void {
    const bg = this.scene.add.graphics();
    const draw = (fill: number) => {
      bg.clear();
      bg.fillStyle(0x000000, 0.2);
      bg.fillRoundedRect(x - w / 2, y - h / 2 + 2, w, h, 12);
      bg.fillStyle(fill, 0.9);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      bg.lineStyle(1, 0xFFFFFF, 0.15);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    };
    draw(color);

    bg.setAlpha(0);
    this.scene.tweens.add({ targets: bg, alpha: 1, duration: 200 });

    this.overlay!.add(bg);

    const t = this.scene.add.text(x, y, label, {
      fontSize: '14px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, duration: 200 });

    this.overlay!.add(t);

    t.on('pointerover', () => { draw(hoverColor); this.scene.tweens.add({ targets: t, scaleX: 1.05, scaleY: 1.05, duration: 60 }); });
    t.on('pointerout', () => { draw(color); this.scene.tweens.add({ targets: t, scaleX: 1, scaleY: 1, duration: 60 }); });
    t.on('pointerdown', cb);
  }

  hide(): void { this.overlay?.destroy(); this.overlay = null; }
  destroy(): void { this.hide(); }
}
