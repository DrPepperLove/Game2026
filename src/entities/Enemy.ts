import Phaser from 'phaser';
import { COLORS, DEPTH, EVENTS, MIN_ENEMY_SPEED } from '../constants';
import { EnemyType } from '../types';
import type { IEnemy, IEffect, EnemyDefinition } from '../types';
import { EventBus } from '../core/EventBus';
import type { SlowEffect } from '../effects/SlowEffect';

let enemyIdCounter = 0;

export class Enemy extends Phaser.GameObjects.Container implements IEnemy {
  readonly id: string;
  readonly enemyType: EnemyType;
  readonly definition: EnemyDefinition;
  readonly maxHP: number;
  currentHP: number;
  baseSpeed: number;
  armor: number;
  activeEffects: IEffect[] = [];
  waypointIndex: number = 0;
  alive: boolean = true;

  private waypoints: Array<{ x: number; y: number }> = [];
  private spawnTimer: number = 0;
  private spawnCount: number = 0;
  private splitUsed: boolean = false;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private hpBarBg: Phaser.GameObjects.Graphics;
  private hpBarFg: Phaser.GameObjects.Graphics;
  private readonly hpBarW: number;  // set based on radius
  private readonly hpBarH: number = 5;

  constructor(
    scene: Phaser.Scene,
    definition: EnemyDefinition,
    waypoints: Array<{ x: number; y: number }>,
    x: number, y: number,
  ) {
    super(scene, x, y);
    this.id = `enemy_${++enemyIdCounter}`;
    this.enemyType = definition.type;
    this.definition = definition;
    this.maxHP = definition.stats.maxHP;
    this.currentHP = definition.stats.maxHP;
    this.baseSpeed = definition.stats.speed;
    this.armor = definition.stats.armor;
    this.waypoints = waypoints;

    // Cartoon body
    this.bodyGfx = scene.add.graphics();
    this.drawBody(definition.color, this.getDarkColor(definition));
    this.add(this.bodyGfx);

    // Bosses get wider HP bars
    this.hpBarW = definition.radius >= 22 ? 44 : 28;

    // HP bar
    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.fillStyle(COLORS.HP_BAR_BG, 0.7);
    this.hpBarBg.fillRoundedRect(-this.hpBarW / 2, -definition.radius - 10, this.hpBarW, this.hpBarH, 2);
    this.add(this.hpBarBg);

    this.hpBarFg = scene.add.graphics();
    this.updateHpBar();
    this.add(this.hpBarFg);

    this.setDepth(DEPTH.ENEMIES);
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  private drawBody(color: number, dark: number): void {
    const g = this.bodyGfx;
    const r = this.definition.radius;
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.15);
    g.fillCircle(2, 3, r);

    // Body
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, r);

    // Outline
    g.lineStyle(2.5, dark, 1);
    g.strokeCircle(0, 0, r);

    // Cartoon face (different per type)
    g.lineStyle(2, dark, 1);
    const eyeY = -r * 0.25;
    const eyeGap = r * 0.35;

    switch (this.enemyType) {
      case EnemyType.SCOUT:
        // Angry slanted eyes
        g.beginPath();
        g.moveTo(-eyeGap - 4, eyeY - 3); g.lineTo(-eyeGap + 2, eyeY + 2);
        g.strokePath();
        g.beginPath();
        g.moveTo(eyeGap + 4, eyeY - 3); g.lineTo(eyeGap - 2, eyeY + 2);
        g.strokePath();
        // Angry mouth
        g.beginPath();
        g.moveTo(-3, r * 0.3); g.lineTo(3, r * 0.3);
        g.strokePath();
        break;
      case EnemyType.TANK:
        // Small determined eyes
        g.fillStyle(dark, 1);
        g.fillCircle(-eyeGap, eyeY, 2.5);
        g.fillCircle(eyeGap, eyeY, 2.5);
        // Grim mouth
        g.beginPath();
        g.moveTo(-4, r * 0.35); g.lineTo(4, r * 0.35);
        g.strokePath();
        break;
      case EnemyType.BASIC:
        // Round dot eyes
        g.fillStyle(dark, 1);
        g.fillCircle(-eyeGap, eyeY, 3);
        g.fillCircle(eyeGap, eyeY, 3);
        // Simple smile
        g.beginPath();
        g.arc(0, r * 0.15, r * 0.25, 0.2, Math.PI - 0.2);
        g.strokePath();
        break;
      case EnemyType.SUMMONER:
        // Glowing magical eyes (rings)
        g.lineStyle(1.5, dark, 1);
        g.strokeCircle(-eyeGap, eyeY, 3);
        g.strokeCircle(eyeGap, eyeY, 3);
        // Mystic mouth (small circle)
        g.strokeCircle(0, r * 0.3, 2);
        break;
      case EnemyType.VENOM:
        // Menacing squint eyes
        g.lineStyle(2, dark, 1);
        g.beginPath();
        g.moveTo(-eyeGap - 3, eyeY); g.lineTo(-eyeGap + 3, eyeY + 2);
        g.strokePath();
        g.beginPath();
        g.moveTo(eyeGap + 3, eyeY); g.lineTo(eyeGap - 3, eyeY + 2);
        g.strokePath();
        // Drip mouth
        g.beginPath();
        g.moveTo(-3, r * 0.25); g.lineTo(0, r * 0.45); g.lineTo(3, r * 0.25);
        g.strokePath();
        break;
      case EnemyType.FLYING:
        // Sharp angled eyes (bird-like)
        g.lineStyle(1.5, dark, 1);
        g.beginPath();
        g.moveTo(-eyeGap - 4, eyeY + 2); g.lineTo(-eyeGap, eyeY - 2); g.lineTo(-eyeGap + 4, eyeY + 2);
        g.strokePath();
        g.beginPath();
        g.moveTo(eyeGap - 4, eyeY + 2); g.lineTo(eyeGap, eyeY - 2); g.lineTo(eyeGap + 4, eyeY + 2);
        g.strokePath();
        // Beak
        g.beginPath();
        g.moveTo(-2, r * 0.2); g.lineTo(0, r * 0.4); g.lineTo(2, r * 0.2);
        g.strokePath();
        break;
      case EnemyType.SPLITTER:
        // Wide crazy eyes
        g.fillStyle(dark, 1);
        g.fillCircle(-eyeGap, eyeY, 3.5);
        g.fillCircle(eyeGap, eyeY, 3.5);
        // White pupils (small dots)
        g.fillStyle(color, 1);
        g.fillCircle(-eyeGap - 1, eyeY - 1, 1.5);
        g.fillCircle(eyeGap - 1, eyeY - 1, 1.5);
        // Zigzag mouth
        g.lineStyle(1.5, dark, 1);
        g.beginPath();
        g.moveTo(-4, r * 0.3); g.lineTo(-2, r * 0.15); g.lineTo(0, r * 0.3); g.lineTo(2, r * 0.15); g.lineTo(4, r * 0.3);
        g.strokePath();
        break;

      // ─── Bosses ─────────────────────────────────
      case EnemyType.SWAMP_BOSS:
        // Big crocodile eyes (horizontal slits)
        g.lineStyle(3, dark, 1);
        g.beginPath();
        g.moveTo(-eyeGap - 6, eyeY); g.lineTo(-eyeGap + 4, eyeY);
        g.strokePath();
        g.beginPath();
        g.moveTo(eyeGap - 4, eyeY); g.lineTo(eyeGap + 6, eyeY);
        g.strokePath();
        // Wide jagged mouth
        g.lineStyle(2.5, dark, 1);
        g.beginPath();
        g.moveTo(-r * 0.6, r * 0.3); g.lineTo(-r * 0.3, r * 0.5); g.lineTo(0, r * 0.3);
        g.lineTo(r * 0.3, r * 0.5); g.lineTo(r * 0.6, r * 0.3);
        g.strokePath();
        // Crown-like ridges on top
        g.fillStyle(dark, 0.6);
        g.fillTriangle(-r * 0.4, -r * 0.7, -r * 0.2, -r * 0.9, 0, -r * 0.7);
        g.fillTriangle(0, -r * 0.7, r * 0.2, -r * 0.9, r * 0.4, -r * 0.7);
        break;

      case EnemyType.MOUNTAIN_BOSS:
        // Glowing red eyes
        g.fillStyle(0xFFDD44, 1);
        g.fillCircle(-eyeGap, eyeY, 4);
        g.fillCircle(eyeGap, eyeY, 4);
        g.fillStyle(0xFF8800, 1);
        g.fillCircle(-eyeGap, eyeY, 2);
        g.fillCircle(eyeGap, eyeY, 2);
        // Crack lines on body
        g.lineStyle(1.5, 0xFF8800, 0.5);
        g.beginPath();
        g.moveTo(-r * 0.3, -r * 0.5); g.lineTo(-r * 0.1, -r * 0.1); g.lineTo(-r * 0.4, r * 0.2);
        g.strokePath();
        g.beginPath();
        g.moveTo(r * 0.2, -r * 0.6); g.lineTo(r * 0.3, -r * 0.2); g.lineTo(r * 0.1, r * 0.1);
        g.strokePath();
        // Angry mouth
        g.lineStyle(3, dark, 1);
        g.beginPath();
        g.moveTo(-r * 0.5, r * 0.4); g.lineTo(r * 0.5, r * 0.4);
        g.strokePath();
        break;

      case EnemyType.CHAOS_BOSS:
        // Glowing purple eyes
        g.fillStyle(0xFF44FF, 1);
        g.fillCircle(-eyeGap, eyeY, 5);
        g.fillCircle(eyeGap, eyeY, 5);
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(-eyeGap - 1, eyeY - 1, 2);
        g.fillCircle(eyeGap - 1, eyeY - 1, 2);
        // Dark aura ring
        g.lineStyle(3, 0x440066, 0.4);
        g.strokeCircle(0, 0, r + 4);
        // Evil grin
        g.lineStyle(2.5, 0xCC44CC, 1);
        g.beginPath();
        g.arc(0, r * 0.2, r * 0.4, 0.2, Math.PI - 0.2);
        g.strokePath();
        // Horns
        g.fillStyle(dark, 1);
        g.fillTriangle(-eyeGap - 2, -r * 0.7, -eyeGap - 6, -r * 1.1, -eyeGap + 2, -r * 0.7);
        g.fillTriangle(eyeGap + 2, -r * 0.7, eyeGap + 6, -r * 1.1, eyeGap - 2, -r * 0.7);
        break;
    }
  }

  private getDarkColor(def: EnemyDefinition): number {
    switch (def.type) {
      case EnemyType.SCOUT: return COLORS.SCOUT_DARK;
      case EnemyType.TANK: return COLORS.TANK_DARK;
      case EnemyType.BASIC: return COLORS.BASIC_DARK;
      case EnemyType.SUMMONER: return COLORS.SUMMONER_DARK;
      case EnemyType.VENOM: return COLORS.VENOM_DARK;
      case EnemyType.FLYING: return COLORS.FLYING_DARK;
      case EnemyType.SPLITTER: return COLORS.SPLITTER_DARK;
      case EnemyType.SWAMP_BOSS: return COLORS.SWAMP_BOSS_DARK;
      case EnemyType.MOUNTAIN_BOSS: return COLORS.MOUNTAIN_BOSS_DARK;
      case EnemyType.CHAOS_BOSS: return COLORS.CHAOS_BOSS_DARK;
    }
  }

  // ─── Movement ────────────────────────────────────

  preUpdate(_time: number, delta: number): void {
    if (!this.alive) return;
    // ★ 游戏暂停时（选卡奖励等），冻结所有敌人行动
    if (this.scene.time.paused) return;

    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const e = this.activeEffects[i];
      e.onTick(this, delta);
      if (e.remainingDuration <= 0) { e.onRemove(this); this.activeEffects.splice(i, 1); }
    }

    // Summoner: periodically spawn minions
    if (this.enemyType === EnemyType.SUMMONER && this.spawnCount < 3) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= 5000) {
        this.spawnTimer = 0;
        this.spawnCount++;
        EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
          enemyType: EnemyType.BASIC,
          x: this.x, y: this.y,
          waypoints: this.waypoints,
        });
      }
    }

    // Chaos Boss: periodically spawn scouts
    if (this.enemyType === EnemyType.CHAOS_BOSS && this.spawnCount < 5) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= 4000) {
        this.spawnTimer = 0;
        this.spawnCount++;
        EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
          enemyType: EnemyType.SCOUT,
          x: this.x - 10, y: this.y,
          waypoints: this.waypoints,
        });
        EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
          enemyType: EnemyType.SCOUT,
          x: this.x + 10, y: this.y,
          waypoints: this.waypoints,
        });
      }
    }

    if (!this.hasEffect('stun') && this.waypointIndex < this.waypoints.length) {
      const target = this.waypoints[this.waypointIndex];
      const dx = target.x - this.x, dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 3) {
        this.waypointIndex++;
        if (this.waypointIndex >= this.waypoints.length) { this.reachedBase(); return; }
      } else {
        const step = (this.getEffectiveSpeed() * delta) / 1000;
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
    }
  }

  getEffectiveSpeed(): number {
    if (this.hasEffect('stun')) return 0;
    let totalSlow = 0;
    for (const e of this.activeEffects) {
      if (e.type === 'slow') totalSlow = Math.max(totalSlow, (e as SlowEffect).slowPercent);
    }
    return Math.max(MIN_ENEMY_SPEED, this.baseSpeed * (1 - totalSlow));
  }

  getEffectiveArmor(): number { return this.armor; }

  takeDamage(amount: number, armorPen: boolean, _source: string): void {
    if (!this.alive) return;
    const dmg = Math.max(1, amount - (armorPen ? 0 : this.getEffectiveArmor()));
    this.currentHP = Math.max(0, this.currentHP - dmg);

    this.scene.tweens.add({
      targets: this, scaleX: 1.15, scaleY: 0.85,
      duration: 60, yoyo: true,
    });
    this.updateHpBar();

    // ★ Emit damage event for visual feedback (damage numbers)
    EventBus.emit(EVENTS.ENEMY_DAMAGED, { x: this.x, y: this.y, damage: dmg, enemyId: this.id, enemyType: this.enemyType });

    // ★ Boss-specific: update boss HP bar
    if (this.enemyType === EnemyType.SWAMP_BOSS ||
        this.enemyType === EnemyType.MOUNTAIN_BOSS ||
        this.enemyType === EnemyType.CHAOS_BOSS) {
      EventBus.emit(EVENTS.BOSS_HP_CHANGED, { enemyId: this.id, currentHP: this.currentHP });
    }

    // Splitter: split once when HP drops below 50%
    if (
      this.enemyType === EnemyType.SPLITTER &&
      !this.splitUsed &&
      this.currentHP <= this.maxHP * 0.5
    ) {
      this.splitUsed = true;
      EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
        enemyType: EnemyType.BASIC,
        x: this.x - 8,
        y: this.y,
        waypoints: this.waypoints,
      });
      EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
        enemyType: EnemyType.BASIC,
        x: this.x + 8,
        y: this.y,
        waypoints: this.waypoints,
      });
    }

    if (this.currentHP <= 0) this.die();
  }

  applyEffect(effect: IEffect): void {
    for (let i = 0; i < this.activeEffects.length; i++) {
      if (this.activeEffects[i].type === effect.type) {
        if (effect.shouldOverride(this.activeEffects[i])) {
          this.activeEffects[i].onRemove(this);
          this.activeEffects[i] = effect;
          effect.onApply(this);
        }
        return;
      }
    }
    this.activeEffects.push(effect);
    effect.onApply(this);
  }

  removeEffect(t: string): void {
    const i = this.activeEffects.findIndex(e => e.type === t);
    if (i >= 0) { this.activeEffects[i].onRemove(this); this.activeEffects.splice(i, 1); }
  }

  hasEffect(t: string): boolean {
    return this.activeEffects.some(e => e.type === t && e.remainingDuration > 0);
  }

  private die(): void {
    this.alive = false;

    // ─── Boss on-death effects ─────────────────────
    if (this.enemyType === EnemyType.SWAMP_BOSS) {
      // 沼泽巨鳄死亡 → 召唤2毒液怪 + 2普通怪
      for (let i = 0; i < 2; i++) {
        EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
          enemyType: EnemyType.VENOM,
          x: this.x + (i - 1) * 16, y: this.y,
          waypoints: this.waypoints,
        });
        EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
          enemyType: EnemyType.BASIC,
          x: this.x + (i - 1) * 16, y: this.y + 10,
          waypoints: this.waypoints,
        });
      }
    } else if (this.enemyType === EnemyType.MOUNTAIN_BOSS) {
      // 熔岩巨像死亡 → 爆炸 + 3普通怪
      for (let i = 0; i < 3; i++) {
        EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
          enemyType: EnemyType.BASIC,
          x: this.x + (i - 1) * 20, y: this.y + (i % 2 === 0 ? -8 : 8),
          waypoints: this.waypoints,
        });
      }
    } else if (this.enemyType === EnemyType.CHAOS_BOSS) {
      // 混沌领主死亡 → 召唤4斥候
      for (let i = 0; i < 4; i++) {
        EventBus.emit(EVENTS.ENEMY_SPAWN_REQUEST, {
          enemyType: EnemyType.SCOUT,
          x: this.x + (i - 2) * 15, y: this.y + (i % 2 === 0 ? -10 : 10),
          waypoints: this.waypoints,
        });
      }
    }

    EventBus.emit(EVENTS.ENEMY_KILLED, { enemy: this });

    // Venom: emit poison pool at death location
    if (this.enemyType === EnemyType.VENOM) {
      EventBus.emit(EVENTS.VENOM_POOL_SPAWN, { x: this.x, y: this.y });
    }

    // Boss: larger death animation
    const isBoss = this.enemyType === EnemyType.SWAMP_BOSS ||
                   this.enemyType === EnemyType.MOUNTAIN_BOSS ||
                   this.enemyType === EnemyType.CHAOS_BOSS;
    const duration = isBoss ? 500 : 250;
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.1, scaleY: 0.1,
      duration, onComplete: () => this.destroy(),
    });
  }

  private reachedBase(): void {
    this.alive = false;
    EventBus.emit(EVENTS.ENEMY_BASE_REACHED, { enemy: this });
    this.destroy();
  }

  onReachedBase(): number { return this.definition.stats.baseReachPenalty; }

  getWaypoints(): Array<{ x: number; y: number }> {
    return this.waypoints;
  }

  private updateHpBar(): void {
    this.hpBarFg.clear();
    const ratio = Math.max(0, this.currentHP / this.maxHP);
    const color = ratio > 0.5 ? COLORS.HP_BAR_FG : ratio > 0.25 ? COLORS.HP_BAR_MID : COLORS.HP_BAR_LOW;
    this.hpBarFg.fillStyle(color, 1);
    this.hpBarFg.fillRoundedRect(
      -this.hpBarW / 2, -this.definition.radius - 10,
      Math.max(0, this.hpBarW * ratio), this.hpBarH, 2,
    );
  }

  destroy(fromScene?: boolean): void {
    for (const e of this.activeEffects) e.onRemove(this);
    this.activeEffects = [];
    super.destroy(fromScene);
  }
}
