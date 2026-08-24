// generate-rom-card-data.ts — genera src/data/romCardData.ts desde la ROM.
// Fuente: dbz-lsw-decomp/12_data/cards/rom-card-table.json (extraído con
// extract-card-table.py desde la ROM USA — fuente de verdad).
//
// El archivo generado se COMMITEA (dato derivado estable) para que el juego
// tenga la taxonomía real aunque la ROM no esté presente.
// Uso: npx tsx scripts/generate-rom-card-data.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CARDS } from '../src/data/cards';

function findRomJson(): string | null {
  const candidates = [
    resolve(process.cwd(), '../dbz-lsw-decomp/12_data/cards/rom-card-table.json'),
    resolve(process.cwd(), 'dbz-lsw-decomp/12_data/cards/rom-card-table.json'),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function main() {
  const romPath = findRomJson();
  if (!romPath) {
    console.log('⚠ ROM JSON ausente — no se regenera (mantener el archivo commiteado)');
    process.exit(0);
  }
  const rom = JSON.parse(readFileSync(romPath, 'utf8'));
  const byName = new Map<string, { exec: number; actorAnim: number; fxGraphics: number; fxPalette: number; mask: string }>();
  for (const r of rom.records) {
    const c = CARDS[r.index - 1];
    if (!c) continue;
    byName.set(normalize(c.name), {
      exec: r.exec_selector,
      actorAnim: r.actor_anim,
      fxGraphics: r.fx_graphics,
      fxPalette: r.fx_palette,
      mask: r.compat_mask,
    });
  }
  const lines: string[] = [
    '// ═══════════════════════════════════════════════════════════════════════',
    '// romCardData.ts — GENERADO por scripts/generate-rom-card-data.ts',
    '// Taxonomía de ejecución REAL extraída de la ROM (banco $11, tabla de 125',
    '// cartas). NO editar a mano — regenerar tras reextraer la ROM.',
    '// Ejecutar: npx tsx scripts/generate-rom-card-data.ts',
    '// ═══════════════════════════════════════════════════════════════════════',
    '',
    'export interface RomCardData {',
    '  /** Selector de ejecución (byte 5 de la tabla ROM): familia real de la técnica. */',
    '  exec: number;',
    '  /** Actor AnimationResource (byte 6). 0xff = sin recurso de actor. */',
    '  actorAnim: number;',
    '  /** FX graphics resource (byte 7). 0xff = sin recurso FX. */',
    '  fxGraphics: number;',
    '  /** CGB palette id (byte 8). 0xff = sin paleta FX. */',
    '  fxPalette: number;',
    '  /** Máscara de compatibilidad 48-bit (bytes 9-14): bit N = forma N. */',
    '  mask: string;',
    '}',
    '',
    '/** Normaliza un nombre de carta para lookup (minúsculas, sin símbolos). */',
    'export function normalizeCardName(name: string): string {',
    '  return name.toLowerCase().replace(/[^a-z0-9]/g, \'\');',
    '}',
    '',
    '/** Mapa nombre-normalizado → datos ROM. Generado: ' + new Date().toISOString().slice(0, 10) + ' */',
    'export const ROM_CARD_DATA: Record<string, RomCardData> = {',
  ];
  for (const [name, d] of [...byName.entries()].sort()) {
    lines.push(`  '${name}': { exec: ${d.exec}, actorAnim: ${d.actorAnim}, fxGraphics: ${d.fxGraphics}, fxPalette: ${d.fxPalette}, mask: '${d.mask}' },`);
  }
  lines.push('};');
  lines.push('');
  lines.push('/** Busca los datos ROM de una carta por nombre (undefined si no está). */');
  lines.push('export function romCardData(name: string): RomCardData | undefined {');
  lines.push('  return ROM_CARD_DATA[normalizeCardName(name)];');
  lines.push('}');
  lines.push('');

  const out = resolve(process.cwd(), 'src/data/romCardData.ts');
  writeFileSync(out, lines.join('\n'));
  console.log(`✅ generado ${out} (${byName.size} cartas)`);
}

main();
