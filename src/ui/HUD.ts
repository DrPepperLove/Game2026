import Phaser from 'phaser';
import { DEPTH, EVENTS } from '../constants';
import { GamePhase } from '../types';
import type { PlayerResources } from '../types';
import { EventBus } from '../core/EventBus';

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

  // Layout constants
  private static readonly BAR_Y = 4;
  private static readonly BAR_H = 42;
  private static readonly BAR_CY = 25;  // vertical center of bar
  private static readonly PAD = 14;     // horizontal padding from edges
  private static readonly GAP = 22;     // gap between text elements
  private static readonly BTN_S = 34;   // icon button size
  private static readonly DIVIDER_W = 12; // divider slot width
  private static readonly RIGHT_GAP = 16; // gap after restart btn before divider

  constructor(scene: Phaser.Scene, mode: string = 'normal') {
    this.scene = scene;
    this.mode = mode;
    const W = scene.cameras.main.width;
    const { BAR_Y, BAR_H, BAR_CY, PAD, GAP, BTN_S } = HUD;

    this.container = scene.add.container(0, 0).setDepth(DEPTH.HUD);

    // ── Background bar ───────────────────────────
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.25);
    bg.fillRoundedRect(8, BAR_Y + 2, W - 16, BAR_H, 14);
    bg.fillStyle(0x2A1E10, 0.88);
    bg.fillRoundedRect(6, BAR_Y, W - 12, BAR_H, 14);
    bg.lineStyle(1, 0xFFFFFF, 0.08);
    bg.beginPath();
    bg.moveTo(20, BAR_Y + 4); bg.lineTo(W - 20, BAR_Y + 4);
    bg.strokePath();
    bg.lineStyle(1.5, 0xD4B896, 0.2);
    bg.strokeRoundedRect(6, BAR_Y, W - 12, BAR_H, 14);
    this.container.add(bg);

    // ── Left group: exit | wave · essence · lives ──
    let lx = PAD;

    // Exit button
    this.exitBtn = this.makeIconBtn(lx, BAR_CY - BTN_S / 2, '←', 0x994444, 0xBB5555, BTN_S, () => {
      this.scene.scene.start('LevelSelectScene', { mode: this.mode });
    });
    lx += BTN_S + 6;

    // Divider after exit
    lx = this.addDivider(lx, BAR_Y, BAR_H);

    // Wave / phase text
    this.waveText = this.makeText(lx, BAR_CY, '⚔ 准备阶段', 14, '#F5DEB3');
    lx += this.waveText.width + GAP;

    // Essence
    this.essenceText = this.makeText(lx, BAR_CY, '⭐ 30', 14, '#FFD700');
    lx += this.essenceText.width + GAP;

    // Lives
    this.livesText = this.makeText(lx, BAR_CY, '❤️ 20', 14, '#FF6B6B');

    // ── Right group: [start wave] | [restart] ──────
    const { RIGHT_GAP } = HUD;
    let rx = W - PAD;

    // Restart button (anchored to right edge)
    this.restartBtn = this.makeIconBtn(rx - BTN_S, BAR_CY - BTN_S / 2, '↻', 0xA07020, 0xC08830, BTN_S, () => {
      EventBus.emit(EVENTS.GAME_RESTART, {});
    });
    rx -= BTN_S + RIGHT_GAP;

    // Divider before start wave button
    rx = this.addDivider(rx, BAR_Y, BAR_H);

    // Start wave button (right-aligned, width changes with label)
    const startLabel = '▶ 开始波次';
    const startW = this.getPillWidth(startLabel);
    this.startWaveBtn = this.makePillBtn(rx - startW, BAR_CY - 16, startLabel, 0x4A9E30, 0x6DB840, () => {
      if (this.phase === GamePhase.PREPARATION || this.phase === GamePhase.WAVE_TRANSITION) {
        EventBus.emit(EVENTS.WAVE_START_REQUESTED, {});
      }
    });

    // ── Listeners ────────────────────────────────
    EventBus.on(EVENTS.RESOURCE_CHANGED, this.onResourceChanged, this);
    EventBus.on(EVENTS.WAVE_START, this.onWaveStart, this);
    EventBus.on(EVENTS.PHASE_CHANGED, this.onPhaseChanged, this);
    EventBus.on(EVENTS.GAME_OVER, this.onGameOver, this);
  }

  // ── Factory helpers ──────────────────────────────

  /** 垂直居中的文本，origin(0, 0.5) */
  private makeText(x: number, y: number, text: string, size: number, color: string): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(DEPTH.HUD);
    this.container.add(t);
    return t;
  }

  /** 添加一条垂直分隔线，返回分隔线右侧的 x */
  private addDivider(x: number, barY: number, barH: number): number {
    const g = this.scene.add.graphics();
    g.lineStyle(1, 0xD4B896, 0.12);
    g.beginPath();
    g.moveTo(x + 2, barY + 7);
    g.lineTo(x + 2, barY + barH - 7);
    g.strokePath();
    this.container.add(g);
    return x + HUD.DIVIDER_W;
  }

  private getPillWidth(label: string): number {
    return label.length * 11 + 28;
  }

  private makePillBtn(
    x: number, y: number, label: string,
    color: number, hoverColor: number, cb: () => void,
  ): Phaser.GameObjects.Container {
    const w = this.getPillWidth(label);
    const h = 32;
    const c = this.scene.add.container(x, y).setDepth(DEPTH.HUD);

    // Store mutable width so redraws pick up size changes
    const state = { w };
    (c as any)._pillState = state;

    const g = this.scene.add.graphics();
    const draw = (fill: number, borderAlpha: number) => {
      const cw = state.w;
      g.clear();
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(0, 2, cw, h, 16);
      g.fillStyle(fill, 0.9);
      g.fillRoundedRect(0, 0, cw, h, 16);
      g.fillStyle(0xFFFFFF, 0.12);
      g.fillRoundedRect(2, 1, cw - 4, h / 2, 14);
      g.lineStyle(1.5, 0xFFFFFF, borderAlpha);
      g.strokeRoundedRect(0, 0, cw, h, 16);
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

    (c as any)._pillDraw = draw;
    (c as any)._pillColor = color;

    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => {
      draw(hoverColor, 0.4);
      this.scene.tweens.add({ targets: c, scaleX: 1.05, scaleY: 1.05, duration: 80 });
    });
    c.on('pointerout', () => {
      draw(color, 0.2);
      this.scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80 });
    });
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
    c.on('pointerover', () => {
      draw(hoverColor);
      this.scene.tweens.add({ targets: c, scaleX: 1.1, scaleY: 1.1, duration: 80 });
    });
    c.on('pointerout', () => {
      draw(color);
      this.scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80 });
    });
    c.on('pointerdown', cb);
    return c;
  }

  /** 重新计算左组文字位置（文字内容变化后调用） */
  private relayoutLeftTexts(): void {
    const { GAP } = HUD;
    // Exit button right edge + divider
    let lx = HUD.PAD + HUD.BTN_S + 6 + 12;
    this.waveText.setPosition(lx, HUD.BAR_CY);
    lx += this.waveText.width + GAP;
    this.essenceText.setPosition(lx, HUD.BAR_CY);
    lx += this.essenceText.width + GAP;
    this.livesText.setPosition(lx, HUD.BAR_CY);
  }

  private onResourceChanged = (data: PlayerResources & { essenceGained?: number }): void => {
    if (data.essence !== undefined) {
      this.essenceText.setText(`⭐ ${data.essence}`);
      this.relayoutLeftTexts();
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
      this.livesText.setColor(data.lives <= 5 ? '#FF2222' : '#FF6B6B');
      this.relayoutLeftTexts();
      if (data.lives <= 5) {
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
    this.relayoutLeftTexts();
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
    if (!show) return;

    const label = data.phase === GamePhase.WAVE_TRANSITION ? '▶ 下一波' : '▶ 开始波次';
    const textObj = this.startWaveBtn.getAt(1) as Phaser.GameObjects.Text;
    textObj.setText(label);

    // Update size & position (right-aligned, width varies with label)
    const state = (this.startWaveBtn as any)._pillState;
    const draw = (this.startWaveBtn as any)._pillDraw as Function;
    const newW = this.getPillWidth(label);
    if (state) state.w = newW;
    this.startWaveBtn.setSize(newW, 32);
    textObj.setPosition(newW / 2, 16);

    const targetX = this.restartBtn.x - HUD.RIGHT_GAP + HUD.DIVIDER_W - newW;

    if (data.phase === GamePhase.WAVE_TRANSITION) {
      this.startWaveBtn.setAlpha(0);
      this.startWaveBtn.x = targetX + 30;
      this.scene.tweens.add({
        targets: this.startWaveBtn,
        alpha: 1,
        x: targetX,
        duration: 250,
        ease: 'Power2',
      });
    } else {
      this.startWaveBtn.x = targetX;
    }

    if (draw) draw(0x4A9E30, 0.2);
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
