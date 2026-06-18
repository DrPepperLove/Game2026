import Phaser from 'phaser';
import { DEPTH, EVENTS, WAVE_TRANSITION_DELAY, COLORS } from '../constants';
import { EventBus } from '../core/EventBus';

export class WaveBanner {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    EventBus.on(EVENTS.WAVE_START, (d: { waveIndex: number; total: number }) => {
      this.show(`⚔️ 第 ${d.waveIndex + 1} / ${d.total} 波`, '#FFD700', 1800);
    });
    EventBus.on(EVENTS.WAVE_COMPLETE, (d: { waveIndex: number; total: number }) => {
      this.show(`✅ 第 ${d.waveIndex + 1} 波 完成`, '#8CC63F', WAVE_TRANSITION_DELAY * 0.7);
    });
    EventBus.on(EVENTS.ALL_WAVES_DONE, () => {
      this.show('🎉 全波次通关!', '#FFD700', 3000);
    });

    // ★ Boss intro — enhanced banner
    EventBus.on(EVENTS.BOSS_ALERT, (data: { enemy?: { name?: string }; enemyType?: string }) => {
      const bossNames: Record<string, string> = {
        'SWAMP_BOSS': '🐊 沼泽巨鳄',
        'MOUNTAIN_BOSS': '🌋 熔岩巨像',
        'CHAOS_BOSS': '🌀 混沌领主',
      };
      const enemyType = data.enemyType as string;
      const bossName = bossNames[enemyType] || '👹 BOSS';
      this.showBossBanner(bossName);
    });
  }

  private show(text: string, color: string, duration: number): void {
    const { width, height } = this.scene.cameras.main;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(width / 2 - 180, height / 2 - 40, 360, 56, 16);
    bg.setDepth(DEPTH.WAVE_BANNER - 1).setAlpha(0);

    const t = this.scene.add.text(width / 2, height / 2 - 12, text, {
      fontSize: '28px', fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.WAVE_BANNER).setAlpha(0);

    this.scene.tweens.add({
      targets: [bg, t], alpha: 1, duration: 250,
      yoyo: true, hold: duration,
      onComplete: () => { bg.destroy(); t.destroy(); },
    });
  }

  /** ★ Enhanced boss intro with larger banner + border glow */
  private showBossBanner(bossName: string): void {
    const { width, height } = this.scene.cameras.main;
    const cx = width / 2, cy = height / 3;

    // Dark background veil
    const veil = this.scene.add.graphics();
    veil.fillStyle(0x000000, 0.15);
    veil.fillRect(0, 0, width, height);
    veil.setDepth(DEPTH.WAVE_BANNER - 2).setAlpha(0);

    // Large banner background
    const bg = this.scene.add.graphics();
    bg.setDepth(DEPTH.WAVE_BANNER - 1).setAlpha(0);
    bg.fillStyle(0x220000, 0.85);
    bg.fillRoundedRect(cx - 220, cy - 55, 440, 110, 20);
    // Glow border
    bg.lineStyle(4, 0xFF4444, 0.8);
    bg.strokeRoundedRect(cx - 220, cy - 55, 440, 110, 20);
    bg.lineStyle(2, 0xFFAA00, 0.5);
    bg.strokeRoundedRect(cx - 216, cy - 51, 432, 102, 18);

    // Boss name
    const title = this.scene.add.text(cx, cy - 10, bossName, {
      fontSize: '38px', fontFamily: 'monospace',
      color: '#FF4444',
      stroke: '#000', strokeThickness: 6,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(DEPTH.WAVE_BANNER).setAlpha(0);

    // Subtitle
    const sub = this.scene.add.text(cx, cy + 32, '⚔ BOSS 登场 ⚔', {
      fontSize: '16px', fontFamily: 'monospace',
      color: '#FFAA44',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.WAVE_BANNER).setAlpha(0);

    // Animate entrance
    this.scene.tweens.add({
      targets: [bg, veil],
      alpha: { from: 0, to: 1 },
      duration: 300,
    });
    this.scene.tweens.add({
      targets: [title, sub],
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Hold then fade out
    this.scene.time.delayedCall(2500, () => {
      this.scene.tweens.add({
        targets: [bg, veil, title, sub],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          bg.destroy(); veil.destroy();
          title.destroy(); sub.destroy();
        },
      });
    });
  }
}
