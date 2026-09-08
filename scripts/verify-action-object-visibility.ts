// P0 ACTION_OBJECT_VISUAL_LIFECYCLE — Slice 2 gate.
// Verifies the logical slot contract independently from Pixi: bindings are
// role-based, rebinds replace the previous target, and STOP/UNBIND cannot
// affect an object selected by a stale fixed-side assumption.
import { ActionObjectRuntime } from '../src/battle/runtime/ActionObjectRuntime';

let passed = 0;
let failed = 0;
function check(label: string, condition: boolean): void {
  if (condition) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.error(`FAIL ${label}`); }
}

const runtime = new ActionObjectRuntime();
check('OFFENSE defaults slot0 actor', runtime.resolve(0)?.role === 'ACTOR');
check('OFFENSE defaults slot1 target', runtime.resolve(1)?.role === 'TARGET');

runtime.bind(0, { role: 'TARGET', fighterSide: 'PLAYER' });
runtime.bind(1, { role: 'ACTOR', fighterSide: 'ENEMY' });
check('DEFENSE rebinds slot0 to defender', runtime.resolve(0)?.role === 'TARGET');
check('DEFENSE rebinds slot1 to attacker', runtime.resolve(1)?.role === 'ACTOR');
check('slot0 carries the player side explicitly', runtime.resolve(0)?.fighterSide === 'PLAYER');
check('slot1 carries the enemy side explicitly', runtime.resolve(1)?.fighterSide === 'ENEMY');

runtime.stop(0);
check('STOP deactivates the currently rebound slot', runtime.state(0).active === false && runtime.state(0).visible === false);
check('STOP preserves the current binding for diagnostics', runtime.resolve(0)?.role === 'TARGET');

runtime.bind(0, { role: 'ACTOR', fighterSide: 'ENEMY' });
check('rebind restores the slot and replaces stale role', runtime.state(0).active && runtime.resolve(0)?.role === 'ACTOR');
runtime.unbind(0);
check('UNBIND removes binding and hides the slot', runtime.resolve(0) === null && !runtime.state(0).active && !runtime.state(0).visible);
check('other slot remains bound after slot0 unbind', runtime.resolve(1)?.role === 'ACTOR');

console.log(`ACTION_OBJECT_VISIBILITY: ${passed}/${passed + failed} PASS`);
if (failed > 0) process.exitCode = 1;
