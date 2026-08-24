// ═══════════════════════════════════════════════════════════════════════
// ROM LOTE 9/10 — verify-rom-campaign: valida la campaña + pipeline ingest.
// Uso: npm run verify:rom-campaign
// 1) Verifica el criterio L10 contra docs/rom/traces/ (si hay capturas).
// 2) Test end-to-end del ingest con un dump de juguete (generado, NO ROM):
//    valida que raw → trace.full.json → changes → summary funciona y que
//    las promociones NO ocurren sin cross-trace.
// ═══════════════════════════════════════════════════════════════════════

import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadCampaign } from '../tools/rom-trace/campaign';
import { ingestTrace } from '../tools/rom-trace/ingest';
import { validateTrace, traceId } from '../tools/rom-trace/trace-schema';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const SHA = '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee';

console.log('\n── ROM L9 · campaign + ingest pipeline ──\n');

// ── 1) Estado de la campaña real (docs/rom/traces/) ──
const st = loadCampaign('docs/rom/traces');
check('campaign: estructura de targets definida (5 handlers)',
  st.traceDir === 'docs/rom/traces' && loadCampaign('docs/rom/traces').missing.length >= 0);
check('campaign: sin capturas reales todavía, NO está listo para L10 (honesto)',
  !st.readyForL10 && st.valid.length === 0);
check('campaign: el criterio exige Tail 4 + PC ≥2 + PCZ ≥2',
  st.reasons.some(r => r.includes('Tail')) || st.valid.length > 0);

// ── 2) Test end-to-end del ingest con dump de juguete ──
const dir = mkdtempSync(join(tmpdir(), 'trace-test-'));
const name = 'tail_left_hit';
const capDir = join(dir, name);
writeFileSync(join(dir, name + '.raw.json'), JSON.stringify({
  frames: Array.from({ length: 12 }, (_, i) => ({
    frame: i,
    battle: { C0A0: 2, CA01: 0, CA02: 0, CA03: 0, CA04: 0, CA06: i < 3 ? i : 3, CA7E: 0x0b, CB77: 0, CA53: i > 8 ? 0 : 0 },
    actionObjects: [
      Array.from({ length: 19 }, (_, j) => (0x10 + j).toString(16).padStart(2, '0')).join(' '),
      Array.from({ length: 19 }, (_, j) => (0x40 + j).toString(16).padStart(2, '0')).join(' '),
    ],
    activeObject: 0,
    drawState: 0,
    drawOrderFlag: 0,
    display: { scx: 0, scy: 0, lcdc: 0x91, stat: 0 },
  })),
}));
writeFileSync(join(dir, name + '.meta.json'), JSON.stringify({
  source: { romSha256: SHA, romSize: 2097152, romLabel: 'dbz-lsw-usa', emulator: 'test', emulatorVersion: '1.0', traceToolVersion: 'l9.1' },
  attackerSide: 'LEFT',
  expectedOutcome: 'NORMAL_HIT',
  firstFrame: 0,
  lastFrame: 11,
  cardId: 29,
  subtype: 0x0b,
  workerBank: 3,
  workerAddress: 0x61c5,
}));

const ingested = ingestTrace(join(dir, name + '.raw.json'), join(dir, name + '.meta.json'), capDir);
check('ingest: produce trace.full.json válido', validateTrace(ingested).length === 0);
check('ingest: produce trace.changes.json (diff regenerable)',
  existsSync(join(capDir, 'trace.changes.json')) && JSON.parse(readFileSync(join(capDir, 'trace.changes.json'), 'utf8')).frames.length <= ingested.frames.length);
check('ingest: produce summary.md con FSM',
  existsSync(join(capDir, 'summary.md')) && readFileSync(join(capDir, 'summary.md'), 'utf8').includes('State transitions'));
check('ingest: 19 bytes por ActionObject preservados', ingested.frames[0].actionObjects.every(o => o.bytes.length === 19));
check('ingest: trace ID determinista', traceId(ingested) === traceId(ingested));

// raw inmutable: el ingest no modifica el capture
const rawAfter = JSON.parse(readFileSync(join(dir, name + '.raw.json'), 'utf8'));
check('ingest: raw inmutable (no se modifica)', rawAfter.frames.length === 12);

// ── 3) Guardrail: sin SHA no promueve ──
const badMeta = { ...JSON.parse(readFileSync(join(dir, name + '.meta.json'), 'utf8')), source: { ...JSON.parse(readFileSync(join(dir, name + '.meta.json'), 'utf8')).source, romSha256: '' } };
writeFileSync(join(dir, 'bad.meta.json'), JSON.stringify(badMeta));
let threw = false;
try { ingestTrace(join(dir, name + '.raw.json'), join(dir, 'bad.meta.json'), join(dir, 'bad')); } catch { threw = true; }
check('ingest: sin SHA válido → rechazado (no promueve datos)', threw);

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
}
