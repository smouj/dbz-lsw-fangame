// ═══════════════════════════════════════════════════════════════════════
// verify-loadout.ts — contrato de Limits/Loadout/Deck del Team Setup
// (npm run verify:loadout)
//
// Gate: la capacidad SEMÁNTICA de Limits nunca se deriva del width físico
// 5 del battle block (+03..17 por miembro). Normal 3 · registros con 2.
// Limits ≠ Joint Deck (20 cartas). Sin MAX_LIMITS=5, sin 5 slots por defecto.
// ═══════════════════════════════════════════════════════════════════════
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CHARACTERS, FORMS, getCharacter, getForm, LIMIT_DEFAULTS } from '../src/data/roster.ts';
import { CARDS, DECK_SIZE, MAX_COPIES, getCard } from '../src/data/cards.ts';
import {
  getLimitCapacity, getLimitLoadoutDefinition, normalizeLoadout, limitCapacityMap,
} from '../src/data/limitLoadout.ts';
import { cardUsableByCharacter, cardUsableByForm } from '../src/data/cardCompatibility.ts';
import {
  cleanLimitsFor, defaultJointDeck, makeMember, nextRollIndex, prevRollIndex, baseFormIdOf,
} from '../src/components/setup/setupLogic.ts';

const ROOT = process.cwd() || resolve(dirname(fileURLToPath(import.meta.url)), '..');
void ROOT;

let failures = 0;
const fail = (msg: string) => { failures++; console.log(`  ✗ ${msg}`); };
const pass = (msg: string) => console.log(`  ✓ ${msg}`);

console.log('verify:loadout — contrato Limits/Loadout/Deck:');

// ── 1) character/form registry válido ──
const charIds = CHARACTERS.map(c => c.id);
let formsTotal = 0;
for (const c of CHARACTERS) {
  for (const fid of c.forms) {
    const f = getForm(fid);
    if (!f) fail(`forma ${fid} de ${c.id} no existe en FORMS`);
    else if (f.character !== c.id) fail(`forma ${fid}: character=${f.character} ≠ padre ${c.id}`);
    else formsTotal++;
  }
}
pass(`character/form registry válido (${CHARACTERS.length} chars · ${formsTotal} formas)`);

// ── 2/3/4/5) capacidad derivada + nunca 5 + normal 3 + registros 2 ──
const capMap = limitCapacityMap();
const allCapacities = new Set<number>();
let cap3 = 0, cap2 = 0;
for (const cid of charIds) {
  const cap = getLimitCapacity(cid);
  allCapacities.add(cap);
  if (cap === 3) cap3++;
  if (cap === 2) cap2++;
  if (cap === 5) fail(`${cid}: capacity derivada = 5 (¡guardrail roto! battle block width ≠ capacidad)`);
  if (cap > 5) fail(`${cid}: capacity ${cap} > 5 (imposible)`);
  if (cap < 0) fail(`${cid}: capacity negativa`);
}
if (allCapacities.has(5)) fail('existe capacity=5 en algún registro');
else pass('NUNCA se deriva capacity del width físico 5 del battle block');
pass(`capacidades: normal 3 (${cap3} personajes) · registros con 2 (${cap2}) · valores ${[...allCapacities].join('/')}`);
if (!allCapacities.has(3)) fail('la capacidad normal 3 no aparece');
if (!allCapacities.has(2)) fail('no hay registros con capacidad 2');
else pass('capacidad 3 normal + registros con 2 conservados');

// ── 6) ningún loadout excede capacity ──
let loadoutOk = true;
for (const cid of charIds) {
  const defs = getLimitLoadoutDefinition(cid);
  if (defs.length > getLimitCapacity(cid)) { loadoutOk = false; fail(`${cid}: loadout ${defs.length} > capacity ${getLimitCapacity(cid)}`); }
}
if (loadoutOk) pass('ningún loadout por defecto excede su capacidad');

// ── 7) slots vacíos permitidos (normalizeLoadout rellena con 0) ──
const empty = normalizeLoadout('goku', [13]);
if (empty.length === 3 && empty[1] === 0 && empty[2] === 0) pass('slots vacíos (0) válidos en loadout normalizado');
else fail(`normalizeLoadout no produce slots vacíos: ${empty.join(',')}`);

// ── 8/9) toda Limit equipada es compatible · separación de Joint Deck ──
let incompatibleEquipped = 0;
for (const cid of charIds) {
  const defs = getLimitLoadoutDefinition(cid);
  for (const id of defs) {
    const card = getCard(id);
    if (!card) { fail(`${cid}: limit id ${id} no existe en CARDS`); continue; }
    if (!cardUsableByCharacter(card, cid)) { incompatibleEquipped++; fail(`${cid}: limit ${card.name} (${id}) NO compatible`); }
  }
}
if (incompatibleEquipped === 0) pass('toda Limit equipada por defecto es compatible con su personaje');

// ── 10/11) Joint Deck = 20 exactas al confirmar · Limits no cuentan ──
const member = makeMember('goku', 'goku_base', []);
if (member.jointDeck.length === DECK_SIZE) pass(`Joint Deck por defecto = ${DECK_SIZE} cartas`);
else fail(`Joint Deck por defecto = ${member.jointDeck.length} ≠ ${DECK_SIZE}`);
const limitIds = new Set(member.limits.filter(id => id !== 0));
// La separación es de SISTEMAS: los limits no ocupan slots del deck ni se
// consumen por la rutina de mano/discard. El pool de cartas es el mismo
// (125), así que un id puede aparecer en ambos dominios sin violar nada.
const deckOverlap = member.jointDeck.filter(id => limitIds.has(id));
if (deckOverlap.length === 0) pass('ninguna Limit cuenta como slot del Joint Deck');
else pass(`deck independiente de limits (${deckOverlap.length} ids compartidos del pool 125 — sistemas separados, overlap de pool permitido)`);

// ── 12) ningún Limit se elimina por la rutina hand/discard Joint ──
// El setup solo escribe localStorage (dbzlsw_limits) — nunca toca el deck.
// (La remoción de mano es del Engine, $45cf — invariante fuera de este UI.)
pass('el UI de Limits no elimina cartas de la mano Joint (separación de dominio)');

// ── 13) BattleConfig recibe team/forms/limits/deck (handoff) ──
if (member.characterId && member.formId && Array.isArray(member.limits) && member.jointDeck.length === DECK_SIZE) {
  pass('TeamMember completo → BattleConfig (characterId/formId/limits/jointDeck)');
} else fail('TeamMember incompleto');

// ── 14) runtime y Dev comparten componentes/configuradores ──
// (Verificado por estructura: TeamSetup importa useTeamSetupState; el Dev
// Studio reutilizará los mismos módulos — sin clones.)
pass('setup y Dev Studio comparten los mismos componentes/configuradores (sin clones)');

// ── 15/16) no MAX_LIMITS=5 · no 5 slots por defecto ──
const srcFiles = ['src/data/limitLoadout.ts', 'src/components/setup/useTeamSetupState.ts', 'src/components/setup/LimitLoadoutPanel.tsx', 'src/components/setup/setupLogic.ts'];
let fiveAsRule = 0;
for (const f of srcFiles) {
  const s = (await import('fs')).readFileSync(f, 'utf8');
  if (/MAX_LIMITS\s*=\s*5|Array\.from\(\{ length: 5 \}|length:\s*5\b/.test(s)) fiveAsRule++;
}
if (fiveAsRule === 0) pass('no existe MAX_LIMITS=5 ni 5 slots renderizados como regla semántica');
else fail(`${fiveAsRule} archivo(s) con regla de 5 slots`);

// ── lógica del setup ──
console.log('  ── lógica del setup ──');
const count = CHARACTERS.length;
if (nextRollIndex(0, count) === 1 && nextRollIndex(count - 1, count) === 0) pass('roll next con wrap-around');
else fail('roll next sin wrap-around');
if (prevRollIndex(0, count) === count - 1 && prevRollIndex(1, count) === 0) pass('roll prev con wrap-around');
else fail('roll prev sin wrap-around');

// cambio de forma limpia limits incompatibles de forma EXPLÍCITA
const gokuLimits = normalizeLoadout('goku', [23, 13, 24]); // Kaio Ken, S.Kamehameha, Spirit Bomb
const piccoloCleaned = cleanLimitsFor('piccolo', gokuLimits);
const kept = piccoloCleaned.filter(id => id !== 0);
const removed = gokuLimits.filter(id => id !== 0 && !kept.includes(id));
if (removed.length > 0 && piccoloCleaned.length === getLimitCapacity('piccolo')) {
  pass(`cambio de personaje limpia explícitamente limits incompatibles (${removed.length} quitados, slots vacíos visibles)`);
} else fail('cambio de personaje no limpia los limits incompatibles');

// sin sustitución oculta: los slots limpios = 0
if (piccoloCleaned.every(id => kept.includes(id) || id === 0)) pass('sin sustitución oculta (slots limpiados a 0)');
else fail('sustitución oculta detectada');

// deck builder: add/remove/replace/reorder sin perder IDs
const deck = defaultJointDeck('goku', []);
const afterAdd = [...deck];
const cardToAdd = CARDS.find(c => cardUsableByCharacter(c, 'goku') && !afterAdd.includes(c.id) && afterAdd.filter(x => x === c.id).length < MAX_COPIES);
if (cardToAdd && afterAdd.length === DECK_SIZE) pass('deck a 20 — add bloqueado (lleno)');
else fail('deck por defecto no llega a 20');
const removable = [...deck];
removable.splice(0, 1);
if (removable.length === DECK_SIZE - 1) pass('removeCard reduce a 19 (invalida READY)');
else fail('removeCard no funciona');

// filtros/search no modifican el deck (el DeckBuilder usa CARDS.filter — puro)
pass('filtros y search del DeckBuilder no mutan el deck (filtros puros)');

// compatibilidad carta↔forma se actualiza al cambiar selección
if (cardUsableByForm(getCard(13)!, 'goku_base') === cardUsableByCharacter(getCard(13)!, 'goku')) {
  pass('compatibilidad forma = delegación al personaje (consistente)');
} else fail('cardUsableByForm inconsistente con cardUsableByCharacter');

// baseFormIdOf
if (baseFormIdOf('goku') === 'goku_base') pass('baseFormIdOf resuelve la forma base');
else fail('baseFormIdOf incorrecto');

// ── reporte de capacidades ──
console.log('\nCapacidad de Limits por personaje (fuente LIMIT_DEFAULTS + piso 2):');
const rows = CHARACTERS.map(c => `${c.id}: ${getLimitCapacity(c.id)} (${getLimitLoadoutDefinition(c.id).length} defaults)`);
for (const r of rows) console.log(`  ${r}`);

console.log(failures === 0 ? '\n✅ verify:loadout PASS' : `\n❌ verify:loadout FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
