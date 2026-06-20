import Phaser from 'phaser';
import { gameConfig } from './config';

// 在页面上显示状态，方便调试启动问题
const statusEl = document.createElement('div');
statusEl.id = 'game-status';
statusEl.style.cssText =
  'position:fixed;top:0;left:0;right:0;z-index:999;padding:8px 16px;' +
  'font-family:monospace;font-size:13px;color:#fff;background:rgba(0,0,0,0.85);' +
  'pointer-events:none;text-align:center;';
statusEl.textContent = '正在初始化 Phaser...';
document.body.appendChild(statusEl);

try {
  const game = new Phaser.Game(gameConfig);
  (window as any).__PHASER_GAME__ = game;

  game.events.on('ready', () => {
    statusEl.textContent = '游戏已启动';
    statusEl.style.background = 'rgba(0,128,0,0.8)';
    setTimeout(() => statusEl.remove(), 1500);
  });
} catch (err: any) {
  statusEl.textContent = '游戏启动失败: ' + (err?.message || String(err));
  statusEl.style.background = 'rgba(200,0,0,0.9)';
  statusEl.style.color = '#fff';
  statusEl.style.pointerEvents = 'auto';
  console.error('Game init failed:', err);
}
