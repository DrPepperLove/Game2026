import type { TowerType } from './ITower';

// ─── Card Types ─────────────────────────────────────────

export enum CardType {
  TOWER = 'TOWER',
  ENCHANTMENT = 'ENCHANTMENT',
}

export interface Card {
  id: string;                // unique instance id
  type: CardType;
  towerType?: TowerType;     // if TOWER card
  enchantmentId?: string;    // if ENCHANTMENT card
  name: string;
  description: string;
  cost: number;              // card resource cost to play
  color: number;             // hex color for placeholder
}
