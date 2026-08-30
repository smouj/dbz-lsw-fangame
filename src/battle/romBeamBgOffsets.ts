/**
 * Battle Cinematic Viewport Offsets (from beam_actor_screen_offsets_v4.csv)
 * 
 * Provides per-frame SCX/SCY deltas ($C406 / $C405) for the GBC differential
 * cinematic viewport. Used by CameraPresenter to model the C407/C409 base
 * scroll plus the C405/C406 HBlank viewport delta.
 * 
 * Only for non-frozen beams. The 6 special actions ($0B, $0F, $12, $16, $22, $3F)
 * remain deferred to ROM trace.
 *
 * ── P9 RE pasada: cadena C5 CORREGIDA (ROM estática) ──
 *   C407/C408 = baseScrollY 16-bit · C409/C40A = baseScrollX 16-bit
 *   C405 = cinematicDeltaY · C406 = cinematicDeltaX
 *
 *   Fuera del viewport HBlank:
 *     SCY = low(C407)
 *     SCX = low(C409)
 *
 *   Dentro del viewport HBlank:
 *     SCY = low(C407) + C405
 *     SCX = low(C409) + C406
 *
 *   Rutinas ROM:
 *     Bank00:$0D90  set C407/C408 (base SCY)
 *     Bank00:$0D89  set C409/C40A (base SCX)
 *     Bank00:$0D97  C407 → SCY, C409 → SCX
 *     Bank00:$0DA2  C407+C405 → SCY, C409+C406 → SCX
 *
 *   $0D CONFIG_SCENE param3:
 *     0    → viewportTopScanline = 23
 *     != 0 → viewportTopScanline = 31
 *     viewportBottomScanline = 95
 *     STAT = $08
 *
 *   $0F SCREEN_RESTORE:
 *     desactiva STAT/HBlank viewport, pero NO borra C405/C406.
 *
 *   No modelar esto como un desplazamiento de container Pixi entero: es un
 *   viewport diferencial del GBC.
 */

/** Cadena C5 (base scroll + cinematic viewport delta → SCX/SCY). */
export const BATTLE_CINEMATIC_SCROLL_CHAIN = {
  baseScrollY: 0xc407,
  baseScrollX: 0xc409,
  cinematicDeltaY: 0xc405,
  cinematicDeltaX: 0xc406,
  /** Rutinas de lectura/escritura (Bank00). */
  routines: {
    setBaseScrollY: 0x0d90,
    setBaseScrollX: 0x0d89,
    baseToScroll: 0x0d97,
    basePlusDeltaToScroll: 0x0da2,
  },
  viewport: {
    statHandler: 0x02d4,
    topStorage: 0xc234,
    topWhenParam3Zero: 23,
    topWhenParam3Nonzero: 31,
    activeLyEndExclusive: 96,
    bottomClampConstant: 98,
    enabledBy: 'STAT/HBlank',
    statValue: 0x08,
    lyRegister: 0xff44,
  },
  clipping: {
    translatedY: 'baseScrollY + cinematicDeltaY + LY',
    topRule: 'if translatedY < viewportTop, clamp to top edge',
    middleRule: 'else if translatedY < 98, use base + cinematic delta',
    bottomRule: 'else clamp to bottom edge',
  },
  screenRestore: {
    routine: 0x035b,
    statValue: 0x00,
    disablesViewport: true,
    preservesCinematicDelta: true,
  },
  /** Productores Bank03: static architecture closed; production cutover still pending. */
  producers: {
    callsites: [0x699e, 0x69a9],
    setters: [0x6ab7, 0x6aeb],
  },
  evidence: 'ROM_STATIC_VERIFIED',
  source: 'Pass 9 static RE: C407/C409 base camera/BG scroll + C405/C406 HBlank viewport delta; $0F disables viewport and preserves deltas.',
} as const;

/** Back-compat alias: old name was beam-specific; values are now general C5 viewport facts. */
export const BEAM_BG_SCROLL_CHAIN = BATTLE_CINEMATIC_SCROLL_CHAIN;

export interface BeamFrameOffset {
  cardId: number;
  animationResource: number;
  actorRecordId: number;
  sequence: number;
  frameIndex: number; // derived from row order within (card, resource, sequence)
  deltaScy: number;   // C405
  deltaScxSide1: number; // C406 for SIDE_1
  deltaScxSide2: number; // C406 for SIDE_2
}

const beamOffsets: BeamFrameOffset[] = [];

let loaded = false;

export async function loadBeamBgOffsets(): Promise<void> {
  if (loaded) return;

  // Lazy load the generated JSON (produced from the authoritative CSV)
  const mod = await import('../../docs/rom/research-v4-fx/external/DBZ_LSW_ROM_RESEARCH_V4_FX/data/beam_actor_screen_offsets_v4.json');
  const raw = mod.default ?? mod;

  // The CSV rows are already in (card, resource, sequence) order.
  // We assign frameIndex sequentially within each (cardId, animationResource, sequence) group.
  const groups = new Map<string, number>();

  for (const row of raw) {
    const key = `${row.cardId}:${row.animationResource}:${row.sequence}`;
    const frameIndex = groups.get(key) ?? 0;
    groups.set(key, frameIndex + 1);

    beamOffsets.push({
      cardId: Number(row.cardId),
      animationResource: parseInt(row.animationResource, 16),
      actorRecordId: Number(row.actorRecordId),
      sequence: parseInt(row.sequence, 16),
      frameIndex,
      deltaScy: Number(row.C405_screenYDeltaSigned),
      deltaScxSide1: parseInt(row.C406_side1_screenXDeltaByte, 16),
      deltaScxSide2: parseInt(row.C406_side2_screenXDeltaByte, 16),
    });
  }

  loaded = true;
}

/**
 * Get the screen deltas for a specific beam animation frame.
 * Returns null if not found (e.g. frozen special beams).
 */
export function getBeamFrameDeltas(
  cardId: number,
  animationResource: number,
  sequence: number,
  frameIndex: number,
  side: 'SIDE_1' | 'SIDE_2'
): { deltaScx: number; deltaScy: number } | null {
  const match = beamOffsets.find(o =>
    o.cardId === cardId &&
    o.animationResource === animationResource &&
    o.sequence === sequence &&
    o.frameIndex === frameIndex
  );

  if (!match) return null;

  const deltaScx = side === 'SIDE_1' ? match.deltaScxSide1 : match.deltaScxSide2;
  return {
    deltaScx,
    deltaScy: match.deltaScy,
  };
}

export function isBeamBgDataLoaded(): boolean {
  return loaded;
}
