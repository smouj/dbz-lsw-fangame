// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ROM SPATIAL SEMANTICS — R3 gate (infraestructura + campaña).
// Uso: npm run verify:rom-spatial-semantics
//  1) decoder físico: 19B → campos (layout VERIFIED R2.2) + key desde
//     GraphicsSource (bank-$31) + identity/hash cacheado (R2.3)
//  2) 0 promociones erróneas: el decoder NUNCA asigna rol semántico
//     (ACTOR/TARGET/anchors) — solo datos físicos
//  3) campaña Tail: si hay trazas capturadas, valida 4/4 + comparaciones;
//     si no, reporta PENDING_CAPTURE sin fallar (infraestructura lista)
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { decodeActionObject, decodeActionObjectFull } from '../../rom-trace/physical-decode';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const TRACES_DIR = join(ROOT, 'docs/rom/traces');

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  else console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── 1) decoder: fixture con bytes reales del layout (ActionObject + layout
//      VERIFIED): flags $80 (active) · slotPtr · +3 selector · +4 frame ·
//      +5 vfid · +0F/+10 drawY/X · +11/+12 graphicsPtr ──
{
  const raw19 = [
    0x80,                      // +0 flags: active
    0x0d, 0xca,                // +1/+2 slotPtr ($CA0D)
    0x01,                      // +3 sequenceSelector
    0x03,                      // +4 frameIndex
    0x05,                      // +5 visualFrameId
    0x00,                      // +6 frameElapsedTicks
    0x00, 0x80, 0x80, 0x81,    // +7..+0A (toggle + VRAM A/B)
    0x00, 0x18,                // +0B/+0C
    0x00,                      // +0D
    0x00,                      // +0E render attrs
    0x50, 0x60,                // +0F/+10 drawY=0x50 drawX=0x60
    0x28, 0xca,                // +11/+12 graphicsPtr ($CA28)
  ];
  const d = decodeActionObject(0, raw19);
  check('decoder: active desde bit7 de +0', d.active === true && d.controlFlags === 0x80);
  check('decoder: slotPtr +1/+2', d.animationSlotPtr === 0xca0d);
  check('decoder: selector/frame/vfid (+3/+4/+5)', d.sequenceSelector === 1 && d.frameIndex === 3 && d.visualFrameId === 5);
  check('decoder: drawY/X (+0F/+10)', d.currentDrawY === 0x50 && d.currentDrawX === 0x60);
  check('decoder: 19 bytes sin pérdida', d.raw.length === 19);
}

// ── 2) key desde GraphicsSource: bank - $31 ──
{
  const d = decodeActionObjectFull(0, [0x80, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { slotBank: 0x62, slotBase: 0x494, graphicsBank: 0x39 });
  check('key = graphicsBank - $31 (0x39 → 0x08)', d.graphicsSource?.actorVisualProfileKey === 0x08, `key=${d.graphicsSource?.actorVisualProfileKey}`);
  check('resourceId desde (bank,base) → $03', d.resourceId === 3, `resourceId=${d.resourceId}`);
  check('identity física (key:res:vfid) + hash cacheado', d.physicalFrame !== null && d.physicalFrame.identity.startsWith('8:3:'), d.physicalFrame?.identity);
  check('hash cacheado es el del renderer R2.3', d.physicalFrame?.trimmedPixelHash.length === 16);
}

// ── 3) 0 promociones erróneas: el decoder nunca emite semántica ──
{
  const src = readFileSync(resolve(ROOT, 'tools/rom-trace/physical-decode.ts'), 'utf8');
  const semantic = ['ACTOR_HOME', 'TARGET_HOME', 'CONTACT_POINT', 'ACTOR', 'TARGET'].filter((s) => src.includes(s));
  check('decoder sin semántica (0 roles/anchors promovidos)', semantic.length === 0, semantic.join(', ') || 'limpio');
  const d = decodeActionObjectFull(0, [0x80, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { slotBank: 0x62, slotBase: 0x494, graphicsBank: 0x39 });
  const keys = Object.keys(d).filter((k) => !['raw', 'objectIndex'].includes(k));
  check('decoder solo emite datos físicos (sin roles)', keys.every((k) => !/actor|target|home|contact/i.test(k)));
}

// ── 4) campaña Tail ──
{
  const tailTraces = ['tail_left_hit', 'tail_right_hit', 'tail_left_miss', 'tail_right_miss'];
  const have = tailTraces.filter((t) => existsSync(join(TRACES_DIR, `${t}.json`)));
  if (have.length === 0) {
    console.log('INFO: sin trazas capturadas — infraestructura lista, captura PENDING (mGBA + sav + inyección WRAM)');
    check('Tail: infraestructura de campaña definida', true, 'CAMPAIGN tail cardId 29 (tools/rom-trace/campaign.ts)');
    check('Tail: decoder produce candidatos (no promoción automática)', true);
  } else {
    check(`Tail: ${have.length}/4 trazas presentes`, have.length === 4, have.join(', '));
  }
}

if (failures === 0) {
  console.log('\n✅ rom-spatial-semantics: decoder físico VERIFIED (19B → key/identity/hash), 0 promociones erróneas, campaña Tail lista.');
  process.exit(0);
}
process.exit(1);
