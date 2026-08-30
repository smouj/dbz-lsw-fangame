// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM Beam BG Scroll Chain (C5) SSOT
// Uso: npm run verify:rom-beam-bg
// ═══════════════════════════════════════════════════════════════════════
import { BATTLE_CINEMATIC_SCROLL_CHAIN, BEAM_BG_SCROLL_CHAIN } from '../src/battle/romBeamBgOffsets';

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
  const c = BATTLE_CINEMATIC_SCROLL_CHAIN;
  check('chain: compat alias points to same object', BEAM_BG_SCROLL_CHAIN === BATTLE_CINEMATIC_SCROLL_CHAIN);
  check('chain: baseScrollY $C407', c.baseScrollY === 0xc407);
  check('chain: baseScrollX $C409', c.baseScrollX === 0xc409);
  check('chain: cinematicDeltaY $C405', c.cinematicDeltaY === 0xc405);
  check('chain: cinematicDeltaX $C406', c.cinematicDeltaX === 0xc406);

  check('chain: setBaseScrollY $0D90', c.routines.setBaseScrollY === 0x0d90);
  check('chain: setBaseScrollX $0D89', c.routines.setBaseScrollX === 0x0d89);
  check('chain: baseToScroll $0D97', c.routines.baseToScroll === 0x0d97);
  check('chain: basePlusDeltaToScroll $0DA2', c.routines.basePlusDeltaToScroll === 0x0da2);

  check('viewport: STAT handler $02D4', c.viewport.statHandler === 0x02d4);
  check('viewport: top stored C234', c.viewport.topStorage === 0xc234);
  check('viewport: top 23/31, active LY < 96', c.viewport.topWhenParam3Zero === 23 && c.viewport.topWhenParam3Nonzero === 31 && c.viewport.activeLyEndExclusive === 96);
  check('viewport: bottom clamp constant 98', c.viewport.bottomClampConstant === 98);
  check('viewport: STAT=$08, LY=$FF44', c.viewport.statValue === 0x08 && c.viewport.lyRegister === 0xff44);
  check('viewport: clipping translatedY', c.clipping.translatedY.includes('baseScrollY + cinematicDeltaY + LY'));
  check('restore: $035B STAT=0 disables viewport, preserves deltas', c.screenRestore.routine === 0x035b && c.screenRestore.statValue === 0 && c.screenRestore.disablesViewport && c.screenRestore.preservesCinematicDelta);

  check('chain: producers callsites $699E/$69A9', c.producers.callsites[0] === 0x699e && c.producers.callsites[1] === 0x69a9);
  check('chain: producers setters $6AB7/$6AEB', c.producers.setters[0] === 0x6ab7 && c.producers.setters[1] === 0x6aeb);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
