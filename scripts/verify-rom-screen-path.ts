// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM ScreenPath SSOT (SCREEN_PATH $11 — 18-step table)
// Uso: npm run verify:rom-screen-path
// ═══════════════════════════════════════════════════════════════════════
import {
  SCREEN_PATH_TABLE,
  SCREEN_PATH_STEPS,
  screenPathNetDelta,
  screenPathOffsetAt,
  screenPathFinalOffset,
} from '../src/battle/romScreenPath';

let passed = 0;
let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    passed++;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

{
  check('table: address $73C5', SCREEN_PATH_TABLE.address === 0x73c5);
  check('table: bank $7E', SCREEN_PATH_TABLE.bank === 0x7e);
  check('table: 18 steps', SCREEN_PATH_TABLE.stepCount === 18);
  check('table: no pathId operand', SCREEN_PATH_TABLE.hasPathIdOperand === false);
  check('table: single implicit fixed path', SCREEN_PATH_TABLE.pathSelection === 'implicit single fixed path');

  check('steps: 18 entries', SCREEN_PATH_STEPS.length === 18, `got ${SCREEN_PATH_STEPS.length}`);

  // Primeros 8 explícitos
  const expectFirst8: Array<[number, number]> = [
    [-5, -5], [-4, -5], [-3, -6], [-2, -6], [-2, -7], [-2, -8], [-2, -9], [-2, -10],
  ];
  for (let i = 0; i < 8; i++) {
    const s = SCREEN_PATH_STEPS[i];
    check(`steps: [${i}] = (${expectFirst8[i][0]}, ${expectFirst8[i][1]})`, s.deltaY === expectFirst8[i][0] && s.deltaX === expectFirst8[i][1], `got (${s.deltaY},${s.deltaX})`);
  }
  // Pasos 9..17 repiten (-2,-10)
  for (let i = 8; i < 18; i++) {
    const s = SCREEN_PATH_STEPS[i];
    check(`steps: [${i}] = (-2,-10)`, s.deltaY === -2 && s.deltaX === -10, `got (${s.deltaY},${s.deltaX})`);
  }

  const net = screenPathNetDelta();
  check('net: ΔSCY = -42', net.deltaY === -42, `got ${net.deltaY}`);
  check('net: ΔSCX = -156', net.deltaX === -156, `got ${net.deltaX}`);

  check('offsetAt(0) = (0,0)', screenPathOffsetAt(0).deltaY === 0 && screenPathOffsetAt(0).deltaX === 0);
  check('offsetAt(18) = net', screenPathOffsetAt(18).deltaY === net.deltaY && screenPathOffsetAt(18).deltaX === net.deltaX);

  // X reflejado por lado
  const s1 = screenPathFinalOffset('SIDE_1');
  const s2 = screenPathFinalOffset('SIDE_2');
  check('final: SIDE_1 ΔSCX = -156', s1.deltaX === -156, `got ${s1.deltaX}`);
  check('final: SIDE_2 ΔSCX = +156', s2.deltaX === 156, `got ${s2.deltaX}`);
  check('final: Y no reflejada', s1.deltaY === -42 && s2.deltaY === -42);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
