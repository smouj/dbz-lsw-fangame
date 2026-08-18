// ═══════════════════════════════════════════════════════════════════════
// VERIFY: P0 FIGHTER IDENTITY / SCENE OWNERSHIP (M8.P0)
// Uso: npm run verify:p0-identity
// Invariantes estructurales del renderer Pixi:
//   1. EXACTAMENTE 2 FighterActor durante toda la batalla.
//   2. setRoles() NUNCA reparenta (parents estables).
//   3. ACTOR/TARGET son roles resueltos por getter, no nodos.
//   4. Cambios de escena no crean actores.
//   5. Visibilidad canónica por plano (FIELD/ACTION_SOLO/ACTION_DUEL).
// ═══════════════════════════════════════════════════════════════════════

import { ActionScene } from '../src/renderer/pixi/scenes/ActionScene';
import { FighterActor } from '../src/renderer/pixi/actors/FighterActor';
import { Texture } from 'pixi.js';

// ── Dobles de FighterActor: sin atlas real (solo identidad/parent) ──
// El test de invariantes NO necesita texturas: verifica estructura de
// scene graph (parents, roles, visibilidad), no frames.
function fakeFighter(formId: string, side: 'left' | 'right'): FighterActor {
  // Llamamos al constructor real con un atlas vacío mínimo.
  const atlas = {
    maxW: 16, maxH: 16,
    textures: new Map<string, Texture>(),
    anims: new Map<string, { frames: number[]; fps: number }>(),
  } as never;
  return new FighterActor(atlas as never, formId, side);
}

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('═══ verify:p0-identity — Fighter Identity & Scene Ownership ═══\n');

// ── Invariante 1: init crea exactamente 2 actores ──
const scene = new ActionScene();
const player = fakeFighter('goku_base', 'left');
const enemy = fakeFighter('piccolo_base', 'right');
scene.setFighters(player, enemy);
check('I1: setFighters registra 2 actores', scene.fighterCount === 2);
check('I1: ambos cuelgan de ActionScene', player.parent === scene && enemy.parent === scene);

// ── Invariante 3: setRoles NO reparenta ──
const playerParent = player.parent;
const enemyParent = enemy.parent;
scene.setRoles('right');
scene.setRoles('left');
scene.setRoles('right');
scene.setRoles('left');
scene.setRoles('right');
check('I3: tras 5 setRoles, parents NO cambian', player.parent === playerParent && enemy.parent === enemyParent);
check('I3: fighterCount sigue siendo 2', scene.fighterCount === 2);

// ── Invariante 3b: roles correctos tras swaps ──
scene.setRoles('left');
check('I3: attacker=left → actor=player · target=enemy',
  scene.getActor() === player && scene.getTarget() === enemy);
scene.setRoles('right');
check('I3: attacker=right → actor=enemy · target=player',
  scene.getActor() === enemy && scene.getTarget() === player);

// ── Invariante 4: cambios de escena NO crean actores ──
const countBefore = scene.fighterCount;
for (let i = 0; i < 100; i++) {
  scene.setScene(i % 2 === 0 ? 'ACTION_DUEL' : 'ACTION_SOLO');
  scene.setRoles(i % 2 === 0 ? 'left' : 'right');
}
check('I4: 100 cambios de escena → fighterCount === 2', scene.fighterCount === countBefore && scene.fighterCount === 2);
check('I4: 100 cambios → parents siguen estables', player.parent === scene && enemy.parent === scene);

// ── Invariante 5: visibilidad canónica por plano ──
scene.setRoles('left');
scene.setScene('ACTION_SOLO');
check('I5: ACTION_SOLO → actor visible · target oculto',
  player.visible === true && enemy.visible === false);
scene.setScene('ACTION_DUEL');
check('I5: ACTION_DUEL → ambos visibles',
  player.visible === true && enemy.visible === true);
scene.setRoles('right');
scene.setScene('ACTION_SOLO');
check('I5: ACTION_SOLO con attacker=right → enemy visible · player oculto',
  enemy.visible === true && player.visible === false);
scene.setScene('ACTION_DUEL');
check('I5: vuelta a ACTION_DUEL → ambos visibles',
  player.visible === true && enemy.visible === true);

// ── M8.C2a: DEFENDER_ACTION — cámara en el defensor ──
scene.setRoles('left');
scene.setScene('DEFENDER_ACTION');
check('C2a: DEFENDER_ACTION (attacker=left) → defensor right visible · actor left oculto',
  enemy.visible === true && player.visible === false);
scene.setRoles('right');
scene.setScene('DEFENDER_ACTION');
check('C2a: DEFENDER_ACTION (attacker=right) → defensor left visible · actor right oculto',
  player.visible === true && enemy.visible === false);
scene.setScene('ACTION_DUEL');
check('C2a: DEFENDER_ACTION → ACTION_DUEL → ambos visibles',
  player.visible === true && enemy.visible === true);
check('C2a: DEFENDER_ACTION no crea actores (fighterCount === 2)', scene.fighterCount === 2);

// ── Invariante 1b: 1000 swaps de roles no crean actores ──
for (let i = 0; i < 1000; i++) {
  scene.setRoles(i % 2 === 0 ? 'left' : 'right');
}
check('I1b: 1000 swaps de roles → fighterCount === 2', scene.fighterCount === 2);
check('I1b: 1000 swaps → parents estables', player.parent === scene && enemy.parent === scene);

console.log(`\n═══ RESULTADO: ${pass} passed · ${fail} failed ═══`);
if (fail > 0) process.exitCode = 1;
