import Phaser from 'phaser';

export class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeSelectScene' });
  }

  create(): void {
    const { width: W, height: H } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1A1A2E, 0x1A1A2E, 0x2A1A1A, 0x2A1A1A, 1);
    bg.fillRect(0, 0, W, H);

    // Title
    this.add.text(W / 2, H * 0.18, '选择模式', {
      fontSize: '36px',
      fontFamily: 'Arial, sans-serif',
      color: '#F5DEB3',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Back
    const backBtn = this.add.text(24, 20, '← 返回', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#9999AA',
      stroke: '#000',
      strokeThickness: 2,
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#CCCCDD'));
    backBtn.on('pointerout', () => backBtn.setColor('#9999AA'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // ─── Campaign Mode Card ──────────────────────────
    this.drawModeCard(
      W / 2, H * 0.42, 400, 150,
      '⚔️ 生涯模式',
      '按顺序挑战所有关卡，逐步解锁\n打通前一关才能挑战下一关',
      0x5BA0D9,
      () => this.scene.start('LevelSelectScene', { mode: 'campaign' }),
    );

    // ─── Normal Mode Card ────────────────────────────
    this.drawModeCard(
      W / 2, H * 0.68, 400, 150,
      '🎯 普通模式',
      '自由选择任何已解锁的关卡\n随意练习、刷资源、挑战高分',
      0x6DB840,
      () => this.scene.start('LevelSelectScene', { mode: 'normal' }),
    );
  }

  private drawModeCard(
    x: number, y: number, w: number, h: number,
    title: string, desc: string,
    color: number,
    onClick: () => void,
  ): void {
    const hw = w / 2, hh = h / 2;
    const g = this.add.graphics();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x - hw + 3, y - hh + 4, w, h, 16);

    // Body
    g.fillStyle(0x2A2A3A, 0.92);
    g.fillRoundedRect(x - hw, y - hh, w, h, 16);

    // Left accent
    g.fillStyle(color, 0.8);
    g.fillRect(x - hw, y - hh, 6, h);

    // Border
    g.lineStyle(2, color, 0.6);
    g.strokeRoundedRect(x - hw, y - hh, w, h, 16);

    // Title
    this.add.text(x - hw + 24, y - hh + 18, title, {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#F5DEB3',
      stroke: '#000',
      strokeThickness: 2,
    });

    // Description
    this.add.text(x - hw + 24, y - 8, desc, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#AAAACC',
      lineSpacing: 4,
    });

    // Click zone
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(x - hw + 3, y - hh + 4, w, h, 16);
      g.fillStyle(0x3A3A4A, 0.95);
      g.fillRoundedRect(x - hw, y - hh, w, h, 16);
      g.fillStyle(color, 0.8);
      g.fillRect(x - hw, y - hh, 6, h);
      g.lineStyle(3, color, 0.9);
      g.strokeRoundedRect(x - hw, y - hh, w, h, 16);
    });
    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(x - hw + 3, y - hh + 4, w, h, 16);
      g.fillStyle(0x2A2A3A, 0.92);
      g.fillRoundedRect(x - hw, y - hh, w, h, 16);
      g.fillStyle(color, 0.8);
      g.fillRect(x - hw, y - hh, 6, h);
      g.lineStyle(2, color, 0.6);
      g.strokeRoundedRect(x - hw, y - hh, w, h, 16);
    });
    zone.on('pointerdown', onClick);
  }
}
