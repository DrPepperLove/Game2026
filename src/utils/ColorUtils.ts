/**
 * ColorUtils — RGBA 颜色转换工具
 */
export class ColorUtils {
  /**
   * 将 hex number 转换为 CSS rgba 字符串
   */
  static hexToRgba(hex: number, alpha: number = 1): string {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /**
   * 将 hex number 转换为 Phaser 兼容的整数颜色
   */
  static hexToPhaser(hex: number): number {
    return hex;
  }

  /**
   * 混合两个颜色（线性插值）
   */
  static blend(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }
}
