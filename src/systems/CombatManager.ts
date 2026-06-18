import { EVENTS, DEPTH } from '../constants';
import { TowerType } from '../types';
import type { ITower, IEnemy } from '../types';
import { EventBus } from '../core/EventBus';
import { ProjectileFactory } from '../factories/ProjectileFactory';
import { MathUtils } from '../utils/MathUtils';
import { PoisonEffect } from '../effects/PoisonEffect';
import { SlowEffect } from '../effects/SlowEffect';
import { StunEffect } from '../effects/StunEffect';
import { VulnerableEffect } from '../effects/VulnerableEffect';

/**
 * CombatManager — 战斗系统总调度
 *
 * 职责：
 *   - 每帧遍历所有塔，检查冷却、寻敌、发射弹射物
 *   - 弹射物飞行与命中检测
 *   - 伤害结算（单体 + 范围）
 *   - 附魔钩子调度（onProjectileCreated / onHit / onKill）
 *   - 状态效果创建
 */
export class CombatManager {
  private scene: Phaser.Scene;
  private projectileFactory: ProjectileFactory;
  private towers: ITower[] = [];
  private enemies: IEnemy[] = [];
  private active: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.projectileFactory = new ProjectileFactory(scene);
  }

  // ─── Registration ────────────────────────────────

  registerTower(tower: ITower): void {
    this.towers.push(tower);
  }

  removeTower(towerId: string): void {
    this.towers = this.towers.filter(t => t.id !== towerId);
  }

  setEnemies(enemies: IEnemy[]): void {
    this.enemies = enemies;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  getProjectileFactory(): ProjectileFactory {
    return this.projectileFactory;
  }

  // ─── Update Loop ─────────────────────────────────

  update(_time: number, _delta: number): void {
    if (!this.active) return;

    const aliveEnemies = this.enemies.filter(e => e.alive);

    // Tower attack loop
    for (const tower of this.towers) {
      if (!tower.isReady()) continue;

      // Flying enemies: only Arrow and Magic towers can target them
      let validTargets = aliveEnemies;
      if (tower.towerType === TowerType.CANNON || tower.towerType === TowerType.SLOW) {
        validTargets = aliveEnemies.filter(e => !e.definition.flying);
      }

      const target = tower.findTarget(validTargets);
      if (!target) continue;

      tower.attack(target);

      const stats = tower.getEffectiveStats();

      // Check for enchantments on this tower
      const hasArcaneFocus = tower.enchantments.some(
        inst => inst.definition.id === 'arcane_focus',
      );
      const isArcaneBurst = hasArcaneFocus && tower.attackCount % 3 === 0;

      // ★ Emit attack event for audio/visual feedback
      EventBus.emit(EVENTS.TOWER_ATTACK, {
        towerType: tower.towerType,
        towerId: tower.id,
        pixelX: tower.pixelX,
        pixelY: tower.pixelY,
        enemy: target,
      });

      // Slow tower: instant area effect, no projectile
      if (tower.towerType === TowerType.SLOW) {
        if (stats.slowAmount > 0) {
          // Apply slow to all enemies in range
          for (const enemy of aliveEnemies) {
            const dist = MathUtils.distance(
              tower.pixelX, tower.pixelY, enemy.x, enemy.y,
            );
            if (dist <= stats.range) {
              const slow = new SlowEffect(
                `tower_${tower.id}`,
                stats.slowAmount,
                stats.slowDuration,
              );
              enemy.applyEffect(slow);

              // Resonance Field: apply vulnerable to enemies in range
              if (tower.enchantments.some(i => i.definition.id === 'resonance_field')) {
                const vuln = new VulnerableEffect(
                  'enchant_resonance_field',
                  1.1, // +10% damage
                  2000,
                );
                enemy.applyEffect(vuln);
              }
            }
          }
        }

        // On-hit enchant hooks for slow tower area
        for (const inst of tower.enchantments) {
          for (const hook of inst.definition.hooks) {
            if (hook.event === 'onProjectileHit') {
              for (const enemy of aliveEnemies) {
                const dist = MathUtils.distance(
                  tower.pixelX, tower.pixelY, enemy.x, enemy.y,
                );
                if (dist <= stats.range) {
                  this.executeHitHook(
                    hook.event,
                    tower,
                    enemy,
                    inst.definition.id,
                    inst.stackCount,
                  );
                }
              }
            }
          }
        }
        continue;
      }

      // Other towers: fire projectile
      // Check for onProjectileCreated hooks first
      const hasMultishot = tower.enchantments.some(
        inst => inst.definition.id === 'multishot',
      );

      // Arcane Focus: every 3rd attack deals double damage
      let projectileDamage = stats.damage;
      if (isArcaneBurst) {
        projectileDamage *= 2;
      }

      // Primary projectile
      this.projectileFactory.fire(
        tower.pixelX,
        tower.pixelY,
        target,
        projectileDamage,
        stats.armorPenetration,
        stats.projectileSpeed,
        tower.towerType,
        tower.id,
        stats.areaDamage,
        stats.areaRadius,
        [], // effects applied on hit
        false,
      );

      // Multishot bonus projectile at 50% damage
      if (hasMultishot) {
        const bonusDamage = isArcaneBurst
          ? Math.floor(projectileDamage * 0.25)  // arcane burst: double → bonus is 50% of doubled = 25% of original
          : Math.floor(stats.damage * 0.5);
        this.projectileFactory.fire(
          tower.pixelX,
          tower.pixelY,
          target,
          bonusDamage,
          stats.armorPenetration,
          stats.projectileSpeed,
          tower.towerType,
          tower.id,
          false,
          0,
          [],
          true,
        );
      }
    }

    // Projectile hit detection — check distance each frame
    const projectiles = this.projectileFactory.getActiveProjectiles();
    for (const proj of projectiles) {
      if (!proj.alive) continue;

      let tx: number, ty: number;
      if (proj.targetEnemy && proj.targetEnemy.alive) {
        tx = proj.targetEnemy.x;
        ty = proj.targetEnemy.y;
      } else {
        tx = proj.targetX;
        ty = proj.targetY;
      }

      const dx = tx - proj.x;
      const dy = ty - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 14) {
        // Hit! Apply damage and recycle
        this.handleProjectileHit(proj);
        this.projectileFactory.recycle(proj);
      }
    }
  }

  private handleProjectileHit(proj: import('../entities/Projectile').Projectile): void {
    const config = proj.config;
    const sourceTower = this.towers.find(t => t.id === config.sourceTowerId);

    // ★ Emit hit event for audio feedback
    if (config.areaDamage && config.areaRadius > 0) {
      EventBus.emit(EVENTS.PROJECTILE_EXPLOSION, { x: proj.x, y: proj.y, radius: config.areaRadius });
    } else {
      EventBus.emit(EVENTS.PROJECTILE_HIT, { armorPen: config.armorPenetration, x: proj.x, y: proj.y });
    }

    // Calculate final damage with crit + vulnerable modifiers
    const finalDamage = this.calculateModifiedDamage(config.damage, sourceTower, null);

    if (config.areaDamage && config.areaRadius > 0) {
      // Area damage
      const hitX = proj.targetEnemy ? proj.targetEnemy.x : proj.targetX;
      const hitY = proj.targetEnemy ? proj.targetEnemy.y : proj.targetY;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = MathUtils.distance(hitX, hitY, enemy.x, enemy.y);
        if (dist <= config.areaRadius) {
          // Per-enemy damage with vulnerable check
          const dmg = this.calculateModifiedDamage(finalDamage, sourceTower, enemy);
          enemy.takeDamage(dmg, config.armorPenetration, `proj_${proj.id}`);
          // Apply effects from config and enchantments
          for (const effect of config.appliedEffects) {
            enemy.applyEffect(effect);
          }

          if (sourceTower) {
            this.applyEnchantmentHitEffects(sourceTower, enemy);
          }

          // Blast Shock combo: stun enemies at edge of explosion
          if (sourceTower && dist > config.areaRadius * 0.7) {
            const hasBlastShock = sourceTower.enchantments.some(
              i => i.definition.id === 'splash',
            ) && sourceTower.enchantments.some(
              i => i.definition.id === 'stun',
            );
            if (hasBlastShock && Math.random() < 0.3) {
              const stun = new StunEffect('combo_blast_shock', 500);
              enemy.applyEffect(stun);
            }
          }
        }
      }
    } else if (proj.targetEnemy && proj.targetEnemy.alive) {
      // Single target
      const dmg = this.calculateModifiedDamage(finalDamage, sourceTower, proj.targetEnemy);
      proj.targetEnemy.takeDamage(dmg, config.armorPenetration, `proj_${proj.id}`);
      for (const effect of config.appliedEffects) {
        proj.targetEnemy.applyEffect(effect);
      }

      if (sourceTower) {
        this.applyEnchantmentHitEffects(sourceTower, proj.targetEnemy);
      }
    }
  }

  /**
   * Calculate final damage factoring in crit and vulnerable effects
   */
  private calculateModifiedDamage(
    baseDamage: number,
    sourceTower: ITower | undefined,
    targetEnemy: IEnemy | null,
  ): number {
    let dmg = baseDamage;

    // Crit: 15% chance per stack to deal double damage
    if (sourceTower) {
      const critInst = sourceTower.enchantments.find(
        i => i.definition.id === 'crit',
      );
      if (critInst) {
        const critChance = Math.min(1, 0.15 * critInst.stackCount);
        if (Math.random() < critChance) {
          dmg *= 2;
        }
      }
    }

    // Frost + Arcane Focus combo: +50% damage against slowed enemies
    if (sourceTower && targetEnemy) {
      const hasFrost = sourceTower.enchantments.some(i => i.definition.id === 'frost');
      const hasArcane = sourceTower.enchantments.some(i => i.definition.id === 'arcane_focus');
      if (hasFrost && hasArcane && targetEnemy.hasEffect('slow')) {
        dmg = Math.round(dmg * 1.5);
      }
    }

    // Vulnerable: multiply damage if enemy has vulnerable effect
    if (targetEnemy) {
      for (const effect of targetEnemy.activeEffects) {
        if (effect.type === 'vulnerable') {
          const vuln = effect as VulnerableEffect;
          dmg = Math.round(dmg * vuln.multiplier);
          break;
        }
      }
    }

    return dmg;
  }

  /**
   * Apply enchantment on-hit effects for a tower hitting an enemy
   */
  private applyEnchantmentHitEffects(tower: ITower, enemy: IEnemy): void {
    for (const inst of tower.enchantments) {
      this.executeHitHook(
        'onProjectileHit',
        tower,
        enemy,
        inst.definition.id,
        inst.stackCount,
      );
    }
  }

  /**
   * Execute a specific enchantment effect based on enchantment ID
   */
  private executeHitHook(
    _event: string,
    _tower: ITower,
    enemy: IEnemy,
    enchantId: string,
    stackCount: number,
  ): void {
    switch (enchantId) {
      case 'poison': {
        // Poison: 5 dmg per tick, 3s duration
        const tickDmg = 5 * stackCount;
        const duration = 3000;
        const poison = new PoisonEffect('enchant_poison', tickDmg, duration, 1000);
        enemy.applyEffect(poison);
        break;
      }
      case 'frost': {
        // Frost: 30% slow for 2s
        const slowAmt = 0.3 * stackCount;
        const slowDuration = 2000;
        const slow = new SlowEffect('enchant_frost', slowAmt, slowDuration);
        enemy.applyEffect(slow);
        break;
      }
      case 'stun': {
        // Stun: 15% chance per stack to stun for 0.5s
        const chance = Math.min(1, 0.15 * stackCount);
        if (Math.random() < chance) {
          const stun = new StunEffect('enchant_stun', 500);
          enemy.applyEffect(stun);
        }
        break;
      }
      case 'splash': {
        // Splash: handled by area damage modifiers on tower stats — no extra action
        break;
      }
      default:
        break;
    }
  }

  // ─── Cleanup ─────────────────────────────────────

  destroy(): void {
    this.towers = [];
    this.enemies = [];
    this.active = false;
  }
}
