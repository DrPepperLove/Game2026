import Phaser from 'phaser';

/**
 * MenuScene — 主菜单场景
 * 显示游戏标题和开始按钮
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 标题
    this.add.text(width / 2, height / 3, '幻 阵', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#e0d8c0',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 70, 'Card Tower Defense', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#8888aa',
    }).setOrigin(0.5);

    // 开始按钮
    const startBtn = this.add.text(width / 2, height / 2 + 80, '[ 开 始 游 戏 ]', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#4488ff',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#66aaff'));
    startBtn.on('pointerout', () => startBtn.setColor('#4488ff'));
    startBtn.on('pointerdown', () => {
      this.scene.start('ModeSelectScene');
    });

    // 版本信息
    this.add.text(width / 2, height - 40, 'P0 Prototype v0.1.0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#555566',
    }).setOrigin(0.5);
  }
}
