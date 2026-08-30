// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM CARD EFFECT HANDLER SSOT
// Uso: npm run verify:rom-card-effects
//
// Golden checks for src/battle/romCardEffectHandlers.ts:
//   A) Stop Device (#98) handler rule — Android range + geometry outcomes.
//   B) Android identity table ($22..$26).
// ═══════════════════════════════════════════════════════════════════════
import {
  CARD_EFFECT_HANDLERS,
  ANDROID_TARGET_RANGE,
  TACTICAL_BITS,
  cardEffectHandlerByCardId,
  androidIdentityByFormId,
} from '../src/battle/romCardEffectHandlers';

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

// ── A) Stop Device handler ──
{
  const sd = cardEffectHandlerByCardId(98);
  check('handler: Stop Device = card #98', sd?.cardName === 'Stop Device');
  check('handler: evidence ROM_HANDLER_VERIFIED', sd?.evidence === 'ROM_HANDLER_VERIFIED');
  check('handler: 5 outcomes', sd?.outcomes.length === 5, `got ${sd?.outcomes.length}`);

  const outcomes = sd?.outcomes ?? [];
  const has = (needle: string) => outcomes.some(o => o.condition.includes(needle) || o.result.includes(needle));
  check('handler: target-not-Android → FAIL', has('target ∉ Android') && has('CA53 = 1'));
  check('handler: actor BACK → FAIL', has('actor BACK'));
  check('handler: FRONT→FRONT → KO (maxLife)', has('FRONT + target FRONT') && has('maxLife'));
  check('handler: FRONT→BACK same plane → maxLife/2', has('FRONT + target BACK') && has('floor(maxLife / 2)'));
  check('handler: other geometry → FAIL', has('any other geometry'));

  check('handler: memory CA53 = STOP_DEVICE_FAIL_FLAG', sd?.memory.some(m => m.address === 0xca53 && m.name === 'STOP_DEVICE_FAIL_FLAG'));
}

// ── B) Android identity table ──
{
  check('android: range $22..$26', ANDROID_TARGET_RANGE.minFormId === 0x22 && ANDROID_TARGET_RANGE.maxFormId === 0x26);
  check('android: 5 identities', ANDROID_TARGET_RANGE.identities.length === 5, `got ${ANDROID_TARGET_RANGE.identities.length}`);
  check('android: $22 = Android 16', androidIdentityByFormId(0x22) === 'Android 16');
  check('android: $23 = Android 17', androidIdentityByFormId(0x23) === 'Android 17');
  check('android: $24 = Android 18', androidIdentityByFormId(0x24) === 'Android 18');
  check('android: $25 = Android 19', androidIdentityByFormId(0x25) === 'Android 19');
  check('android: $26 = Android 20 / Dr. Gero', androidIdentityByFormId(0x26) === 'Android 20 / Dr. Gero');

  // tactical bits
  check('tactical: bit0 GROUND/AIR', TACTICAL_BITS.vertical.bit === 0 && TACTICAL_BITS.vertical.ground === 0 && TACTICAL_BITS.vertical.air === 1);
  check('tactical: bit1 FRONT/BACK', TACTICAL_BITS.depth.bit === 1 && TACTICAL_BITS.depth.front === 0 && TACTICAL_BITS.depth.back === 1);
}

// ── C) Registry consistency ──
{
  const ids = new Set(CARD_EFFECT_HANDLERS.map(h => h.cardId));
  check('registry: no duplicate card ids', ids.size === CARD_EFFECT_HANDLERS.length);
  check('registry: 1 handler (Stop Device)', CARD_EFFECT_HANDLERS.length === 1, `got ${CARD_EFFECT_HANDLERS.length}`);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) {
  process.exit(1);
}
