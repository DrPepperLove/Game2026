import Phaser from 'phaser';
import { TILE_TEXTURES } from '../constants';

// 地图装饰物素材清单
const PROP_SOURCES: Record<string, string> = {
  'prop_tree_large':   'Top-Down Simple Summer_prop - Tree Large.png',
  'prop_tree_medium':  'Top-Down Simple Summer_Prop - Tree Medium.png',
  'prop_tree_small':   'Top-Down Simple Summer_Prop - Tree Small.png',
  'prop_stump_short':  'Top-Down Simple Summer_Prop - Tree Stump Short.png',
  'prop_stump_tall':   'Top-Down Simple Summer_Prop - Tree Stump Tall.png',
  'prop_rock_01':      'Top-Down Simple Summer_Prop - Rock 01.png',
  'prop_rock_02':      'Top-Down Simple Summer_Prop - Rock 02.png',
  'prop_rock_03':      'Top-Down Simple Summer_Prop - Rock 03.png',
  'prop_rock_04':      'Top-Down Simple Summer_Prop - Rock 04.png',
  'prop_rock_05':      'Top-Down Simple Summer_Prop - Rock 05.png',
  'prop_bush_large':   'Top-Down Simple Summer_Prop - Bushes Large.png',
  'prop_bush_medium':  'Top-Down Simple Summer_Prop - Bushes Medium.png',
  'prop_bush_small':   'Top-Down Simple Summer_Prop - Bushes Small.png',
  'prop_campfire':     'Top-Down Simple Summer_Prop - Campfire.png',
  'prop_well':         'Top-Down Simple Summer_Prop - Well.png',
  'prop_barrel':       'Top-Down Simple Summer_Prop - Wooden Barrel.png',
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // Loading text
    const loadText = this.add.text(width / 2, height / 2 - 50, '⏳ 加载资源中...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e0d8c0',
    }).setOrigin(0.5);

    // Progress bar
    const box = this.add.graphics();
    box.fillStyle(0x3A2E1E, 0.8);
    box.fillRoundedRect(width / 2 - 160, height / 2 - 20, 320, 40, 8);

    const bar = this.add.graphics();
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x8CC63F, 1);
      bar.fillRoundedRect(width / 2 - 152, height / 2 - 13, 300 * v, 26, 6);
    });
    this.load.on('complete', () => {
      bar.destroy();
      box.destroy();
      loadText.destroy();
    });

    // 加载出错提示
    this.load.on('loaderror', (_file: any) => {
      loadText.setText('⚠️ 资源加载失败: ' + (_file?.key || _file?.url || 'unknown'));
      loadText.setColor('#ff6666');
    });

    // Load all tile textures
    const sources = TILE_TEXTURES.SOURCES as Record<string, string>;
    for (const [key, filename] of Object.entries(sources)) {
      this.load.image(key, `assets/images/tiles/${filename}`);
    }

    // Load decorative props
    for (const [key, filename] of Object.entries(PROP_SOURCES)) {
      this.load.image(key, `assets/images/tiles/${filename}`);
    }

    // Preload level data
    this.load.json('levels_index', 'assets/data/levels.json');

    // 预加载所有关卡 JSON（必须全部预加载，GameScene 从缓存读取）
    const levelIds = [
      'ch1_01', 'ch1_02', 'ch1_03',
      'ch2_01', 'ch2_02', 'ch2_03', 'ch2_04',
      'ch3_01', 'ch3_02', 'ch3_03', 'ch3_04',
      'ch4_01', 'ch4_02', 'ch4_03',
    ];
    for (const id of levelIds) {
      this.load.json(`level_${id}`, `assets/data/levels/level_${id}.json`);
    }
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
