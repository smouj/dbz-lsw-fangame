// ═══════════════════════════════════════════════════════════════════════
// P0 — ROM-Native Identity Types
// ═══════════════════════════════════════════════════════════════════════
// ROM identity is the PRIMARY authority for physical data.
// Project aliases (goku_base, Kamehameha, etc.) are SECONDARY metadata.
//
// PRINCIPLE: Every physical datum must be identified first exactly as the
// ROM does. Human-readable names are aliases, never authorities.
//
// Authority chain:
//   ROM Character Record
//     → ROM Form Record
//       → actorVisualProfileKey
//         → graphicsBank
//           → paletteIndex
//             → AnimationResource
//               → sequenceSelector
//                 → resolvedSequence
//                   → frameIndex
//                     → visualFrameId
//                       → metasprite
//                         → graphics descriptor
//                           → graphics blocks → tiles
//
// THEN (not instead):
//   ROM identity → project alias → manifest pose → runtime
//
// PROHIBITED as physical authority:
//   - formId strings (goku_base, etc.)
//   - filenames or folder names
//   - manifest pose names
//   - array positions or iteration order
//   - visual similarity
// ═══════════════════════════════════════════════════════════════════════

// ─── ROM-Native Keys ──────────────────────────────────────────────────

/**
 * Canonical ROM fighter identity key.
 * Format: `${romFormId}:${actorVisualProfileKey}:${graphicsBank}`
 *
 * This key uniquely identifies a ROM form's visual profile.
 * It is derived from raw ROM bytes, never from project aliases.
 *
 * Example: "8:5:54" = romFormId 0x08, profileKey 0x05, graphicsBank 0x36
 */
export type RomFighterIdentityKey = `${number}:${number}:${number}`;

/**
 * Canonical ROM physical frame key.
 * Format: `${profileKey}:${graphicsBank}:${resource}:${sequence}:${frameIndex}:${visualFrameId}`
 *
 * This key uniquely identifies a single physical frame in the ROM.
 * Two frames with the same key are the SAME physical frame.
 *
 * Example: "5:54:0:0:0:0" = goku_base idle frame 0
 */
export type RomPhysicalFrameKey = `${number}:${number}:${number}:${number}:${number}:${number}`;

// ─── ROM-Native Identity Structure ────────────────────────────────────

/**
 * Complete ROM identity for a fighter form.
 * All fields come from raw ROM bytes — never from project aliases.
 */
export interface RomFighterFormIdentity {
  /** ROM form record index (Bank11, byte 0 = 0x01 marker). */
  romFormId: number;
  /** ROM Bank (always 0x11 for fighter forms). */
  romRecordBank: number;
  /** CPU address of this form's 16-byte record in the ROM. */
  romRecordCpuAddress: number;
  /** File offset of this form's 16-byte record in the ROM image. */
  romRecordFileOffset: number;
  /** Raw 16-byte form record from ROM Bank11. */
  rawRecord: readonly number[];
  /** Byte 1 of rawRecord — the visual profile key used for graphics/palette routing. */
  actorVisualProfileKey: number;
  /** Graphics bank: 0x31 + actorVisualProfileKey. */
  graphicsBank: number;
  /** Palette index: equals actorVisualProfileKey (Bank30 palette routing). */
  paletteIndex: number;
  /** Canonical identity key. */
  identityKey: RomFighterIdentityKey;
}

/**
 * Project alias — human-readable metadata layered ON TOP of ROM identity.
 * These are NEVER used as physical authority.
 */
export interface RomFighterProjectAlias {
  /** The project formId (e.g., "goku_base"). SECONDARY to ROM identity. */
  formId: string;
  /** The project characterId (e.g., "goku"). SECONDARY. */
  characterId: string;
  /** Human-readable display name. SECONDARY. */
  displayName: string;
}

/**
 * Combined view: ROM identity (authority) + project alias (convenience).
 * Dev Studio should show ROM identity FIRST, then project alias.
 */
export interface RomFighterFormView {
  identity: RomFighterFormIdentity;
  alias: RomFighterProjectAlias;
}

// ─── ROM-Native Frame Identity ─────────────────────────────────────────

/**
 * Complete ROM identity for a physical animation frame.
 * All fields come from ROM structure — never from pose names.
 */
export interface RomFrameIdentity {
  /** Profile key that selects graphics bank and palette. */
  profileKey: number;
  /** Graphics bank (0x31 + profileKey). */
  graphicsBank: number;
  /** Animation resource ID (ROM byte, not a name). */
  animationResource: number;
  /** Sequence selector (ROM byte, not a semantic name). */
  sequenceSelector: number;
  /** Resolved sequence index after selector lookup. */
  resolvedSequence: number;
  /** Frame index within the sequence. */
  frameIndex: number;
  /** Visual frame ID — ROM metasprite reference. */
  visualFrameId: number;
  /** Duration in GBC ticks. */
  durationTicks: number;
  /** X offset (ROM byte, signed). */
  offsetX: number;
  /** Y offset (ROM byte, signed). */
  offsetY: number;
  /** Canonical frame key. */
  frameKey: RomPhysicalFrameKey;
}

// ─── ROM-Native Evidence Status ────────────────────────────────────────

/**
 * ROM-centric evidence status for a physical datum.
 * These are FACTS about the ROM, not about project convenience.
 */
export type RomEvidenceStatus =
  | 'ROM_STATIC_VERIFIED'      // Byte-exact match from ROM extraction
  | 'ROM_DYNAMIC_VERIFIED'     // Verified at runtime against ROM bytes
  | 'ROM_PHYSICAL_VERIFIED'    // Physical frame assembly verified (pixels match)
  | 'ROM_SHARED_PHYSICAL'     // Physical frame shared across forms (valid but not unique)
  | 'ROM_UNRESOLVED';          // ROM data not yet proven

/**
 * Project-level manifest status — separate from ROM evidence.
 * These describe how the project maps ROM data to its own structure.
 */
export type ProjectManifestStatus =
  | 'MANIFEST_EXACT'           // ROM physical matches a manifest frame exactly
  | 'MANIFEST_COMPOSITE'       // ROM physical requires composition from multiple sources
  | 'MANIFEST_FALLBACK';      // No ROM physical match; using project fallback

// ─── ROM-Native Resolution Input ───────────────────────────────────────

/**
 * ROM-native resolution input for physical frame lookup.
 * ALL fields are ROM-native — no strings, no aliases.
 *
 * This is the CORRECT way to resolve a frame:
 *   1. Start with ROM identity (profile, resource, sequence, frame)
 *   2. The resolver finds the physical frame by these ROM coordinates
 *   3. Only AFTER resolution, attach the project alias for display
 */
export interface RomNativeFrameInput {
  /** ROM profile key (from Bank11 rawRecord[1]). */
  profileKey: number;
  /** ROM graphics bank (0x31 + profileKey). */
  graphicsBank: number;
  /** ROM AnimationResource ID. */
  animationResource: number;
  /** ROM sequence selector byte. */
  sequenceSelector: number;
  /** Frame index within the resolved sequence. */
  frameIndex: number;
}

/**
 * Legacy resolution input — uses formId string as proxy.
 * DEPRECATED: Use RomNativeFrameInput for new code.
 * This interface exists only for backward compatibility during migration.
 */
export interface LegacyFrameInput {
  /** Project formId string. NOT a ROM authority. */
  formId: string;
  /** ROM AnimationResource ID. */
  animationResource: number;
  /** ROM sequence selector byte. */
  sequenceSelector: number;
  /** Frame index. */
  frameIndex: number;
}

// ─── Utility Functions ────────────────────────────────────────────────

/** Create a canonical ROM fighter identity key from raw fields. */
export function makeRomFighterIdentityKey(
  romFormId: number,
  actorVisualProfileKey: number,
  graphicsBank: number,
): RomFighterIdentityKey {
  return `${romFormId}:${actorVisualProfileKey}:${graphicsBank}`;
}

/** Create a canonical ROM physical frame key from raw fields. */
export function makeRomPhysicalFrameKey(
  profileKey: number,
  graphicsBank: number,
  animationResource: number,
  sequence: number,
  frameIndex: number,
  visualFrameId: number,
): RomPhysicalFrameKey {
  return `${profileKey}:${graphicsBank}:${animationResource}:${sequence}:${frameIndex}:${visualFrameId}`;
}

/** Parse a ROM fighter identity key back into components. */
export function parseRomFighterIdentityKey(key: RomFighterIdentityKey): {
  romFormId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
} {
  const [romFormId, actorVisualProfileKey, graphicsBank] = key.split(':').map(Number);
  return { romFormId, actorVisualProfileKey, graphicsBank };
}

/** Parse a ROM physical frame key back into components. */
export function parseRomPhysicalFrameKey(key: RomPhysicalFrameKey): {
  profileKey: number;
  graphicsBank: number;
  animationResource: number;
  sequence: number;
  frameIndex: number;
  visualFrameId: number;
} {
  const [profileKey, graphicsBank, animationResource, sequence, frameIndex, visualFrameId] = key.split(':').map(Number);
  return { profileKey, graphicsBank, animationResource, sequence, frameIndex, visualFrameId };
}

/**
 * Compute graphicsBank from actorVisualProfileKey.
 * Formula: graphicsBank = 0x31 + profileKey
 * This is the ROM's own routing formula, verified byte-by-byte.
 */
export function graphicsBankForProfileKey(profileKey: number): number {
  return 0x31 + profileKey;
}

/**
 * Verify the ROM identity chain for a single form.
 * Returns null if all checks pass, or a description of the failure.
 */
export function verifyRomIdentityChain(identity: {
  rawRecord: readonly number[];
  actorVisualProfileKey: number;
  graphicsBank: number;
  paletteIndex: number;
}): string | null {
  if (identity.rawRecord[0] !== 0x01) {
    return `rawRecord[0] should be 0x01 (form marker), got 0x${identity.rawRecord[0].toString(16)}`;
  }
  if (identity.rawRecord[1] !== identity.actorVisualProfileKey) {
    return `rawRecord[1] (${identity.rawRecord[1]}) ≠ actorVisualProfileKey (${identity.actorVisualProfileKey})`;
  }
  if (identity.graphicsBank !== 0x31 + identity.actorVisualProfileKey) {
    return `graphicsBank (${identity.graphicsBank}) ≠ 0x31 + profileKey (${0x31 + identity.actorVisualProfileKey})`;
  }
  if (identity.paletteIndex !== identity.actorVisualProfileKey) {
    return `paletteIndex (${identity.paletteIndex}) ≠ actorVisualProfileKey (${identity.actorVisualProfileKey})`;
  }
  return null;
}

/**
 * Detect off-by-one displacement in identity data.
 * If profileKey appears shifted by +1 or -1 from rawRecord[1], this catches it.
 */
export function detectOffByOne(identity: {
  rawRecord: readonly number[];
  actorVisualProfileKey: number;
  graphicsBank: number;
}): { detected: boolean; direction?: '+1' | '-1'; expected?: number; actual?: number; description: string } {
  const rawProfileKey = identity.rawRecord[1];
  if (identity.actorVisualProfileKey === rawProfileKey + 1) {
    return {
      detected: true,
      direction: '+1',
      expected: rawProfileKey,
      actual: identity.actorVisualProfileKey,
      description: `actorVisualProfileKey is +1 from rawRecord[1]: expected ${rawProfileKey}, got ${identity.actorVisualProfileKey}`,
    };
  }
  if (identity.actorVisualProfileKey === rawProfileKey - 1) {
    return {
      detected: true,
      direction: '-1',
      expected: rawProfileKey,
      actual: identity.actorVisualProfileKey,
      description: `actorVisualProfileKey is -1 from rawRecord[1]: expected ${rawProfileKey}, got ${identity.actorVisualProfileKey}`,
    };
  }
  if (identity.graphicsBank === 0x30 + rawProfileKey) {
    return {
      detected: true,
      direction: '+1',
      expected: 0x31 + rawProfileKey,
      actual: identity.graphicsBank,
      description: `graphicsBank uses 0x30+profile (off by -1): got 0x${identity.graphicsBank.toString(16)}, expected 0x${(0x31 + rawProfileKey).toString(16)}`,
    };
  }
  if (identity.graphicsBank === 0x32 + rawProfileKey) {
    return {
      detected: true,
      direction: '-1',
      expected: 0x31 + rawProfileKey,
      actual: identity.graphicsBank,
      description: `graphicsBank uses 0x32+profile (off by +1): got 0x${identity.graphicsBank.toString(16)}, expected 0x${(0x31 + rawProfileKey).toString(16)}`,
    };
  }
  return { detected: false, description: 'No off-by-one detected' };
}