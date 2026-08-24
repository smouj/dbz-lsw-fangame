// ═══════════════════════════════════════════════════════════════════════
// ROM L9 — mgba-batch.ts v2: captura en UNA sesión batch + parseo por
// patrón+posición. Cero sincronización: todos los comandos en stdin de
// una vez; el output se filtra por patrones de respuesta.
//
// Orden fijo por frame: 15× r/1 (registros) → x/1 obj0 → x/1 obj1 → frame
// Respuestas reconocibles (el resto — ecos/registros/disasm — se ignora):
//   r/1 → línea ' 0xNN'        (tras trim: '0xNN')
//   x/1 → línea '0x0000ADDR: AA BB ...'
// ═══════════════════════════════════════════════════════════════════════
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ADDR: Record<string, number> = {
  C0A0: 0xC0A0, CA01: 0xCA01, CA02: 0xCA02, CA03: 0xCA03, CA04: 0xCA04,
  CA06: 0xCA06, CA7E: 0xCA7E, CB77: 0xCB77,
  OBJ0: 0xC3A0, OBJ1: 0xC3B3, C3C6: 0xC3C6, C3C7: 0xC3C7, CA39: 0xCA39,
  SCX: 0xFF43, SCY: 0xFF42, LCDC: 0xFF40, STAT: 0xFF41,
};
const REG_NAMES = ['C0A0', 'CA01', 'CA02', 'CA03', 'CA04', 'CA06', 'CA7E', 'CB77', 'C3C6', 'C3C7', 'CA39', 'SCX', 'SCY', 'LCDC', 'STAT'];

export function runBatch(romPath: string, savPath: string | undefined, frames: number, killAfterMs = 45000): Promise<string> {
  return new Promise((resolve, reject) => {
    const inner = `/usr/games/mgba -d ${savPath ? `-t '${savPath}' ` : ''}'${romPath}'`;
    const proc = spawn('script', ['-qec', inner, '/dev/null'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      proc.kill('SIGKILL');
      resolve(output);
    };
    const killer = setTimeout(finish, killAfterMs);
    proc.stdout.on('data', (c: Buffer) => { output += c.toString(); });
    proc.stderr.on('data', () => { /* mesa warnings */ });
    proc.on('exit', finish);
    proc.on('error', (e) => { if (!settled) { settled = true; clearTimeout(killer); reject(e); } });

    setTimeout(() => {
      const cmds: string[] = [];
      for (let f = 0; f < frames; f++) {
        for (const name of REG_NAMES) cmds.push(`r/1 0x${ADDR[name].toString(16)}`);
        cmds.push(`x/1 0xc3a0 19`, `x/1 0xc3b3 19`, 'frame');
      }
      cmds.push('quit');
      proc.stdin.write(cmds.join('\n') + '\n');
    }, 2500);
  });
}

/** Filtra las líneas de respuesta del batch (patrón) y las asigna por orden. */
export function parseBatch(output: string, frames: number) {
  const lines = output.replace(/\r/g, '').split('\n');
  const regVals: number[] = [];
  // Filas x/1 en orden de aparición: { addr, bytes[] }
  const xRows: Array<{ addr: number; bytes: number[] }> = [];

  for (const line of lines) {
    const t = line.trim();
    if (/^0x[0-9A-Fa-f]{2}$/.test(t) && !t.startsWith('0x0000')) {
      regVals.push(parseInt(t.slice(2), 16));
      continue;
    }
    const xm = t.match(/^0x([0-9A-Fa-f]+):((?: [0-9A-Fa-f]{2})+)$/);
    if (xm) {
      xRows.push({
        addr: parseInt(xm[1], 16),
        bytes: xm[2].trim().split(/\s+/).map(h => parseInt(h, 16)),
      });
    }
  }

  /** Consume filas x/1 hasta completar n bytes desde start (salta solapadas). */
  let rowIdx = 0;
  const nextObject = (start: number, n: number): number[] => {
    const out: number[] = [];
    let cursor = start;
    while (out.length < n && rowIdx < xRows.length) {
      const row = xRows[rowIdx];
      if (row.addr !== cursor) {
        // fila no contigua: avanzar (eco/otra cosa) — pero las filas x/1
        // vienen en orden; si no coincide, saltamos esta fila.
        rowIdx++;
        continue;
      }
      out.push(...row.bytes);
      cursor += row.bytes.length;
      rowIdx++;
    }
    return out.slice(0, n);
  };

  const perFrame = REG_NAMES.length; // 15 registros por frame
  const out: unknown[] = [];
  for (let f = 0; f < frames; f++) {
    const regs = regVals.slice(f * perFrame, f * perFrame + perFrame);
    const o0 = nextObject(0xc3a0, 19);
    const o1 = nextObject(0xc3b3, 19);
    const battle: Record<string, number> = {};
    REG_NAMES.forEach((n, i) => { battle[n] = regs[i] ?? 0; });
    out.push({
      frame: f,
      battle: {
        C0A0: battle.C0A0, CA01: battle.CA01, CA02: battle.CA02, CA03: battle.CA03,
        CA04: battle.CA04, CA06: battle.CA06, CA7E: battle.CA7E, CB77: battle.CB77,
      },
      actionObjects: [{ bytes: o0 }, { bytes: o1 }],
      activeObject: battle.C3C6,
      drawState: battle.C3C7,
      drawOrderFlag: battle.CA39,
      display: { scx: battle.SCX, scy: battle.SCY, lcdc: battle.LCDC, stat: battle.STAT },
    });
  }
  return out;
}

/** CLI: node mgba-batch.mjs <rom> [sav] <outDir> <name> <frames> */
if (process.argv[1] && /mgba-batch\.(ts|mjs|js)$/.test(process.argv[1])) {
  const [rom, sav, outDir, name, framesStr] = process.argv.slice(2);
  if (!rom || !outDir) {
    console.error('uso: node mgba-batch.mjs <rom> [sav] <outDir> <name> <frames>');
    process.exit(1);
  }
  const frames = Number(framesStr ?? 600);
  console.log('BATCH: escribiendo comandos (una sesión)…');
  const output = await runBatch(rom, sav || undefined, frames);
  const parsed = parseBatch(output, frames);
  const regs = parsed[0] ? (parsed[0] as { battle: Record<string, number> }).battle : null;
  const dir = join(outDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'capture.raw.json'), JSON.stringify({ frames: parsed }, null, 1));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    source: {
      romSha256: '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee',
      romSize: 2097152, romLabel: 'dbz-lsw-usa',
      emulator: 'mGBA', emulatorVersion: '0.10.2', traceToolVersion: 'l9.2-batch',
    },
    attackerSide: 'LEFT', expectedOutcome: 'NORMAL_HIT',
    firstFrame: 0, lastFrame: frames - 1,
    notes: 'batch single-session (stdin masivo + parseo por patrón)',
  }, null, 1));
  console.log(`CAPTURA OK: ${frames} frames → ${dir}/`);
  console.log(`  sanity f0: CA06=${regs?.CA06?.toString(16)} C0A0=${regs?.C0A0?.toString(16)} obj0len=${(parsed[0] as { actionObjects: { bytes: number[] }[] }).actionObjects[0].bytes.length}`);
  process.exit(0);
}
