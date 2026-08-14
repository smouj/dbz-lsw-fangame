// ═══════════════════════════════════════════════════════════
// DBZ LSW — TacticalScene (vista TÁCTICA: overview + overworld sprites)
// ═══════════════════════════════════════════════════════════
// Plano FIELD: fondo overview (160×80 → 2×) + sprites overworld chibi
// (16×16 → 2×) clavados en las 4 posiciones tácticas (anchorFor).
// NINGÚN movimiento interpolado altera aquí la posición lógica: el Tactical
// solo REFLEJA las posiciones lógicas (BattlePosition).

import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { BattlePosition, anchorFor } from '../../../data/positions';
import type { BattleSide } from '../../../data/facing';
import { BATTLE_LOGICAL_W, BATTLE_LOGICAL_H, BG_SCALE } from '../config';

export class TacticalScene extends Container {
  private bg: Sprite | null = null;
  private overworld = new Map<BattleSide, Sprite>();

  constructor() {
    super();
    this.visible = false;
  }

  setBackground(tex: Texture | null): void {
    if (this.bg) {
      this.removeChild(this.bg);
      this.bg.destroy({ texture: false });
      this.bg = null;
    }
    if (!tex) return;
    const s = new Sprite(tex);
    s.scale.set(BG_SCALE, BG_SCALE);
    s.roundPixels = true;
    this.bg = s;
    this.addChildAt(s, 0);
  }

  /** Coloca (o crea) el sprite overworld de un lado en su posición táctica. */
  setOverworld(side: BattleSide, tex: Texture | null, pos: BattlePosition, flip = 1): void {
    let s = this.overworld.get(side);
    if (tex) {
      if (!s) {
        s = new Sprite(tex);
        s.anchor.set(0.5, 1);
        s.roundPixels = true;
        this.overworld.set(side, s);
        this.addChild(s);
      } else {
        s.texture = tex;
      }
      s.visible = true;
      s.scale.set(2 * flip, 2);
      const a = anchorFor(pos, side === 'left' ? 'LEFT' : 'RIGHT');
      s.position.set((a.x / 100) * BATTLE_LOGICAL_W, (a.y / 100) * BATTLE_LOGICAL_H);
    } else if (s) {
      s.visible = false;
    }
  }

  /** Recoloca el sprite overworld de un lado en su nueva posición lógica
   *  (MOVE táctico) SIN recargar la textura ni el flip. */
  setOverworldPosition(side: BattleSide, pos: BattlePosition): void {
    const s = this.overworld.get(side);
    if (!s || !s.visible) return;
    const a = anchorFor(pos, side === 'left' ? 'LEFT' : 'RIGHT');
    s.position.set((a.x / 100) * BATTLE_LOGICAL_W, (a.y / 100) * BATTLE_LOGICAL_H);
  }

  clearOverworld(): void {
    for (const s of this.overworld.values()) {
      this.removeChild(s);
      s.destroy({ texture: false });
    }
    this.overworld.clear();
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
