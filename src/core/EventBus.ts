import Phaser from 'phaser';

/**
 * EventBus — 全局单例事件总线
 *
 * 系统间通信的唯一渠道。所有 Manager 和 UI 组件通过此总线
 * 订阅和发布事件，实现零直接依赖的松耦合架构。
 *
 * 使用 Phaser.Events.EventEmitter 作为底层实现，
 * 无需额外依赖。
 */
export const EventBus = new Phaser.Events.EventEmitter();
