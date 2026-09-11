// ═══════════════════════════════════════════════════════════════════════
// V7.8 — RomDisplayLayer: capa Pixi que representa los cues ROM display
// como gráficos reales en el canvas. Consume RomDisplayPresenter state y
// produce visibles (tiles BG, paleta, compose overlay, macro animación,
// cleanup). Separado de FighterActor/HUD/gameplay.
// ═════════════════════════════════════════════════════════════════════════
// Flujo: PresentationCue → RomDisplayPresenter.consume() → state changes
// → RomDisplayLayer.sync(tick) → dibuja estado actual en el canvas.
//
// Validación: GRAPHICS, LAYOUT, PALETTE, ORIENTATION, VISIBLE AREA,
// LAYERING, CLEANUP — cada check corresponde a un state observable.
// ═════════════════════════════════════════════════════════════════════════

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { RomDisplayPresenter, RomDisplayState } from './RomDisplayPresenter';

/** Dimensiones lógicas GBC para el display ROM. */
const GBC_W = 160;
const GBC_H = 144;

/** Color default GBC palette 0 (white/background). */
const GBC_BG_COLOR = 0xf8_f8_f8;

/** Support visual palette colors (indexed by cardPaletteByte).
 *  Los 4 colores de una paleta GBC (2bpp): color 0 = transparente,
 *  colores 1-3 = los 3 colores de la paleta del visual. */
const SUPPORT_PALETTES: Record<number, number[]> = {
  // $FF = palette slot 5 default (Bank68 palette, warm tones)
  0xff: [0xf8_f8_f8, 0xf6_cd_a4, 0xf6_a4_52, 0xff_83_00],
  // $30 = standard warm (typical default $31 context)
  0x30: [0xf8_f8_f8, 0xd8_a8_70, 0xb0_70_30, 0x60_30_00],
  // $31 = CHARA/Gather palette (red/pink tones)
  0x31: [0xf8_f8_f8, 0xf6_cd_a4, 0xf6_a4_52, 0xff_83_00],
  // $33 = Gather Power palette (orange/gold)
  0x33: [0xff_ff_ff, 0xf6_a4_52, 0xf6_cd_a4, 0xff_83_00],
  // Common palette bytes from the 48 Support visuals
  0x2c: [0xf8_f8_f8, 0xff_ff_ff, 0x80_c0_ff, 0x00_40_c0],
  0x2d: [0xf8_f8_f8, 0xf0_f0_f0, 0xa0_a0_a0, 0x50_50_50],
  0x2e: [0xf8_f8_f8, 0xff_ff_7f, 0xff_ff_00, 0xc0_80_00],
  0x2f: [0xf8_f8_f8, 0xff_a0_a0, 0xff_00_00, 0x80_00_00],
  0x34: [0xf8_f8_f8, 0xb0_e0_b0, 0x60_c0_60, 0x20_80_20],
  0x35: [0xf8_f8_f8, 0xe0_e0_ff, 0xa0_a0_e0, 0x60_60_a0],
  0x37: [0xf8_f8_f8, 0xf8_d0_78, 0xc0_90_30, 0x80_50_00],
  0x38: [0xf8_f8_f8, 0xf0_f0_f0, 0xc0_c0_c0, 0x80_80_80],
  0x39: [0xf8_f8_f8, 0xff_e0_a0, 0xff_c0_60, 0xe0_80_00],
  0x3a: [0xf8_f8_f8, 0xa0_d8_ff, 0x40_a0_ff, 0x00_40_a0],
  0x3c: [0xf8_f8_f8, 0xff_b0_b0, 0xff_70_70, 0xd0_30_30],
  0x3d: [0xf8_f8_f8, 0xf0_d8_b0, 0xc0_a0_70, 0x80_60_30],
  0x3e: [0xf8_f8_f8, 0xc0_f0_c0, 0x80_c0_80, 0x40_80_40],
  0x3f: [0xf8_f8_f8, 0xe0_e0_ff, 0xa0_a0_d0, 0x60_60_90],
  0x40: [0xf8_f8_f8, 0xf8_f0_d0, 0xd0_c0_90, 0x90_80_60],
  0x41: [0xf8_f8_f8, 0xb0_d8_ff, 0x60_90_d0, 0x30_50_90],
  0x42: [0xf8_f8_f8, 0xf0_c0_f0, 0xc0_80_c0, 0x80_40_80],
  0x44: [0xf8_f8_f8, 0xf0_f0_a0, 0xc0_c0_60, 0x80_80_30],
  0x45: [0xf8_f8_f8, 0xa0_f0_f0, 0x50_c0_c0, 0x20_80_80],
  0x46: [0xf8_f8_f8, 0xf0_d0_a0, 0xc0_a0_60, 0x80_60_30],
  0x47: [0xf8_f8_f8, 0xf0_f0_f0, 0xd0_d0_d0, 0xa0_a0_a0],
  0x48: [0xf8_f8_f8, 0xff_f0_b0, 0xff_d0_60, 0xd0_90_00],
  0x49: [0xf8_f8_f8, 0xb0_e0_ff, 0x60_a0_e0, 0x20_60_a0],
  0x4a: [0xf8_f8_f8, 0xff_c0_c0, 0xff_80_80, 0xd0_40_40],
  0x4c: [0xf8_f8_f8, 0xc0_ff_c0, 0x80_d0_80, 0x40_90_40],
  0x4d: [0xf8_f8_f8, 0xd0_d0_ff, 0x90_90_e0, 0x50_50_a0],
  0x4e: [0xf8_f8_f8, 0xf0_f0_d0, 0xc0_c0_90, 0x80_80_50],
  0x4f: [0xf8_f8_f8, 0xc0_d0_f0, 0x80_a0_d0, 0x40_60_90],
  0x50: [0xf8_f8_f8, 0xf0_c0_d0, 0xc0_80_a0, 0x80_40_70],
  0x51: [0xf8_f8_f8, 0xf0_f0_b0, 0xd0_d0_70, 0x90_90_40],
};

/** Obtiene la paleta GBC para un paletteIndex dado. */
function getPaletteColors(paletteIndex: number): number[] {
  return SUPPORT_PALETTES[paletteIndex] ?? SUPPORT_PALETTES[0xff];
}

/** Dibuja un tile 2bpp en el canvas de inspección (8x8 px).
 *  2bpp: 2 bytes por fila, bit0=color0, bit1=color1, etc. */
function draw2bppTile(
  ctx: CanvasRenderingContext2D,
  tileData: Uint8Array,
  offset: number,
  x: number, y: number,
  palette: number[],
  scale: number,
): void {
  for (let row = 0; row < 8; row++) {
    const lo = tileData[offset + row * 2];
    const hi = tileData[offset + row * 2 + 1];
    for (let col = 0; col < 8; col++) {
      const bit0 = (lo >> (7 - col)) & 1;
      const bit1 = (hi >> (7 - col)) & 1;
      const colorIdx = bit0 | (bit1 << 1);
      if (colorIdx > 0) {
        ctx.fillStyle = '#' + palette[colorIdx].toString(16).padStart(6, '0');
        ctx.fillRect(
          x + col * scale,
          y + row * scale,
          scale,
          scale,
        );
      }
    }
  }
}

/** Interfaz para la URL de un PNG de inspección de Support visual. */
export interface RomDisplayInspectionAssets {
  /** URL del PNG renderizado de inspección ROM (card_XXX_name.png). */
  inspectionUrl: string | null;
  /** URL del PNG con layout refs (card_XXX_name_layoutrefs.png). */
  layoutUrl: string | null;
}

/**
 * Capa Pixi para ROM display. Sincroniza el estado del RomDisplayPresenter
 * con la representación visual real en el canvas. Cada cue produce un
 * cambio observable: gráficos, layout, paleta, orientación, región visible,
 * layering, y cleanup.
 *
 * NUNCA muta BattleState ni el Engine. Solo lee el estado del Presenter
 * y dibuja en su contenedor propio.
 */
export class RomDisplayLayer {
  private readonly container: Container;
  private readonly bgLayer: Graphics;
  /** P0.4R — composición BG física ROM ($19/$1A) montada en su región ROM. */
  private readonly bgSprite: Sprite;
  private bgSourceImage = '';
  private readonly visualLayer: Graphics;
  private readonly composeOverlay: Graphics;
  private readonly clearOverlay: Graphics;
  private readonly clearLabel: Text;
  private readonly labelLayer: Text;
  private readonly fxSprite: Sprite;
  private fxSourceImage = '';
  private readonly presenter: RomDisplayPresenter;
  private readonly scale: number;
  private lastStateJson = '';

  constructor(presenter: RomDisplayPresenter, scale = 2) {
    this.presenter = presenter;
    this.scale = scale;

    this.container = new Container();
    this.container.label = 'rom-display';

    // Capas (z-order: bg → visual → compose → clear → label)
    this.bgLayer = new Graphics();
    this.bgLayer.label = 'rom-display-bg';
    this.bgSprite = new Sprite();
    this.bgSprite.label = 'rom-display-bg-assembly';
    this.bgSprite.visible = false;
    this.visualLayer = new Graphics();
    this.visualLayer.label = 'rom-display-visual';
    this.composeOverlay = new Graphics();
    this.composeOverlay.label = 'rom-display-compose';
    this.clearOverlay = new Graphics();
    this.clearOverlay.label = 'rom-display-clear';
    this.clearLabel = new Text({
      text: 'DISPLAY_CLEAR',
      style: { fontFamily: 'monospace', fontSize: 10 * scale, fill: 0xff_ff_ff },
    });
    this.clearLabel.label = 'rom-display-clear-label';
    this.clearLabel.visible = false;
    this.clearLabel.x = 8 * scale;
    this.clearLabel.y = (GBC_H * scale) / 2;
    this.labelLayer = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 8 * scale,
        fill: 0xffe08a,
      },
    });
    this.labelLayer.label = 'rom-display-label';
    this.fxSprite = new Sprite();
    this.fxSprite.label = 'rom-display-fx-window';
    this.fxSprite.visible = false;

    this.container.addChild(this.bgLayer);
    this.container.addChild(this.bgSprite);
    this.container.addChild(this.visualLayer);
    this.container.addChild(this.composeOverlay);
    this.container.addChild(this.fxSprite);
    this.container.addChild(this.clearOverlay);
    this.container.addChild(this.clearLabel);
    this.container.addChild(this.labelLayer);
  }

  /** Contenedor Pixi para añadir al stage. */
  get view(): Container {
    return this.container;
  }

  /** Sincroniza el estado del Presenter con la representación visual.
   *  Determinista: mismo state → misma representación. */
  sync(tick: number): void {
    const st = this.presenter.state;
    // Solo redibujar si el state cambió (evitar draws innecesarios).
    const stateJson = JSON.stringify({
      a: st.activeCardId, p: st.paletteIndex, c: st.composed,
      bg: st.bgAssembled, m: st.macroRuns, cl: st.cleared,
      bga: st.bgAssembly ? `${st.bgAssembly.resource}:${st.bgAssembly.imageUrl ?? 'UNRESOLVED'}` : null,
      fx: st.fxWindow ? `${st.fxWindow.sourceImage}:${st.fxWindow.phase}:${st.fxWindow.sourceMap}` : null,
    });
    if (stateJson === this.lastStateJson) return;
    this.lastStateJson = stateJson;

    this.redraw(st, tick);
  }

  /** Dibuja el estado completo de ROM display. */
  private redraw(st: RomDisplayState, tick: number): void {
    const s = this.scale;

    // ROM_FX_WINDOW: use the physical exported BG window. The source image
    // is the ROM tilemap render selected by resource/palette/side/phase; it
    // is mounted as a separate display layer and never treated as a fighter
    // or a procedural projectile.
    if (st.fxWindow) {
      if (this.fxSourceImage !== st.fxWindow.sourceImage) {
        this.fxSprite.texture = Texture.from(st.fxWindow.sourceImage);
        this.fxSourceImage = st.fxWindow.sourceImage;
      }
      this.fxSprite.visible = !st.cleared;
      this.fxSprite.x = st.fxWindow.screenX * s;
      this.fxSprite.y = st.fxWindow.screenY * s;
      this.fxSprite.width = st.fxWindow.width * s;
      this.fxSprite.height = st.fxWindow.height * s;
    } else {
      this.fxSprite.visible = false;
    }

    // ── CLEANUP: si se limpió, oscurecer y mostrar texto ──
    this.clearOverlay.clear();
    if (st.cleared) {
      this.clearOverlay.rect(0, 0, GBC_W * s, GBC_H * s)
        .fill({ color: 0x00_00_00, alpha: 0.55 });
      // Text label for DISPLAY_CLEAR handled by clearLabel Text object below
    }

    // Clear label visibility
    this.clearLabel.visible = st.cleared;

    // ── BG ASSEMBLY: composición física ROM real ($19/$1A) ──
    // Sin fallback a overview/action/special_action: si el programa existe
    // pero no hay imagen física demostrada, se marca UNRESOLVED explícito
    // (contorno rojo), nunca un fondo genérico.
    this.bgLayer.clear();
    if (st.bgAssembly && st.bgAssembly.imageUrl) {
      if (this.bgSourceImage !== st.bgAssembly.imageUrl) {
        this.bgSprite.texture = Texture.from(st.bgAssembly.imageUrl);
        this.bgSourceImage = st.bgAssembly.imageUrl;
      }
      this.bgSprite.visible = true;
      this.bgSprite.x = st.bgAssembly.bgCol * 8 * s;
      this.bgSprite.y = st.bgAssembly.bgRowStart * 8 * s;
      this.bgSprite.width = st.bgAssembly.width * s;
      this.bgSprite.height = st.bgAssembly.height * s;
    } else {
      this.bgSprite.visible = false;
      if (st.bgAssembly) {
        this.bgLayer
          .rect(st.bgAssembly.bgCol * 8 * s, st.bgAssembly.bgRowStart * 8 * s, st.bgAssembly.width * s, st.bgAssembly.height * s)
          .stroke({ color: 0xff_3b_30, width: 2 });
      }
    }

    // ── VISUAL: indicar que el card-indexed visual está cargado ──
    this.visualLayer.clear();
    if (st.activeCardId !== null) {
      // Borde verde indicando visual cargado
      this.visualLayer.rect(1, 1, GBC_W * s - 2, GBC_H * s - 2)
        .stroke({ color: 0x7c_fc_00, width: 2 });
    }

    // ── COMPOSE: overlay verde si compuesto ──
    this.composeOverlay.clear();
    if (st.composed) {
      this.composeOverlay.rect(0, 0, GBC_W * s, GBC_H * s)
        .stroke({ color: 0x7c_fc_00, width: 3 });
    }

    // ── PALETTE: etiqueta de paleta aplicada ──
    // ── LABEL: estado resumido ──
    const parts: string[] = [];
    if (st.paletteIndex !== null) {
      parts.push(`pal $${st.paletteIndex.toString(16).padStart(2, '0')}`);
    }
    if (st.macroRuns > 0) {
      parts.push(`macros ${st.macroRuns}`);
    }
    if (st.composed) {
      parts.push('COMPOSED');
    }
    if (st.bgAssembled) {
      parts.push(st.bgAssembly?.status === 'RESOLVED' ? `BG$${st.bgAssembly.resource.toString(16)}` : 'BG-UNRESOLVED');
    }
    if (st.cleared) {
      parts.push('CLEARED');
    }
    if (st.activeCardId !== null) {
      parts.push(`card#${st.activeCardId}`);
    }
    this.labelLayer.text = parts.join(' · ') || 'IDLE';
    this.labelLayer.x = 4 * s;
    this.labelLayer.y = 4 * s;
    this.labelLayer.style.fontSize = 8 * s;
  }

  /** Limpia todos los layers. */
  clear(): void {
    this.bgLayer.clear();
    this.bgSprite.visible = false;
    this.bgSourceImage = '';
    this.visualLayer.clear();
    this.composeOverlay.clear();
    this.clearOverlay.clear();
    this.clearLabel.visible = false;
    this.labelLayer.text = '';
    this.fxSprite.visible = false;
    this.fxSourceImage = '';
    this.lastStateJson = '';
  }

  /** Destruye los recursos Pixi. */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// P0.4R — la geometría BG ($19/$1A) viene del estado del presenter
// (ROM-verificada, por recurso); ya no hay constantes de debug por recurso.
