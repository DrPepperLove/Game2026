import Phaser from 'phaser';
import {
  EVENTS, WAVE_TRANSITION_DELAY,
  VENOM_POOL_DURATION, VENOM_POOL_DAMAGE, VENOM_POOL_TICK, VENOM_POOL_RADIUS,
  COLORS, DEPTH,
} from '../constants';
import { EnemyType } from '../types';
import type { WaveConfig, LevelConfig, IEnemy } from '../types';
import { EnemyFactory } from '../factories/EnemyFactory';
import { EventBus } from '../core/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { drawRandomCard, generateCardReward } from '../data/CardLibrary';

/**
 * WaveManager — 波次调度系统
 *
 * 职责：
 *   - 按关卡配置生成敌人波次
 *   - 追踪波次状态（活跃敌人数量、波次完成等）
 *   - 管理波次间过渡
 *   - 监听敌人死亡，触发卡牌掉落
 */
export class WaveManager {
  private scene: Phaser.Scene;
  private enemyFactory: EnemyFactory;
  private config: LevelConfig | null = null;
  private enemies: IEnemy[] = [];
  private currentWaveIndex: number = 0;
  private waveActive: boolean = false;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private spawnedInWave: number = 0;
  private totalInWave: number = 0;
  private killedInWave: number = 0;
  private waypoints: Array<{ x: number; y: number }> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.enemyFactory = new EnemyFactory(scene);

    // Listen for enemy kills to trigger card drops
    EventBus.on(EVENTS.ENEMY_KILLED, this.onEnemyKilled, this);
    EventBus.on(EVENTS.ENEMY_BASE_REACHED, this.onEnemyReachedBase, this);
    EventBus.on(EVENTS.ENEMY_SPAWN_REQUEST, this.onSpawnRequest, this);
    EventBus.on(EVENTS.VENOM_POOL_SPAWN, this.onVenomPoolSpawn, this);
  }

  // ─── Initialization ──────────────────────────────

  loadLevel(config: LevelConfig): void {
    this.config = config;
    this.waypoints = config.pathWaypoints;
    this.currentWaveIndex = 0;
    this.enemies = [];
    this.waveActive = false;
  }

  getEnemies(): IEnemy[] {
    return this.enemies;
  }

  getAliveEnemies(): IEnemy[] {
    return this.enemies.filter(e => e.alive);
  }

  // ─── Wave Control ────────────────────────────────

  startNextWave(): boolean {
    if (!this.config) return false;
    if (this.currentWaveIndex >= this.config.waves.length) return false;

    const waveCfg = this.config.waves[this.currentWaveIndex];
    this.totalInWave = waveCfg.count;
    this.spawnedInWave = 0;
    this.killedInWave = 0;
    this.waveActive = true;

    EventBus.emit(EVENTS.WAVE_START, {
      waveIndex: this.currentWaveIndex,
      total: this.config.waves.length,
    });

    // Start spawning after startDelay
    this.spawnTimer?.destroy();
    this.spawnTimer = this.scene.time.addEvent({
      delay: waveCfg.spawnInterval,
      callback: () => this.spawnEnemy(waveCfg),
      repeat: waveCfg.count - 1,
      startAt: waveCfg.startDelay,
    });

    this.currentWaveIndex++;
    return true;
  }

  private spawnEnemy(waveCfg: WaveConfig): void {
    if (this.spawnedInWave >= this.totalInWave) return;

    const enemy = this.enemyFactory.create(
      waveCfg.enemyType,
      this.waypoints,
    );
    this.enemies.push(enemy);
    this.spawnedInWave++;

    EventBus.emit(EVENTS.ENEMY_SPAWNED, { enemy });

    // ★ Boss alert for audio/visual feedback
    if (waveCfg.enemyType === EnemyType.SWAMP_BOSS ||
        waveCfg.enemyType === EnemyType.MOUNTAIN_BOSS ||
        waveCfg.enemyType === EnemyType.CHAOS_BOSS) {
      EventBus.emit(EVENTS.BOSS_ALERT, { enemyType: waveCfg.enemyType, enemy });
    }
  }

  // ─── Event Handlers ──────────────────────────────

  private onEnemyKilled(data: { enemy: IEnemy }): void {
    this.killedInWave++;

    const def = data.enemy.definition;
    const rarity = def.stats.rarity || 'normal';

    // Card drop — tier-based
    if (MathUtils.chance(def.stats.cardDropChance)) {
      if (rarity === 'elite' || rarity === 'boss') {
        // Elite/Boss: 3-choice reward
        const cards = generateCardReward(rarity);
        EventBus.emit(EVENTS.CARD_REWARD_SHOW, { cards, source: 'kill' });
      } else {
        // Normal: random card auto-added to hand
        const card = drawRandomCard();
        EventBus.emit(EVENTS.CARD_DRAWN, { card, fromDrop: true });
      }
    }

    // Essence reward
    EventBus.emit(EVENTS.RESOURCE_CHANGED, {
      essenceGained: def.stats.rewardEssence + (rarity === 'boss' ? 10 : rarity === 'elite' ? 5 : 0),
    });

    this.checkWaveComplete();
  }

  private onEnemyReachedBase(data: { enemy: IEnemy }): void {
    this.killedInWave++; // Count as "removed" from play
    this.checkWaveComplete();
  }

  /**
   * Handle spawn requests from summoner / splitter enemies
   */
  private onSpawnRequest(data: {
    enemyType: EnemyType;
    x: number;
    y: number;
    waypoints: Array<{ x: number; y: number }>;
  }): void {
    const enemy = this.enemyFactory.create(
      data.enemyType,
      data.waypoints,
      data.x,
      data.y,
    );
    this.enemies.push(enemy);
    EventBus.emit(EVENTS.ENEMY_SPAWNED, { enemy });
  }

  /**
   * Spawn a venom pool at the death location of a Venom enemy
   */
  private onVenomPoolSpawn(data: { x: number; y: number }): void {
    const { x, y } = data;

    // Visual pool
    const pool = this.scene.add.graphics();
    pool.fillStyle(COLORS.POISON_TINT, 0.3);
    pool.fillCircle(x, y, VENOM_POOL_RADIUS);
    pool.setDepth(DEPTH.ENEMIES + 1);

    // Tick damage timer
    const tickTimer = this.scene.time.addEvent({
      delay: VENOM_POOL_TICK,
      callback: () => {
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          const dist = MathUtils.distance(x, y, enemy.x, enemy.y);
          if (dist <= VENOM_POOL_RADIUS) {
            enemy.takeDamage(VENOM_POOL_DAMAGE, true, 'venom_pool');
          }
        }
      },
      repeat: Math.floor(VENOM_POOL_DURATION / VENOM_POOL_TICK) - 1,
    });

    // Cleanup after duration
    this.scene.time.delayedCall(VENOM_POOL_DURATION, () => {
      tickTimer.destroy();
      pool.destroy();
    });
  }

  private checkWaveComplete(): void {
    if (!this.waveActive) return;
    if (!this.config) return;

    // Wave complete when all enemies spawned and all killed/removed
    const allSpawned = this.spawnedInWave >= this.totalInWave;
    const aliveCount = this.getAliveEnemies().length;

    if (allSpawned && aliveCount <= 0) {
      this.waveActive = false;
      EventBus.emit(EVENTS.WAVE_COMPLETE, {
        waveIndex: this.currentWaveIndex - 1,
        total: this.config.waves.length,
      });

      // Wave completion bonus: show 3-choice reward every 2 waves + final wave
      const isFinalWave = this.currentWaveIndex >= this.config.waves.length;
      const isMilestone = (this.currentWaveIndex === this.config.waves.length) ||
                          (this.currentWaveIndex % 2 === 0);
      if (isMilestone) {
        const rarity = isFinalWave ? 'elite' : 'normal';
        const bonusCards = generateCardReward(rarity);
        EventBus.emit(EVENTS.CARD_REWARD_SHOW, { cards: bonusCards, source: 'wave_complete' });
      }

      if (this.currentWaveIndex >= this.config.waves.length) {
        // All waves done
        this.scene.time.delayedCall(WAVE_TRANSITION_DELAY, () => {
          EventBus.emit(EVENTS.ALL_WAVES_DONE, {});
        });
      }
    }
  }

  // ─── Cleanup ─────────────────────────────────────

  destroy(): void {
    this.spawnTimer?.destroy();
    for (const enemy of this.enemies) {
      if (enemy.alive) {
        (enemy as unknown as Phaser.GameObjects.GameObject)?.destroy();
      }
    }
    this.enemies = [];
    EventBus.off(EVENTS.ENEMY_KILLED, this.onEnemyKilled, this);
    EventBus.off(EVENTS.ENEMY_BASE_REACHED, this.onEnemyReachedBase, this);
    EventBus.off(EVENTS.ENEMY_SPAWN_REQUEST, this.onSpawnRequest, this);
    EventBus.off(EVENTS.VENOM_POOL_SPAWN, this.onVenomPoolSpawn, this);
  }
}
