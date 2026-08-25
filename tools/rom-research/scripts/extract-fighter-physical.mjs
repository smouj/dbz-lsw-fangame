// ═══════════════════════════════════════════════════════════════════════
// R1 — extract-fighter-physical: metadata física de fighters (parcial real).
// Fuente: docs/rom/generated/animation-resources.json (vuelco del catálogo
// ANIMATION_RESOURCE_CATALOG — sequences decodificadas de la ROM, bancos
// $62-$64) + paletas físicas (romFighterPalettes.generated.ts).
// ESTADO HONESTO: frames [visualFrameId, durationTicks, offsetY, offsetX]
// ROM_STATIC_VERIFIED; el RENDER del sprite requiere la TABLA DE
// METASPRITES (piezas x/y/tile) — dirección no persistida en el repo
// (research-v3 la demostró en sesión, scripts ad-hoc) → PENDING_REEXTRACT.
// Nunca se inventa un metasprite.
// Uso: node tools/rom-research/scripts/extract-fighter-physical.mjs <hex>
//   ej: node tools/rom-research/scripts/extract-fighter-physical.mjs 03
// Salida: docs/rom/generated/fighters/resource_<hex>/metadata.json + frames/
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CATALOG = join(ROOT, 'docs/rom/generated/animation-resources.json');
const OUT = join(ROOT, 'docs/rom/generated/fighters');

const resourceHex = (process.argv[2] ?? '03').toLowerCase();
const resourceId = parseInt(resourceHex, 16);

function main() {
  if (!existsSync(CATALOG)) {
    console.log('⚠ animation-resources.json ausente — regenerar con: npx tsx -e "…" (ver README)');
    process.exit(1);
  }
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const res = catalog.find((r) => r.resourceId === resourceId);
  if (!res) {
    console.log(`⚠ resource 0x${resourceHex} no está en el catálogo (${catalog.length} resources)`);
    process.exit(1);
  }

  const palettesPath = join(ROOT, 'src/data/generated/romFighterPalettes.generated.ts');
  let palettes = [];
  if (existsSync(palettesPath)) {
    const src = readFileSync(palettesPath, 'utf8');
    const m = src.match(/ROM_FIGHTER_PALETTES:[\s\S]*?= (\[[\s\S]*?\]);/);
    if (m) { try { palettes = JSON.parse(m[1]); } catch { /* noop */ } }
  }

  const outDir = join(OUT, `resource_${resourceHex}`);
  mkdirSync(join(outDir, 'frames'), { recursive: true });

  const framesOut = [];
  let totalFrames = 0, totalTicks = 0;
  res.sequences.forEach((s, si) => {
    s.frames.forEach((f, fi) => {
      const file = `resource_${resourceHex}_seq_${String(si).padStart(2, '0')}_frame_${String(fi).padStart(2, '0')}.json`;
      const frame = {
        visualFrameId: f.visualFrameId,
        durationTicks: f.durationTicks,
        offsetY: f.offsetY,
        offsetX: f.offsetX,
        raw: f.raw,
        sequenceAddr: `$${s.addr.toString(16).toUpperCase()}`,
      };
      writeFileSync(join(outDir, 'frames', file), JSON.stringify(frame, null, 2));
      framesOut.push({ file, frame, sequence: si });
      totalFrames++; totalTicks += f.durationTicks;
    });
  });

  const metadata = {
    resourceId: res.resourceId,
    resourceHex: `0x${res.resourceHex}`,
    bank: res.bank,
    localId: res.localId,
    sequences: res.sequenceCount,
    frames: res.physicalFrameCount,
    totalTicks: res.totalTicks,
    perSequenceTicks: res.sequences.map((s, i) => ({ sequence: i, addr: `$${s.addr.toString(16).toUpperCase()}`, frames: s.frames.length, ticks: s.frames.reduce((a, f) => a + f.durationTicks, 0) })),
    evidence: 'ROM_STATIC_VERIFIED (frames [visualFrameId, durationTicks, offsetY, offsetX] — catálogo ANIMATION_RESOURCE_CATALOG, bancos $62-$64)',
    palettes: palettes.slice(0, 8).map((p) => ({ key: `0x${p.key.toString(16).padStart(2, '0')}`, colors: p.colors, bgr555: p.bgr555 })),
    metaspriteTable: {
      status: 'PENDING_REEXTRACT',
      missing: 'tabla de metasprites (piezas x/y/tile) — dirección no persistida en el repo; research-v3 §2 la demostró en sesión (scripts ad-hoc): 411/411 graphicsBlockCount == metasprite.pieceCount; bloque 32B = 2 tiles 8×8 = pieza OBJ 8×16. El render físico requiere reencontrarla (descriptor +4 → tabla gráfica).',
    },
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  console.log(`R1 extract-fighter-physical: resource 0x${resourceHex}`);
  console.log(`  bank=${res.bank} localId=${res.localId} · sequences=${res.sequenceCount} frames=${res.physicalFrameCount} totalTicks=${res.totalTicks}t`);
  console.log(`  per-sequence: ${metadata.perSequenceTicks.map((s) => `S${s.sequence}:${s.frames}f/${s.ticks}t`).join('  ')}`);
  console.log(`  paletas físicas: ${palettes.length} (BGR555→RGB reales) → ${outDir}`);
  console.log(`  METASPRITE: ${metadata.metaspriteTable.status} — render del sprite pendiente de reextracción de la tabla (nunca se inventa)`);
}

main();
