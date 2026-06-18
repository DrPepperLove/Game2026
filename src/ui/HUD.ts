import Phaser from 'phaser';
import { DEPTH, EVENTS, COLORS } from '../constants';
import { GamePhase } from '../types';
import type { PlayerResources } from '../types';
import { EventBus } from '../core/EventBus';

const FONT = '14px Arial, sans-serif';
const FONT_BTN = '13px Arial, sans-serif';

export class HUD {
  private scene: Phaser.Scene;
  private mode: string;
  private container: Phaser.GameObjects.Container;
  private waveText: Phaser.GameObjects.Text;
  private essenceText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private startWaveBtn: Phaser.GameObjects.Container;
  private restartBtn: Phaser.GameObjects.Container;
  private exitBtn: Phaser.GameObjects.Container;
  private phase: GamePhase = GamePhase.PREPARATION;
  private currentWave: number = 0;
  private totalWaves: number = 0;

  constructor(scene: Phaser.Scene, mode: string = 'normal') {
    this.scene = scene;
    this.mode = mode;
    const W = scene.cameras.main.width;

    this.container = scene.add.container(0, 0).setDepth(DEPTH.HUD);

    // ── Background bar (glassmorphism) ─────────────
    const bg = scene.add.graphics();
    // Shadow layer
    bg.fillStyle(0x000000, 0.25);
    bg.fillRoundedRect(8, 6, W - 16, 42, 14);
    // Main glass layer
    bg.fillStyle(0x2A1E10, 0.88);
    bg.fillRoundedRect(6, 4, W - 12, 42, 14);
    // Top highlight line
    bg.lineStyle(1, 0xFFFFFF, 0.08);
    bg.beginPath();
    bg.moveTo(20, 8); bg.lineTo(W - 20, 8);
    bg.strokePath();
    // Subtle border
    bg.lineStyle(1.5, 0xD4B896, 0.2);
    bg.strokeRoundedRect(6, 4, W - 12, 42, 14);
    this.container.add(bg);

    // ── Decorative divider lines ─────────────────
    const d1 = scene.add.graphics();
    d1.lineStyle(1, 0xD4B896, 0.15);
    d1.beginPath();
    d1.moveTo(80, 10); d1.lineTo(80, 40);
    d1.strokePath();
    this.container.add(d1);

    const d2 = scene.add.graphics();
    d2.lineStyle(1, 0xD4B896, 0.15);
    d2.beginPath();
    d2.moveTo(365, 10); d2.lineTo(365, 40);
    d2.strokePath();
    this.container.add(d2);

    // ── Exit button ─────────────────────────────
    this.exitBtn = this.makeIconBtn(14, 8, '←', 0x994444, 0xBB5555, 36, () => {
      this.scene.scene.start('LevelSelectScene', { mode: this.mode });
    });

    // ── Wave info ───────────────────────────────
    this.waveText = this.makeText(85, 12, '⚔ 准备阶段', 15, '#F5DEB3', true);

    // ── Essence ──────────────────────────────────
    this.essenceText = this.makeText(155, 12, '⭐ 30', 15, '#FFD700', true);

    // ── Lives ────────────────────────────────────
    this.livesText = this.makeText(240, 12, '❤️ 20', 15, '#FF6B6B', true);

    // ── Start Wave button ────────────────────────
    this.startWaveBtn = this.makePillBtn(W - 215, 6, '▶ 开始波次', 0x4A9E30, 0x6DB840, () => {
      if (this.phase === GamePhase.PREPARATION || this.phase === GamePhase.WAVE_TRANSITION) {
        EventBus.emit(EVENTS.WAVE_START_REQUESTED, {});
      }
    });

    // ── Restart button ───────────────────────────
    this.restartBtn = this.makeIconBtn(W - 88, 8, '↻', 0xA07020, 0xC08830, 36, () => {
      EventBus.emit(EVENTS.GAME_RESTART, {});
    });

    // ── Listeners ────────────────────────────────
    EventBus.on(EVENTS.RESOURCE_CHANGED, this.onResourceChanged, this);
    EventBus.on(EVENTS.WAVE_START, this.onWaveStart, this);
    EventBus.on(EVENTS.PHASE_CHANGED, this.onPhaseChanged, this);
    EventBus.on(EVENTS.GAME_OVER, this.onGameOver, this);
  }

  private makeText(x: number, y: number, text: string, size: number, color: string, shadow: boolean): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: '"Microsoft YaHei", "PingFang SC", Arial, sans-serif',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setDepth(DEPTH.HUD);
    this.container.add(t);
    return t;
  }

  private makePillBtn(
    x: number, y: number, label: string,
    color: number, hoverColor: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const w = label.length * 11 + 28;
    const h = 32;
    const c = this.scene.add.container(x, y).setDepth(DEPTH.HUD);

    const g = this.scene.add.graphics();
    const draw = (fill: number, borderAlpha: number) => {
      g.clear();
      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(0, 2, w, h, 16);
      // Main fill
      g.fillStyle(fill, 0.9);
      g.fillRoundedRect(0, 0, w, h, 16);
      // Highlight
      g.fillStyle(0xFFFFFF, 0.12);
      g.fillRoundedRect(2, 1, w - 4, h / 2, 14);
      // Border
      g.lineStyle(1.5, 0xFFFFFF, borderAlpha);
      g.strokeRoundedRect(0, 0, w, h, 16);
    };
    draw(color, 0.2);

    c.add(g);
    const t = this.scene.add.text(w / 2, h / 2, label, {
      fontSize: '14px',
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    c.add(t);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { draw(hoverColor, 0.4); this.scene.tweens.add({ targets: c, scaleX: 1.05, scaleY: 1.05, duration: 80 }); });
    c.on('pointerout', () => { draw(color, 0.2); this.scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80 }); });
    c.on('pointerdown', cb);
    return c;
  }

  private makeIconBtn(
    x: number, y: number, icon: string,
    color: number, hoverColor: number, size: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const s = size;
    const c = this.scene.add.container(x, y).setDepth(DEPTH.HUD);

    const g = this.scene.add.graphics();
    const draw = (fill: number) => {
      g.clear();
      g.fillStyle(0x000000, 0.2);
      g.fillCircle(s / 2, s / 2 + 2, s / 2 - 1);
      g.fillStyle(fill, 0.85);
      g.fillCircle(s / 2, s / 2, s / 2 - 1);
      // Highlight
      g.fillStyle(0xFFFFFF, 0.1);
      g.fillCircle(s / 2 - 2, s / 2 - 2, s / 3);
    };
    draw(color);

    c.add(g);
    const t = this.scene.add.text(s / 2, s / 2, icon, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFFFFF',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    c.add(t);
    c.setSize(s, s);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => { draw(hoverColor); this.scene.tweens.add({ targets: c, scaleX: 1.1, scaleY: 1.1, duration: 80 }); });
    c.on('pointerout', () => { draw(color); this.scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80 }); });
    c.on('pointerdown', cb);
    return c;
  }

  private onResourceChanged = (data: PlayerResources & { essenceGained?: number }): void => {
    if (data.essence !== undefined) {
      this.essenceText.setText(`⭐ ${data.essence}`);
      // Pulse animation on essence change
      this.scene.tweens.add({
        targets: this.essenceText,
        scaleX: { from: 1.3, to: 1 },
        scaleY: { from: 1.3, to: 1 },
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
    if (data.lives !== undefined) {
      this.livesText.setText(`❤️ ${data.lives}`);
      const isLow = data.lives <= 5;
      this.livesText.setColor(isLow ? '#FF2222' : '#FF6B6B');
      // Pulse when lives are low
      if (isLow) {
        this.scene.tweens.add({
          targets: this.livesText,
          scaleX: { from: 1.3, to: 1 },
          scaleY: { from: 1.3, to: 1 },
          duration: 200,
          ease: 'Back.easeOut',
        });
      }
    }
  };

  private onWaveStart = (data: { waveIndex: number; total: number }): void => {
    this.currentWave = data.waveIndex;
    this.totalWaves = data.total;
    this.waveText.setText(`⚔ 波次 ${data.waveIndex + 1}/${data.total}`);
    this.scene.tweens.add({
      targets: this.waveText,
      scaleX: { from: 1.2, to: 1 },
      scaleY: { from: 1.2, to: 1 },
      duration: 200,
      ease: 'Back.easeOut',
    });
    this.startWaveBtn.setVisible(false);
  };

  private onPhaseChanged = (data: { phase: GamePhase }): void => {
    this.phase = data.phase;
    const show = data.phase === GamePhase.PREPARATION || data.phase === GamePhase.WAVE_TRANSITION;
    this.startWaveBtn.setVisible(show);
    if (show && data.phase === GamePhase.WAVE_TRANSITION) {
      (this.startWaveBtn.getAt(1) as Phaser.GameObjects.Text).setText('▶ 下一波');
      // Slide in animation
      this.startWaveBtn.setAlpha(0);
      this.scene.tweens.add({
        targets: this.startWaveBtn,
        alpha: 1,
        x: { from: this.startWaveBtn.x + 30, to: this.startWaveBtn.x },
        duration: 250,
        ease: 'Power2',
      });
    } else if (show) {
      (this.startWaveBtn.getAt(1) as Phaser.GameObjects.Text).setText('▶ 开始波次');
    }
  };

  private onGameOver = (): void => { this.startWaveBtn.setVisible(false); };

  destroy(): void {
    EventBus.off(EVENTS.RESOURCE_CHANGED, this.onResourceChanged, this);
    EventBus.off(EVENTS.WAVE_START, this.onWaveStart, this);
    EventBus.off(EVENTS.PHASE_CHANGED, this.onPhaseChanged, this);
    EventBus.off(EVENTS.GAME_OVER, this.onGameOver, this);
    this.container.destroy();
  }
}
