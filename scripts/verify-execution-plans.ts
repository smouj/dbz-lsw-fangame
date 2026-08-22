// verify-execution-plans.ts — valida los ExecutionPlans de las técnicas ROM.
// Checks por técnica:
//   1. ticks 100% de los frames ROM (suma = totalTicks)
//   2. ACTION_BEGIN y RETURN_TO_TACTICAL presentes
//   3. fases en orden del contrato (orden parcial)
//   4. durationMs consistente (ticks / 59.7275)
//   5. eventos HANDLER_SIGNAL y ACTOR_FRAME separados (kind)
//   6. ningún tick inventado etiquetado ROM_CONFIRMED (todo tick de un
//      evento ACTOR_FRAME debe estar en actorTrack con el mismo tick)
//   7. determinismo: compilar dos veces produce plan deepEqual
// Uso: npm run verify:execution
import { ROM_TECHNIQUES } from '../src/data/romAnimationData';
import { compileExecutionPlan, PHASE_ORDER } from '../src/battle/engine/execution';
import type { ExecutionPhase } from '../src/battle/engine/execution';

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function main() {
  const names = Object.keys(ROM_TECHNIQUES);
  console.log(`═══ EXECUTION PLANS (${names.length} técnicas ROM_CONFIRMED) ═══\n`);
  let fails = 0;
  const allPhases = new Set<ExecutionPhase>();

  for (const name of names.sort()) {
    const profile = ROM_TECHNIQUES[name];
    const plan = compileExecutionPlan(profile, name);

    // ── 1. ticks ROM puros ──
    const frameSum = plan.frames.reduce((a, f) => a + f.ticks, 0);
    if (frameSum !== plan.totalTicks) {
      console.error(`❌ ${name}: suma frames ${frameSum} ≠ totalTicks ${plan.totalTicks}`);
      fails++;
    }
    // ── 2. fronteras ──
    const phases = plan.events.map(e => e.phase);
    if (!phases.includes('ACTION_BEGIN')) { console.error(`❌ ${name}: falta ACTION_BEGIN`); fails++; }
    if (!phases.includes('RETURN_TO_TACTICAL')) { console.error(`❌ ${name}: falta RETURN_TO_TACTICAL`); fails++; }
    phases.forEach(p => allPhases.add(p));
    // ── 3. orden del contrato (solo sobre señales del handler, no frames) ──
    let lastIdx = -1;
    for (const e of plan.events) {
      if (e.kind !== 'HANDLER_SIGNAL') continue;
      const idx = PHASE_ORDER.indexOf(e.phase);
      if (idx < lastIdx) {
        console.error(`❌ ${name}: fase ${e.phase} retrocede (orden del contrato)`);
        fails++;
        break;
      }
      lastIdx = Math.max(lastIdx, idx);
    }
    // ── 4. durationMs ──
    const expectMs = Math.round((plan.totalTicks / 59.7275) * 1000) / 1000;
    if (plan.durationMs !== expectMs) {
      console.error(`❌ ${name}: durationMs ${plan.durationMs} ≠ ${expectMs}`);
      fails++;
    }
    // ── 5. kinds separados ──
    const hasSignal = plan.events.some(e => e.kind === 'HANDLER_SIGNAL');
    const hasFrame = plan.events.some(e => e.kind === 'ACTOR_FRAME');
    if (!hasSignal || !hasFrame) {
      console.error(`❌ ${name}: faltan HANDLER_SIGNAL o ACTOR_FRAME (${hasSignal}/${hasFrame})`);
      fails++;
    }
    // ── 6. ningún tick inventado como ROM_CONFIRMED ──
    // Todo evento ACTOR_FRAME ROM_CONFIRMED debe tener su frame en
    // actorTrack con el MISMO tick y el mismo label base (sin el sufijo).
    const actorTicks = new Set(plan.actorTrack.map(t => `${t.tick}:${t.label.split(' (')[0]}`));
    for (const e of plan.events) {
      if (e.kind === 'ACTOR_FRAME' && e.provenance === 'ROM_CONFIRMED') {
        const key = `${e.tick}:${e.label}`;
        if (!actorTicks.has(key)) {
          console.error(`❌ ${name}: ACTOR_FRAME ${key} no está en actorTrack (tick inventado?)`);
          fails++;
        }
      }
    }
    // ── 7. determinismo (deepEqual byte-for-byte) ──
    const plan2 = compileExecutionPlan(profile, name);
    if (!deepEqual(plan, plan2)) {
      console.error(`❌ ${name}: plan NO determinista (dos compilaciones difieren)`);
      fails++;
    }
  }

  // ── Traza detallada de Kamehameha y Big Bang ──
  for (const t of ['Kamehameha', 'Big Bang Attack']) {
    const p = ROM_TECHNIQUES[t];
    if (!p) continue;
    const plan = compileExecutionPlan(p, t);
    console.log(`\n═══ ${t.toUpperCase()} — traza de ejecución ═══`);
    for (const e of plan.events) {
      const tick = String(e.tick).padStart(4, '0');
      const ph = e.phase.padEnd(20);
      const kind = e.kind.padEnd(15);
      console.log(`  T+${tick} ${ph} [${e.provenance}] ${kind} ${e.label}${e.detail ? ' — ' + e.detail : ''}`);
    }
    console.log(`  ── FX track (${plan.fxTrack.length} eventos):`);
    for (const fx of plan.fxTrack) {
      console.log(`     T+${fx.tick} ${fx.kind} ${fx.label} [${fx.provenance}]`);
    }
    console.log(`  TOTAL: ${plan.totalTicks} ticks = ${plan.durationMs}s @59.7275`);
  }

  console.log(`\n═══ RESULTADO: ${names.length} planes · ${fails} fallos ═══`);
  console.log(`Fases usadas: ${[...allPhases].join(' → ')}`);
  if (fails) process.exit(1);
  console.log('✅ OK');
}

main();
