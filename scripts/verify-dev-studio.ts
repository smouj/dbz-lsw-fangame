// ═══════════════════════════════════════════════════════════
// VERIFY: DEV-STUDIO — contrato del combate + consistencia del Dev Studio.
// Uso: npm run verify:dev-studio
//   1. Los 23 módulos del Dev Studio existen (ids canónicos).
//   2. El simulador del contrato (combatSim) recorre una ronda completa
//      con iniciativa PLAYER y ENEMY — readout correcto en cada frontera.
//   3. El snapshot común (devSnapshot) es consistente: 48 formas · 125
//      cartas · Stage 3/4/5/6 · canon V9 sin duplicados.
// ═══════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { getDevProjectSnapshot } from '../src/devtools/devSnapshot';
import {
  contractReadout, simInitialState, simCommand, simOpenQte, simExpectedKey, simClearQte,
} from '../src/devtools/combatSim';
import { executeCommand } from '../src/battle/engine/commands/executeCommand';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ── 1. Módulos del Dev Studio (lista real extraída de la fuente — sin
// importar componentes React que arrastran imports Vite-only) ──
const devSrc = readFileSync('src/devtools/DevStudio.tsx', 'utf8');
const modulesSection = devSrc.match(/export const DEV_MODULES:[\s\S]*?\n\];/u)?.[0] ?? '';
const idMatch = modulesSection.match(/id: '([a-z-]+)'/g) ?? [];
const moduleIds = idMatch.map(m => m.replace(/id: '|'/g, ''));
const EXPECTED_MODULES = [
  'system-hub',
  'dashboard', 'characters', 'cards', 'animation', 'animation-studio', 'pixelart', 'facing', 'assets', 'hud',
  'lab', 'positions', 'combat', 'timeline', 'story', 'validation', 'research',
  'romdisplay', 'music', 'gameconfig', 'team-builder', 'deck-builder', 'workspace',
];
check(`dev: ${EXPECTED_MODULES.length} módulos registrados (${moduleIds.length})`, moduleIds.length === EXPECTED_MODULES.length);
for (const id of EXPECTED_MODULES) {
  check(`dev: módulo '${id}' registrado`, moduleIds.includes(id));
}
// Sin módulos huérfanos (sprites/sheets absorbidos por characters)
check('dev: sin módulos sprites/sheets (absorbidos por Character Studio)',
  !moduleIds.includes('sprites') && !moduleIds.includes('sheets'));
// El render switch cubre todos los módulos (chequeo de fuente)
const renderCovers = EXPECTED_MODULES.every(id => devSrc.includes(`module === '${id}'`));
check(`dev: el render switch cubre los ${EXPECTED_MODULES.length} módulos`, renderCovers);

// ── 2. Snapshot común (Dashboard ≡ Validation ≡ GameConfig) ──
{
  const snap = getDevProjectSnapshot();
  check('dev: snapshot — 48 formas ROM', snap.roster.forms === 48);
  check('dev: snapshot — 125 cartas', snap.cards.count === 125);
  check('dev: snapshot — Stage 3/4/5/6 cubiertos', snap.cards.stageLevels.join() === '3,4,5,6');
  check('dev: snapshot — sprites canónicos establecidos (OUT_frames → manifests zip oficial)',
    snap.sprites.canonFrames > 3000);
  check('dev: snapshot — poses runtime ≥ 20 (COMBAT_POSE_ORDER tiene 23)',
    snap.sprites.poseOrder >= 21 && snap.sprites.runtimePoseCount >= 20);
  check('dev: snapshot — 32 capítulos con mazo', snap.story.chapters === 32);
  check('dev: snapshot — SFX canónicos 85 · música 20', snap.audio.sfx === 85 && snap.audio.musicTracks === 20);
  check('dev: snapshot — 20 familias cinematográficas F0', snap.cinematics.gbcFamilies === 20);
  // C1.0 §8 — producción real (ROM vs LEGACY) presente y honesta.
  check('dev: snapshot — production metrics presentes', typeof snap.production?.romBackedStrict === 'number');
  check('dev: snapshot — ROM backed estricto > 0', snap.production.romBackedStrict > 0);
  check('dev: snapshot — ROM backed estricto dentro del mazo completo', snap.production.romBackedStrict <= snap.cards.count, `${snap.production.romBackedStrict}/${snap.cards.count}`);
  check('dev: snapshot — ROM backed estricto coincide con cues generadas/consumidas',
    snap.production.romBackedStrict === snap.production.romCuesGenerated &&
    snap.production.romBackedStrict === snap.production.romCuesConsumed,
    `${snap.production.romBackedStrict}/${snap.production.romCuesGenerated}/${snap.production.romCuesConsumed}`);
  check('dev: snapshot — MIXED físico = 0', snap.production.mixed === 0);
  check('dev: snapshot — legacy visible = 125 - estricto', snap.production.legacyVisible === 125 - snap.production.romBackedStrict);
  check('dev: snapshot — ROM_DATA_AVAILABLE >= consumido (gap honesto)',
    snap.production.romDataAvailable >= snap.production.romCuesConsumed);
}

// ── 3. Simulador del contrato — ronda completa con iniciativa PLAYER ──
{
  let s = simInitialState('player');
  const ro0 = contractReadout(s);
  check('sim: R1 E0 initiative player → PLAYER_ATTACK_CHOICE · attacker PLAYER',
    ro0.control === 'PLAYER_ATTACK_CHOICE' && ro0.attacker === 'PLAYER' && ro0.defender === 'ENEMY' && ro0.execution === 'IDLE');

  // Elige Stage (fase basic → BASIC_STAGE_ATTACK)
  const prep = simCommand({ ...s, phase: 'basic' as never }, { type: 'BASIC_STAGE_ATTACK' }, { side: 'player', characterId: 'goku' });
  check('sim: elegir Stage → PREPARING (sin inputs aún)',
    prep.ok && contractReadout(prep.state).execution === 'PREPARING' && contractReadout(prep.state).control === 'RESOLVING');

  // Preparación completa → WAITING_INPUT
  const open = simOpenQte(prep.state);
  const roOpen = contractReadout(open.state);
  check('sim: preparación completa → WAITING_INPUT · ACTION_INPUT',
    open.ok && roOpen.execution === 'WAITING_INPUT' && roOpen.control === 'ACTION_INPUT' && simExpectedKey(open.state) !== null);

  // QTE completo
  let q = open.state;
  const seq = [...q.stageQte.seq];
  for (const key of seq) q = simCommand(q, { type: 'QTE_INPUT', input: key }, { side: 'player' }).state;
  const roQ = contractReadout(q);
  check(`sim: QTE completo (${seq.length} inputs) → COMPLETE · sin encadenar enemigo`,
    roQ.execution === 'COMPLETE' && roQ.control === 'RESOLVING');

  // Fin exchange 0 → DEFENSE espera (el orquestador limpia el QTE de la
  // acción terminada — paridad finishPlayerTurnStage — y abre la ventana)
  const ex1 = simCommand(simClearQte(q), { type: 'END_EXCHANGE' }, { side: 'player' });
  const def = simCommand({ ...ex1.state, phase: 'defend' as never, defenseState: 'AWAITING_CHOICE' as const }, { type: 'RESET_DEFENSE' }, { side: 'player' });
  const roDef = contractReadout(def.state);
  check('sim: exchange 1 → PLAYER_DEFENSE_CHOICE · attacker ENEMY (el enemigo espera)',
    roDef.control === 'PLAYER_DEFENSE_CHOICE' && roDef.attacker === 'ENEMY' && roDef.execution === 'IDLE');

  // GUARD → COMMITTED
  const g = simCommand(def.state, { type: 'GUARD' }, { side: 'player', characterId: 'goku' });
  const roG = contractReadout(g.state);
  check('sim: GUARD → COMMITTED · RESOLVING (interacción defensa+ataque enemigo)',
    g.ok && roG.defense === 'COMMITTED' && roG.control === 'RESOLVING');

  // Fin de ronda → R2 E0 → ATTACK espera
  const r2 = simCommand(g.state, { type: 'END_EXCHANGE' }, { side: 'player' });
  const ro2 = contractReadout({ ...r2.state, phase: 'command' as never });
  check('sim: fin de R1 → R2 E0 · turn+1 · PLAYER_ATTACK_CHOICE (espera de nuevo)',
    r2.ok && r2.state.turn === s.turn + 1 && r2.state.exchange === 0 && ro2.control === 'PLAYER_ATTACK_CHOICE');
}

// ── 4. Simulador del contrato — iniciativa ENEMY (DEFENSE primero) ──
{
  let s = simInitialState('enemy');
  const def = simCommand({ ...s, phase: 'defend' as never, defenseState: 'AWAITING_CHOICE' as const }, { type: 'RESET_DEFENSE' }, { side: 'player' });
  const ro = contractReadout(def.state);
  check('sim: initiative enemy → R1 E0 PLAYER_DEFENSE_CHOICE (el juego NO ataca solo)',
    ro.control === 'PLAYER_DEFENSE_CHOICE' && ro.initiative === 'ENEMY' && ro.attacker === 'ENEMY' && ro.defender === 'PLAYER');
  const g = simCommand(def.state, { type: 'GUARD' }, { side: 'player', characterId: 'goku' });
  const ex1 = simCommand(g.state, { type: 'END_EXCHANGE' }, { side: 'player' });
  const ro1 = contractReadout({ ...ex1.state, phase: 'command' as never });
  check('sim: tras defender (R1 E1) → PLAYER_ATTACK_CHOICE (iniciativa enemy → ATTACK después)',
    ex1.ok && ro1.attacker === 'PLAYER' && ro1.control === 'PLAYER_ATTACK_CHOICE');
  // El jugador ataca con una carta damage (sin input): resolución inmediata.
  const sAtk = { ...ex1.state, phase: 'cardSelect' as never, deck: { ...ex1.state.deck, hand: [executeCommand(ex1.state, { type: 'JOINT' }, { side: 'player' }).state.deck.hand[0] ?? { id: 5, name: 'Cont.Punch', type: 'damage', effect: 'physical', atk: 10, acc: 100, cc: 10, rarity: 1 }] } };
  const play = simCommand(sAtk, { type: 'PLAY_CARD', handIndex: 0 }, { side: 'player', characterId: 'goku' });
  check('sim: carta damage (sin input) → resuelve sin WAITING_INPUT (PREPARING→RESOLVING→COMPLETE)',
    play.ok && contractReadout(play.state).execution === 'IDLE');
}

// ── 5. Perfil cinematográfico declarativo (contrato §23-§31) ──
{
  const { resolveCinematicProfile } = await import('../src/battle/cinematic/cinematicProfile');
  const melee = resolveCinematicProfile({
    id: 'cont_punch', label: 'Cont.Punch', kind: 'damage', visual: 'punch', fidelity: 'INFERRED',
    actorBeats: [{ frame: 0, pose: 'idle' }, { frame: 12, pose: 'punch_right' }],
    impact: { targetPose: 'knockback_back' },
  });
  check('cine: melee → familia melee + shotFlow FIELD→ACTION→ACTION_DUEL→FIELD',
    melee.family === 'melee' && melee.shotFlow.join('→') === 'FIELD→ACTION→ACTION_DUEL→FIELD');
  check('cine: poses del perfil firma → ROM_ASSET_VERIFIED (manifest), gramática PRESENTATION_DERIVED',
    melee.actorBeats.every(b => b.fidelity === 'ROM_ASSET_VERIFIED')
    && melee.entryTransition.fidelity === 'PRESENTATION_DERIVED' && melee.fidelity === 'PRESENTATION_DERIVED');
  check('cine: reacción del objetivo → knockback_back ROM_ASSET_VERIFIED',
    melee.reactionPose?.pose === 'knockback_back' && melee.reactionPose.fidelity === 'ROM_ASSET_VERIFIED');
  check('cine: sin rush declarado → STATIC (el APPROACH solo con evidencia)',
    melee.actorMovement.length === 0);
  const rush = resolveCinematicProfile({
    id: 'dunk_shot', label: 'Dunk Shot', kind: 'damage', visual: 'punch', fidelity: 'INFERRED',
    impact: { targetPose: 'knockback_down' }, rush: { startFrame: 20, duration: 8 },
  });
  check('cine: con rush → APPROACH ACTOR_HOME→CONTACT_POINT (restoreAnchor)',
    rush.actorMovement.length === 1 && rush.actorMovement[0].type === 'APPROACH'
    && rush.actorMovement[0].toAnchor === 'CONTACT_POINT' && rush.actorMovement[0].restoreAnchor);
  const beam = resolveCinematicProfile({
    id: 'kamehameha', label: 'Kamehameha', kind: 'beam', visual: 'ray', fidelity: 'INFERRED',
    projectile: { kind: 'ray' },
  });
  check('cine: beam → familia beam + proyectil por ANCLAS relativas (PROJECTILE_ORIGIN→TARGET)',
    beam.family === 'beam' && beam.projectile?.origin === 'PROJECTILE_ORIGIN'
    && beam.projectile?.target === 'PROJECTILE_TARGET');
  const stage = resolveCinematicProfile({ id: 'stage', label: '3 Stage Atk.', kind: 'command', visual: 'stage', fidelity: 'INFERRED' });
  check('cine: stage → familia stage + input STAGE_QTE (nunca en otras familias)',
    stage.family === 'stage' && stage.input === 'STAGE_QTE' && melee.input === 'NONE');
  // La herencia NUNCA inventa fades/holds: vacíos por defecto (INFERRED).
  check('cine: sin holds declarados → 0 (nada inventado) · fx vacío',
    melee.holds.length === 0 && melee.fx.length === 0);
}

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
