import { GamePhase } from '../types';
import type { PlayerResources } from '../types';
import { DEFAULT_LIVES, DEFAULT_ESSENCE } from '../constants';
import { EventBus } from './EventBus';
import { EVENTS } from '../constants';

/**
 * GameStateManager — 集中式游戏状态管理
 *
 * 读写接口分离设计：
 *   - 公开的 getter 方法提供只读访问
 *   - 公开的 mutator 方法包含变更逻辑和事件发布
 *
 * 未来可与 LocalStorage 对接实现存档。
 */
export class GameStateManager {
  private _currentWave: number = 0;
  private _totalWaves: number = 0;
  private _phase: GamePhase = GamePhase.PREPARATION;
  private _resources: PlayerResources = { essence: DEFAULT_ESSENCE, lives: DEFAULT_LIVES };
  private _isGameOver: boolean = false;
  private _victory: boolean = false;

  // ─── Getters (Read-Only) ──────────────────────────

  get currentWave(): number { return this._currentWave; }
  get totalWaves(): number { return this._totalWaves; }
  get phase(): GamePhase { return this._phase; }
  get resources(): Readonly<PlayerResources> { return this._resources; }
  get isGameOver(): boolean { return this._isGameOver; }
  get victory(): boolean { return this._victory; }

  // ─── Initialization ────────────────────────────────

  init(totalWaves: number, baseLives: number): void {
    this._currentWave = 0;
    this._totalWaves = totalWaves;
    this._phase = GamePhase.PREPARATION;
    this._resources = { essence: DEFAULT_ESSENCE, lives: baseLives };
    this._isGameOver = false;
    this._victory = false;
  }

  // ─── Phase Transitions ─────────────────────────────

  setPhase(phase: GamePhase): void {
    if (this._phase === phase) return;
    this._phase = phase;
    EventBus.emit(EVENTS.PHASE_CHANGED, { phase });
  }

  // ─── Wave Tracking ─────────────────────────────────

  setWave(index: number): void {
    this._currentWave = index;
  }

  // ─── Resource Mutations ────────────────────────────

  addEssence(amount: number): void {
    this._resources = {
      ...this._resources,
      essence: this._resources.essence + amount,
    };
    EventBus.emit(EVENTS.RESOURCE_CHANGED, { ...this._resources });
  }

  deductEssence(amount: number): boolean {
    if (this._resources.essence < amount) return false;
    this._resources = {
      ...this._resources,
      essence: this._resources.essence - amount,
    };
    EventBus.emit(EVENTS.RESOURCE_CHANGED, { ...this._resources });
    return true;
  }

  deductLife(amount: number): void {
    this._resources = {
      ...this._resources,
      lives: Math.max(0, this._resources.lives - amount),
    };
    EventBus.emit(EVENTS.RESOURCE_CHANGED, { ...this._resources });

    if (this._resources.lives <= 0) {
      this.endGame(false);
    }
  }

  // ─── Game Over ─────────────────────────────────────

  endGame(victory: boolean): void {
    if (this._isGameOver) return;
    this._isGameOver = true;
    this._victory = victory;
    this._phase = GamePhase.GAME_OVER;
    EventBus.emit(EVENTS.GAME_OVER, { victory });
  }

  // ─── Reset ─────────────────────────────────────────

  reset(): void {
    this._currentWave = 0;
    this._totalWaves = 0;
    this._phase = GamePhase.PREPARATION;
    this._resources = { essence: DEFAULT_ESSENCE, lives: DEFAULT_LIVES };
    this._isGameOver = false;
    this._victory = false;
  }
}
