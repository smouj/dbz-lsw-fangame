// generate-rom-support-physical-visuals.ts — V6.7: genera la fuente canónica
// derivada src/data/generated/romSupportPhysicalVisuals.generated.ts desde los
// datos ROM V6 (docs/rom/research-v6-support-physicals). NUNCA editar a mano.
// Uso: npx tsx scripts/generate-rom-support-physical-visuals.ts
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE = resolve(process.cwd(), 'docs/rom/research-v6-support-physicals');
const matrix = JSON.parse(readFileSync(resolve(BASE, 'data/support_physical_visual_matrix_v6.json'), 'utf8')) as any[];
const macros = JSON.parse(readFileSync(resolve(BASE, 'data/support_macros_v6.json'), 'utf8')) as any[];

// worker family por handler (V5 dispatcher Support Bank00:$3A6C)
const WORKER_BY_HANDLER: Record<number, string> = {
  0x00: '$00',
  0x02: '$02',
  0x0b: '$0B',
  0x0d: '$0D',
  0x0f: '$0F',
};
// macros por worker (call-sites V6.4: LD BC,id; CALL $3E92)
const MACROS_BY_WORKER: Record<string, number[]> = {
  $0B: [0x2c, 0x34, 0x35],
  $0D: [0x2b],
};
const MACRO_RAW: Record<number, string> = {};
for (const m of macros) {
  MACRO_RAW[parseInt(m.macroId.slice(1), 16)] = m.rawBytes;
}

const lines: string[] = [];
lines.push('// AUTO-GENERADO por scripts/generate-rom-support-physical-visuals.ts');
lines.push('// Fuente: docs/rom/research-v6-support-physicals (matriz 48/48 + palette path + macros).');
lines.push('// No editar a mano. NO incluye payloads gráficos ni base64 (ver docs/rom).');
lines.push('');
lines.push('export interface RomSupportPhysicalVisual {');
lines.push('  cardId: number;');
lines.push('  name: string;');
lines.push('  handler: number;');
lines.push('  loader: {');
lines.push('    bank: number;');
lines.push('    localIndex: number;');
lines.push('    descriptorAddress: string;');
lines.push('  };');
lines.push('  physical: {');
lines.push('    tileCount: number;');
lines.push('    payloadSha256: string;');
lines.push('    graphicsSha256: string;');
lines.push('    layoutSha256: string;');
lines.push('    layoutSharedWith: string;');
lines.push('  };');
lines.push('  palette: {');
lines.push('    cardPaletteByte: number;');
lines.push('    effective: string; // CC15_PRESENTATION_STATE(default $31) | ...');
lines.push('    cardByte8Link: string; // UNLINKED_CARD_BYTE8');
lines.push('  };');
lines.push('  background: { resource: 0x19 | null; };');
lines.push('  macros: { macroId: number; rawBytes: string; semanticStatus: string; }[];');
lines.push('  animationSlot6Status: string;');
lines.push('  evidence: string;');
lines.push('}');
lines.push('');
lines.push('export const ROM_SUPPORT_PHYSICAL_VISUALS: Record<number, RomSupportPhysicalVisual> = {');

const BG19_HANDLERS = new Set([0x00, 0x02]);
const slot6Status: Record<number, string> = {
  42: 'PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED', // Kiai
  51: 'PRELOADED_SLOT6_NOT_ACTIONOBJECT_STARTED', // Paralysis
};
const names: Record<number, string> = {};
for (const r of matrix) names[Number(r.cardId)] = String(r.name);

for (const r of matrix) {
  const cardId = Number(r.cardId);
  const handler = parseInt(String(r.handler).replace('$', ''), 16);
  const worker = WORKER_BY_HANDLER[handler] ?? `0x${handler.toString(16)}`;
  const macrosForWorker = MACROS_BY_WORKER[worker] ?? [];
  const macroEntries = macrosForWorker
    .map((id) => ({
      macroId: id,
      rawBytes: MACRO_RAW[id] ?? '',
      semanticStatus: 'UNRESOLVED',
    }))
    .filter((m) => m.rawBytes);
  lines.push(`  ${cardId}: {`);
  lines.push(`    cardId: ${cardId},`);
  lines.push(`    name: ${JSON.stringify(names[cardId] ?? '')},`);
  lines.push(`    handler: 0x${handler.toString(16).padStart(2, '0')},`);
  lines.push(`    loader: { bank: ${parseInt(String(r.loaderBank).replace('$', ''), 16)}, localIndex: ${parseInt(String(r.loaderLocalIndex).replace('$', ''), 16)}, descriptorAddress: ${JSON.stringify(String(r.descriptorAddress))} },`);
  lines.push(`    physical: { tileCount: ${Number(r.tileCount)}, payloadSha256: ${JSON.stringify(String(r.payloadSha256))}, graphicsSha256: ${JSON.stringify(String(r.graphicsSha256))}, layoutSha256: ${JSON.stringify(String(r.layoutSha256))}, layoutSharedWith: ${JSON.stringify(String(r.layoutSharedWith))} },`);
  lines.push(`    palette: { cardPaletteByte: ${parseInt(String(r.palette).replace('$', ''), 16)}, effective: 'CC15_PRESENTATION_STATE(default $31)', cardByte8Link: 'UNLINKED_CARD_BYTE8' },`);
  lines.push(`    background: { resource: ${BG19_HANDLERS.has(handler) ? '0x19' : 'null'} },`);
  lines.push(`    macros: ${JSON.stringify(macroEntries)},`);
  lines.push(`    animationSlot6Status: ${JSON.stringify(slot6Status[cardId] ?? 'NOT_LOADED_SLOT6')},`);
  lines.push(`    evidence: 'ROM_STATIC_VERIFIED',`);
  lines.push(`  },`);
}

lines.push('};');
lines.push('');
lines.push('export const ROM_SUPPORT_VISUAL_COUNT = Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS).length;');

const outPath = resolve(process.cwd(), 'src/data/generated/romSupportPhysicalVisuals.generated.ts');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`wrote ${outPath} (${matrix.length} cards)`);
