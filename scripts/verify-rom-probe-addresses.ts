// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM PROBE ADDRESS MAP
// Uso: npm run verify:rom-probe-addresses
//
// Self-consistency + golden checks for src/data/romProbeAddresses.ts.
// ═══════════════════════════════════════════════════════════════════════
import {
  ROM_PROBE_ADDRESSES,
  PER_FRAME_PROBES,
  EQUIPPED_CARD_LAYOUT,
  probeByAddress,
  probesByGroup,
  probesBySide,
  probeGroupSummary,
} from '../src/data/romProbeAddresses';

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
  // No duplicate addresses
  const seen = new Set<number>();
  for (const p of ROM_PROBE_ADDRESSES) {
    if (seen.has(p.address)) check(`address $${p.address.toString(16).toUpperCase()} unique`, false, 'dup');
    seen.add(p.address);
  }
  check('probes: no duplicate addresses', seen.size === ROM_PROBE_ADDRESSES.length);

  // All addresses within GBC WRAM (0xC000..0xDFFF)
  check('probes: all in WRAM range $C000..$DFFF', ROM_PROBE_ADDRESSES.every(p => p.address >= 0xc000 && p.address <= 0xdfff));

  // Group coverage
  const groups = new Set(ROM_PROBE_ADDRESSES.map(p => p.group));
  const expectedGroups = ['BATTLE_BLOCK', 'ACTION_SELECT', 'TURN', 'FIGHTER_STATE', 'CC', 'POWER_WINDOW', 'CPU', 'LIMIT', 'ACTION_OBJECT', 'TRANSITION_JOB', 'VIEWPORT_SCROLL', 'RNG', 'STAGE', 'SPECIAL', 'RESOLUTION'];
  check('probes: all 15 groups present', expectedGroups.every(g => groups.has(g)), `got ${groups.size}`);

  // Goldens
  check('probe: CA34 = BATTLE_TURN_COUNTER', probeByAddress(0xca34)?.name === 'BATTLE_TURN_COUNTER');
  check('probe: C0A4 = CPU_POLICY_MODE', probeByAddress(0xc0a4)?.name === 'CPU_POLICY_MODE');
  check('probe: C043 = BATTLE_MODE_CONSECUTIVE_WINS', probeByAddress(0xc043)?.name === 'BATTLE_MODE_CONSECUTIVE_WINS');
  check('probe: C0A3 = BATTLE_RESULT', probeByAddress(0xc0a3)?.name === 'BATTLE_RESULT');
  check('probe: C7D7 = TAIL_MARKER ($1D)', probeByAddress(0xc7d7)?.name === 'TAIL_MARKER');
  check('probe: CA53 = RESOLUTION_BRANCH', probeByAddress(0xca53)?.name === 'RESOLUTION_BRANCH');
  check('probe: CA56 = CPU_ATTACK_SOURCE', probeByAddress(0xca56)?.name === 'CPU_ATTACK_SOURCE');
  check('probe: CA58 = CPU_ATTACK_SELECTION', probeByAddress(0xca58)?.name === 'CPU_ATTACK_SELECTION');
  check('probe: CA59 = VBALL_VARIANT_SELECTOR', probeByAddress(0xca59)?.name === 'VBALL_VARIANT_SELECTOR');
  check('probe: CA5D = STAGE_RANDOM', probeByAddress(0xca5d)?.name === 'STAGE_RANDOM');
  check('probe: C3C8 = ACTION_OBJECT0_BASE_Y', probeByAddress(0xc3c8)?.name === 'ACTION_OBJECT0_BASE_Y');
  check('probe: C3CB = ACTION_OBJECT1_BASE_X', probeByAddress(0xc3cb)?.name === 'ACTION_OBJECT1_BASE_X');
  check('probe: C405 = CINEMATIC_DELTA_Y', probeByAddress(0xc405)?.name === 'CINEMATIC_DELTA_Y');
  check('probe: C409 = BASE_SCROLL_X', probeByAddress(0xc409)?.name === 'BASE_SCROLL_X' && probeByAddress(0xc409)?.width === 2);
  check('probe: C234 = CINEMATIC_VIEWPORT_TOP', probeByAddress(0xc234)?.name === 'CINEMATIC_VIEWPORT_TOP');

  // Transition job descriptor block C41D..C422 continuous (6 bytes)
  const tj = probesByGroup('TRANSITION_JOB');
  check('probes: 6 transition-job bytes', tj.length === 6, `got ${tj.length}`);
  const tjAddrs = tj.map(p => p.address).sort((a, b) => a - b);
  check('probes: transition job C41D..C422 continuous', tjAddrs.every((a, i) => a === 0xc41d + i));
  check('probes: C41E/C41F are mask lo/hi', probeByAddress(0xc41e)?.name === 'TRANSITION_JOB_MASK_LO' && probeByAddress(0xc41f)?.name === 'TRANSITION_JOB_MASK_HI');
  check('probes: C420/C421/C422 counter model', probeByAddress(0xc420)?.name === 'TRANSITION_JOB_MAX_COUNTER' && probeByAddress(0xc421)?.name === 'TRANSITION_JOB_CHANNEL_STEP' && probeByAddress(0xc422)?.name === 'TRANSITION_JOB_CURRENT_COUNTER');

  const vp = probesByGroup('VIEWPORT_SCROLL');
  check('probes: 5 viewport/scroll probes', vp.length === 5, `got ${vp.length}`);

  // Fighter/CC/powerWindow player↔enemy symmetry
  check('probes: player/enemy fighter state pair', probeByAddress(0xca3c)?.side === 'PLAYER' && probeByAddress(0xca44)?.side === 'ENEMY');
  check('probes: player/enemy CC pair', probeByAddress(0xca3e)?.side === 'PLAYER' && probeByAddress(0xca46)?.side === 'ENEMY');
  check('probes: player/enemy powerWindow pair', probeByAddress(0xca40)?.side === 'PLAYER' && probeByAddress(0xca48)?.side === 'ENEMY');

  // Per-frame probes documented
  check('per-frame: battleBlock CA01..CA06', PER_FRAME_PROBES.battleBlock[0] === 'CA01..CA06');
  check('per-frame: actionSelect CA55..CA5A', PER_FRAME_PROBES.actionSelect[0] === 'CA55..CA5A');
  check('per-frame: actionObjects (AO0/AO1)', PER_FRAME_PROBES.actionObjects.length === 2);
  check('per-frame: base positions C3C8..C3CB', PER_FRAME_PROBES.actionObjectBasePositions[0] === 'C3C8..C3CB');
  check('per-frame: viewport C405/C406/C407/C409/C234', PER_FRAME_PROBES.viewportScroll.length === 5);
  check('per-frame: hardware SCX/SCY/LCDC/STAT/LY', PER_FRAME_PROBES.hardware.length === 5 && PER_FRAME_PROBES.hardware.includes('LY'));

  // Equipped card layout documented
  check('equipped: limit range +03..+17', EQUIPPED_CARD_LAYOUT.limitRange.includes('+03..+17'));

  // Summary sanity
  const summary = probeGroupSummary();
  check('summary: total probes = entries', Object.values(summary).reduce((a, b) => a + b, 0) === ROM_PROBE_ADDRESSES.length);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
