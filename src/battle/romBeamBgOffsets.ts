/**
 * Beam BG Layer Offsets (from beam_actor_screen_offsets_v4.csv)
 * 
 * Provides per-frame SCX/SCY deltas ($C406 / $C405) for beam FX tilemap scrolling.
 * Used by CameraPresenter to drive the separate beam background scroll.
 * 
 * Only for non-frozen beams. The 6 special actions ($0B, $0F, $12, $16, $22, $3F)
 * remain deferred to ROM trace.
 */

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
