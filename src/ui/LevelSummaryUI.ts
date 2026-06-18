import Phaser from 'phaser';
import { DEPTH } from '../constants';
import type { LevelStats } from '../core/StatsTracker';
import { getEnemyDefinition } from '../data/EnemyRegistry';

const enemyNames: Record<string, string> = {
  SCOUT: '快速斥候',
  TANK: '装甲巨魔',
  BASIC: '普通怪物',
  SUMMONER: '召唤师',
  VENOM: '毒液怪',
  FLYING: '飞行单位',
  SPLITTER: '分裂怪',
  SWAMP_BOSS: '沼泽巨鳄',
  MOUNTAIN_BOSS: '熔岩巨像',
  CHAOS_BOSS: '混沌领主',
};

/**
 * LevelSummaryUI — 关卡结算统计界面
 *
 * 胜利后弹出，展示本局详细数据。
 * 点击任意位置继续到 GameOverOverlay。
 */
export class LevelSummaryUI {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Container | null = null;
  private onClose: () => void;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    this.scene = scene;
    this.onClose = onClose;
  }

  show(stats: LevelStats): void {
    if (this.overlay) return;
    const { width: W, height: H } = this.scene.cameras.main;
    this.overlay = this.scene.add.container(0, 0).setDepth(DEPTH.OVERLAY_BG);

    // 背景遮罩
    const bd = this.scene.add.graphics();
    bd.fillStyle(0x000000, 0.6);
    bd.fillRect(0, 0, W, H);
    this.overlay.add(bd);

    // 主面板
    const pw = 520, ph = 480;
    const cx = W / 2, cy = H / 2;

    // 阴影
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(cx - pw / 2 + 5, cy - ph / 2 + 6, pw, ph, 20);
    this.overlay.add(shadow);

    // 面板背景
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1A1815, 0.95);
    panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 20);
    panel.lineStyle(2, 0xFFD700, 0.4);
    panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 20);
    this.overlay.add(panel);

    // 标题
    const title = this.scene.add.text(cx, cy - ph / 2 + 28, '📊 关卡统计', {
      fontSize: '24px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#FFD700', stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlay.add(title);

    let yOff = cy - ph / 2 + 60;

    // 分割线
    const divider = (y: number) => {
      const g = this.scene.add.graphics();
      g.lineStyle(1, 0xFFFFFF, 0.08);
      g.beginPath();
      g.moveTo(cx - pw / 2 + 30, y);
      g.lineTo(cx + pw / 2 - 30, y);
      g.strokePath();
      this.overlay!.add(g);
    };

    divider(yOff);
    yOff += 10;

    // ── 击杀统计 ──
    const addSection = (icon: string, text: string, y: number): number => {
      const lbl = this.scene.add.text(cx - pw / 2 + 30, y, `${icon} ${text}`, {
        fontSize: '14px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        color: '#DDDDDD', stroke: '#000', strokeThickness: 2, fontStyle: 'bold',
      }).setOrigin(0, 0);
      this.overlay!.add(lbl);
      return y + 22;
    };

    yOff = addSection('⚔️', '击杀统计', yOff);

    // 按敌人类型排列击杀数
    const typeKeys = Object.keys(stats.killsPerType);
    if (typeKeys.length > 0) {
      // 按数量排序（从多到少）
      typeKeys.sort((a, b) => (stats.killsPerType[b] || 0) - (stats.killsPerType[a] || 0));

      for (const type of typeKeys) {
        const count = stats.killsPerType[type] || 0;
        const name = enemyNames[type] || type;
        const def = getEnemyDefinition(type as any);
        const color = def ? `#${def.color.toString(16).padStart(6, '0')}` : '#888888';

        const row = this.scene.add.text(cx - pw / 2 + 45, yOff, `• ${name} ×${count}`, {
          fontSize: '12px', fontFamily: '"Microsoft YaHei", monospace',
          color, stroke: '#000', strokeThickness: 1,
        }).setOrigin(0, 0);
        this.overlay!.add(row);
        yOff += 17;
      }
    } else {
      const row = this.scene.add.text(cx - pw / 2 + 45, yOff, '(无击杀)', {
        fontSize: '12px', fontFamily: '"Microsoft YaHei", monospace',
        color: '#666666',
      }).setOrigin(0, 0);
      this.overlay!.add(row);
      yOff += 17;
    }

    yOff += 4;
    divider(yOff);
    yOff += 10;

    // ── 综合数据 ──
    yOff = addSection('📈', '综合数据', yOff);

    const lines: [string, string][] = [
      ['击杀总数', `${stats.totalKills}`],
      ['生命损失', `${stats.livesLost}`],
      ['波次完成', `${stats.wavesCompleted}`],
      ['精华收入', `${stats.essenceEarned}`],
      ['精华消耗', `${stats.essenceSpent}`],
      ['塔卡使用', `${stats.towerCardsUsed}`],
      ['附魔使用', `${stats.enchantCardsUsed}`],
      ['塔升级数', `${stats.towersUpgraded}`],
      ['卡牌出售', `${stats.cardsSold} (${stats.essenceFromSells}⭐)`],
    ];

    // 两列布局
    const col1X = cx - pw / 2 + 45;
    const col2X = cx + 20;
    let rowY = yOff;

    lines.forEach(([label, value], i) => {
      const x = i < Math.ceil(lines.length / 2) ? col1X : col2X;
      if (i === Math.ceil(lines.length / 2)) rowY = yOff; // reset row for second column

      const lbl = this.scene.add.text(x, rowY, label, {
        fontSize: '12px', fontFamily: '"Microsoft YaHei", monospace',
        color: '#AAAAAA', stroke: '#000', strokeThickness: 1,
      }).setOrigin(0, 0);
      this.overlay!.add(lbl);

      const val = this.scene.add.text(x + 120, rowY, value, {
        fontSize: '12px', fontFamily: 'monospace',
        color: '#FFD700', stroke: '#000', strokeThickness: 1, fontStyle: 'bold',
      }).setOrigin(0, 0);
      this.overlay!.add(val);

      if (i < Math.ceil(lines.length / 2) - 1) rowY += 18;
      else if (i >= Math.ceil(lines.length / 2) - 1 && i < lines.length - 1) rowY += 18;
    });

    yOff = rowY + 24;

    // ── 继续按钮（点击任意处） ──
    // 创建场景层级的点击zone，确保可交互
    const summary = this;
    const clickZone = this.scene.add.zone(cx, cy, pw, ph)
      .setInteractive({ useHandCursor: true })
      .setDepth(DEPTH.OVERLAY_BG + 1);
    clickZone.on('pointerdown', () => summary.close());

    // 底部提示
    const hint = this.scene.add.text(cx, cy + ph / 2 - 18, '点击任意位置继续', {
      fontSize: '13px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#888888', stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);
    this.overlay.add(hint);

    // 入场动画
    this.overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlay, alpha: 1, duration: 300,
    });
  }

  private close(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.onClose();
  }

  destroy(): void {
    this.overlay?.destroy();
    this.overlay = null;
  }
}
