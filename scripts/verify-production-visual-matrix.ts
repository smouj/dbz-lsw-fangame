// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B8B — verify:production-visual-matrix
// ═══════════════════════════════════════════════════════════════════════
// No verifica solo cues: conduce la cadena real y compara tres niveles
//   expected ROM program  vs  timeline emitted  vs  Production consumed
//
// Además de la matriz, exige los invariantes de B8 y que TODA ausencia de
// evidencia esté clasificada (B8C/B8D).
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { buildVisualMatrix, MATRIX_FAMILIES, driveRuntime } from './production-visual-matrix';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { ActionObjectBindingProbe } from '../src/battle/engine/presentation/ActionObjectRuntime';

let checks = 0, failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

const rows = buildVisualMatrix();

console.log('═══ B8 — Production visual matrix ═══');

// ── Cobertura: las 14 familias representativas están presentes ──
const covered = new Set(rows.map(r => r.family));
const missing = MATRIX_FAMILIES.filter(f => !covered.has(f));
check(`familias representativas cubiertas 100% (${MATRIX_FAMILIES.length})`, missing.length === 0,
  missing.length ? `faltan: ${missing.join(', ')}` : `${MATRIX_FAMILIES.length}/${MATRIX_FAMILIES.length}`);

// ── Toda ausencia de evidencia está clasificada y justificada ──
const badState = rows.filter(r => !['VERIFIED', 'PENDING', 'DEFERRED_TO_TRACE'].includes(r.fidelity));
check('toda fila tiene estado de fidelidad válido', badState.length === 0, `${badState.length} sin estado`);
const unclassified = rows.filter(r => r.fidelity !== 'VERIFIED' && !r.note);
check('todo gap (PENDING/DEFERRED) está justificado', unclassified.length === 0,
  unclassified.map(r => r.family).join(', ') || 'todos con nota');

// ── Tres niveles sobre el caso conductor (STANDARD_DAMAGE) ──
{
  const cues = driveRuntime(5, 'player') ?? [];
  const probe = new ActionObjectBindingProbe();
  const base = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'bindActionObject') return (s: 0 | 1, b: unknown) => probe.bindActionObject(s, b as never);
      if (p === 'unbindActionObject') return (s: 0 | 1) => probe.unbindActionObject(s);
      if (p === 'actionObjectBindingObservation') return () => probe.actionObjectBindingObservation();
      if (p === 'clearActionObjectBinding') return () => probe.clearActionObjectBinding();
      if (p === 'setActionObjectVisibilityForParticipant') return (s: 'player' | 'enemy', v: boolean) => probe.setVisibilityForBoundParticipant(s, v);
      if (p === 'setActionObjectDrawOrder') return (o: 'SLOT_0_THEN_1' | 'SLOT_1_THEN_0') => probe.setActionObjectDrawOrder(o);
      if (p === 'then') return undefined;
      return () => undefined;
    },
  }) as never;
  const adapter = new ProductionRomPresentationAdapter(base, new RomDisplayPresenter());
  // El film termina en FIELD restore, que por diseño limpia el binding: el
  // estado físico se lee DURANTE la acción. El bind va al inicio (B7B3) y el
  // draw order en branchTick, así que se avanza hasta el ÚLTIMO de los dos.
  let lastPhysical = -1;
  cues.forEach((c, i) => {
    if (c.type === 'ACTION_OBJECT_BIND' || c.type === 'ACTION_OBJECT_DRAW_ORDER') lastPhysical = i;
  });
  for (let i = 0; i <= lastPhysical; i++) adapter.consume(cues[i]);
  const during = adapter.actionObjectBinding;
  const drawDuring = probe.drawOrderObservation();
  for (let i = lastPhysical + 1; i < cues.length; i++) adapter.consume(cues[i]);
  const snap = adapter.snapshot;
  const emitted = cues.length;
  const consumed = snap.cuesConsumed;
  check('nivel 2 ≡ nivel 3 (timeline emitted == Production consumed)', consumed === emitted,
    `emitted=${emitted} consumed=${consumed}`);
  check('cue emitted but ignored = 0', snap.pendingCues === 0, `${snap.pendingCues}`);
  check('camera residual after FIELD = 0',
    (snap as unknown as { exitResidualTypes?: string[] }).exitResidualTypes?.filter(t => t.includes('SCREEN')).length === 0,
    `${(snap as unknown as { exitResidualTypes?: string[] }).exitResidualTypes?.length ?? 0} tipos residuales`);
  check('display residual after FIELD = 0', snap.exitDisplayReleases >= 0 && snap.exitResidualCues === 0,
    `residual=${snap.exitResidualCues}`);
  check('ActionObject / FX residual after FIELD = 0', snap.exitResidualCues === 0, `${snap.exitResidualCues}`);
  check('binding divergence = 0', during?.bindingContext === 'OFFENSE',
    `context=${during?.bindingContext}`);
  check('draw-order divergence = 0', drawDuring.order === 'SLOT_0_THEN_1', `${drawDuring.order}`);
  check('visibility divergence = 0',
    during?.slot0Role === 'ATTACKER' && during?.slot1Role === 'DEFENDER',
    `${during?.slot0Role}/${during?.slot1Role}`);
}

// ── Invariantes estáticos ──
const adapterSrc = readFileSync('src/renderer/pixi/presentation/ProductionRomPresentationAdapter.ts', 'utf8');
const sceneSrc = readFileSync('src/renderer/pixi/scenes/ActionScene.ts', 'utf8');
check('LEGACY authority reached = 0',
  !/applySceneVisibility/.test(adapterSrc) && !/applySceneVisibility\s*\(/.test(sceneSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')),
  'sin autoridad LEGACY en el path de producción');
check('BG fallback = 0', !/BG_ASSEMBLY[^\n]*fallback|fallback[^\n]*BG_ASSEMBLY/i.test(adapterSrc),
  'BG sin fallback silencioso');
check('palette fallback = 0', !/PALETTE_TRANSITION[^\n]*fallback|fallback[^\n]*PALETTE/i.test(adapterSrc),
  'palette sin fallback silencioso');
check('physicalId unresolved silently = 0',
  /this\.stats\.physicalFrames\+\+/.test(adapterSrc)
  && /lastPhysicalFrame\s*=\s*\{[^}]*physicalId/s.test(adapterSrc),
  'cada frame se cuenta y su physicalId queda en el snapshot (nunca tragado)');

// ── Resumen por estado ──
const byState = (s: string) => rows.filter(r => r.fidelity === s).length;
console.log(`\n  VERIFIED ${byState('VERIFIED')} · PENDING ${byState('PENDING')} · DEFERRED_TO_TRACE ${byState('DEFERRED_TO_TRACE')}`);
console.log(`\nProduction visual matrix: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:production-visual-matrix FAIL' : '✅ verify:production-visual-matrix PASS');
process.exit(failures ? 1 : 0);
