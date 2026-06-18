// ─── Game Phase ─────────────────────────────────────────

export enum GamePhase {
  PREPARATION = 'PREPARATION',
  COMBAT = 'COMBAT',
  WAVE_TRANSITION = 'WAVE_TRANSITION',
  GAME_OVER = 'GAME_OVER',
}

// ─── Player Resources ───────────────────────────────────

export interface PlayerResources {
  essence: number;
  lives: number;
}

// ─── Game State ─────────────────────────────────────────

export interface IGameState {
  readonly currentWave: number;
  readonly totalWaves: number;
  readonly phase: GamePhase;
  readonly resources: PlayerResources;
  readonly isGameOver: boolean;
  readonly victory: boolean;
}
