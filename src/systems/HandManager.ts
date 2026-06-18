import { MAX_HAND_SIZE, EVENTS } from '../constants';
import type { Card } from '../types';
import { CardType } from '../types';
import { EventBus } from '../core/EventBus';
import { createTowerCard, createEnchantmentCard, drawRandomCard } from '../data/CardLibrary';

/**
 * HandManager — 手牌管理系统
 *
 * 职责：
 *   - 手牌数组管理（增删、上限控制、补牌）
 *   - 卡牌打出验证与执行
 *   - 暂存区（超上限卡牌暂存）
 */
export class HandManager {
  private hand: Card[] = [];
  private overflow: Card[] = []; // 暂存区
  private maxSize: number;

  constructor(maxSize: number = MAX_HAND_SIZE) {
    this.maxSize = maxSize;
  }

  // ─── Queries ─────────────────────────────────────

  getHand(): readonly Card[] {
    return this.hand;
  }

  getHandSize(): number {
    return this.hand.length;
  }

  getMaxSize(): number {
    return this.maxSize;
  }

  getOverflow(): readonly Card[] {
    return this.overflow;
  }

  // ─── Mutations ───────────────────────────────────

  /**
   * 添加卡牌到手牌。
   * 手牌满时触发替换选择事件。
   */
  addCard(card: Card): boolean {
    if (this.hand.length < this.maxSize) {
      const cardToAdd = { ...card }; // shallow copy for id uniqueness
      this.hand.push(cardToAdd);
      EventBus.emit(EVENTS.HAND_CHANGED, { hand: [...this.hand] });
      return true;
    } else {
      // Trigger hand replacement UI
      EventBus.emit(EVENTS.HAND_REPLACE_SHOW, {
        newCard: card,
        hand: [...this.hand],
      });
      return false;
    }
  }

  /**
   * 替换手牌中的一张卡牌（手牌替换选择结果）
   */
  replaceCard(handIndex: number, newCard: Card): void {
    if (handIndex < 0 || handIndex >= this.hand.length) return;
    this.hand[handIndex] = { ...newCard };
    EventBus.emit(EVENTS.HAND_CHANGED, { hand: [...this.hand] });
  }

  /**
   * 从手牌打出一张卡牌
   */
  playCard(cardIndex: number): Card | null {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return null;

    const card = this.hand.splice(cardIndex, 1)[0];
    EventBus.emit(EVENTS.CARD_PLAYED, { card });
    EventBus.emit(EVENTS.HAND_CHANGED, { hand: [...this.hand] });

    return card;
  }

  /**
   * 从手牌移除一张卡牌（不触发打出事件）
   */
  removeCard(cardIndex: number): Card | null {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return null;
    const card = this.hand.splice(cardIndex, 1)[0];
    EventBus.emit(EVENTS.HAND_CHANGED, { hand: [...this.hand] });
    return card;
  }

  /**
   * 补牌至上限（从随机池抽取）
   */
  drawToMax(): void {
    while (this.hand.length < this.maxSize) {
      const card = drawRandomCard();
      this.hand.push(card);
    }

    // Also try to bring cards from overflow
    while (this.hand.length < this.maxSize && this.overflow.length > 0) {
      this.hand.push(this.overflow.shift()!);
    }

    EventBus.emit(EVENTS.HAND_CHANGED, { hand: [...this.hand] });
  }

  /**
   * 从暂存区选择一张卡牌替换手牌中的卡牌
   */
  swapFromOverflow(handIndex: number, overflowIndex: number): void {
    if (handIndex < 0 || handIndex >= this.hand.length) return;
    if (overflowIndex < 0 || overflowIndex >= this.overflow.length) return;

    const handCard = this.hand[handIndex];
    const overflowCard = this.overflow[overflowIndex];
    this.hand[handIndex] = overflowCard;
    this.overflow[overflowIndex] = handCard;

    EventBus.emit(EVENTS.HAND_CHANGED, { hand: [...this.hand] });
  }

  /**
   * 初始化手牌（从起始卡组配置）
   */
  initHand(startingCards: Array<{ type: string; towerType?: string; enchantmentId?: string }>): void {
    this.hand = [];
    this.overflow = [];

    for (const sc of startingCards) {
      if (sc.type === 'TOWER' && sc.towerType) {
        const card = createTowerCard(sc.towerType as any);
        this.hand.push(card);
      } else if (sc.type === 'ENCHANTMENT' && sc.enchantmentId) {
        const card = createEnchantmentCard(sc.enchantmentId);
        this.hand.push(card);
      }
    }

    // Fill remaining slots with random cards
    this.drawToMax();

    EventBus.emit(EVENTS.HAND_CHANGED, { hand: [...this.hand] });
  }

  // ─── Reset ───────────────────────────────────────

  reset(): void {
    this.hand = [];
    this.overflow = [];
  }
}
