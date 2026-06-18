import Phaser from 'phaser';
import { EVENTS, COLORS, DEPTH } from '../constants';
import { EventBus } from '../core/EventBus';
import { MathUtils } from '../utils/MathUtils';

/**
 * VisualEffectsManager — 集中管理所有视觉反馈特效
 *
 * 监听 EventBus 事件，自动在场景中生成视觉特效。
 * 所有特效均为"发射后即忘"——完成后自动清理。
 *
 * 提供的特效：
 *   - 塔攻击闪光 (muzzle flash)
 *   - 投射物命中粒子 (hit spark)
 *   - 范围爆炸环 (explosion ring)
 *   - 伤害数字弹出 (damage number)
 *   - 死亡粒子爆发 (death burst)
 *   - 附魔光效 (enchant glow)
 *   - 升级粒子 (upgrade sparkle)
 *   - 中毒指示 (poison indicator)
 */
export class VisualEffectsManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.listen();
  }

  private listen(): void {
    // ★ Tower attack muzzle flash
    EventBus.on(EVENTS.TOWER_ATTACK, (data: { towerType: string; pixelX: number; pixelY: number }) => {
      this.showMuzzleFlash(data.pixelX, data.pixelY, data.towerType);
    });

    // ★ Projectile hit spark
    EventBus.on(EVENTS.PROJECTILE_HIT, (data: { armorPen: boolean; x: number; y: number }) => {
      this.showHitSpark(data.x, data.y, data.armorPen ? 0xCC88FF : 0xFFDD44);
    });

    // ★ Projectile explosion
    EventBus.on(EVENTS.PROJECTILE_EXPLOSION, (data: { x: number; y: number; radius: number }) => {
      this.showExplosionRing(data.x, data.y, data.radius);
    });

    // ★ Enemy kill / death burst
    EventBus.on(EVENTS.ENEMY_KILLED, (data: { enemy: { x: number; y: number; enemyType?: string; maxHP?: number } }) => {
      const isBoss = data?.enemy?.enemyType === 'SWAMP_BOSS' ||
                     data?.enemy?.enemyType === 'MOUNTAIN_BOSS' ||
                     data?.enemy?.enemyType === 'CHAOS_BOSS';
      this.showDeathBurst(data.enemy.x, data.enemy.y, isBoss);
    });

    // ★ Enchantment apply glow
    EventBus.on(EVENTS.ENCHANT_APPLIED, (data: { tower?: { pixelX: number; pixelY: number } }) => {
      if (data?.tower) {
        this.showEnchantGlow(data.tower.pixelX, data.tower.pixelY);
      }
    });

    // ★ Combo activated - bigger effect
    EventBus.on(EVENTS.COMBO_ACTIVATED, (data: { tower?: { pixelX: number; pixelY: number } }) => {
      if (data?.tower) {
        this.showEnchantGlow(data.tower.pixelX, data.tower.pixelY, true);
      }
    });

    // ★ Enemy damage
    EventBus.on(EVENTS.ENEMY_DAMAGED, (data: { x: number; y: number; damage: number }) => {
      this.showDamageNumber(data.x, data.y, data.damage);
    });

    // ★ Upgrade
    EventBus.on(EVENTS.TOWER_DEPLOYED, (data: { tower?: { pixelX?: number; pixelY?: number }; action?: string }) => {
      if (data?.action === 'upgrade' && data?.tower && data.tower.pixelX !== undefined && data.tower.pixelY !== undefined) {
        this.showUpgradeSparkle(data.tower.pixelX, data.tower.pixelY);
      }
    });

    // ★ Boss alert - screen flash
    EventBus.on(EVENTS.BOSS_ALERT, () => {
      this.showBossAlert();
    });
  }

  // ─── 1. Muzzle Flash ──────────────────────────────

  private showMuzzleFlash(px: number, py: number, towerType: string): void {
    const colors: Record<string, number> = {
      'ARROW': 0x88CCFF,
      'MAGIC': 0xCC88FF,
      'CANNON': 0xFFAA44,
      'SLOW': 0x88FFEE,
    };
    const color = colors[towerType] || 0xFFFFFF;

    // Quick flash circle
    const flash = this.scene.add.graphics();
    flash.setDepth(DEPTH.PROJECTILES);

    // Draw cross-like flash
    flash.lineStyle(3, 0xFFFFFF, 0.9);
    flash.beginPath();
    flash.moveTo(px - 18, py); flash.lineTo(px + 18, py);
    flash.moveTo(px, py - 18); flash.lineTo(px, py + 18);
    flash.strokePath();

    flash.fillStyle(color, 0.7);
    flash.fillCircle(px, py, 12);

    // Fade out and destroy
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      scaleX: { from: 0.8, to: 1.5 },
      scaleY: { from: 0.8, to: 1.5 },
      duration: 100,
      onComplete: () => flash.destroy(),
    });
  }

  // ─── 2. Hit Spark ─────────────────────────────────

  private showHitSpark(x: number, y: number, color: number): void {
    // Particle burst: draw several small lines radiating outward
    const spark = this.scene.add.graphics();
    spark.setDepth(DEPTH.PROJECTILES + 1);

    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const len = 8 + Math.random() * 10;
      spark.lineStyle(2, color, 1);
      spark.beginPath();
      spark.moveTo(x, y);
      spark.lineTo(
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len,
      );
      spark.strokePath();
    }

    // Also a small circle
    spark.fillStyle(0xFFFFFF, 0.6);
    spark.fillCircle(x, y, 4);

    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      duration: 200,
      onComplete: () => spark.destroy(),
    });
  }

  // ─── 3. Explosion Ring ────────────────────────────

  private showExplosionRing(x: number, y: number, radius: number): void {
    // Expanding ring
    const ring = this.scene.add.graphics();
    ring.setDepth(DEPTH.PROJECTILES);

    // Initial burst
    ring.fillStyle(0xFF6600, 0.3);
    ring.fillCircle(x, y, radius * 0.3);

    // Animate expanding ring
    let progress = 0;
    const step = () => {
      progress += 0.05;
      if (progress > 1) { ring.destroy(); return; }
      ring.clear();
      const r = radius * progress;
      const alpha = Math.max(0, 0.3 * (1 - progress));
      ring.lineStyle(3, 0xFF6600, alpha);
      ring.strokeCircle(x, y, r);
      ring.fillStyle(0xFF4400, alpha * 0.5);
      ring.fillCircle(x, y, r * 0.5);
      // Schedule next frame
      if (ring.active) {
        this.scene.time.delayedCall(30, step);
      }
    };
    step();

    // Add some random debris particles (simple dots)
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      const debris = this.scene.add.graphics();
      debris.setDepth(DEPTH.PROJECTILES + 1);
      debris.fillStyle(0xFF8844, 1);
      debris.fillCircle(x, y, 3 + Math.random() * 3);

      this.scene.tweens.add({
        targets: debris,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        onComplete: () => debris.destroy(),
      });
    }
  }

  // ─── 4. Damage Number ─────────────────────────────

  private showDamageNumber(x: number, y: number, damage: number): void {
    if (damage <= 0) return;

    const color = damage >= 50 ? '#FF4444' : damage >= 20 ? '#FFAA44' : '#FFFFFF';
    const size = Math.min(18, Math.max(12, 10 + Math.floor(damage / 10)));

    const text = this.scene.add.text(
      x + MathUtils.randomInt(-8, 8),
      y - 10,
      `-${damage}`,
      {
        fontSize: `${size}px`,
        fontFamily: 'monospace',
        color,
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      },
    ).setOrigin(0.5).setDepth(DEPTH.ENEMIES + 5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: { from: 1, to: 0 },
      duration: 600 + Math.random() * 200,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // ─── 5. Death Burst ───────────────────────────────

  private showDeathBurst(x: number, y: number, isBoss: boolean): void {
    const count = isBoss ? 20 : 8;
    const colors = isBoss
      ? [0xFF4444, 0xFF8800, 0xFFCC00, 0xFF6600]
      : [0x88CCFF, 0xFFFFFF, 0xFFDD88];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const speed = isBoss ? 40 + Math.random() * 60 : 15 + Math.random() * 25;
      const size = isBoss ? 3 + Math.random() * 5 : 2 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)];

      const particle = this.scene.add.graphics();
      particle.setDepth(DEPTH.ENEMIES + 3);
      particle.fillStyle(color, 1);
      particle.fillCircle(x, y, size);

      this.scene.tweens.add({
        targets: particle,
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
        alpha: 0,
        rotation: Math.random() * 6,
        duration: 400 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Boss: add a flash ring
    if (isBoss) {
      const ring = this.scene.add.graphics();
      ring.setDepth(DEPTH.ENEMIES + 2);
      ring.lineStyle(4, 0xFFAA00, 0.8);
      ring.strokeCircle(x, y, 10);

      this.scene.tweens.add({
        targets: ring,
        scaleX: 5,
        scaleY: 5,
        alpha: 0,
        duration: 600,
        onComplete: () => ring.destroy(),
      });
    }
  }

  // ─── 6. Enchant Glow ──────────────────────────────

  private showEnchantGlow(x: number, y: number, isCombo: boolean = false): void {
    const color = isCombo ? 0xFFD700 : 0xB07CD8;
    const size = isCombo ? 45 : 35;

    // Expanding ring
    const ring = this.scene.add.graphics();
    ring.setDepth(DEPTH.TOWERS + 1);

    // Draw initial burst
    ring.fillStyle(color, 0.25);
    ring.fillCircle(x, y, size);
    ring.lineStyle(3, color, 0.7);
    ring.strokeCircle(x, y, size);

    // Animate
    this.scene.tweens.add({
      targets: ring,
      scaleX: { from: 0.5, to: 1.8 },
      scaleY: { from: 0.5, to: 1.8 },
      alpha: 0,
      duration: isCombo ? 700 : 500,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Sparkle particles
    for (let i = 0; i < (isCombo ? 12 : 6); i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 25;
      const spark = this.scene.add.graphics();
      spark.setDepth(DEPTH.TOWERS + 1);
      spark.fillStyle(0xFFFFFF, 1);
      spark.fillCircle(x, y, 2);

      this.scene.tweens.add({
        targets: spark,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: 0,
        duration: 400 + Math.random() * 300,
        onComplete: () => spark.destroy(),
      });
    }
  }

  // ─── 7. Upgrade Sparkle ───────────────────────────

  private showUpgradeSparkle(x: number, y: number): void {
    // Golden star burst
    const color = 0xFFD700;

    // Central flash
    const flash = this.scene.add.graphics();
    flash.setDepth(DEPTH.TOWERS + 1);
    flash.fillStyle(color, 0.9);
    flash.fillCircle(x, y, 20);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    // Particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const dist = 20 + Math.random() * 30;
      const spark = this.scene.add.graphics();
      spark.setDepth(DEPTH.TOWERS + 1);
      spark.fillStyle(i % 2 === 0 ? 0xFFD700 : 0xFFFFFF, 1);
      spark.fillCircle(x, y, 3);

      this.scene.tweens.add({
        targets: spark,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 500 + Math.random() * 200,
        onComplete: () => spark.destroy(),
      });
    }
  }

  // ─── 8. Boss Alert ────────────────────────────────

  private showBossAlert(): void {
    const { width, height } = this.scene.cameras.main;

    // Screen flash (dark veil)
    const veil = this.scene.add.graphics();
    veil.setDepth(DEPTH.OVERLAY_BG);
    veil.fillStyle(0x000000, 0);
    veil.fillRect(0, 0, width, height);

    // Flash dark
    this.scene.tweens.add({
      targets: veil,
      alpha: { from: 0, to: 0.2 },
      duration: 200,
      yoyo: true,
      hold: 100,
      onComplete: () => veil.destroy(),
    });

    // Screen shake
    this.scene.cameras.main.shake(300, 0.008);

    // Red border flash
    const border = this.scene.add.graphics();
    border.setDepth(DEPTH.OVERLAY_BG + 1);
    border.lineStyle(6, 0xFF2200, 0);
    border.strokeRect(3, 3, width - 6, height - 6);

    this.scene.tweens.add({
      targets: border,
      alpha: { from: 0.8, to: 0 },
      duration: 600,
      onComplete: () => border.destroy(),
    });
  }

  // ─── 9. Poison Indicator ──────────────────────────

  showPoisonTick(x: number, y: number): void {
    const puff = this.scene.add.graphics();
    puff.setDepth(DEPTH.ENEMIES + 2);
    puff.fillStyle(COLORS.POISON_TINT, 0.5);
    puff.fillCircle(x, y, 8);

    this.scene.tweens.add({
      targets: puff,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 400,
      onComplete: () => puff.destroy(),
    });
  }

  // ─── Cleanup ──────────────────────────────────────

  destroy(): void {
    // EventBus listeners are cleaned up by GameScene.removeAllListeners
  }
}
