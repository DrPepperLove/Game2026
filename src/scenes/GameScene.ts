import Phaser from 'phaser';
import { EVENTS } from '../constants';
import { GamePhase } from '../types';
import type { Card, ITower } from '../types';
import { CardType } from '../types';
import { EventBus } from '../core/EventBus';
import { GameStateManager } from '../core/GameStateManager';
import { ServiceLocator } from '../core/ServiceLocator';
import { StatsTracker } from '../core/StatsTracker';
import { LevelSummaryUI } from '../ui/LevelSummaryUI';
import { MapManager } from '../systems/MapManager';
import { WaveManager } from '../systems/WaveManager';
import { HandManager } from '../systems/HandManager';
import { CombatManager } from '../systems/CombatManager';
import { EnchantmentManager } from '../systems/EnchantmentManager';
import { TowerFactory } from '../factories/TowerFactory';
import { getEnchantmentEssenceCost } from '../data/CardLibrary';
import { HUD } from '../ui/HUD';
import { CardHandUI } from '../ui/CardHandUI';
import { CardRewardUI } from '../ui/CardRewardUI';
import { HandReplaceUI } from '../ui/HandReplaceUI';
import { TowerInfoPanel } from '../ui/TowerInfoPanel';
import { WaveBanner } from '../ui/WaveBanner';
import { GameOverOverlay } from '../ui/GameOverOverlay';
import { BossHPBar } from '../ui/BossHPBar';
import { VisualEffectsManager } from '../systems/VisualEffectsManager';
import { AudioManager } from '../core/AudioManager';
import type { LevelConfig } from '../types';

/**
 * GameScene — 主游戏场景
 *
 * 波次流转：
 *   PREPARATION → (玩家点击"开始波次") → COMBAT → 波完成 → WAVE_TRANSITION
 *   → (玩家点击"下一波") → COMBAT → ... → 全部完成 → GAME_OVER(victory)
 */
export class GameScene extends Phaser.Scene {
  // Infrastructure
  private gameState!: GameStateManager;
  private locator!: ServiceLocator;
  private stats!: StatsTracker;
  private levelSummary!: LevelSummaryUI;
  private audio!: AudioManager;

  // Systems
  private mapManager!: MapManager;
  private waveManager!: WaveManager;
  private handManager!: HandManager;
  private combatManager!: CombatManager;
  private enchantmentManager!: EnchantmentManager;

  // Factories
  private towerFactory!: TowerFactory;

  // UI
  private hud!: HUD;
  private visualEffects!: VisualEffectsManager;
  private cardHandUI!: CardHandUI;
  private towerPanel!: TowerInfoPanel;
  private waveBanner!: WaveBanner;
  private gameOverOverlay!: GameOverOverlay;
  private bossHPBar!: BossHPBar;
  private cardRewardUI!: CardRewardUI;
  private handReplaceUI!: HandReplaceUI;

  // Interaction state
  private selectedCard: Card | null = null;
  private selectedCardIndex: number = -1;

  // Level config
  private levelConfig!: LevelConfig;
  private currentMode: string = 'normal';

  // Towers list (owned by this scene)
  private towers: ITower[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── Lifecycle ───────────────────────────────────

  create(): void {
    EventBus.removeAllListeners();

    this.gameState = new GameStateManager();
    this.locator = new ServiceLocator();
    this.stats = new StatsTracker();
    this.levelSummary = new LevelSummaryUI(this, () => {
      // 关卡统计关闭后 → 触发真正的 GameOver
      EventBus.emit(EVENTS.GAME_OVER, { victory: true });
    });
    this.towers = [];

    // Read params from scene data
    const data = (this.scene.settings.data as any) || {};
    const levelId = data.levelId || 'ch1_01';
    this.currentMode = data.mode || 'normal';

    // Load level by ID (from preloaded cache)
    const cacheKey = `level_${levelId}`;
    const cached = this.cache.json.get(cacheKey) as LevelConfig | undefined;
    this.levelConfig = cached!;
    this.levelConfig.id = levelId; // ensure ID is set
    this.initGame();
  }

  private initGame(): void {
    const config = this.levelConfig;
    this.gameState.init(config.waves.length, config.baseLives);

    // Systems
    this.audio = new AudioManager();
    this.audio.startMusic();
    this.visualEffects = new VisualEffectsManager(this);

    this.mapManager = new MapManager(this);
    this.mapManager.loadLevel(this.levelConfig);

    this.waveManager = new WaveManager(this);
    this.waveManager.loadLevel(this.levelConfig);

    this.handManager = new HandManager(this.levelConfig.maxHandSize);
    this.combatManager = new CombatManager(this);
    this.enchantmentManager = new EnchantmentManager();
    this.towerFactory = new TowerFactory(this);

    // UI
    this.hud = new HUD(this, this.currentMode);
    this.cardHandUI = new CardHandUI(this);
    this.towerPanel = new TowerInfoPanel(this);
    this.waveBanner = new WaveBanner(this);
    this.gameOverOverlay = new GameOverOverlay(this, this.currentMode, this.levelConfig.id);
    this.bossHPBar = new BossHPBar(this);
    this.cardRewardUI = new CardRewardUI(this);
    this.handReplaceUI = new HandReplaceUI(this);

    this.mapManager.enableInteraction();
    this.handManager.initHand(this.levelConfig.startingHand);
    this.setupInteraction();
    this.setupGameEvents();
    this.setupAudioEvents();

    // ★ 进入 PREPARATION 阶段 — 等待玩家点击"开始波次"
    this.gameState.setPhase(GamePhase.PREPARATION);

    // ★ 场景关闭时清理（不 restart，切场景用）
    this.events.on('shutdown', () => this.cleanupGame());
  }

  update(time: number, delta: number): void {
    if (this.gameState.phase === GamePhase.COMBAT) {
      this.combatManager.setEnemies(this.waveManager.getAliveEnemies());
      this.combatManager.update(time, delta);
    }
  }

  // ─── Game Events ─────────────────────────────────

  private setupGameEvents(): void {
    // --- 重新开始 ---
    EventBus.on(EVENTS.GAME_RESTART, () => this.restartGame());

    // --- 玩家点击"开始波次 / 下一波" ---
    EventBus.on(EVENTS.WAVE_START_REQUESTED, () => {
      if (this.gameState.isGameOver) return;
      if (
        this.gameState.phase !== GamePhase.PREPARATION &&
        this.gameState.phase !== GamePhase.WAVE_TRANSITION
      ) return;

      const started = this.waveManager.startNextWave();
      if (started) {
        this.gameState.setPhase(GamePhase.COMBAT);
        this.combatManager.setActive(true);
      }
    });

    // --- 一波完成 → 过渡 ---
    EventBus.on(EVENTS.WAVE_COMPLETE, () => {
      this.handManager.drawToMax();
      this.combatManager.setActive(false);

      if (!this.gameState.isGameOver) {
        this.gameState.setPhase(GamePhase.WAVE_TRANSITION);
      }
    });

    // --- 全波通关 → 先展示统计，再触发结束 ---
    EventBus.on(EVENTS.ALL_WAVES_DONE, () => {
      this.combatManager.setActive(false);
      if (!this.gameState.isGameOver) {
        this.stats.recordWaveComplete();
        this.levelSummary.show(this.stats.getStats());
      }
    });

    // --- 敌人到达基地 → 扣血 + 记录 ---
    EventBus.on(EVENTS.ENEMY_BASE_REACHED, (data: { enemy: { onReachedBase: () => number; enemyType?: string } }) => {
      const penalty = data.enemy.onReachedBase();
      this.gameState.deductLife(penalty);
      this.stats.recordLifeLost(penalty);
    });

    // --- 怪物掉落魔力 ---
    EventBus.on(EVENTS.RESOURCE_CHANGED, (data: { essenceGained?: number }) => {
      if (data.essenceGained) {
        this.gameState.addEssence(data.essenceGained);
      }
    });

    // --- 怪物掉落卡牌 ---
    EventBus.on(EVENTS.CARD_DRAWN, (data: { card: Card; fromDrop: boolean }) => {
      if (data.fromDrop) {
        this.handManager.addCard(data.card);
        this.stats.recordCardDrawn();
      }
    });

    // --- 击杀记录 ---
    EventBus.on(EVENTS.ENEMY_KILLED, (data: { enemy: { enemyType: string; definition: { stats: { rewardEssence: number; baseReachPenalty: number } } } }) => {
      // 经验附魔额外奖励
      const hasExperience = this.towers.some(
        t => t.enchantments.some(i => i.definition.id === 'experience'),
      );
      if (hasExperience) {
        this.gameState.addEssence(2);
      }

      // 统计击杀
      const e = data.enemy;
      this.stats.recordKill(e.enemyType, e.definition.stats.baseReachPenalty, e.definition.stats.rewardEssence);
    });

    // --- 卡牌3选1奖励 ---
    EventBus.on(EVENTS.CARD_REWARD_SELECTED, (data: { card: Card }) => {
      const added = this.handManager.addCard(data.card);
      if (!added) {
        // Hand is full — HandReplaceUI will handle it
        console.log('[Reward] Hand full, showing replace UI');
      }
    });

    // --- 手牌替换完成 ---
    EventBus.on(EVENTS.HAND_REPLACE_DONE, (data: { handIndex: number; newCard: Card }) => {
      if (data.handIndex >= 0) {
        this.handManager.replaceCard(data.handIndex, data.newCard);
      } else {
        // Skip: push to overflow via addCard
        this.handManager.addCard(data.newCard);
      }
    });

    // --- 游戏结束 ---
    EventBus.on(EVENTS.GAME_OVER, (data: { victory: boolean }) => {
      this.combatManager.setActive(false);
      this.selectedCard = null;
      this.cardHandUI.clearSelection();
      this.audio.playGameOver(data?.victory ?? false);
      this.audio.stopMusic();
    });
  }

  // ─── Audio Events ────────────────────────────────

  private setupAudioEvents(): void {
    // Wave
    EventBus.on(EVENTS.WAVE_START, () => this.audio.playWaveStart());
    EventBus.on(EVENTS.WAVE_COMPLETE, () => this.audio.playWaveComplete());
    EventBus.on(EVENTS.ALL_WAVES_DONE, () => this.audio.playAllWavesDone());

    // Tower attack
    EventBus.on(EVENTS.TOWER_ATTACK, (data: { towerType: string }) => {
      this.audio.playTowerAttack(data.towerType);
    });

    // Projectile hit
    EventBus.on(EVENTS.PROJECTILE_HIT, (data: { armorPen: boolean }) => {
      this.audio.playHit(data.armorPen);
    });
    EventBus.on(EVENTS.PROJECTILE_EXPLOSION, () => {
      this.audio.playExplosion();
    });

    // Enemy
    EventBus.on(EVENTS.ENEMY_KILLED, (data: { enemy: { enemyType?: string } }) => {
      const isBoss = data?.enemy?.enemyType === 'SWAMP_BOSS' ||
                     data?.enemy?.enemyType === 'MOUNTAIN_BOSS' ||
                     data?.enemy?.enemyType === 'CHAOS_BOSS';
      this.audio.playEnemyDeath(isBoss);
    });

    // Cards
    EventBus.on(EVENTS.CARD_SELECTED, () => this.audio.playCardSelect());
    EventBus.on(EVENTS.CARD_PLAYED, () => this.audio.playCardPlay());
    EventBus.on(EVENTS.CARD_SELL, () => this.audio.playCardSell());

    // Enchantment
    EventBus.on(EVENTS.ENCHANT_APPLIED, () => this.audio.playEnchantApply());
    EventBus.on(EVENTS.COMBO_ACTIVATED, () => this.audio.playComboActivate());

    // Essence
    EventBus.on(EVENTS.RESOURCE_CHANGED, (data: { essenceGained?: number }) => {
      if (data.essenceGained && data.essenceGained > 0) {
        this.audio.playEssenceGain();
      }
    });

    // Boss
    EventBus.on(EVENTS.BOSS_ALERT, () => this.audio.playBossIntro());

    // Enemy base reached → error sound
    EventBus.on(EVENTS.ENEMY_BASE_REACHED, () => this.audio.playUIError());

    // Tower demolish
    EventBus.on(EVENTS.TOWER_DEMOLISH, () => this.audio.playUIError());

    // Restart
    EventBus.on(EVENTS.GAME_RESTART, () => {
      this.audio.stopMusic();
      this.audio.startMusic();
    });

    // Upgrade (tower upgrade detected)
    EventBus.on(EVENTS.TOWER_DEPLOYED, () => this.audio.playCardPlay());
  }

  // ─── Interaction Setup ───────────────────────────

  private setupInteraction(): void {
    // --- Card selection ---
    EventBus.on(EVENTS.CARD_SELECTED, (data: { card: Card; index: number }) => {
      this.selectedCard = data.card;
      this.selectedCardIndex = data.index;
      EventBus.emit(EVENTS.TOWER_DESELECTED, {});

      // ★ 附魔卡：高亮所有兼容的防御塔
      if (data.card.type === CardType.ENCHANTMENT && data.card.enchantmentId) {
        this.highlightCompatibleTowers(data.card.enchantmentId);
      }

      // ★ 塔卡：高亮匹配类型塔（提示可升级）
      if (data.card.type === CardType.TOWER && data.card.towerType) {
        this.highlightMatchingTowers(data.card.towerType);
      }
    });

    EventBus.on(EVENTS.CARD_DESELECTED, () => {
      this.clearTowerHighlights();
      this.selectedCard = null;
      this.selectedCardIndex = -1;
    });

    // --- Build spot clicked → deploy tower ---
    EventBus.on(EVENTS.BUILD_SPOT_CLICKED, (data: { gridX: number; gridY: number }) => {
      if (!this.selectedCard) return;
      if (this.selectedCard.type !== CardType.TOWER) return;
      if (!this.selectedCard.towerType) return;
      if (this.mapManager.isSpotOccupied(data.gridX, data.gridY)) return;

      const tower = this.towerFactory.create(
        this.selectedCard.towerType,
        data.gridX,
        data.gridY,
      );
      this.towers.push(tower);
      this.combatManager.registerTower(tower);
      this.mapManager.markSpotOccupied(data.gridX, data.gridY, true);

      EventBus.emit(EVENTS.TOWER_DEPLOYED, { tower, action: 'deploy' });

      this.stats.recordTowerCardUsed();
      this.consumeSelectedCard();
    });

    // --- Tower clicked → upgrade or enchant ---
    EventBus.on(EVENTS.TOWER_SELECTED, (data: { tower: ITower }) => {
      if (!this.selectedCard) return;

      if (this.selectedCard.type === CardType.TOWER) {
        // 同类型塔卡 + 同类型已部署塔 → 升级
        if (
          this.selectedCard.towerType === data.tower.towerType &&
          data.tower.level < 3
        ) {
          const ok = data.tower.upgrade();
          if (ok) {
            console.log(`[Upgrade] ${data.tower.definition.name} → Lv.${data.tower.level}`);
            this.audio.playUpgrade();
            EventBus.emit(EVENTS.TOWER_DEPLOYED, { tower: data.tower, action: 'upgrade' });
            this.stats.recordTowerUpgrade();
            this.stats.recordTowerCardUsed();
            this.consumeSelectedCard();
            this.towerPanel.show(data.tower);
            return;
          }
        }

        // 不同类型或已满级 → 不操作塔，取消选卡（正常展示塔信息面板）
        this.clearTowerHighlights();
        this.selectedCard = null;
        this.selectedCardIndex = -1;
        this.cardHandUI.clearSelection();
        return;
      }

      if (this.selectedCard.type === CardType.ENCHANTMENT) {
        if (this.selectedCard.enchantmentId) {
          // ★ Essence cost check
          const essenceCost = getEnchantmentEssenceCost(this.selectedCard.enchantmentId);
          if (!this.gameState.deductEssence(essenceCost)) {
            console.log(`[Enchant] 精华不足 (需要 ${essenceCost})`);
            return;
          }

          const result = this.enchantmentManager.applyEnchantment(
            data.tower,
            this.selectedCard.enchantmentId,
          );
          console.log(`[Enchant] ${result.message}`);

          if (result.success) {
            this.stats.recordEnchantCardUsed();
            this.stats.recordEssenceSpent(essenceCost);
            this.consumeSelectedCard();
            this.towerPanel.show(data.tower);
          } else {
            // Refund essence if enchantment failed
            this.gameState.addEssence(essenceCost);
          }
        }
      }
    });

    // --- Demolish tower ---
    EventBus.on(EVENTS.TOWER_DEMOLISH, (data: { tower: ITower; refund: number }) => {
      this.demolishTower(data.tower);
      this.gameState.addEssence(data.refund);
      EventBus.emit(EVENTS.TOWER_DESELECTED, {});
      console.log(`[Demolish] Refunded ${data.refund} essence`);
    });

    // --- Sell card from hand ---
    EventBus.on(EVENTS.CARD_SELL, (data: { card: Card; index: number; value: number }) => {
      this.handManager.removeCard(data.index);
      this.gameState.addEssence(data.value);
      this.stats.recordCardSold(data.value);
      this.clearTowerHighlights();
      this.selectedCard = null;
      this.selectedCardIndex = -1;
      console.log(`[Sell] ${data.card.name} → +${data.value} essence`);
    });

    // --- Demolish tower → track ---
    EventBus.on(EVENTS.TOWER_DEMOLISH, (data: { tower: ITower; refund: number }) => {
      this.stats.recordTowerDemolish();
    });

    // --- Damage dealt → track ---
    EventBus.on(EVENTS.ENEMY_DAMAGED, (data: { damage: number }) => {
      if (data.damage > 0) {
        this.stats.recordDamageDealt(data.damage);
      }
    });

    // --- Remove enchantment ---
    EventBus.on(EVENTS.ENCHANT_REMOVED, (data: { tower: ITower; slotIndex: number }) => {
      this.enchantmentManager.removeEnchantment(data.tower, data.slotIndex);
      const tower = this.towers.find(t => t.id === data.tower.id);
      if (tower) {
        this.towerPanel.show(tower);
      }
    });
  }

  // ─── Tower Highlight Helpers ──────────────────────

  /** 选附魔卡时，高亮所有可施加该附魔的塔 */
  private highlightCompatibleTowers(enchantmentId: string): void {
    for (const tower of this.towers) {
      if (tower.canAcceptEnchantment(enchantmentId)) {
        tower.setHighlight(true);
      }
    }
  }

  /** 选塔卡时，高亮所有同类型塔（提示可升级） */
  private highlightMatchingTowers(towerType: import('../types').TowerType): void {
    for (const tower of this.towers) {
      if (tower.towerType === towerType && tower.level < 3) {
        tower.setHighlight(true);
      }
    }
  }

  /** 清除所有塔的高亮状态 */
  private clearTowerHighlights(): void {
    for (const tower of this.towers) {
      tower.setHighlight(false);
    }
  }

  // ─── Helpers ─────────────────────────────────────

  private consumeSelectedCard(): void {
    // Clear highlights before consuming card
    this.clearTowerHighlights();
    if (this.selectedCardIndex >= 0) {
      this.handManager.playCard(this.selectedCardIndex);
    }
    this.selectedCard = null;
    this.selectedCardIndex = -1;
    this.cardHandUI.clearSelection();
  }

  private demolishTower(tower: ITower): void {
    this.combatManager.removeTower(tower.id);
    this.mapManager.markSpotOccupied(tower.gridX, tower.gridY, false);
    this.towers = this.towers.filter(t => t.id !== tower.id);
    (tower as unknown as Phaser.GameObjects.GameObject).destroy();
  }

  // ─── Restart ─────────────────────────────────────

  private cleanupGame(): void {
    for (const tower of this.towers) {
      (tower as unknown as Phaser.GameObjects.GameObject).destroy();
    }
    this.towers = [];

    this.mapManager?.destroy();
    this.waveManager?.destroy();
    this.combatManager?.destroy();
    this.cardHandUI?.destroy();
    this.towerPanel?.destroy();
    this.hud?.destroy();
    this.visualEffects?.destroy();
    this.audio?.destroy();
    this.gameOverOverlay?.destroy();
    this.bossHPBar?.destroy();
    this.cardRewardUI?.destroy();
    this.handReplaceUI?.destroy();
    this.levelSummary?.destroy();

    EventBus.removeAllListeners();
  }

  private restartGame(): void {
    this.cleanupGame();
    this.scene.restart();
  }
}
