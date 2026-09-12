// ═══════════════════════════════════════════════════════════════════════
// ROM V6 — RomSupportPresentationProfile (V6.8).
// Consume datos ROM derivados (V6.7) + BG $19 + palette path + HOLD120 y
// produce RomPresentationCue[] con la gramática literal de Support.
// SIN autoridad de gameplay: describe lo que la ROM hace; el Engine decide
// efectos/daño. No reproduce AnimationResource automáticamente (V5:
// Kiai/Paralysis = PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED).
// ═══════════════════════════════════════════════════════════════════════
import type { PresentationCue } from './engine/presentation/PresentationCue';
import { SUPPORT_COMMON_PALETTE_TRANSITION_SEQUENCE } from './romDisplay/romPaletteTransitionProgram';
import {
  ROM_SUPPORT_PHYSICAL_VISUALS,
  type RomSupportPhysicalVisual,
} from '../data/generated/romSupportPhysicalVisuals.generated';

/** HOLD120 ROM (CB77 -> $78 = 120 ticks ≈ 2.009s) antes de la transición. */
export const SUPPORT_HOLD120_TICKS = 120;

/** BG $19: 7 filas x 6 tiles = 48x56 px en BG rows 4-10, col 7, slot 5. */
export const SUPPORT_BG19 = {
  resource: 0x19 as const,
  rows: 7,
  cols: 6,
  bgRowStart: 4,
  bgCol: 7,
  paletteSlot: 5,
};

export type SupportWorkerFamily = '$00' | '$02' | '$0B' | '$0D' | '$0F';

const WORKER_BY_HANDLER: Record<number, SupportWorkerFamily> = {
  0x00: '$00',
  0x02: '$02',
  0x0b: '$0B',
  0x0d: '$0D',
  0x0f: '$0F',
};

/** Familias que usan BG $19 (V5: $00/$02 construyen Bank68:$19). */
const BG19_HANDLERS = new Set<number>([0x00, 0x02]);

export interface RomSupportPresentationProfileInput {
  cardId: number;
}

export interface RomSupportPresentationProfileResult {
  cardId: number;
  family: SupportWorkerFamily | null;
  cues: PresentationCue[];
  /** Estado de la pista física: lo que la ROM demuestra. */
  boundary: 'STATIC' | 'DYNAMIC';
}

/** V7.2 — contrato SUPPORT_COMMON (familias $00/$02). */
export interface RomSupportCommonProfile {
  family: 'SUPPORT_COMMON';
  cardId: number;
  cardVisual: {
    loaderBank: number;
    localIndex: number;
    descriptorAddress: string;
    tileCount: number;
  };
  fixedBg: {
    resource: 0x19;
    rows: number;
    cols: number;
    bgRowStart: number;
    bgCol: number;
    paletteSlot: number;
  };
  holdTicks: 120;
  palette: {
    cardPaletteByte: number;
    /** $FF se conserva como índice físico ($36CA -> Bank30:$75F8); NUNCA NONE. */
    effective: 'CC15_PRESENTATION_STATE(default $31)';
    cardByte8Link: 'UNLINKED_CARD_BYTE8';
  };
  macro: { macroId: number; rawBytes: string; semanticStatus: 'UNRESOLVED' }[];
  provenance: 'ROM_PRESENTATION';
}

/**
 * V7.2 — perfil canónico para las familias Support comunes ($00/$02):
 * card-indexed visual + BG $19 + palette route + HOLD120 + programa literal.
 * NO es una película semántica (no "aura_support").
 */
export function supportCommonProfile(cardId: number): RomSupportCommonProfile | null {
  const visual = ROM_SUPPORT_PHYSICAL_VISUALS[cardId];
  if (!visual || !BG19_HANDLERS.has(visual.handler)) return null;
  return {
    family: 'SUPPORT_COMMON',
    cardId,
    cardVisual: {
      loaderBank: visual.loader.bank,
      localIndex: visual.loader.localIndex,
      descriptorAddress: visual.loader.descriptorAddress,
      tileCount: visual.physical.tileCount,
    },
    fixedBg: {
      resource: 0x19,
      rows: SUPPORT_BG19.rows,
      cols: SUPPORT_BG19.cols,
      bgRowStart: SUPPORT_BG19.bgRowStart,
      bgCol: SUPPORT_BG19.bgCol,
      paletteSlot: SUPPORT_BG19.paletteSlot,
    },
    holdTicks: SUPPORT_HOLD120_TICKS as 120,
    palette: {
      cardPaletteByte: visual.palette.cardPaletteByte,
      effective: 'CC15_PRESENTATION_STATE(default $31)',
      cardByte8Link: 'UNLINKED_CARD_BYTE8',
    },
    macro: visual.macros.map((m) => ({
      macroId: m.macroId,
      rawBytes: m.rawBytes,
      semanticStatus: 'UNRESOLVED' as const,
    })),
    provenance: 'ROM_PRESENTATION',
  };
}

/**
 * Compila la gramática de presentación Support para una carta (V6/V7).
 * - $00/$02: SUPPORT_VISUAL_LOAD + BG_ASSEMBLY $19 + PALETTE_TRANSITION + HOLD120.
 * - $0B:     SUPPORT_VISUAL_LOAD + DISPLAY_COMPOSE + PALETTE_LOAD + branch CA53
 *            (==0 -> $1E, !=0 -> $14) + macros $2C/$34/$35 + waits + pending.
 * - $0D:     SUPPORT_VISUAL_LOAD + DISPLAY_COMPOSE + PALETTE_LOAD + macro $2B
 *            + SFX $42 + waits (semántica humana UNRESOLVED).
 * - $0F:     SUPPORT_VISUAL_LOAD + DISPLAY_COMPOSE + PALETTE_LOAD + pending
 *            (FSM propia $17/$18/$19, sin macros).
 * Nunca dispara postActionMaintenance (guardrail §193); nunca auto-reproduce
 * AnimationResource; sin anchors ni bindings semánticos.
 */
export function romSupportPresentationProfile(
  input: RomSupportPresentationProfileInput,
): RomSupportPresentationProfileResult {
  const visual: RomSupportPhysicalVisual | undefined =
    ROM_SUPPORT_PHYSICAL_VISUALS[input.cardId];
  if (!visual) {
    return {
      cardId: input.cardId,
      family: null,
      cues: [
        {
          type: 'ROM_PENDING',
          tick: 0,
          reason: 'no support physical visual in V6 matrix',
          boundary: 'STATIC',
        },
      ],
      boundary: 'STATIC',
    };
  }

  const family = WORKER_BY_HANDLER[visual.handler] ?? null;
  const cues: PresentationCue[] = [];
  const tick = (n: number) => n;

  // 1) Carga card-indexed del visual ($2C30).
  cues.push({
    type: 'SUPPORT_VISUAL_LOAD',
    tick: tick(0),
    loaderBank: visual.loader.bank,
    localIndex: visual.loader.localIndex,
    descriptorAddress: parseInt(visual.loader.descriptorAddress.split('$')[1] ?? '0', 16),
    tileCount: visual.physical.tileCount,
  });

  // 2) Palette física del visual ($36CA; $FF = índice físico, nunca NONE).
  cues.push({
    type: 'PALETTE_LOAD',
    tick: tick(4),
    paletteIndex: visual.palette.cardPaletteByte,
    paletteIsPhysical: true,
  });

  if (family === '$00' || family === '$02') {
    // ── Orden ROM REAL (V5 FSM ROM_HANDLER_VERIFIED 03:$63FA..$64D7) ──
    // NO es el orden del código previo: en la ROM la primera transición de
    // paleta ocurre ANTES de ensamblar el BG $19, y el camino tiene TRES
    // transiciones (no una).
    const [t1, t2, t3] = SUPPORT_COMMON_PALETTE_TRANSITION_SEQUENCE;

    // $0A: paleta T1 (A=1 BC=$0038 E=$20 D=1) — antes del BG.
    cues.push({
      type: 'PALETTE_TRANSITION',
      tick: tick(8),
      durationTicks: t1.maxCounter + 1,
      sourcePalette: visual.palette.cardPaletteByte,
      targetPalette: visual.palette.cardPaletteByte,
      mode: t1.mode,
      paletteMask16: t1.paletteMask16,
      maxCounter: t1.maxCounter,
      channelStep: t1.channelStep,
      stage: t1.stage,
    });

    // $0B: poll $080C · scene $3764 · macro $19 (SET_ANIMATION_STATE slot 0).
    cues.push({ type: 'MACRO', tick: tick(41), macroId: 0x19 });

    // $0C: BG $19 helper $66D1 → Bank68:$19 (48x56, row 4 col 7, slot 5).
    cues.push({
      type: 'BG_ASSEMBLY',
      tick: tick(49),
      resource: SUPPORT_BG19.resource,
      rows: SUPPORT_BG19.rows,
      cols: SUPPORT_BG19.cols,
      bgRowStart: SUPPORT_BG19.bgRowStart,
      bgCol: SUPPORT_BG19.bgCol,
      paletteSlot: SUPPORT_BG19.paletteSlot,
      note: 'SINGLE_BG_GRAPHIC',
    });

    // $0C cont.: al completar el helper → T2 (A=0 BC=$0360 E=$20 D=1).
    cues.push({
      type: 'PALETTE_TRANSITION',
      tick: tick(57),
      durationTicks: t2.maxCounter + 1,
      sourcePalette: visual.palette.cardPaletteByte,
      targetPalette: visual.palette.cardPaletteByte,
      mode: t2.mode,
      paletteMask16: t2.paletteMask16,
      maxCounter: t2.maxCounter,
      channelStep: t2.channelStep,
      stage: t2.stage,
    });

    // $0D: delay $0821 DE=$28 (40 ticks) + poll + CB77=0.
    cues.push({
      type: 'ROM_WAIT',
      tick: tick(90),
      durationTicks: 40,
      reason: 'worker $0D: delay $0821 DE=$28 (40t) + poll paleta + CB77=0',
    });

    // $0E: CB77++ hasta $78 = 120 ticks.
    cues.push({
      type: 'ROM_WAIT',
      tick: tick(130),
      durationTicks: SUPPORT_HOLD120_TICKS,
      reason: 'HOLD120 (CB77 -> $78, worker $0E)',
    });

    // $0E cont.: tras el hold → T3 (A=1 BC=$0020 E=$10 D=2).
    cues.push({
      type: 'PALETTE_TRANSITION',
      tick: tick(250),
      durationTicks: t3.maxCounter + 1,
      sourcePalette: visual.palette.cardPaletteByte,
      targetPalette: visual.palette.cardPaletteByte,
      mode: t3.mode,
      paletteMask16: t3.paletteMask16,
      maxCounter: t3.maxCounter,
      channelStep: t3.channelStep,
      stage: t3.stage,
    });

    return { cardId: input.cardId, family, cues, boundary: 'STATIC' };
  }

  // 3) Composición display del visual card-indexed (V7.1).
  cues.push({
    type: 'DISPLAY_COMPOSE',
    tick: tick(8),
    composeEvidence: 'ROM_STATIC_VERIFIED',
    note: 'V7.1: secuencias $5A68+ -> $9800 (o shadow $DD00/$DE00)',
  });

  if (family === '$0B') {
    // V7.1: worker $0B state $0D ramifica por CA53 numérico.
    cues.push({
      type: 'ROM_RESULT_BRANCH',
      tick: tick(12),
      family: 'CA53_BRANCH_$0B',
      branches: [
        { family: '$1E', condition: 'CA53 == 0', macroId: 0x34, macroHex: null },
        { family: '$14', condition: 'CA53 != 0', macroId: 0x2c, macroHex: null },
      ],
    });
    // Macros del worker (V6.4: call-sites). Semántica humana UNRESOLVED.
    for (const macro of visual.macros) {
      cues.push({
        type: 'SUPPORT_MACRO',
        tick: tick(16),
        macroId: macro.macroId,
        macroHex: macro.rawBytes,
        workerFamily: family,
        literalProgramStatus: 'COMPLETE_ROM_VERIFIED',
        semanticStatus: macro.semanticStatus === 'RESOLVED' ? 'RESOLVED' : 'UNRESOLVED',
      });
    }
    cues.push({
      type: 'ROM_WAIT',
      tick: tick(40),
      durationTicks: 40,
      reason: 'worker $0B: poll $3E5E / espera $2FCE',
    });
    cues.push({
      type: 'ROM_PENDING',
      tick: tick(80),
      reason: 'worker $0B states $15/$16/$17/$20/$22 (KnockDown result, $CAA2 payload) — gramática de detalle pendiente',
      boundary: 'STATIC',
    });
  } else if (family === '$0D') {
    // worker $0D: macro $2B + SFX $42 + poll.
    for (const macro of visual.macros) {
      cues.push({
        type: 'SUPPORT_MACRO',
        tick: tick(16),
        macroId: macro.macroId,
        macroHex: macro.rawBytes,
        workerFamily: family,
        literalProgramStatus: 'COMPLETE_ROM_VERIFIED',
        semanticStatus: macro.semanticStatus === 'RESOLVED' ? 'RESOLVED' : 'UNRESOLVED',
      });
    }
    cues.push({
      type: 'ROM_SFX',
      tick: tick(20),
      sfxId: 0x42,
    });
    cues.push({
      type: 'ROM_WAIT',
      tick: tick(24),
      durationTicks: 40,
      reason: 'worker $0D: $0821 DE=$28 (40 ticks) + poll $3E5E',
    });
  } else if (family === '$0F') {
    // worker $0F: FSM propia $17/$18/$19, sin macros (V7.1).
    cues.push({
      type: 'ROM_PENDING',
      tick: tick(16),
      reason: 'worker $0F states $17/$18/$19: transiciones $3239/$2FCE/$34C7, sin macros — gramática de detalle pendiente',
      boundary: 'STATIC',
    });
  }

  // 4) Cleanup del display (V7.1: jobs $C459+, flags $C45C/$C45D).
  cues.push({
    type: 'DISPLAY_CLEAR',
    tick: tick(200),
    evidence: 'ROM_STATIC_VERIFIED',
  });

  return { cardId: input.cardId, family, cues, boundary: 'STATIC' };
}

/** Perfiles para las 48 Support (usado por Dev Studio / verifiers). */
export function romSupportPresentationProfilesAll(): RomSupportPresentationProfileResult[] {
  return Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS).map((id) =>
    romSupportPresentationProfile({ cardId: Number(id) }),
  );
}
