import Phaser from 'phaser';
import { DEPTH, EVENTS, COLORS } from '../constants';
import { EventBus } from '../core/EventBus';

/**
 * BossHPBar — 屏幕顶部的BOSS血条
 *
 * 监听事件：
 *   BOSS_ALERT → 显示BOSS血条
 *   ENEMY_DAMAGED → 更新血量（若目标为BOSS）
 *   ENEMY_KILLED → 隐藏（如果是BOSS死亡）
 */
export class BossHPBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Graphics;
  private fill: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private activeBossId: string | null = null;
  private bossMaxHP: number = 0;
  private bossCurrentHP: number = 0;

  private static readonly BAR_W = 300;
  private static readonly BAR_H = 22;
  private static readonly BAR_Y = 56; // below HUD

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create elements but hidden
    this.bg = scene.add.graphics().setDepth(DEPTH.HUD + 1).setVisible(false);
    this.fill = scene.add.graphics().setDepth(DEPTH.HUD + 2).setVisible(false);
    this.nameText = scene.add.text(0, 0, '', {
      fontSize: '13px', fontFamily: 'Arial, sans-serif',
      color: '#FFD700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH.HUD + 3).setVisible(false);
    this.hpText = scene.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#FFFFFF', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(DEPTH.HUD + 3).setVisible(false);

    this.listen();
  }

  private listen(): void {
    // ── Boss alert: show bar ──────────────────────────
    EventBus.on(EVENTS.BOSS_ALERT, (data: { enemy: { id: string; maxHP: number; currentHP: number; enemyType?: string } }) => {
      const enemy = data.enemy;
      this.activeBossId = enemy.id;
      this.bossMaxHP = enemy.maxHP;
      this.bossCurrentHP = enemy.currentHP;

      const bossNames: Record<string, string> = {
        'SWAMP_BOSS': '🐊 沼泽巨鳄',
        'MOUNTAIN_BOSS': '🌋 熔岩巨像',
        'CHAOS_BOSS': '🌀 混沌领主',
      };
      const bossName = bossNames[enemy.enemyType || ''] || '👹 BOSS';
      this.show(bossName);
    });

    // ── Boss HP changed: update bar ──────────────────
    EventBus.on(EVENTS.BOSS_HP_CHANGED, (data: { enemyId: string; currentHP: number }) => {
      if (data.enemyId === this.activeBossId) {
        this.bossCurrentHP = Math.max(0, data.currentHP);
        this.drawBar();
      }
    });

    // ── Enemy killed: hide if boss died ──────────────
    EventBus.on(EVENTS.ENEMY_KILLED, (data: { enemy: { id: string; enemyType?: string } }) => {
      if (data.enemy.id === this.activeBossId) {
        this.hide();
        this.activeBossId = null;
      }
    });
  }

  private show(name: string): void {
    const W = this.scene.cameras.main.width;
    const x = W / 2;
    const y = BossHPBar.BAR_Y;

    this.nameText.setText(`⚔ ${name}`);
    this.nameText.setPosition(x, y - 18);
    this.nameText.setVisible(true);

    // Animate in
    this.nameText.setAlpha(0);
    this.scene.tweens.add({
      targets: this.nameText,
      alpha: { from: 0, to: 1 },
      duration: 400,
    });

    this.drawBar();
    this.bg.setVisible(true);
    this.fill.setVisible(true);
    this.hpText.setVisible(true);

    // Entrance animation
    this.bg.setAlpha(0);
    this.fill.setAlpha(0);
    this.scene.tweens.add({
      targets: [this.bg, this.fill, this.hpText],
      alpha: { from: 0, to: 1 },
      duration: 300,
    });
  }

  private drawBar(): void {
    const W = this.scene.cameras.main.width;
    const x = W / 2 - BossHPBar.BAR_W / 2;
    const y = BossHPBar.BAR_Y;

    const ratio = this.bossMaxHP > 0
      ? Math.max(0, this.bossCurrentHP / this.bossMaxHP)
      : 0;

    // Background
    this.bg.clear();
    this.bg.fillStyle(0x220000, 1);
    this.bg.fillRoundedRect(x - 2, y - 2, BossHPBar.BAR_W + 4, BossHPBar.BAR_H + 4, 6);
    this.bg.fillStyle(0x440000, 0.9);
    this.bg.fillRoundedRect(x, y, BossHPBar.BAR_W, BossHPBar.BAR_H, 4);
    this.bg.lineStyle(2, 0xFF4444, 0.8);
    this.bg.strokeRoundedRect(x, y, BossHPBar.BAR_W, BossHPBar.BAR_H, 4);

    // Fill
    const color = ratio > 0.5 ? 0xDD3333 : ratio > 0.25 ? 0xDD8800 : 0xFF2222;
    this.fill.clear();
    this.fill.fillStyle(color, 1);
    if (ratio > 0) {
      this.fill.fillRoundedRect(x + 2, y + 2, Math.max(4, (BossHPBar.BAR_W - 4) * ratio), BossHPBar.BAR_H - 4, 3);
    }

    // HP text
    this.hpText.setText(`${Math.ceil(this.bossCurrentHP)} / ${this.bossMaxHP}`);
    this.hpText.setPosition(W / 2, y + BossHPBar.BAR_H / 2);
  }

  private hide(): void {
    this.activeBossId = null;

    // Animate out
    this.scene.tweens.add({
      targets: [this.bg, this.fill, this.hpText, this.nameText],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.bg.setVisible(false);
        this.fill.setVisible(false);
        this.hpText.setVisible(false);
        this.nameText.setVisible(false);
      },
    });
  }

  destroy(): void {
    this.hide();
    this.bg.destroy();
    this.fill.destroy();
    this.nameText.destroy();
    this.hpText.destroy();
  }
}
