import Phaser from 'phaser';
import { gameConfig } from './config';

/**
 * Card Tower Defense — 卡牌驱动塔防游戏
 * P0 核心闭环原型
 */
const game = new Phaser.Game(gameConfig);
(window as any).__PHASER_GAME__ = game;
