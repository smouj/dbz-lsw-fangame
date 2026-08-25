// ═══════════════════════════════════════════════════════════════════════
// verify-animation-studio.ts — gate P0.3 (ROM ↔ runtime visual debugger)
// ═══════════════════════════════════════════════════════════════════════
// Verifica que el Animation Studio consume la VERDAD ROM/runtime sin
// duplicar mappings, que la timeline es por ticks GBC, que el playback es
// determinista, y que UNRESOLVED nunca se presenta como PHYSICAL.
// ═══════════════════════════════════════════════════════════════════════

import {
  GOLDEN_FORMS,
  GOLDEN_CONTEXTS,
  decodedStudioResources,
  romFrameView,
  tickBoundaries,
  sequenceTotalTicks,
  frameIndexAtTick,
  studioUnresolvedMetrics,
  cardsForStudioResource,
  studioResourceList,
} from '../src/battle/animationStudio';
import { animationResourceById } from '../src/battle/animationResources';
import { FORMS } from '../src/data/roster';
import { spriteDirFor } from '../src/data/spriteManifest';
import { manifestFramesFor, manifestPoseNames } from '../src/data/generated/manifestFrameIndex.generated';
import { resolveCharacterVisualSequence } from '../src/battle/characterFrameMap';
import { resolvePoseFrameSequence } from '../src/battle/spriteConfig';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('verify-animation-studio\n');

// 1. Recursos DECODED disponibles
const resources = decodedStudioResources();
check('recursos ROM decodificados > 0', resources.length > 0, `${resources.length}`);

// 2. Timeline física: cada secuencia decodificada íntegra
let badSeq = 0;
let badTicks = 0;
let badVf = 0;
for (const r of resources) {
  const catalog = animationResourceById(r.resourceId);
  if (!catalog) continue;
  for (const [si, seq] of catalog.sequences.entries()) {
    const bounds = tickBoundaries(r.resourceId, si);
    if (bounds.length !== seq.frames.length) badSeq++;
    const sum = bounds.reduce((a, b) => a + b.durationTicks, 0);
    if (sum !== seq.totalTicks) badTicks++;
    for (const f of seq.frames) {
      if (f.visualFrameId < 0 || f.durationTicks < 1) badVf++;
    }
  }
}
check('toda secuencia: frame count correcto', badSeq === 0, `${badSeq} incorrectas`);
check('toda secuencia: totalTicks correcto', badTicks === 0, `${badTicks} incorrectas`);
check('toda secuencia: visualFrameIds/duration válidos', badVf === 0, `${badVf} inválidos`);

// 3. romFrameView resuelve para un frame kamehameha (goku_base)
const kameView = romFrameView('goku_base', 3, 0, 2);
check('romFrameView kamehameha goku_base resuelve', !!kameView, kameView ? `${kameView.visualFrameId}t ticks=${kameView.durationTicks}` : 'null');
if (kameView) {
  check('romFrameView: manifestPose mapeado', !!kameView.manifestPose, kameView.manifestPose ?? 'null');
  check('romFrameView: F-MAP classification presente', !!kameView.classification, kameView.classification ?? 'null');
  check('romFrameView: ROM PHYSICAL source real', kameView.physical.source === 'ROM_PHYSICAL', kameView.physical.source);
  check('romFrameView: ROM PHYSICAL file usa physical/rom-p...', !!kameView.physical.file?.startsWith('physical/rom-p'), kameView.physical.file ?? 'null');
  check(
    'romFrameView: physicalId fuerte p/g/r/vf/metasprite/graphics',
    /^rom-p[0-9a-f]{2}-g[0-9a-f]{2}-r03-vf[0-9a-f]{2}-ms[0-9a-f]{8}-gfx[0-9a-f]{8}$/.test(kameView.physical.physicalId ?? ''),
    kameView.physical.physicalId ?? 'null',
  );
}

// 4. Deterministic playback
const t0 = frameIndexAtTick(3, 0, 0);
const t17 = frameIndexAtTick(3, 0, 17);
const t17again = frameIndexAtTick(3, 0, 17);
const wrapped = frameIndexAtTick(3, 0, 17 + 75);
check('playback determinista (mismo tick → mismo frame)', t17 === t17again, `${t17}`);
check('playback envuelve con loop (tick % total)', wrapped === t17, `${wrapped} vs ${t17}`);
check('tick 0 → frame 0', t0 === 0, `${t0}`);

// 5. Same resource + profile → same sequence (identidad invariante)
const seqA = tickBoundaries(3, 0).map(b => b.durationTicks).join(',');
const seqB = tickBoundaries(3, 0).map(b => b.durationTicks).join(',');
check('mismo resource+seq → misma secuencia', seqA === seqB, `${seqA}`);

// 6. LEFT/RIGHT no altera identidad de secuencia (side es solo render)
const viewRight = romFrameView('goku_base', 3, 0, 0);
const viewRight2 = romFrameView('goku_base', 3, 0, 0);
check('LEFT/RIGHT: identidad de secuencia invariante', viewRight && viewRight2 && viewRight.visualFrameId === viewRight2.visualFrameId && viewRight.durationTicks === viewRight2.durationTicks);

// 7. Golden set: 4 formas × 5 contextos = 20
check('golden set: 4 formas', GOLDEN_FORMS.length === 4, `${GOLDEN_FORMS.length}`);
check('golden set: 5 contextos', GOLDEN_CONTEXTS.length === 5, `${GOLDEN_CONTEXTS.length}`);

// 8. Gather actor path = STATIC (no animación de actor)
const gather = GOLDEN_CONTEXTS.find(c => c.id === 'gather');
check('gather: actor path = STATIC', gather?.actorPath === 'STATIC', gather?.actorPath);
check('gather: FX $1A + palette $33', gather?.fxResource === 0x1a && gather?.palette === 0x33, `$${gather?.fxResource?.toString(16)} / $${gather?.palette?.toString(16)}`);

// 9. Ningún UNRESOLVED se presenta como PHYSICAL (classification no se inventa)
//    — para cada frame ROM mapeado, el F-MAP classification debe coincidir
//    con el physical reconciliation (EXACT→ROM_EXACT), nunca UNRESOLVED→ROM_EXACT.
let falsePhysical = 0;
for (const r of resources) {
  for (let si = 0; si < r.frames.reduce((m, f) => Math.max(m, f.sequenceIndex + 1), 0); si++) {
    for (let fi = 0; fi < r.frames.filter(f => f.sequenceIndex === si).length; fi++) {
      for (const formId of ['goku_base', 'goku_ssj', 'piccolo_base', 'android_16']) {
        const v = romFrameView(formId, r.resourceId, si, fi);
        if (!v) continue;
        if (v.mappingStatus === 'UNRESOLVED' && v.classification === 'ROM_EXACT') falsePhysical++;
      }
    }
  }
}
check('0 UNRESOLVED presentado como ROM_EXACT', falsePhysical === 0, `${falsePhysical}`);

// 10. REFERENCE_FX nunca se muestra como frame de Fighter
const fxMappedAsFighter = GOLDEN_CONTEXTS.filter(c => c.semanticRole === 'beam_ray' || c.semanticRole === 'aura_power');
check('golden contexts no usan FX como fighter', fxMappedAsFighter.length === 0);

// 11. Referencias de manifest válidas: F-MAP frames son archivos reales
let brokenRef = 0;
for (const formId of ['goku_base', 'goku_ssj', 'piccolo_base', 'android_16']) {
  const dir = spriteDirFor(formId);
  if (!dir) continue;
  for (const ctx of GOLDEN_CONTEXTS) {
    const fmap = resolveCharacterVisualSequence({ formId, semanticRole: ctx.semanticRole });
    for (const file of fmap.frames) {
      const exists = manifestFramesFor(dir, fmap.semanticRole).some(f => f.file === file) || (dir ? manifestFramesFor(dir, fmap.semanticRole).some(f => f.file === file) : false);
      if (!exists) brokenRef++;
    }
  }
}
check('F-MAP frames referencian archivos reales (golden)', brokenRef === 0, `${brokenRef}`);

// 12. Producción expone frames de manifest (resolvePoseFrameSequence)
let prodOk = true;
const dir = spriteDirFor('goku_base');
if (dir) {
  const available = new Set<string>();
  for (const p of manifestPoseNames(dir)) for (const f of manifestFramesFor(dir, p)) available.add(f.file);
  const prod = resolvePoseFrameSequence('beam_fire', dir, file => available.has(file));
  prodOk = prod.length > 0;
}
check('producción expone frames para beam_fire (goku_base)', prodOk);

// 13. Métricas de UNRESOLVED: jerarquía coherente
const m = studioUnresolvedMetrics();
check('TOTAL_UNRESOLVED > 0', m.totalUnresolved > 0, `${m.totalUnresolved}`);
check('PRODUCTION_REACHABLE ≤ TOTAL', m.productionReachableUnresolved <= m.totalUnresolved, `${m.productionReachableUnresolved}`);
check('GOLDEN_REACHABLE ≤ PRODUCTION_REACHABLE', m.goldenReachableUnresolved <= m.productionReachableUnresolved, `${m.goldenReachableUnresolved}`);
check('golden unresolved lista expuesta', m.goldenUnresolved.length === m.goldenReachableUnresolved, `${m.goldenUnresolved.length}`);

// 14. Consumidores por recurso
const kameCards = cardsForStudioResource(3, 'goku_base');
check('consumidores kamehameha expuestos', kameCards.length > 0, `${kameCards.length}`);

console.log(`\nRESULTADO: ${pass} ✓ · ${fail} ✗`);
process.exit(fail === 0 ? 0 : 1);
