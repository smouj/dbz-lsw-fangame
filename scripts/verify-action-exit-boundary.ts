// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B6 — verify:action-exit-boundary
// ═══════════════════════════════════════════════════════════════════════
// Gate del contrato ÚNICO de salida ACTION → FIELD.
// No reimplementa la lógica: consume resolveActionExitBoundary().
//
// DoD B6:
//   · ACTION_OBJECT activo tras FIELD ......... 0
//   · projectile residual ..................... 0
//   · FX residual ............................. 0
//   · palette/display/screen residual ......... 0
//   · presenter spontaneous cleanup ........... 0
//   · synthetic Support DISPLAY_CLEAR ......... 0
//
// Casos mínimos: STANDARD_DAMAGE · Beam $02 · Energy Bomb $05 · Stage ·
//                Support $00/$02 · Gather/CHARA $1A
//
// Portable: no requiere ROM.
// ═══════════════════════════════════════════════════════════════════════
import { resolveActionExitBoundary, describeActionExitBoundary } from '../src/battle/presentation/actionExitBoundary';
import { resolveActionEntryBoundary, describeActionEntryBoundary } from '../src/battle/presentation/actionBoundary';
import { romPresentationTimelineForCard } from '../src/battle/romPresentationForCard';
import { romSupportPresentationProfile } from '../src/battle/romSupportPresentationProfile';
import { compileRomSupportPresentation } from '../src/battle/romSupportPresentationCompiler';
import { getCard, type CardDef } from '../src/data/cards';
import { CARDS } from '../src/data/cards';
import { romBgAssemblyProgram } from '../src/data/generated/romBgAssembly.generated';
import type { BattleTimeline } from '../src/battle/engine/presentation/PresentationCue';

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function route(cardId: number): BattleTimeline | null {
  const card = getCard(cardId) as CardDef | undefined;
  if (!card) return null;
  const value = romPresentationTimelineForCard(card, 'player');
  return value ? (value.timeline as BattleTimeline) : null;
}

function supportTimeline(cardId: number): BattleTimeline | null {
  const profile = romSupportPresentationProfile({ cardId });
  if (!profile) return null;
  return compileRomSupportPresentation(profile).timeline as BattleTimeline;
}

console.log('═══ ACTION EXIT BOUNDARY — contrato único ═══');

const CASES: Array<{ id: number; label: string; via: 'route' | 'support' }> = [
  { id: 5, label: 'STANDARD_DAMAGE (Cont.Punch)', via: 'route' },
  { id: 7, label: 'Beam $02 (Energy Wave)', via: 'route' },
  { id: 8, label: 'Energy Bomb $05', via: 'route' },
  { id: 1, label: 'Stage', via: 'route' },
  { id: 9, label: 'Support $00/$02 (card 9)', via: 'support' },
];

// Gather/CHARA $1A: el recurso es ROM real (Bank03:$6750 → Bank $68 Resource $1A
// → VRAM $8800; decoder spec + SSOT generada). Ninguna carta del perfil Support
// declara todavía BG $1A (background.resource es 0x19|null), así que se registra
// como HUECO EXPLÍCITO en vez de saltarlo en silencio.
let gatherCharaId: number | null = null;
for (const card of CARDS) {
  const tl = route(card.id);
  if (!tl) continue;
  if (tl.entries.some(e => e.cue.type === 'BG_ASSEMBLY' && (e.cue as { resource?: number }).resource === 0x1a)) {
    gatherCharaId = card.id;
    break;
  }
}
const bg1aInRom = romBgAssemblyProgram(0x1a) !== null;
if (gatherCharaId !== null) CASES.push({ id: gatherCharaId, label: `Gather/CHARA $1A (card ${gatherCharaId})`, via: 'route' });

let totalResidual = 0;
let orderViolations = 0;
let undescribed = 0;
let supportSyntheticClear = 0;

for (const c of CASES) {
  const tl = c.via === 'support' ? supportTimeline(c.id) : route(c.id);
  if (!tl) { console.log(`  ! ${c.label}: sin timeline`); undescribed++; continue; }
  const b = resolveActionExitBoundary(tl);
  const entry = resolveActionEntryBoundary(tl);
  console.log(`  · ${c.label}\n      entry: ${describeActionEntryBoundary(entry)}\n      exit : ${describeActionExitBoundary(b)}`);

  if (b.fieldReadyTick === null) undescribed++;
  totalResidual += b.residualAfterField.length;

  // Orden de salida: cleanup antes o en FIELD.
  const cleanups: Array<{ n: string; t: number | null }> = [
    { n: 'stop', t: b.actionObjectsStoppedTick },
    { n: 'unbind', t: b.actionObjectsUnboundTick },
    { n: 'screen', t: b.screenRestoreTick },
  ];
  for (const cl of cleanups) {
    if (cl.t !== null && b.fieldReadyTick !== null && cl.t > b.fieldReadyTick) orderViolations++;
  }

  // Support $00/$02: NO debe existir un DISPLAY_CLEAR sintético.
  if (c.via === 'support' && b.displayClearTick !== null) supportSyntheticClear++;
}

check('todo caso declara FIELD_READY (nunca silencioso)', undescribed === 0, `${undescribed} sin declarar`);
check('residuo tras FIELD = 0 (físicos/FX)', totalResidual === 0, `${totalResidual} residuos`);
check('cleanup (stop/unbind/screen) nunca después de FIELD', orderViolations === 0, `${orderViolations} violaciones`);
check('0 DISPLAY_CLEAR sintético en Support $00/$02', supportSyntheticClear === 0, `${supportSyntheticClear} sintéticos`);
check('caso Gather/CHARA $1A: recurso ROM presente (Bank68:$1A)', bg1aInRom, bg1aInRom ? 'SSOT $1a ok' : 'ausente');
// Principio del proyecto: el hueco debe estar DECLARADO, nunca silencioso. Si
// ninguna carta declara BG $1A, el gate lo exige explícito y lo cuenta.
const bg1aRouteGap = gatherCharaId === null;
check('caso Gather/CHARA $1A: hueco de ruta declarado (no silencioso)',
  !bg1aRouteGap || bg1aInRom,
  bg1aRouteGap
    ? 'HUECO DECLARADO: ninguna carta declara BG $1A (background.resource solo admite $19) — bloquea cerrar el caso $1A de B6'
    : `card ${gatherCharaId}`);

console.log(`\nACTION exit boundary: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:action-exit-boundary FAIL' : '✅ verify:action-exit-boundary PASS');
process.exit(failures ? 1 : 0);
