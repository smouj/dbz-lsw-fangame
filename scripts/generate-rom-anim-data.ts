// generate-rom-anim-data.ts — genera src/data/romAnimationData.ts desde la ROM.
// Fuente: rom-anim-sequences.json (confirmadas) + rom-card-table.json.
// Uso: npx tsx scripts/generate-rom-anim-data.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function findJson(name: string): string | null {
  const candidates = [
    resolve(process.cwd(), '../dbz-lsw-decomp/12_data/cards', name),
    resolve(process.cwd(), 'dbz-lsw-decomp/12_data/cards', name),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

function main() {
  const seqPath = findJson('rom-anim-sequences.json');
  const cardPath = findJson('rom-card-table.json');
  if (!seqPath || !cardPath) {
    console.log('⚠ JSONs ROM ausentes — no se regenera');
    process.exit(0);
  }
  const seq = JSON.parse(readFileSync(seqPath, 'utf8'));
  const cards = JSON.parse(readFileSync(cardPath, 'utf8'));

  // nombre técnica → datos de carta (handler/resource/fx/palette)
  const cardByName = new Map<string, any>();
  const CARD_IDS: Record<string, number> = {
    'Kamehameha': 12, 'Masenko': 10, 'Galick-Ho': 30, 'Final Flash': 32,
    'Energy Wave': 7, 'Finger Beam': 63, 'Big Bang Attack': 31,
    'Destructo Disk': 21, 'Special Beam Cannon': 17, 'Misty KiWave': 20,
    'Spirit Bomb': 24, 'Tail': 29,
  };
  for (const [name, id] of Object.entries(CARD_IDS)) {
    const rec = cards.records[id - 1];
    if (rec) cardByName.set(name, rec);
  }

  const lines: string[] = [
    '// ═══════════════════════════════════════════════════════════════════════',
    '// romAnimationData.ts — GENERADO por scripts/generate-rom-anim-data.ts',
    '// Secuencias de animación REALES extraídas de la ROM (bancos $62-$64).',
    '// Frame: [metasprite, ticks, deltaY, deltaX] — formato del reproductor GBC.',
    '// NO editar a mano — regenerar tras reextraer la ROM.',
    '// ═══════════════════════════════════════════════════════════════════════',
    '',
    '/** Frame de animación ROM: [metaspriteIndex, durationTicks, deltaY, deltaX]. */',
    'export interface RomAnimationFrame {',
    '  meta: number;',
    '  ticks: number;',
    '  dy: number;',
    '  dx: number;',
    '  /** Raw 4-byte frame record: [metaspriteIndex, durationTicks, deltaY_u8, deltaX_u8]. */',
    '  raw: readonly [number, number, number, number];',
    '}',
    '',
    'export interface RomAnimationSequence {',
    '  /** Bank-local address of the sequence record. */',
    '  addr: number;',
    '  frames: RomAnimationFrame[];',
    '  totalTicks: number;',
    '}',
    '',
    '/** Perfil de técnica anclado a la ROM (selector de ejecución + recursos). */',
    'export interface RomTechniqueProfile {',
    '  /** execution handler (byte +05) — dispatcher del juego. */',
    '  handler: number;',
    '  /** actor animation resource (byte +06, bancos $62-$64). */',
    '  animationResource: number;',
    '  /** effect graphics resource (byte +07, bancos $65+, VRAM $8800). */',
    '  fxResource: number;',
    '  /** effect palette ID (byte +08, tabla CGB banco $30:$6E00). */',
    '  palette: number;',
    '  /** secuencias del actor extraídas (rom-anim-sequences.json). */',
    '  sequences: RomAnimationSequence[];',
    '  /** banco ROM donde vive el recurso. */',
    '  bank: number;',
    '}',
    '',
    '/** Técnicas con secuencias ROM_CONFIRMED (extracción byte-exacta). */',
    'export const ROM_TECHNIQUES: Record<string, RomTechniqueProfile> = {',
  ];

  const confirmed = seq.confirmed as Record<string, any>;
  for (const [name, data] of Object.entries(confirmed)) {
    const card = cardByName.get(name);
    const rec = card ?? {};
    const bank = typeof data.bank === 'number' ? data.bank : data.bank;
    lines.push(`  ${JSON.stringify(name)}: {`);
    lines.push(`    handler: ${rec.exec_selector ?? 0},`);
    lines.push(`    animationResource: ${rec.actor_anim ?? 0},`);
    lines.push(`    fxResource: ${rec.fx_graphics ?? 0},`);
    lines.push(`    palette: ${rec.fx_palette ?? 0},`);
    lines.push(`    bank: ${bank},`);
    lines.push(`    sequences: [`);
    for (const s of data.sequences) {
      lines.push(`      { addr: ${s.addr ?? 0}, totalTicks: ${s.totalTicks}, frames: [`);
      for (const f of s.frames) {
        const rawDy = f.dy < 0 ? f.dy + 256 : f.dy;
        const rawDx = f.dx < 0 ? f.dx + 256 : f.dx;
        lines.push(`        { meta: ${f.meta}, ticks: ${f.ticks}, dy: ${f.dy}, dx: ${f.dx}, raw: [${f.meta}, ${f.ticks}, ${rawDy}, ${rawDx}] },`);
      }
      lines.push(`      ] },`);
    }
    lines.push(`    ],`);
    lines.push(`  },`);
  }
  lines.push('};');
  lines.push('');
  lines.push('/** Busca el perfil ROM de una técnica (undefined si aún no confirmada). */');
  lines.push('export function romTechnique(name: string): RomTechniqueProfile | undefined {');
  lines.push('  return ROM_TECHNIQUES[name];');
  lines.push('}');
  lines.push('');

  const out = resolve(process.cwd(), 'src/data/romAnimationData.ts');
  writeFileSync(out, lines.join('\n'));
  console.log(`✅ generado ${out} (${Object.keys(confirmed).length} técnicas confirmadas)`);
}

main();
