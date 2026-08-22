// verify-execution-plans.ts — genera la traza de ejecución ROM por técnica.
// Para cada técnica ROM_CONFIRMED compila su ExecutionPlan y verifica:
//   1. Los ticks salen 100% de los frames ROM (suma = totalTicks)
//   2. Existe ACTION_BEGIN y RETURN_TO_TACTICAL
//   3. Las fases siguen el orden del contrato
//   4. La duración en ms es consistente (ticks / 59.7275)
// Uso: npm run verify:execution
import { ROM_TECHNIQUES } from '../src/data/romAnimationData';
import { compileExecutionPlan, PHASE_ORDER } from '../src/battle/engine/execution';
import type { ExecutionPhase } from '../src/battle/engine/execution';

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
    // ── 2. eventos de frontera ──
    const phases = plan.events.map(e => e.phase);
    if (!phases.includes('ACTION_BEGIN')) { console.error(`❌ ${name}: falta ACTION_BEGIN`); fails++; }
    if (!phases.includes('RETURN_TO_TACTICAL')) { console.error(`❌ ${name}: falta RETURN_TO_TACTICAL`); fails++; }
    phases.forEach(p => allPhases.add(p));
    // ── 3. orden del contrato (orden parcial: las fases deben avanzar) ──
    let lastIdx = -1;
    for (const p of phases) {
      const idx = PHASE_ORDER.indexOf(p);
      if (idx < lastIdx) {
        console.error(`❌ ${name}: fase ${p} retrocede (orden del contrato)`);
        fails++;
        break;
      }
      lastIdx = Math.max(lastIdx, idx);
    }
    // ── 4. duración ms ──
    const expectMs = Math.round((plan.totalTicks / 59.7275) * 1000) / 1000;
    if (plan.durationMs !== expectMs) {
      console.error(`❌ ${name}: durationMs ${plan.durationMs} ≠ ${expectMs}`);
      fails++;
    }
  }

  // ── Traza detallada de Kamehameha (ejemplo del entregable) ──
  const kame = compileExecutionPlan(ROM_TECHNIQUES['Kamehameha'], 'Kamehameha');
  console.log('═══ KAMEHAMEHA — traza de ejecución ═══');
  for (const e of kame.events) {
    const t = String(e.tick).padStart(4, '0');
    const ph = e.phase.padEnd(20);
    console.log(`  T+${t} ${ph} [${e.provenance}] ${e.label}${e.detail ? ' — ' + e.detail : ''}`);
  }
  console.log(`  TOTAL: ${kame.totalTicks} ticks = ${kame.durationMs}s @59.7275fps`);

  console.log(`\n═══ RESULTADO: ${names.length} planes · ${fails} fallos ═══`);
  console.log(`Fases usadas: ${[...allPhases].join(' → ')}`);
  if (fails) process.exit(1);
  console.log('✅ OK');
}

main();
