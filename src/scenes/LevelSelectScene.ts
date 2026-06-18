import Phaser from 'phaser';
import { loadCampaignSave, isLevelUnlocked, isLevelCompleted } from '../core/SaveManager';

interface LevelEntry {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  waves: number;
  chapter: number;
  unlocked: boolean;
}

const CHAPTER_CONFIG: Record<number, { title: string; subtitle: string; color: number }> = {
  1: { title: '第一章：边境哨所', subtitle: '翠绿草原 · 基础训练', color: 0x5BA0D9 },
  2: { title: '第二章：幽暗沼泽', subtitle: '暗紫沼泽 · 附魔与特殊敌人', color: 0x44BB66 },
  3: { title: '第三章：钢铁矿脉', subtitle: '灰褐矿山 · 重甲与分裂', color: 0xB0A090 },
  4: { title: '第四章：终焉之界', subtitle: '暗红混沌 · 终极决战', color: 0xDD6666 },
};

export class LevelSelectScene extends Phaser.Scene {
  private levels: LevelEntry[] = [];
  private mode: 'campaign' | 'normal' = 'normal';
  private completedLevels: string[] = [];
  private scrollY = 0;
  private contentContainer!: Phaser.GameObjects.Container;
  private maxScroll = 0;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    const { width: W, height: H } = this.cameras.main;

    // Read mode from scene data
    this.mode = (this.scene.settings.data as any)?.mode || 'normal';
    this.completedLevels = this.mode === 'campaign' ? loadCampaignSave().completedLevels : [];

    // Read levels from cache
    const cached = this.cache.json.get('levels_index') as LevelEntry[] | undefined;
    this.levels = (cached || []).sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.id.localeCompare(b.id);
    });

    // Apply unlock state for campaign mode
    if (this.mode === 'campaign') {
      for (const lv of this.levels) {
        lv.unlocked = isLevelUnlocked(lv.id, this.completedLevels);
      }
    } else {
      for (const lv of this.levels) {
        lv.unlocked = true;
      }
    }

    this.scrollY = 0;
    this.renderBackground();
    this.contentContainer = this.add.container(0, 0);
    this.renderUI();
    this.setupScroll();
  }

  private renderBackground(): void {
    const { width: W, height: H } = this.cameras.main;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1A1A2E, 0x1A1A2E, 0x2A1A1A, 0x2A1A1A, 1);
    bg.fillRect(0, 0, W, H);
  }

  private renderUI(): void {
    const { width: W } = this.cameras.main;
    let y = 50;

    // Title
    const modeLabel = this.mode === 'campaign' ? '⚔️ 生涯模式' : '🎯 普通模式';
    this.contentContainer.add(
      this.add.text(W / 2, y, modeLabel, {
        fontSize: '30px', fontFamily: 'Arial, sans-serif',
        color: '#F5DEB3', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5),
    );
    y += 50;

    // Back to mode select
    const backBtn = this.add.text(24, 20, '← 返回', {
      fontSize: '16px', fontFamily: 'Arial, sans-serif',
      color: '#9999AA', stroke: '#000', strokeThickness: 2,
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#CCCCDD'));
    backBtn.on('pointerout', () => backBtn.setColor('#9999AA'));
    backBtn.on('pointerdown', () => this.scene.start('ModeSelectScene'));
    this.contentContainer.add(backBtn);

    // Group by chapter
    const chapters = new Map<number, LevelEntry[]>();
    for (const lv of this.levels) {
      if (!chapters.has(lv.chapter)) chapters.set(lv.chapter, []);
      chapters.get(lv.chapter)!.push(lv);
    }

    const CARD_W = 200;
    const CARD_H = 80;
    const CARD_GAP = 14;

    for (const [chNum, chLevels] of chapters) {
      const cfg = CHAPTER_CONFIG[chNum];
      if (!cfg) continue;

      // Chapter header
      const headerG = this.add.graphics();
      headerG.fillStyle(cfg.color, 0.25);
      headerG.fillRoundedRect(W / 2 - 460, y, 920, 36, 6);
      headerG.lineStyle(2, cfg.color, 0.6);
      headerG.strokeRoundedRect(W / 2 - 460, y, 920, 36, 6);
      this.contentContainer.add(headerG);

      this.contentContainer.add(
        this.add.text(W / 2 - 440, y + 6, cfg.title, {
          fontSize: '18px', fontFamily: 'Arial, sans-serif',
          color: '#F5DEB3', stroke: '#000', strokeThickness: 2,
        }),
      );
      this.contentContainer.add(
        this.add.text(W / 2 + 200, y + 8, cfg.subtitle, {
          fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#AAAACC',
        }),
      );
      y += 50;

      // Level cards row
      const totalW = chLevels.length * CARD_W + (chLevels.length - 1) * CARD_GAP;
      const startX = W / 2 - totalW / 2 + CARD_W / 2;

      for (let i = 0; i < chLevels.length; i++) {
        const lv = chLevels[i];
        const cx = startX + i * (CARD_W + CARD_GAP);
        this.drawLevelCard(cx, y + CARD_H / 2, CARD_W, CARD_H, lv, cfg.color);
      }

      y += CARD_H + 20;
    }

    this.maxScroll = Math.max(0, y + 50 - 700);
  }

  private drawLevelCard(x: number, y: number, w: number, h: number, lv: LevelEntry, chColor: number): void {
    const hw = w / 2, hh = h / 2;
    const completed = this.mode === 'campaign' && isLevelCompleted(lv.id, this.completedLevels);
    const g = this.add.graphics();

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x - hw + 2, y - hh + 3, w, h, 10);

    // Card body
    let bgColor = 0x2A2A3A;
    if (!lv.unlocked) bgColor = 0x1A1A2A;
    else if (completed) bgColor = 0x2A3A2A; // slight green tint for completed
    g.fillStyle(bgColor, 0.92);
    g.fillRoundedRect(x - hw, y - hh, w, h, 10);

    // Left accent stripe
    g.fillStyle(chColor, lv.unlocked ? 0.8 : 0.3);
    g.fillRect(x - hw, y - hh, 5, h);

    // Border
    const diffColor = [0x8CC63F, 0xFFD700, 0xF0A050, 0xFF6B6B, 0xDD3333][lv.difficulty - 1] || 0x888888;
    g.lineStyle(1.5, lv.unlocked ? diffColor : 0x444444, 0.7);
    g.strokeRoundedRect(x - hw, y - hh, w, h, 10);
    this.contentContainer.add(g);

    if (!lv.unlocked) {
      // Locked
      const lockG = this.add.graphics();
      lockG.fillStyle(0x000000, 0.55);
      lockG.fillRoundedRect(x - hw, y - hh, w, h, 10);
      this.contentContainer.add(lockG);
      this.contentContainer.add(
        this.add.text(x, y, '🔒', { fontSize: '22px' }).setOrigin(0.5),
      );
      return;
    }

    // Level name
    const nameColor = completed ? '#AADDAA' : '#F5DEB3';
    this.contentContainer.add(
      this.add.text(x, y - hh + 14, `${completed ? '✓ ' : ''}${lv.name}`, {
        fontSize: '15px', fontFamily: 'Arial, sans-serif',
        color: nameColor, stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0),
    );

    // Difficulty dots
    const dots = '●'.repeat(lv.difficulty) + '○'.repeat(Math.max(0, 5 - lv.difficulty));
    this.contentContainer.add(
      this.add.text(x, y + 6, dots, {
        fontSize: '10px', fontFamily: 'Arial, sans-serif',
        color: '#CCCC88',
      }).setOrigin(0.5),
    );

    // Wave count + completion badge
    const waveText = `${lv.waves} 波`;
    this.contentContainer.add(
      this.add.text(x, y + hh - 16, waveText, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#888899',
      }).setOrigin(0.5),
    );

    // Interactive zone
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(x - hw + 2, y - hh + 3, w, h, 10);
      g.fillStyle(0x3A3A4A, 0.95);
      g.fillRoundedRect(x - hw, y - hh, w, h, 10);
      g.fillStyle(chColor, 0.8);
      g.fillRect(x - hw, y - hh, 5, h);
      g.lineStyle(2, chColor, 0.9);
      g.strokeRoundedRect(x - hw, y - hh, w, h, 10);
    });
    zone.on('pointerout', () => {
      g.clear();
      this.redrawCardBg(g, x, y, w, h, lv, chColor, completed, bgColor, diffColor);
    });
    zone.on('pointerdown', () => {
      this.scene.start('GameScene', { levelId: lv.id, mode: this.mode });
    });
    this.contentContainer.add(zone);
  }

  private redrawCardBg(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    lv: LevelEntry, chColor: number, completed: boolean,
    bgColor: number, diffColor: number,
  ): void {
    const hw = w / 2, hh = h / 2;
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x - hw + 2, y - hh + 3, w, h, 10);
    g.fillStyle(bgColor, 0.92);
    g.fillRoundedRect(x - hw, y - hh, w, h, 10);
    g.fillStyle(chColor, lv.unlocked ? 0.8 : 0.3);
    g.fillRect(x - hw, y - hh, 5, h);
    g.lineStyle(1.5, lv.unlocked ? diffColor : 0x444444, 0.7);
    g.strokeRoundedRect(x - hw, y - hh, w, h, 10);
  }

  private setupScroll(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.contentContainer.y = -this.scrollY;
    });
  }
}
