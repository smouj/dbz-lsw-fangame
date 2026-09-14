// ═══════════════════════════════════════════════════════════════════════
// DBZ LSW — Verify Cinematic Timing Inventory
// ═══════════════════════════════════════════════════════════════════════
// Audits the RomCinematicBeat registry against runtime constants and
// reports evidence distribution, incorrect usages, and INFERRED_LEGACY
// beats that need replacement.
// ═══════════════════════════════════════════════════════════════════════

import {
  ROM_CINEMATIC_BEATS,
  cinematicEvidenceSummary,
  familyEvidenceSummary,
  inferredLegacyBeats,
  incorrectlyUsedBeats,
  type RomCinematicBeat,
  type CinematicEvidence,
  type CinematicFamily,
} from '../src/battle/romCinematicBeat';
import { CHARA_EXIT, CHARA_ENTRY, ROM_RUSH_MOTION, ROM_BEAM_SETUP_MOTION } from '../src/battle/engine/rom/romDescriptors';
import { SUPPORT_HOLD120_TICKS } from '../src/battle/romSupportPresentationProfile';
import { STAGE_PREP_TICKS, COUNTER_WINDOW_TICKS, STAGE_PREP_FIDELITY } from '../src/battle/engine/clock/clock';
import { ROM_PRESENTATION_PROFILES, romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import { CARDS } from '../src/data/cards';
import { DEFENSE_ROM_RULES } from '../src/battle/engine/rom/romDescriptors';

// ── Cross-check: verify registry matches runtime constants ──

const crossChecks: { beat: string; registryValue: number | null; runtimeValue: number; match: boolean }[] = [];

for (const beat of ROM_CINEMATIC_BEATS) {
  if (beat.durationTicks == null) continue;

  switch (beat.id) {
    case 'CHARA_EXIT': {
      const expected = CHARA_EXIT.moveTicks + CHARA_EXIT.holdTicks;
      crossChecks.push({ beat: beat.id, registryValue: beat.durationTicks, runtimeValue: expected, match: beat.durationTicks === expected });
      break;
    }
    case 'CHARA_ENTRY': {
      // CHARA_ENTRY is the complete ROM macro: entry motion (19t), hold
      // (5t), and the final settle (8t). Comparing only settle+hold used to
      // report a false 13t runtime duration even though production consumes
      // the full 32-tick descriptor.
      const expected = CHARA_ENTRY.entryTicks + CHARA_ENTRY.holdTicks + CHARA_ENTRY.settleTicks;
      crossChecks.push({ beat: beat.id, registryValue: beat.durationTicks, runtimeValue: expected, match: beat.durationTicks === expected });
      break;
    }
    case 'STD_DAMAGE_RUSH': {
      const expected = ROM_RUSH_MOTION.segments.reduce((s, seg) => s + seg.ticks, 0);
      crossChecks.push({ beat: beat.id, registryValue: beat.durationTicks, runtimeValue: expected, match: beat.durationTicks === expected });
      break;
    }
    case 'BEAM_SETUP': {
      const expected = ROM_BEAM_SETUP_MOTION.segments.reduce((s, seg) => s + seg.ticks, 0);
      crossChecks.push({ beat: beat.id, registryValue: beat.durationTicks, runtimeValue: expected, match: beat.durationTicks === expected });
      break;
    }
    case 'SUPPORT_HOLD120': {
      crossChecks.push({ beat: beat.id, registryValue: beat.durationTicks, runtimeValue: SUPPORT_HOLD120_TICKS, match: beat.durationTicks === SUPPORT_HOLD120_TICKS });
      break;
    }
    case 'STAGE_PREP': {
      crossChecks.push({ beat: beat.id, registryValue: beat.durationTicks, runtimeValue: STAGE_PREP_TICKS, match: beat.durationTicks === STAGE_PREP_TICKS });
      break;
    }
    case 'COUNTER_WINDOW': {
      crossChecks.push({ beat: beat.id, registryValue: beat.durationTicks, runtimeValue: COUNTER_WINDOW_TICKS, match: Math.abs((beat.durationTicks ?? 0) - COUNTER_WINDOW_TICKS) <= 1 });
      break;
    }
  }
}

// ── Report ──

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  CINEMATIC TIMING INVENTORY VERIFICATION                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log();

// Cross-checks
console.log('── Cross-Checks (Registry vs Runtime) ──');
let crossPass = 0;
let crossFail = 0;
for (const check of crossChecks) {
  const icon = check.match ? '✓' : '✗';
  if (check.match) crossPass++; else crossFail++;
  console.log(`  ${icon} ${check.beat}: registry=${check.registryValue} runtime=${check.runtimeValue}`);
}
console.log(`  PASS: ${crossPass} / FAIL: ${crossFail}`);
console.log();

// Evidence distribution
console.log('── Evidence Distribution ──');
const evidenceSummary = cinematicEvidenceSummary();
for (const [evidence, count] of Object.entries(evidenceSummary)) {
  console.log(`  ${evidence}: ${count}`);
}
console.log();

// Family distribution
console.log('── Family × Evidence ──');
const familySummary = familyEvidenceSummary();
for (const [family, evidence] of Object.entries(familySummary)) {
  const parts = Object.entries(evidence).map(([e, c]) => `${e}=${c}`).join(', ');
  console.log(`  ${family}: ${parts}`);
}
console.log();

// INFERRED_LEGACY beats
console.log('── INFERRED_LEGACY Beats (MUST ELIMINATE) ──');
const legacy = inferredLegacyBeats();
for (const beat of legacy) {
  console.log(`  ✗ ${beat.id} (${beat.family}): ${beat.durationTicks}t — ${beat.description}`);
  if (beat.remediation) console.log(`    → ${beat.remediation}`);
}
console.log(`  Total INFERRED_LEGACY: ${legacy.length}`);
console.log();

// Incorrectly used beats
console.log('── Incorrectly Used Beats ──');
const incorrect = incorrectlyUsedBeats();
for (const beat of incorrect) {
  console.log(`  ⚠ ${beat.id} (${beat.family}): ${beat.correctlyUsed} — ${beat.description}`);
  if (beat.remediation) console.log(`    → ${beat.remediation}`);
}
console.log(`  Total incorrect: ${incorrect.length}`);
console.log();

// ROM profiles coverage
console.log('── ROM Presentation Profiles Coverage ──');
const romBackedCards = CARDS.filter(card => {
  const profile = romPresentationProfileForCard(card);
  return ['STANDARD_DAMAGE', 'BEAM_BASE', 'BEAM_VARIANT', 'SUPPORT_OR_FIELD_EFFECT'].includes(profile.kind);
}).length;
const totalCards = CARDS.length;
console.log(`  ROM-backed cards: ${romBackedCards} / ${totalCards} (${Math.round(romBackedCards / totalCards * 100)}%)`);
console.log(`  Legacy cards: ${totalCards - romBackedCards} / ${totalCards}`);
console.log();

// Defense coverage
console.log('── Defense ROM Rules ──');
console.log(`  Cards with ROM rules: ${Object.keys(DEFENSE_ROM_RULES).length}`);
console.log();

// STAGE_PREP fidelity
console.log('── STAGE_PREP Fidelity ──');
console.log(`  STAGE_PREP_TICKS = ${STAGE_PREP_TICKS}t`);
console.log(`  STAGE_PREP_FIDELITY = ${STAGE_PREP_FIDELITY}`);
console.log();

// Summary
console.log('── SUMMARY ──');
const total = ROM_CINEMATIC_BEATS.length;
const romExact = (evidenceSummary['ROM_EXACT'] ?? 0);
const romStaticVerified = (evidenceSummary['ROM_STATIC_VERIFIED'] ?? 0);
const romDynamicVerified = (evidenceSummary['ROM_DYNAMIC_VERIFIED'] ?? 0);
const romHandlerVerified = (evidenceSummary['ROM_HANDLER_VERIFIED'] ?? 0);
const presentationDerived = (evidenceSummary['PRESENTATION_DERIVED'] ?? 0);
const inferredLegacyCount = (evidenceSummary['INFERRED_LEGACY'] ?? 0);
const pendingRomTrace = (evidenceSummary['PENDING_ROM_TRACE'] ?? 0);

const romTotal = romExact + romStaticVerified + romDynamicVerified + romHandlerVerified;
const romPercent = Math.round(romTotal / total * 100);

console.log(`  Total beats: ${total}`);
console.log(`  ROM-backed (EXACT+STATIC+DYNAMIC+HANDLER): ${romTotal} (${romPercent}%)`);
console.log(`  PRESENTATION_DERIVED: ${presentationDerived}`);
console.log(`  INFERRED_LEGACY: ${inferredLegacyCount} ← MUST ELIMINATE`);
console.log(`  PENDING_ROM_TRACE: ${pendingRomTrace}`);
console.log();

// Target
console.log('── TARGET ──');
console.log(`  INFERRED_LEGACY must become 0`);
console.log(`  Known ROM timings must be integrated`);
console.log(`  Unknowns explicitly classified as PRESENTATION_DERIVED or PENDING_ROM_TRACE`);
console.log(`  No silent legacy constants`);

if (crossFail > 0) {
  console.error(`\nFAIL — ${crossFail} cinematic timing cross-check(s) diverge from runtime.`);
  process.exitCode = 1;
}
