// ═══════════════════════════════════════════════════════════════════════
// AUDIT: RUNTIME (M8) — restos de autoridad legacy en las rutas de combate.
// Uso: npm run audit:runtime
// Escanea src/main.tsx (BattleScreen) buscando patrones PROHIBIDOS del
// modelo antiguo (mutaciones de gameplay fuera del Engine). El objetivo
// M8 es 0 gaps autoritativos: cada hallazgo es una ruta a migrar a
// BattleRuntime.dispatch/advance.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';

const SRC = 'src/main.tsx';
const src = readFileSync(SRC, 'utf8');

// ── Patrones de mutación de gameplay (autoridad legacy) ──
const GAMEPLAY_MUTATORS: Array<{ name: string; re: RegExp; note: string }> = [
  { name: 'setHp', re: /\bset(?:Player|Enemy)\([^)]*\bhp\s*:/g, note: 'mutación HP fuera del Engine' },
  { name: 'setCc', re: /\bset(?:Player|Enemy)\([^)]*\bcc\s*:/g, note: 'mutación CC fuera del Engine' },
  { name: 'setPhase', re: /\bsetPhase\(/g, note: 'cambio de fase fuera del Engine' },
  { name: 'setPosition', re: /\bset(?:Player|Enemy)\([^)]*\bbattlePos\s*:/g, note: 'posición táctica fuera del Engine' },
  { name: 'setDeck', re: /\bsetDeck\(|\bsetEDeck\(|\bsetHand\(|\bsetDrawPile\(|\bsetDiscard\(/g, note: 'mazo fuera del Engine' },
  { name: 'setQte', re: /\bsetStageQte\(/g, note: 'QTE autoritativo fuera del Engine' },
  { name: 'setPower', re: /\bsetPowerState\(|\bsetGatherTurns\(/g, note: 'estado GATHER fuera del Engine' },
  { name: 'setGuard', re: /\bsetPlayerGuard\(/g, note: 'guardia fuera del Engine' },
  { name: 'setStages', re: /\bsetPStages\(|\bsetEStages\(|\bsetStages\(/g, note: 'stages fuera del Engine' },
  { name: 'setSelectedCard', re: /\bsetSelectedCard\(/g, note: 'carta seleccionada fuera del Engine' },
];

// ── Patrones de aleatoriedad/timers en rutas gameplay ──
const GAMEPLAY_RANDOM: Array<{ name: string; re: RegExp; note: string }> = [
  { name: 'Math.random', re: /\bMath\.random\s*\(/g, note: 'RNG legacy (Engine usa PRNG canónico M5)' },
  { name: 'setTimeout', re: /\bsetTimeout\s*\(/g, note: 'timers de gameplay legacy (Engine usa reloj M6)' },
  { name: 'Date.now', re: /\bDate\.now\s*\(/g, note: 'reloj de pared en gameplay' },
];

function count(re: RegExp, text: string): number {
  return (text.match(re) ?? []).length;
}

console.log('═══ audit:runtime — restos de autoridad legacy (M8) ═══\n');
console.log(`Fuente: ${SRC} (${src.split('\n').length} líneas)\n`);

let total = 0;
console.log('── Mutaciones de gameplay fuera del Engine ──');
for (const p of GAMEPLAY_MUTATORS) {
  const n = count(p.re, src);
  total += n;
  console.log(`  ${n > 0 ? '⚠' : '✓'} ${p.name.padEnd(16)} ${String(n).padStart(3)}  ${p.note}`);
}
console.log('\n── Aleatoriedad / timers en rutas gameplay ──');
for (const p of GAMEPLAY_RANDOM) {
  const n = count(p.re, src);
  total += n;
  console.log(`  ${n > 0 ? '⚠' : '✓'} ${p.name.padEnd(16)} ${String(n).padStart(3)}  ${p.note}`);
}

// ── Estimación de líneas de la ruta de combate (para dimensionar el cutover) ──
const battleStart = src.indexOf('function BattleScreen');
const battleEnd = src.indexOf('function StorySceneScreen', battleStart);
const battleLines = (battleEnd > battleStart ? battleEnd : src.length) - battleStart;
const battleLineCount = src.slice(battleStart, battleEnd > battleStart ? battleEnd : undefined).split('\n').length;

console.log(`\n── Dimensión del cutover ──`);
console.log(`  BattleScreen: ~${battleLineCount} líneas (${Math.round(battleLineCount / src.split('\n').length * 100)}% de main.tsx)`);
console.log(`  Gaps autoritativos detectados: ${total}`);

console.log(`\n═══ RESULTADO: ${total} gaps legacy ═══`);
console.log('Objetivo M8: migrar cada gap a BattleRuntime.dispatch/advance (slices verticales).');
if (total > 0) process.exitCode = 2; // audit informativo: exit 2 = gaps pendientes (no fallo)
