// ═══════════════════════════════════════════════════════════════════════
// P0.4R-B6E — verify:rom-bg-assembly-1a
// ═══════════════════════════════════════════════════════════════════════
// Gate del BG `$1A` (CHARA / Gather Power). Canaries INDEPENDIENTES: CHARA y
// Gather se verifican por separado, y ambos deben compartir el MISMO resource.
//
// No reimplementa la selección: consume ROM_BG_1A_SELECTION (provenance
// ROM_STATIC_VERIFIED, ver docs/rom/B6E_BG_1A_AUTHORITY.md).
//
// Anti-regresión: la selección NO puede venir de nombres de carta/acción, ni
// caer a `$19` cuando `$1A` no resuelve.
//
// Portable: usa la ROM si está; si no, verifica contra la SSOT generada.
// ═══════════════════════════════════════════════════════════════════════
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROM_BG_1A_SELECTION,
  ROM_BG_ASSEMBLY_SPECS,
  romBg1aAssemblyCue,
  romBg1aPaletteFor,
} from '../src/battle/romDisplay/romBgAssemblyDecode';
import { romBgAssemblyImage } from '../src/data/generated/romBgAssembly.generated';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { resolveActionExitBoundary } from '../src/battle/presentation/actionExitBoundary';
import type { BattleTimeline, PresentationCue } from '../src/battle/engine/presentation/PresentationCue';

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('═══ ROM BG ASSEMBLY $1A — CHARA / Gather (canaries independientes) ═══');

const CHARA = 'CHARA_CC15_31' as const;
const GATHER = 'GATHER_POWER_CC15_33' as const;

const charaConsumer = ROM_BG_1A_SELECTION.consumers.find(c => c.id === CHARA);
const gatherConsumer = ROM_BG_1A_SELECTION.consumers.find(c => c.id === GATHER);

// ── Canary 1: CHARA ────────────────────────────────────────────────────
check('CHARA selects $1A', ROM_BG_1A_SELECTION.resource === 0x1a && charaConsumer !== undefined,
  `resource=$${ROM_BG_1A_SELECTION.resource.toString(16)}`);
check('CHARA palette == $31', romBg1aPaletteFor(CHARA) === 0x31, `$${romBg1aPaletteFor(CHARA).toString(16)}`);
check('CHARA escribe $cc15 (causalidad, no nombre→color)',
  charaConsumer?.writer.register === undefined && charaConsumer?.cc15 === 0x31,
  `${charaConsumer?.writer.symbol} ${charaConsumer?.writer.address}`);

// ── Canary 2: Gather ───────────────────────────────────────────────────
check('Gather selects $1A', ROM_BG_1A_SELECTION.resource === 0x1a && gatherConsumer !== undefined,
  `resource=$${ROM_BG_1A_SELECTION.resource.toString(16)}`);
check('Gather palette == $33', romBg1aPaletteFor(GATHER) === 0x33, `$${romBg1aPaletteFor(GATHER).toString(16)}`);

// ── Compartición del resource ──────────────────────────────────────────
check('both share same physical resource', charaConsumer !== undefined && gatherConsumer !== undefined
  && ROM_BG_1A_SELECTION.resource === 0x1a
  && ROM_BG_ASSEMBLY_SPECS[0x1a].consumers.length === 2,
  `consumers=[${ROM_BG_ASSEMBLY_SPECS[0x1a].consumers.join(',')}]`);
check('la autoridad NO es un branch de estado: es el callsite',
  ROM_BG_1A_SELECTION.loadAuthority.symbol === 'Call_000_3abd'
  && ROM_BG_1A_SELECTION.loader.resourceImmediate === '$001a'
  && ROM_BG_1A_SELECTION.sibling.resourceImmediate === '$0019',
  `${ROM_BG_1A_SELECTION.loadAuthority.address} → ${ROM_BG_1A_SELECTION.loadAuthority.target}`);

// ── Emisión ────────────────────────────────────────────────────────────
const cueChara = romBg1aAssemblyCue(CHARA, 17);
const cueGather = romBg1aAssemblyCue(GATHER, 17);
check('BG_ASSEMBLY $1A emitted (CHARA)', cueChara.type === 'BG_ASSEMBLY' && cueChara.resource === 0x1a,
  `resource=$${cueChara.resource.toString(16)} ${cueChara.rows}x${cueChara.cols}`);
check('BG_ASSEMBLY $1A emitted (Gather)', cueGather.type === 'BG_ASSEMBLY' && cueGather.resource === 0x1a);
check('ambas emisiones son el MISMO cue físico (mismo resource/geometría)',
  cueChara.resource === cueGather.resource && cueChara.rows === cueGather.rows && cueChara.cols === cueGather.cols);

// ── Resolución física ──────────────────────────────────────────────────
const imgChara = romBgAssemblyImage(0x1a, 0x31);
const imgGather = romBgAssemblyImage(0x1a, 0x33);
check('resource resolves physically (CHARA $1A/$31)', imgChara !== null, imgChara?.file ?? 'null');
check('resource resolves physically (Gather $1A/$33)', imgGather !== null, imgGather?.file ?? 'null');
const assetOk = [imgChara, imgGather].every(i => i !== null && existsSync(join('public', i.url.replace(/^\//, ''))) || i === null);
// Export físico: solo se exige cuando existe (local estricto). En CI los PNG
// generados no están en el repo → SKIP, igual que el verifier gemelo
// (verify-rom-bg-assembly). Nunca se debilita la ruta local.
const REQUIRE_ROM_BG_EXPORTS = process.env.REQUIRE_ROM_BG_EXPORTS === '1';
const BG_EXPORT = join(process.cwd(), 'public/assets/rom-bg');
if (!existsSync(BG_EXPORT)) {
  if (REQUIRE_ROM_BG_EXPORTS) check('PNG físico presente en public/assets/rom-bg', false, 'falta public/assets/rom-bg (npm run build:rom-bg-assembly)');
  else console.log('SKIP export físico $1A: public/assets/rom-bg no presente; usa REQUIRE_ROM_BG_EXPORTS=1 tras npm run build:rom-bg-assembly');
} else {
  check('PNG físico presente en public/assets/rom-bg',
    existsSync(join(BG_EXPORT, 'bg1a-p31.png')) && existsSync(join(BG_EXPORT, 'bg1a-p33.png')),
    'bg1a-p31.png / bg1a-p33.png');
}

// ── Production: el display lo consume ──────────────────────────────────
function consumeThroughDisplay(cue: Extract<PresentationCue, { type: 'BG_ASSEMBLY' }>, palette: number): string {
  const presenter = new RomDisplayPresenter();
  // El display path consume $cc15 (la paleta la fija el handler ROM).
  (presenter.state as { paletteIndex: number | null }).paletteIndex = palette;
  presenter.consume(cue);
  return presenter.state.bgAssembly?.status ?? 'NONE';
}
const stChara = consumeThroughDisplay(cueChara, 0x31);
const stGather = consumeThroughDisplay(cueGather, 0x33);
check('Production display consumes $1A (CHARA) → RESOLVED', stChara === 'RESOLVED', stChara);
check('Production display consumes $1A (Gather) → RESOLVED', stGather === 'RESOLVED', stGather);

// ── Boundary de salida: llega a FIELD sin residuo ──────────────────────
function timelineWithAssembly(cue: Extract<PresentationCue, { type: 'BG_ASSEMBLY' }>): BattleTimeline {
  const entries = [
    { cue, side: 'player' as const, source: 'B6E', fidelity: 'ROM_STATIC_VERIFIED' as const, logicalTick: 0 },
    { cue: { type: 'SCENE_LOAD' as const, tick: 60, vramLoad: '$8E00', mode: 'RESTORE_TACTICAL' as const }, side: 'player' as const, source: 'B6E', fidelity: 'ROM_STATIC_VERIFIED' as const, logicalTick: 0 },
  ];
  return { startTick: 0, endTick: 60, entries } as unknown as BattleTimeline;
}
const exitChara = resolveActionExitBoundary(timelineWithAssembly(cueChara));
const exitGather = resolveActionExitBoundary(timelineWithAssembly(cueGather));
check('exit boundary reaches FIELD (CHARA/Gather)',
  exitChara.fieldReadyTick === 60 && exitGather.fieldReadyTick === 60,
  `CHARA=${exitChara.fieldReadyTick} Gather=${exitGather.fieldReadyTick}`);
check('residual after FIELD == 0 (CHARA/Gather)',
  exitChara.residualAfterField.length === 0 && exitGather.residualAfterField.length === 0,
  `[${[...exitChara.residualAfterField, ...exitGather.residualAfterField].join(',')}]`);
check('el BG $1A queda declarado como display residual hasta FIELD (release por contrato)',
  exitChara.displayResidualAtField === true && exitGather.displayResidualAtField === true);

// ── Anti-regresión ─────────────────────────────────────────────────────
const nameMapped = /cardName|actionName/.test(JSON.stringify(ROM_BG_1A_SELECTION));
check('cardName/actionName → $1A mapping = 0', !nameMapped, nameMapped ? 'hay mapeo por nombre' : 'ninguno');
const fallback19 = romBgAssemblyImage(0x1a, 0x99) !== null;
check('$19 fallback when $1A is unresolved = 0', !fallback19,
  'una paleta no demostrada de $1A no resuelve a $19 ni a otro fondo');

console.log(`\nROM BG $1A: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:rom-bg-assembly-1a FAIL' : '✅ verify:rom-bg-assembly-1a PASS');
process.exit(failures ? 1 : 0);
