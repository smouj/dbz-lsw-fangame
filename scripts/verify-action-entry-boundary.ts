// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B5 — verify:action-entry-boundary
// ═══════════════════════════════════════════════════════════════════════
// Gate del contrato ÚNICO de entrada a ACTION. No reimplementa la lógica:
// consume resolveActionEntryBoundary() y verifica invariantes ROM.
//
// Invariantes (orden ROM §182/§205):
//   1. El boundary es describible para todos los casos (nunca silencioso).
//   2. Ningún cue de entrada a ACTION ocurre ANTES de la palette transition.
//   3. displayReady ≤ actionEntry.
//   4. La entrada a ACTION nunca es anterior al inicio del film.
//   5. Los timelines que declaran ACTION_READY no usan el fallback legacy.
//   6. Un timeline sin SCENE_LOAD declara actionEntry = null (no se inventa).
//
// Portable: no requiere ROM.
// ═══════════════════════════════════════════════════════════════════════
import { resolveActionEntryBoundary, describeActionEntryBoundary } from '../src/battle/presentation/actionBoundary';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { romSupportPresentationProfile } from '../src/battle/romSupportPresentationProfile';
import { compileRomSupportPresentation } from '../src/battle/romSupportPresentationCompiler';
import { getCard, type CardDef } from '../src/data/cards';
import type { BattleSide } from '../src/battle/engine/state/BattleState';
import type { BattleTimeline } from '../src/battle/engine/presentation/PresentationCue';

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function route(cardId: number, side: BattleSide = 'player'): BattleTimeline {
  const card = getCard(cardId) as CardDef;
  const value = romPresentationTimelineForCard(card, side);
  if (!value) throw new Error(`missing ROM route for card ${cardId}`);
  return value.timeline;
}

function supportCommonTimeline(cardId: number): BattleTimeline | null {
  const profile = romSupportPresentationProfile({ cardId });
  if (!profile) return null;
  return compileRomSupportPresentation(profile).timeline as BattleTimeline;
}

const CASES: Array<{ id: number; label: string }> = [
  { id: 5, label: 'STANDARD_DAMAGE (Cont.Punch)' },
  { id: 7, label: 'BEAM (Energy Wave)' },
  { id: 8, label: 'Energy Bomb $05' },
  { id: 1, label: 'Stage (3 stage atk. static bridge)' },
];

console.log('═══ ACTION ENTRY BOUNDARY — contrato único ═══');

let monotonicBreaks = 0;
let paletteAfterEntry = 0;
let entryBeforeFilm = 0;
let legacyFallbackWithReady = 0;
let undescribed = 0;

for (const c of CASES) {
  const timeline = route(c.id);
  const b = resolveActionEntryBoundary(timeline);
  console.log(`  · ${c.label}: ${describeActionEntryBoundary(b)}`);

  if (b.actionEntryTick === null && b.tacticalExitTick === null) undescribed++;

  if (b.paletteStartTick !== null && b.actionEntryTick !== null && b.paletteStartTick > b.actionEntryTick) paletteAfterEntry++;
  if (b.actionEntryTick !== null && b.actionEntryTick < b.filmStartTick) entryBeforeFilm++;

  const hasReady = timeline.entries.some(e => e.cue.type === 'SCENE_LOAD' && e.cue.mode === 'ACTION_READY');
  if (hasReady && b.usedLegacyFallback) legacyFallbackWithReady++;

  const ticks = [b.tacticalExitTick, b.paletteStartTick, b.displayReadyTick, b.actionEntryTick].filter((t): t is number => t !== null);
  for (let i = 1; i < ticks.length; i++) if (ticks[i] < ticks[i - 1]) monotonicBreaks++;
}

check('todo caso declara boundary (nunca silencioso)', undescribed === 0, `${undescribed} sin declarar`);
check('ninguna palette transition posterior a la entrada a ACTION', paletteAfterEntry === 0, `${paletteAfterEntry} violan`);
check('ACTION entry nunca antes del inicio del film', entryBeforeFilm === 0, `${entryBeforeFilm} violan`);
check('con ACTION_READY declarado no se usa fallback legacy', legacyFallbackWithReady === 0, `${legacyFallbackWithReady} usan fallback`);
check('ticks del contrato monótonos (prepare ≤ palette ≤ displayReady ≤ ACTION)', monotonicBreaks === 0, `${monotonicBreaks} rupturas`);

// El contrato debe ser la ÚNICA autoridad: los consumidores no lo duplican.
const readyCases = CASES
  .map(c => ({ c, b: resolveActionEntryBoundary(route(c.id)) }))
  .filter(x => !x.b.usedLegacyFallback && x.b.actionEntryTick !== null);
check('hay casos con entrada explícita (ACTION_READY) para verificar el contrato', readyCases.length > 0, `${readyCases.length}/${CASES.length}`);

// Support común / Gather: declara su propia secuencia (BG $19 + paletas) pero NO
// cruza el boundary de ACTION → actionEntry debe ser null, no inventado.
const support = supportCommonTimeline(9);
if (support) {
  const bs = resolveActionEntryBoundary(support);
  console.log(`  · Support común/Gather (card 9): ${describeActionEntryBoundary(bs)}`);
  check('Support común no declara entrada a ACTION (null, no inventado)', bs.actionEntryTick === null && !bs.usedLegacyFallback, `ACTION=${bs.actionEntryTick}`);
  check('Support común sí declara su palette transition (BG5)', bs.paletteStartTick !== null, `palette=${bs.paletteStartTick}`);
  check('Support común declara el BG_ASSEMBLY $19', bs.bgAssemblyTick !== null, `bg=${bs.bgAssemblyTick}`);
} else {
  check('Support común card 9 tiene perfil', false, 'sin perfil');
}

console.log(`\nACTION entry boundary: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:action-entry-boundary FAIL' : '✅ verify:action-entry-boundary PASS');
process.exit(failures ? 1 : 0);
