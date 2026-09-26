/**
 * Clamp a dark effect's coverage to 1 in the shader. The scene buffer is half
 * float, so a coverage past 1 under ALPHA_COMBINE leaves `1 - alpha` negative:
 * the pixel goes below black and the next dark layer over it multiplies back
 * to bright. Clamped, a gain above 1 saturates the sheet to black instead,
 * which is what the dark cards and ribbons use it for.
 */
import { MaterialPluginBase, type Material } from '../libs/babylon/exports';

class ClampAlphaPlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'FxClampAlpha', 900, undefined, true, true);
  }

  getClassName(): string {
    return 'FxClampAlphaPlugin';
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    return { CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: 'color.a = clamp(color.a, 0.0, 1.0);' };
  }
}

const clamped = new WeakSet<Material>();

/** Give a Standard material (or one built on it) the clamp; once per material. */
export function clampAlpha(material: Material): void {
  if (clamped.has(material)) return;
  clamped.add(material);
  new ClampAlphaPlugin(material);
}
