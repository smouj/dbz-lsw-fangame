// ═══════════════════════════════════════════════════════════════════════
// P0 — ROM Fighter Profile/Bank Alignment Regression Test
// ═══════════════════════════════════════════════════════════════════════
// Detects systematic off-by-one displacement in the chain:
//   FORM → ROM form record → actorVisualProfileKey → graphicsBank
//         → paletteIndex → physical frame index
//
// If goku_base renders as goku_ssj, krillin renders as goku_base, etc.,
// this test will fail — catching the displacement at the data level.
//
// Values are FIXED from ROM Bank11 records (verified byte-by-byte).
// Do NOT update expected values without verifying against raw ROM bytes.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { ROM_FIGHTER_FORM_IDENTITY } from '../../data/generated/romFighterFormIdentity.generated';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../../data/generated/romPhysicalCorpus.generated';
import {
  makeRomFighterIdentityKey,
  makeRomPhysicalFrameKey,
  parseRomFighterIdentityKey,
  parseRomPhysicalFrameKey,
  graphicsBankForProfileKey,
  verifyRomIdentityChain,
  detectOffByOne,
} from '../romNativeIdentity';

// ─── ROM-verified expected values (Bank11 raw bytes) ──────────────────
// Source: scripts/generate-rom-fighter-identity.ts → rawRecord[1] (byte 1)
// These are NOT derived from runtime index or array position.
// They come from the physical ROM byte at the form record offset.

interface ForensicRow {
  formId: string;
  expectedRomFormId: number;
  expectedActorVisualProfileKey: number;
  expectedGraphicsBank: number;
  expectedPaletteIndex: number;
  expectedRawRecordByte0: number;
  expectedRawRecordByte1: number;
}

const FORENSIC_FIXTURES: ForensicRow[] = [
  {
    formId: 'goku_base',
    expectedRomFormId: 8,           // 0x08
    expectedActorVisualProfileKey: 5, // rawRecord[1] = 0x05
    expectedGraphicsBank: 0x36,       // 0x31 + 5 = 54 = 0x36
    expectedPaletteIndex: 5,
    expectedRawRecordByte0: 0x01,     // form marker
    expectedRawRecordByte1: 0x05,     // profile key
  },
  {
    formId: 'goku_ssj',
    expectedRomFormId: 9,           // 0x09
    expectedActorVisualProfileKey: 6, // rawRecord[1] = 0x06
    expectedGraphicsBank: 0x37,       // 0x31 + 6 = 55 = 0x37
    expectedPaletteIndex: 6,
    expectedRawRecordByte0: 0x01,
    expectedRawRecordByte1: 0x06,
  },
  {
    formId: 'krillin_base',
    expectedRomFormId: 7,           // 0x07
    expectedActorVisualProfileKey: 4, // rawRecord[1] = 0x04
    expectedGraphicsBank: 0x35,       // 0x31 + 4 = 53 = 0x35
    expectedPaletteIndex: 4,
    expectedRawRecordByte0: 0x01,
    expectedRawRecordByte1: 0x04,
  },
  {
    formId: 'piccolo_base',
    expectedRomFormId: 4,           // 0x04
    expectedActorVisualProfileKey: 3, // rawRecord[1] = 0x03
    expectedGraphicsBank: 0x34,       // 0x31 + 3 = 52 = 0x34
    expectedPaletteIndex: 3,
    expectedRawRecordByte0: 0x01,
    expectedRawRecordByte1: 0x03,
  },
];

// ─── Candidate A: formIndex → ROM record ───────────────────────────
// If the code uses forms[index] or array position instead of formId lookup,
// these assertions will catch it.

describe('P0 ROM Fighter Profile/Bank Alignment', () => {
  // ─── Forensic table: every column must match ───────────────────────

  describe('forensic identity chain (4 fixtures)', () => {
    for (const fixture of FORENSIC_FIXTURES) {
      describe(fixture.formId, () => {
        const identity = ROM_FIGHTER_FORM_IDENTITY.find(
          row => row.formId === fixture.formId,
        );

        it('has identity record', () => {
          expect(identity).toBeDefined();
        });

        if (!identity) return;

        it('romFormId matches ROM byte offset', () => {
          expect(identity.romFormId).toBe(fixture.expectedRomFormId);
        });

        it('rawRecord[0] is form marker (0x01)', () => {
          expect(identity.rawRecord[0]).toBe(fixture.expectedRawRecordByte0);
        });

        it('rawRecord[1] (actorVisualProfileKey) matches expected', () => {
          expect(identity.rawRecord[1]).toBe(fixture.expectedRawRecordByte1);
        });

        it('actorVisualProfileKey derived from rawRecord[1]', () => {
          expect(identity.actorVisualProfileKey).toBe(fixture.expectedActorVisualProfileKey);
        });

        // ─── Candidate B: actorVisualProfileKey must come from byte, not index ───
        it('actorVisualProfileKey is NOT form array position (off-by-one check)', () => {
          // If code used formIndex instead of profileKey, goku_base (index ~7 in FORMS)
          // would have profileKey=7 instead of 5. This assertion catches that.
          // Some forms coincidentally align (e.g. piccolo_base is position 3 = profile 3),
          // so we only check forms where they differ.
          const formPosition = ROM_FIGHTER_FORM_IDENTITY.findIndex(
            row => row.formId === fixture.formId,
          );
          // Only assert inequality where position ≠ expected profileKey
          if (formPosition !== fixture.expectedActorVisualProfileKey) {
            expect(identity.actorVisualProfileKey).not.toBe(formPosition);
          }
        });

        // ─── Candidate C: graphicsBank must be 0x31 + profileKey ───
        it('graphicsBank = 0x31 + actorVisualProfileKey', () => {
          expect(identity.graphicsBank).toBe(0x31 + fixture.expectedActorVisualProfileKey);
          expect(identity.graphicsBank).toBe(fixture.expectedGraphicsBank);
        });

        it('graphicsBank is NOT 0x30 + profileKey (off-by-one)', () => {
          expect(identity.graphicsBank).not.toBe(0x30 + fixture.expectedActorVisualProfileKey);
        });

        it('graphicsBank is NOT 0x32 + profileKey (off-by-one)', () => {
          expect(identity.graphicsBank).not.toBe(0x32 + fixture.expectedActorVisualProfileKey);
        });

        it('paletteIndex matches actorVisualProfileKey', () => {
          expect(identity.paletteIndex).toBe(fixture.expectedPaletteIndex);
        });

        it('profileSourceMatchesRecord is true', () => {
          expect(identity.profileSourceMatchesRecord).toBe(true);
        });

        it('mappingStatus is ROM_RECORD_VERIFIED', () => {
          expect(identity.mappingStatus).toBe('ROM_RECORD_VERIFIED');
        });
      });
    }
  });

  // ─── Cross-form inequality (regression alarm) ───────────────────────
  // These forms must NOT share the same profileKey or graphicsBank.
  // If an off-by-one causes all forms to shift, these will fail.

  describe('cross-form identity inequality (regression alarm)', () => {
    it('goku_base ≠ goku_ssj profileKey', () => {
      const gokuBase = ROM_FIGHTER_FORM_IDENTITY.find(r => r.formId === 'goku_base')!;
      const gokuSSJ = ROM_FIGHTER_FORM_IDENTITY.find(r => r.formId === 'goku_ssj')!;
      expect(gokuBase.actorVisualProfileKey).not.toBe(gokuSSJ.actorVisualProfileKey);
      expect(gokuBase.graphicsBank).not.toBe(gokuSSJ.graphicsBank);
    });

    it('goku_base ≠ krillin_base profileKey', () => {
      const gokuBase = ROM_FIGHTER_FORM_IDENTITY.find(r => r.formId === 'goku_base')!;
      const krillin = ROM_FIGHTER_FORM_IDENTITY.find(r => r.formId === 'krillin_base')!;
      expect(gokuBase.actorVisualProfileKey).not.toBe(krillin.actorVisualProfileKey);
      expect(gokuBase.graphicsBank).not.toBe(krillin.graphicsBank);
    });

    it('krillin_base ≠ piccolo_base profileKey', () => {
      const krillin = ROM_FIGHTER_FORM_IDENTITY.find(r => r.formId === 'krillin_base')!;
      const piccolo = ROM_FIGHTER_FORM_IDENTITY.find(r => r.formId === 'piccolo_base')!;
      expect(krillin.actorVisualProfileKey).not.toBe(piccolo.actorVisualProfileKey);
      expect(krillin.graphicsBank).not.toBe(piccolo.graphicsBank);
    });
  });

  // ─── Physical corpus alignment ─────────────────────────────────────

  describe('physical corpus alignment', () => {
    for (const fixture of FORENSIC_FIXTURES) {
      it(`${fixture.formId} physical corpus profile matches identity`, () => {
        const corpusForm = ROM_PHYSICAL_CORPUS_SUMMARY.forms.find(
          f => f.formId === fixture.formId,
        );
        expect(corpusForm).toBeDefined();
        if (corpusForm) {
          expect(corpusForm.actorVisualProfileKey).toBe(fixture.expectedActorVisualProfileKey);
        }
      });
    }
  });

  // ─── Extended coverage: 7 additional fighters ───────────────────────

  describe('extended fighter profile verification (Vegeta, Trunks, Gohan, Android 16, Cell, Buu)', () => {
    const EXTENDED: Array<{ formId: string; expectedProfileKey: number; expectedGraphicsBank: number }> = [
      { formId: 'vegeta_base', expectedProfileKey: 9, expectedGraphicsBank: 0x3a },
      { formId: 'trunks_future', expectedProfileKey: 13, expectedGraphicsBank: 0x3e },
      { formId: 'gohan_adult_ssj', expectedProfileKey: 12, expectedGraphicsBank: 0x3d },
      { formId: 'android_16', expectedProfileKey: 28, expectedGraphicsBank: 0x4d },
      { formId: 'cell_perfect', expectedProfileKey: 35, expectedGraphicsBank: 0x54 },
      { formId: 'buu_base', expectedProfileKey: 19, expectedGraphicsBank: 0x44 },
      { formId: 'frieza_final', expectedProfileKey: 27, expectedGraphicsBank: 0x4c },
    ];

    for (const row of EXTENDED) {
      it(`${row.formId}: profile=${row.expectedProfileKey}, bank=0x${row.expectedGraphicsBank.toString(16)}`, () => {
        const identity = ROM_FIGHTER_FORM_IDENTITY.find(r => r.formId === row.formId);
        expect(identity).toBeDefined();
        if (identity) {
          expect(identity.actorVisualProfileKey).toBe(row.expectedProfileKey);
          expect(identity.graphicsBank).toBe(row.expectedGraphicsBank);
          expect(identity.graphicsBank).toBe(0x31 + row.expectedProfileKey);
        }
      });
    }
  });

  // ── ROM-Native Identity Key Tests ────────────────────────────────────

  describe('ROM-native identity key construction and parsing', () => {
    it('makeRomFighterIdentityKey produces canonical key', () => {
      const key = makeRomFighterIdentityKey(8, 5, 54);
      expect(key).toBe('8:5:54');
    });

    it('parseRomFighterIdentityKey roundtrips', () => {
      const key = makeRomFighterIdentityKey(8, 5, 54);
      const parsed = parseRomFighterIdentityKey(key);
      expect(parsed.romFormId).toBe(8);
      expect(parsed.actorVisualProfileKey).toBe(5);
      expect(parsed.graphicsBank).toBe(54);
    });

    it('makeRomPhysicalFrameKey produces canonical key', () => {
      const key = makeRomPhysicalFrameKey(5, 54, 0, 0, 0, 0);
      expect(key).toBe('5:54:0:0:0:0');
    });

    it('parseRomPhysicalFrameKey roundtrips', () => {
      const key = makeRomPhysicalFrameKey(5, 54, 3, 1, 4, 12);
      const parsed = parseRomPhysicalFrameKey(key);
      expect(parsed.profileKey).toBe(5);
      expect(parsed.graphicsBank).toBe(54);
      expect(parsed.animationResource).toBe(3);
      expect(parsed.sequence).toBe(1);
      expect(parsed.frameIndex).toBe(4);
      expect(parsed.visualFrameId).toBe(12);
    });

    it('graphicsBankForProfileKey uses 0x31 + profile formula', () => {
      expect(graphicsBankForProfileKey(0)).toBe(0x31);
      expect(graphicsBankForProfileKey(5)).toBe(0x36);
      expect(graphicsBankForProfileKey(27)).toBe(0x4c);
    });
  });

  // ── ROM Identity Chain Verification (all 48 forms) ───────────────────

  describe('ROM identity chain verification (all 48 forms)', () => {
    for (const row of ROM_FIGHTER_FORM_IDENTITY) {
      describe(row.formId, () => {
        it('verifyRomIdentityChain passes (raw bytes match derived values)', () => {
          const error = verifyRomIdentityChain({
            rawRecord: row.rawRecord,
            actorVisualProfileKey: row.actorVisualProfileKey,
            graphicsBank: row.graphicsBank,
            paletteIndex: row.paletteIndex,
          });
          expect(error).toBeNull();
        });

        it('detectOffByOne finds no displacement', () => {
          const result = detectOffByOne({
            rawRecord: row.rawRecord,
            actorVisualProfileKey: row.actorVisualProfileKey,
            graphicsBank: row.graphicsBank,
          });
          expect(result.detected).toBe(false);
        });

        it('identity key is canonical romFormId:profileKey:graphicsBank', () => {
          const key = makeRomFighterIdentityKey(
            row.romFormId,
            row.actorVisualProfileKey,
            row.graphicsBank,
          );
          const parsed = parseRomFighterIdentityKey(key);
          expect(parsed.romFormId).toBe(row.romFormId);
          expect(parsed.actorVisualProfileKey).toBe(row.actorVisualProfileKey);
          expect(parsed.graphicsBank).toBe(row.graphicsBank);
        });
      });
    }
  });
});