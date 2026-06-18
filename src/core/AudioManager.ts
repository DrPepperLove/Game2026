/**
 * AudioManager — 程序化音效/音乐系统
 *
 * 使用 Web Audio API 合成所有音效，无需外部音频文件。
 * 所有方法都是"发射后即忘"(fire-and-forget)，不返回 AudioNode 引用。
 *
 * 设计原则：
 *   - 每个音效使用独立的振荡器/增益节点，播放完毕后自动断开
 *   - 背景音乐为简单的程序化循环旋律
 *   - 所有资源在 AudioContext 内管理，无需预加载外部文件
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

// ─── Utility: ramp-based gain envelope ──────────────

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  dest?: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(dest || ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoiseBurst(
  ctx: AudioContext,
  duration: number,
  volume: number = 0.08,
  lowPassFreq: number = 1000,
): void {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lowPassFreq, ctx.currentTime);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
}

// ─── AudioManager Class ─────────────────────────────

export class AudioManager {
  private ctx: AudioContext;
  private musicGain: GainNode;
  private sfxGain: GainNode;
  private musicPlaying: boolean = false;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private masterVolume: number = 0.5;

  // Background music state
  private musicNotes: number[] = [262, 294, 330, 349, 392, 349, 330, 294]; // C D E F G F E D
  private musicNoteIndex: number = 0;

  constructor() {
    this.ctx = getCtx();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.ctx.destination);
  }

  // ─── Master Control ───────────────────────────────

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.sfxGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMusicVolume(v: number): void {
    this.musicGain.gain.setValueAtTime(v * 0.08, this.ctx.currentTime);
  }

  // ─── SFX: Tower Attacks ──────────────────────────

  /** 箭塔射击声 — 短促高频 "嗖" */
  playArrowAttack(): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  /** 魔法塔射击声 — 魔法 "嗖" 带颤音 */
  playMagicAttack(): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.08);
    osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.2);
    // Vibrato
    const vibrato = ctx.createOscillator();
    const vGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(30, ctx.currentTime);
    vGain.gain.setValueAtTime(40, ctx.currentTime);
    vibrato.connect(vGain);
    vGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
    vibrato.start(ctx.currentTime);
    vibrato.stop(ctx.currentTime + 0.25);
  }

  /** 炮塔射击声 — 低沉 "砰" */
  playCannonAttack(): void {
    const ctx = this.ctx;
    // Low thump
    playTone(ctx, 80, 0.25, 'sine', 0.15, this.sfxGain);
    playTone(ctx, 55, 0.3, 'triangle', 0.08, this.sfxGain);
    playNoiseBurst(ctx, 0.15, 0.05, 500);
  }

  /** 凝滞塔 — 冰冻 "叮" */
  playSlowAttack(): void {
    const ctx = this.ctx;
    playTone(ctx, 1200, 0.4, 'sine', 0.06, this.sfxGain);
    playTone(ctx, 1800, 0.3, 'sine', 0.04, this.sfxGain);
    playTone(ctx, 800, 0.5, 'triangle', 0.05, this.sfxGain);
  }

  /** 根据塔类型播放攻击音效 */
  playTowerAttack(towerType: string): void {
    switch (towerType) {
      case 'ARROW': this.playArrowAttack(); break;
      case 'MAGIC': this.playMagicAttack(); break;
      case 'CANNON': this.playCannonAttack(); break;
      case 'SLOW': this.playSlowAttack(); break;
    }
  }

  // ─── SFX: Projectile Hit ─────────────────────────

  /** 投射物命中 — 短促冲击 */
  playHit(armorPen: boolean = false): void {
    const ctx = this.ctx;
    const freq = armorPen ? 600 : 300;
    playTone(ctx, freq, 0.08, 'square', 0.04, this.sfxGain);
    playNoiseBurst(ctx, 0.06, 0.03, 2000);
  }

  /** 范围爆炸 — 炮塔溅射 */
  playExplosion(): void {
    const ctx = this.ctx;
    playNoiseBurst(ctx, 0.3, 0.1, 400);
    playTone(ctx, 60, 0.35, 'sawtooth', 0.1, this.sfxGain);
    playTone(ctx, 40, 0.4, 'sine', 0.06, this.sfxGain);
  }

  // ─── SFX: Enemies ─────────────────────────────────

  /** 敌人死亡 — 短 "噗" */
  playEnemyDeath(isBoss: boolean = false): void {
    const ctx = this.ctx;
    if (isBoss) {
      // Boss死亡：大爆炸
      playNoiseBurst(ctx, 0.6, 0.15, 300);
      playTone(ctx, 80, 0.6, 'sawtooth', 0.12, this.sfxGain);
      playTone(ctx, 50, 0.7, 'sine', 0.08, this.sfxGain);
      playTone(ctx, 30, 0.8, 'triangle', 0.06, this.sfxGain);
    } else {
      playTone(ctx, 200, 0.12, 'square', 0.04, this.sfxGain);
      playNoiseBurst(ctx, 0.08, 0.03, 1500);
    }
  }

  // ─── SFX: Wave ────────────────────────────────────

  /** 波次开始 — 号角声 */
  playWaveStart(): void {
    const ctx = this.ctx;
    playTone(ctx, 523, 0.3, 'sine', 0.1, this.sfxGain); // C5
    playTone(ctx, 659, 0.3, 'sine', 0.08, this.sfxGain); // E5
    setTimeout(() => {
      playTone(ctx, 784, 0.5, 'sine', 0.12, this.sfxGain); // G5
      playTone(ctx, 1047, 0.5, 'sine', 0.08, this.sfxGain); // C6
    }, 150);
  }

  /** 波次完成 — 上升音阶 */
  playWaveComplete(): void {
    const ctx = this.ctx;
    const notes = [523, 587, 659, 784]; // C D E G
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(ctx, freq, 0.2, 'sine', 0.07, this.sfxGain);
      }, i * 80);
    });
  }

  /** 全波通关 — 胜利号角 */
  playAllWavesDone(): void {
    const ctx = this.ctx;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(ctx, freq, Math.min(0.5, 0.15 + i * 0.05), 'sine', 0.1, this.sfxGain);
      }, i * 120);
    });
  }

  // ─── SFX: Cards ───────────────────────────────────

  /** 卡牌选中 — 轻 "滴" */
  playCardSelect(): void {
    playTone(this.ctx, 880, 0.08, 'sine', 0.06, this.sfxGain);
  }

  /** 卡牌使用/打出 — 纸牌音 */
  playCardPlay(): void {
    const ctx = this.ctx;
    playTone(ctx, 440, 0.06, 'triangle', 0.05, this.sfxGain);
    setTimeout(() => playTone(ctx, 660, 0.1, 'sine', 0.04, this.sfxGain), 50);
  }

  /** 卡牌出售 — 金币声 */
  playCardSell(): void {
    const ctx = this.ctx;
    playTone(ctx, 1200, 0.1, 'sine', 0.06, this.sfxGain);
    setTimeout(() => playTone(ctx, 1600, 0.15, 'sine', 0.05, this.sfxGain), 80);
  }

  // ─── SFX: Enchantments ────────────────────────────

  /** 附魔应用 — 魔法闪烁 */
  playEnchantApply(): void {
    const ctx = this.ctx;
    const freqs = [600, 800, 1000, 1200];
    freqs.forEach((f, i) => {
      setTimeout(() => {
        playTone(ctx, f, 0.12, 'sine', 0.06, this.sfxGain);
      }, i * 60);
    });
  }

  /** 组合激活 — 强力音效 */
  playComboActivate(): void {
    const ctx = this.ctx;
    playTone(ctx, 523, 0.2, 'sine', 0.1, this.sfxGain);
    setTimeout(() => playTone(ctx, 784, 0.2, 'sine', 0.1, this.sfxGain), 100);
    setTimeout(() => playTone(ctx, 1047, 0.4, 'sine', 0.15, this.sfxGain), 200);
    // Sparkle
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        playTone(ctx, 1200 + Math.random() * 800, 0.1, 'sine', 0.04, this.sfxGain);
      }
    }, 250);
  }

  /** 升级 — 升级音 */
  playUpgrade(): void {
    const ctx = this.ctx;
    const notes = [440, 554, 659, 880];
    notes.forEach((f, i) => {
      setTimeout(() => {
        playTone(ctx, f, 0.15, 'sine', 0.08, this.sfxGain);
      }, i * 70);
    });
  }

  // ─── SFX: Boss ───────────────────────────────────

  /** BOSS登场 — 沉重鼓声 + 低吼 */
  playBossIntro(): void {
    const ctx = this.ctx;
    // Drum hit
    playTone(ctx, 40, 1.0, 'sine', 0.2, this.sfxGain);
    playTone(ctx, 30, 1.2, 'triangle', 0.15, this.sfxGain);
    playNoiseBurst(ctx, 0.8, 0.12, 200);
    // Rumble
    setTimeout(() => {
      playTone(ctx, 50, 0.8, 'sawtooth', 0.08, this.sfxGain);
      playNoiseBurst(ctx, 0.5, 0.06, 150);
    }, 200);
    // Crescendo
    setTimeout(() => {
      playTone(ctx, 100, 0.8, 'square', 0.06, this.sfxGain);
      playNoiseBurst(ctx, 0.6, 0.08, 250);
    }, 450);
  }

  /** BOSS被击败 — 瓦解声 */
  playBossDefeat(): void {
    const ctx = this.ctx;
    playTone(ctx, 80, 0.5, 'sawtooth', 0.12, this.sfxGain);
    setTimeout(() => playTone(ctx, 60, 0.6, 'sawtooth', 0.1, this.sfxGain), 150);
    setTimeout(() => playTone(ctx, 40, 0.8, 'sawtooth', 0.08, this.sfxGain), 300);
    playNoiseBurst(ctx, 0.7, 0.1, 350);
  }

  // ─── SFX: UI ──────────────────────────────────────

  /** UI按钮点击 — 软点击 */
  playUIClick(): void {
    playTone(this.ctx, 600, 0.04, 'sine', 0.04, this.sfxGain);
  }

  /** 错误/拒绝 — 低沉拒绝音 */
  playUIError(): void {
    playTone(this.ctx, 200, 0.15, 'square', 0.05, this.sfxGain);
    setTimeout(() => playTone(this.ctx, 150, 0.2, 'square', 0.04, this.sfxGain), 100);
  }

  /** 游戏结束 */
  playGameOver(victory: boolean): void {
    const ctx = this.ctx;
    if (victory) {
      this.playAllWavesDone();
    } else {
      // Descending sad tones
      const notes = [400, 350, 300, 250];
      notes.forEach((f, i) => {
        setTimeout(() => {
          playTone(ctx, f, 0.4, 'sine', 0.06, this.sfxGain);
        }, i * 200);
      });
    }
  }

  /** 精华获得 */
  playEssenceGain(): void {
    playTone(this.ctx, 1000, 0.1, 'sine', 0.04, this.sfxGain);
    setTimeout(() => playTone(this.ctx, 1300, 0.12, 'sine', 0.03, this.sfxGain), 60);
  }

  // ─── Background Music ─────────────────────────────

  startMusic(): void {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.setMusicVolume(0.5);

    const playNote = () => {
      if (!this.musicPlaying) return;
      const ctx = this.ctx;
      const freq = this.musicNotes[this.musicNoteIndex];
      const duration = 0.5;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      // Soft attack/release
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);

      // Add gentle harmony a fifth above
      if (this.musicNoteIndex % 2 === 0) {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.025, ctx.currentTime + duration - 0.05);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
        osc2.connect(gain2);
        gain2.connect(this.musicGain);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + duration);
      }

      this.musicNoteIndex = (this.musicNoteIndex + 1) % this.musicNotes.length;
    };

    playNote();
    this.musicInterval = setInterval(playNote, 550);
  }

  stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
  }

  // ─── Cleanup ──────────────────────────────────────

  destroy(): void {
    this.stopMusic();
  }
}
