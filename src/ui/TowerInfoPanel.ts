import Phaser from 'phaser';
import { DEPTH, EVENTS, COLORS } from '../constants';
import type { ITower } from '../types';
import { EventBus } from '../core/EventBus';

export class TowerInfoPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private currentTower: ITower | null = null;
  private static readonly PANEL_W = 250;
  private static readonly PANEL_H = 460;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    EventBus.on(EVENTS.TOWER_SELECTED, (data: { tower: ITower }) => this.show(data.tower));
    EventBus.on(EVENTS.TOWER_DESELECTED, () => this.hide());
    this.scene.input.on('pointerdown', (_p: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      if (objs.length === 0) EventBus.emit(EVENTS.TOWER_DESELECTED, {});
    });
  }

  show(tower: ITower): void {
    this.hide();
    tower.showRange(true);

    const { width: sw, height: sh } = this.scene.cameras.main;
    const px = sw - TowerInfoPanel.PANEL_W / 2 - 12;
    const py = sh / 2 + 8;
    this.currentTower = tower;

    const container = this.scene.add.container(px, py).setDepth(DEPTH.PANEL);
    this.container = container;
    const pw = TowerInfoPanel.PANEL_W, ph = TowerInfoPanel.PANEL_H;
    const hw = pw / 2, hh = ph / 2;

    // ── Panel background with shadow ──────────────────
    const bg = this.scene.add.graphics();
    // Shadow
    bg.fillStyle(0x000000, 0.2);
    bg.fillRoundedRect(-hw + 3, -hh + 4, pw, ph, 16);
    // Main background
    bg.fillStyle(0x1A1510, 0.92);
    bg.fillRoundedRect(-hw, -hh, pw, ph, 16);
    // Top accent stripe
    bg.fillStyle(0x3A2E1E, 0.6);
    bg.fillRoundedRect(-hw + 1, -hh + 1, pw - 2, 50, { tl: 15, tr: 15, bl: 0, br: 0 });
    // Border
    bg.lineStyle(2, 0x5A4E3E, 0.8);
    bg.strokeRoundedRect(-hw, -hh, pw, ph, 16);
    bg.lineStyle(1, 0xD4B896, 0.15);
    bg.strokeRoundedRect(-hw + 2, -hh + 2, pw - 4, ph - 4, 14);
    container.add(bg);

    let yOff = -hh + 18;

    // ── Title + level ─────────────────────────────────
    const towerColor = COLORS.TEXT_ACCENT;
    const titleStr = tower.level > 1
      ? `${tower.definition.name} Lv.${tower.level}`
      : tower.definition.name;
    const title = this.scene.add.text(0, yOff, titleStr, {
      fontSize: '18px',
      fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    container.add(title);
    yOff += 28;

    // ── Level hint ──────────────────────────────────
    if (tower.level < 3) {
      const hint = this.scene.add.text(0, yOff, `⭐ 可升级 ${tower.level}/3`, {
        fontSize: '11px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        color: '#D4891A',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 0);
      container.add(hint);
      yOff += 16;
    } else {
      const maxed = this.scene.add.text(0, yOff, '🌟 已满级', {
        fontSize: '11px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
        color: '#FFD700',
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 0);
      container.add(maxed);
      // Pulsing glow
      this.scene.tweens.add({
        targets: maxed, alpha: { from: 1, to: 0.5 },
        duration: 800, yoyo: true, repeat: -1,
      });
      yOff += 16;
    }

    // ── Divider ─────────────────────────────────────
    yOff = this.drawDivider(yOff);
    yOff += 2;

    // ── Stat blocks ─────────────────────────────────
    const stats = tower.getEffectiveStats();
    const statColor = '#DDD8D0';

    // Helper to draw a stat row
    const addStat = (icon: string, label: string, value: string, barRatio?: number, barColor?: number) => {
      const row = this.scene.add.text(-hw + 18, yOff, `${icon} ${label}: ${value}`, {
        fontSize: '12px', fontFamily: 'monospace', color: statColor,
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0, 0);
      container.add(row);
      yOff += 17;

      // Optional stat bar
      if (barRatio !== undefined && barRatio > 0) {
        const barW = 80, barH = 4;
        const barX = hw - 28 - barW;
        const bar = this.scene.add.graphics();
        // BG
        bar.fillStyle(0x333333, 0.6);
        bar.fillRoundedRect(barX, yOff - 13, barW, barH, 2);
        // Fill
        bar.fillStyle(barColor || 0x88CC44, 0.8);
        bar.fillRoundedRect(barX, yOff - 13, Math.max(4, barW * Math.min(1, barRatio)), barH, 2);
        container.add(bar);
      }
    };

    // Normalize stat values for visual bar display (0-1 range approx)
    const maxDmg = 80, maxSpeed = 3, maxRange = 250;
    addStat('⚔️', '伤害', String(stats.damage), stats.damage / maxDmg, 0xFF6644);
    addStat('⏱', '攻速', `${stats.attackSpeed.toFixed(1)}/s`, stats.attackSpeed / maxSpeed, 0x44BBFF);
    addStat('🎯', '射程', String(stats.range), stats.range / maxRange, 0x88DD44);
    addStat('⏳', '冷却', `${tower.getCooldownMs().toFixed(0)}ms`);
    if (stats.armorPenetration) {
      addStat('🛡', '特性', '无视护甲');
    }
    if (stats.areaDamage) {
      addStat('💥', '范围', `${Math.round(stats.areaRadius)}px`, stats.areaRadius / 120, 0xFF8800);
    }
    if (stats.slowAmount > 0) {
      addStat('🐢', '减速', `${(stats.slowAmount * 100).toFixed(0)}%`, stats.slowAmount, 0x66BBFF);
    }

    yOff += 2;

    // ── Divider ─────────────────────────────────────
    yOff = this.drawDivider(yOff);

    // ── Enchantment slots ────────────────────────────
    const enchLabel = this.scene.add.text(-hw + 18, yOff, '🔮 附魔', {
      fontSize: '13px', fontFamily: '"Microsoft YaHei", Arial, sans-serif',
      color: '#B07CD8',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0);
    container.add(enchLabel);
    yOff += 18;

    const maxSlots = tower.getMaxEnchantmentSlots();
    for (let i = 0; i < maxSlots; i++) {
      const ench = i < tower.enchantments.length ? tower.enchantments[i] : null;
      const slotBg = this.scene.add.graphics();
      if (ench) {
        slotBg.fillStyle(0x3A1A4A, 0.8);
        slotBg.fillRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
        slotBg.lineStyle(1, 0x8B5AB8, 0.6);
        slotBg.strokeRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
        // Combo highlight
        if (tower.enchantments.length >= 2) {
          slotBg.lineStyle(1, 0xFFD700, 0.2);
          slotBg.strokeRoundedRect(-hw + 15, yOff - 3, pw - 30, 22, 5);
        }
      } else {
        slotBg.fillStyle(0x222222, 0.4);
        slotBg.fillRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
        slotBg.lineStyle(1, 0x444444, 0.3);
        slotBg.strokeRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
      }
      container.add(slotBg);

      const slotText = ench
        ? `${ench.definition.name} ×${ench.stackCount}`
        : `[ 空槽 ${i + 1} ]`;
      const color = ench ? '#B07CD8' : '#666666';
      const slot = this.scene.add.text(0, yOff + 8, slotText, {
        fontSize: '11px', fontFamily: 'monospace', color,
        stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: !!ench });
      container.add(slot);

      if (ench) {
        slot.on('pointerdown', () => EventBus.emit(EVENTS.ENCHANT_REMOVED, {
          tower: this.currentTower, slotIndex: i, enchantId: ench.definitionId,
        }));
        slot.on('pointerover', () => {
          slot.setColor('#FF6666');
          slotBg.clear();
          slotBg.fillStyle(0x5A1A3A, 0.9);
          slotBg.fillRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
          slotBg.lineStyle(1, 0xFF4444, 0.8);
          slotBg.strokeRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
        });
        slot.on('pointerout', () => {
          slot.setColor('#B07CD8');
          slotBg.clear();
          slotBg.fillStyle(0x3A1A4A, 0.8);
          slotBg.fillRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
          slotBg.lineStyle(1, 0x8B5AB8, 0.6);
          slotBg.strokeRoundedRect(-hw + 16, yOff - 2, pw - 32, 20, 4);
        });
      }
      yOff += 22;
    }

    yOff += 22;

    // ── Demolish button ────────────────────────────
    const refund = Math.ceil(tower.getTotalInvestedCost() * 0.5);
    this.makeBtn(0, yOff, `🔨 拆除 (返还 ${refund})`, 0x883333, 0xAA4444, () => {
      EventBus.emit(EVENTS.TOWER_DEMOLISH, { tower: this.currentTower, refund });
    });
  }

  private drawDivider(y: number): number {
    const g = this.scene.add.graphics();
    g.lineStyle(1, 0x5A4E3E, 0.4);
    g.beginPath();
    g.moveTo(-TowerInfoPanel.PANEL_W / 2 + 20, y + 4);
    g.lineTo(TowerInfoPanel.PANEL_W / 2 - 20, y + 4);
    g.strokePath();
    this.container!.add(g);
    return y + 12;
  }

  private makeBtn(x: number, y: number, label: string, color: number, hoverColor: number, cb: () => void): void {
    const w = 140, h = 28;
    const bg = this.scene.add.graphics();
    const draw = (fill: number) => {
      bg.clear();
      bg.fillStyle(0x000000, 0.2);
      bg.fillRoundedRect(x - w / 2, y - h / 2 + 2, w, h, 8);
      bg.fillStyle(fill, 0.85);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      bg.lineStyle(1, 0xFFFFFF, 0.1);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    };
    draw(color);
    this.container!.add(bg);

    const t = this.scene.add.text(x, y, label, {
      fontSize: '12px', fontFamily: '"Microsoft YaHei", monospace', color: '#FFFFFF',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.container!.add(t);

    t.on('pointerover', () => { draw(hoverColor); this.scene.tweens.add({ targets: t, scaleX: 1.05, scaleY: 1.05, duration: 60 }); });
    t.on('pointerout', () => { draw(color); this.scene.tweens.add({ targets: t, scaleX: 1, scaleY: 1, duration: 60 }); });
    t.on('pointerdown', cb);
  }

  hide(): void {
    if (this.currentTower) this.currentTower.showRange(false);
    this.currentTower = null;
    this.container?.destroy();
    this.container = null;
  }

  destroy(): void { this.hide(); }
}
