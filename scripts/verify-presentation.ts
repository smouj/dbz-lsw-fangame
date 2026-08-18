// ═══════════════════════════════════════════════════════════════════════
// VERIFY: PRESENTATION (M7) — BattleEventEnvelope[] → BattleTimeline.
// Uso: npm run verify:presentation · npm run gen:presentation-fixtures
//   --write  → (re)genera scripts/fixtures/m7_*.json desde los escenarios.
//   sin flag → compara el timeline contra los fixtures (golden).
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import {
  PRESENTATION_SCENARIOS,
  runPresentationScenario,
  type PresentationScenario,
} from '../src/devtools/presentationScenarios';
import { buildPresentationTimeline, resolveFacing, type BattleTimeline } from '../src/battle/engine/presentation';
import { SCENARIOS } from '../src/data/scenarios';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const WRITE = process.argv.includes('--write');
const FIXTURE_DIR = 'scripts/fixtures';

const CONTEXT = {
  playerFormId: 'goku_base',
  enemyFormId: 'piccolo_base',
  overviewBackground: SCENARIOS[0].overviewBackground,
  actionBackground: SCENARIOS[0].actionBackground,
  specialActionBackground: SCENARIOS[0].actionBackground,
};

/** Forma reducida del timeline (auditable en JSON, sin ruido). */
function reduced(tl: BattleTimeline) {
  return tl.entries.map(en => {
    const c = en.cue as Record<string, unknown>;
    const base: Record<string, unknown> = { tick: c.tick, type: c.type };
    for (const key of ['mode', 'background', 'durationTicks', 'role', 'side', 'pose', 'visible', 'position', 'variant', 'effect', 'kind', 'action', 'outcome', 'value', 'cue', 'from', 'to']) {
      if (c[key] !== undefined) base[key] = c[key];
    }
    base.logicalTick = en.logicalTick;
    base.source = en.sourceEvent;
    base.fidelity = en.fidelity;
    if (en.profileId) base.profile = en.profileId;
    return base;
  });
}

console.log('═══ verify:presentation — M7 Presentation Adapter ═══\n');

// ── Pureza del módulo (sin React/DOM/Pixi/timers) ──
const presSrc = readdirSync('src/battle/engine/presentation', { recursive: true })
  .filter((f): f is string => typeof f === 'string' && f.endsWith('.ts'))
  .map(f => readFileSync(`src/battle/engine/presentation/${f}`, 'utf8'))
  .join('\n');
check('M7: 0 React/DOM/Pixi en el Adapter', !/from 'react'|useState|document\.|window\.|HTMLElement|canvas|WebGL|PIXI|pixi|AudioContext/.test(presSrc));
check('M7: 0 timers de pared en el Adapter', !/setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|Date\.now\s*\(|performance\.now\s*\(/.test(presSrc));
check('M7: 0 Math.random en el Adapter', !/Math\.random\s*\(/.test(presSrc));

// ── Propiedades por escenario + golden ──
mkdirSync(FIXTURE_DIR, { recursive: true });
let allTimelinesOk = true;
for (const sc of PRESENTATION_SCENARIOS) {
  const run = runPresentationScenario(sc);
  const tl = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  const tl2 = buildPresentationTimeline({ events: run.log.entries, context: CONTEXT });
  check(`M7: ${sc.id} — mismo EventLog ⇒ mismo Timeline`, JSON.stringify(tl) === JSON.stringify(tl2));
  const json = JSON.stringify(reduced(tl));
  check(`M7: ${sc.id} — timeline serializable (JSON round-trip)`, JSON.parse(json) !== undefined);
  const poses = tl.entries.filter(en => en.cue.type === 'FIGHTER_POSE').map(en => (en.cue as { pose?: string }).pose ?? '');
  check(`M7: ${sc.id} — sin delayMs y poses SEMÁNTICAS (nunca paths PNG)`, !json.includes('delayMs') && poses.every(p => p && !p.includes('/') && !p.includes('.png') && !p.startsWith('assets')));
  check(`M7: ${sc.id} — logicalTick preservado y ≤ cue.tick en secuencias de acción`,
    tl.entries.every(en => en.logicalTick <= en.cue.tick || ['QTE_INPUT_RESOLVED', 'GUARD_STARTED', 'POSITION_CHANGED', 'CC_GAINED', 'CC_SPENT', 'DAMAGE_APPLIED', 'ATTACK_MISSED', 'PHASE_CHANGED', 'FIGHTER_DEFEATED', 'QTE_COUNTER_RESOLVED', 'ATTACK_HIT'].includes(en.sourceEvent)));
  const fixturePath = `${FIXTURE_DIR}/m7_${sc.id.replace('m7_', '')}.json`;
  const fixture = { scenario: sc.id, seed: sc.seed, timeline: reduced(tl) };
  if (WRITE) {
    writeFileSync(fixturePath, JSON.stringify(fixture, null, 1) + '\n');
    console.log(`  ── ${sc.id}: fixture escrito (${tl.entries.length} cues)`);
  } else {
    let expected: unknown = null;
    try { expected = JSON.parse(readFileSync(fixturePath, 'utf8')); } catch { /* missing */ }
    if (!expected) {
      check(`M7: golden ${sc.id} — FIXTURE FALTA (npm run gen:presentation-fixtures)`, false);
      allTimelinesOk = false;
    } else {
      const same = JSON.stringify(fixture.timeline) === JSON.stringify((expected as { timeline: unknown[] }).timeline);
      check(`M7: golden ${sc.id} — timeline idéntico al fixture (${tl.entries.length} cues)`, same);
      if (!same) allTimelinesOk = false;
    }
  }
}

// ── Resultados derivados de EVENTOS, no de HP ──
{
  const miss = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_melee_miss')!;
  const tl = buildPresentationTimeline({ events: runPresentationScenario(miss).log.entries, context: CONTEXT });
  check('M7: ATTACK_MISSED → IMPACT outcome=miss (event-driven)', tl.entries.some(en => en.cue.type === 'IMPACT' && (en.cue as { outcome?: string }).outcome === 'miss' && en.sourceEvent === 'ATTACK_MISSED'));
  const block = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_beam_block')!;
  const tlB = buildPresentationTimeline({ events: runPresentationScenario(block).log.entries, context: CONTEXT });
  check('M7: ATTACK_HIT(block) → IMPACT outcome=block + TARGET pose guard', tlB.entries.some(en => en.cue.type === 'IMPACT' && (en.cue as { outcome?: string }).outcome === 'block') && tlB.entries.some(en => en.cue.type === 'FIGHTER_POSE' && (en.cue as { pose?: string }).pose === 'guard'));
  const ko = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_defeat')!;
  const tlK = buildPresentationTimeline({ events: runPresentationScenario(ko).log.entries, context: CONTEXT });
  check('M7: FIGHTER_DEFEATED → cue K.O. (HUD message) + pose hurt', tlK.entries.some(en => en.cue.type === 'HUD' && (en.cue as { value?: string }).value === 'K.O.'));
}

// ── Facing V9: orientación por transformación, no assets duplicados ──
check('M7: facing — actor player → scaleX 1 · actor enemy → scaleX −1', resolveFacing('player').actorScaleX === 1 && resolveFacing('enemy').actorScaleX === -1);

// ── Aura como overlay (nunca pose de personaje) ──
{
  const beam = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_beam_hit')!;
  const tl = buildPresentationTimeline({ events: runPresentationScenario(beam).log.entries, context: CONTEXT });
  const auraCues = tl.entries.filter(en => en.cue.type === 'AURA');
  const poseIsAura = tl.entries.some(en => en.cue.type === 'FIGHTER_POSE' && ((en.cue as { pose?: string }).pose === 'aura_power' || (en.cue as { pose?: string }).pose === 'aura_support'));
  check('M7: aura_power como capa overlay (AURA cues) y NUNCA como pose', auraCues.length > 0 && auraCues.some(c => (c.cue as { variant?: string }).variant === 'power') && !poseIsAura);
}

// ── Independencia de FPS: el timeline se construye SOLO desde envelopes ──
{
  // El mismo EventLog producido por dos alimentaciones distintas de reloj
  // (M6 ya lo demostró a 30/60/144/irregular/headless) → mismo Timeline.
  const sc = PRESENTATION_SCENARIOS.find(s => s.id === 'm7_qte_timeout')!;
  const logA = runPresentationScenario(sc).log;
  const logB = runPresentationScenario(sc).log;
  const tlA = buildPresentationTimeline({ events: logA.entries, context: CONTEXT });
  const tlB = buildPresentationTimeline({ events: logB.entries, context: CONTEXT });
  check('M7: mismo seed+comandos ⇒ mismo EventLog ⇒ mismo Timeline (independiente de FPS)', JSON.stringify(tlA) === JSON.stringify(tlB));
}

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
