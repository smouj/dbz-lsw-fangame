// ═══════════════════════════════════════════════════════════════════════
// ROM L9 — mgba-driver.ts: driver de captura vía debugger CLI de mGBA.
// Habla con `mgba -d rom.gbc` por stdin/stdout usando:
//   frame          → avanza UN frame
//   r/1 0xADDR     → lee un byte (formato: línea ' 0xNN')
//   x/1 0xADDR N   → examina N bytes (formato: '0x0000ADDR: AA BB ...')
// No hay prompt visible en pipes: se usa retardo fijo + parseo por patrón.
// ═══════════════════════════════════════════════════════════════════════
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ADDR = {
  C0A0: 0xC0A0, CA01: 0xCA01, CA02: 0xCA02, CA03: 0xCA03, CA04: 0xCA04,
  CA06: 0xCA06, CA7E: 0xCA7E, CB77: 0xCB77,
  OBJ0: 0xC3A0, OBJ1: 0xC3B3, C3C6: 0xC3C6, C3C7: 0xC3C7, CA39: 0xCA39,
  SCX: 0xFF43, SCY: 0xFF42, LCDC: 0xFF40, STAT: 0xFF41,
};

export class MgbaDriver {
  private proc: ChildProcessWithoutNullStreams;
  private buf = '';
  private pending: string[] = [];
  private settled = false;

  constructor(romPath: string, savPath?: string) {
    const args = ['-a', '/usr/games/mgba', '-d'];
    if (savPath) args.push('-t', savPath);
    args.push(romPath);
    this.proc = spawn('xvfb-run', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', (chunk: Buffer) => {
      this.buf += chunk.toString();
      this.drain();
    });
    this.proc.stderr.on('data', () => { /* mesa warnings */ });
  }

  /** Acumula líneas completas y resuelve pendientes. */
  private drain() {
    while (this.pending.length > 0) {
      const nl = this.buf.indexOf('\n');
      if (nl < 0) break;
      const line = this.buf.slice(0, nl).trimEnd();
      this.buf = this.buf.slice(nl + 1);
      this.pending.shift()!(line);
    }
  }

  /** Ejecuta un comando y devuelve la PRÓXIMA línea de salida (espera). */
  private cmdLine(c: string, timeoutMs = 3000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.pending.indexOf(handler);
        if (i >= 0) this.pending.splice(i, 1);
        reject(new Error(`timeout: ${c}`));
      }, timeoutMs);
      const handler = (line: string) => {
        clearTimeout(timer);
        resolve(line);
      };
      this.pending.push(handler);
      this.proc.stdin.write(c + '\n');
      this.drain();
    });
  }

  /** Frame advance. */
  async frame(): Promise<void> {
    await this.cmdLine('frame');
  }

  /** Lee un byte (r/1) — la línea resultado es ' 0xNN'. */
  async readByte(addr: number): Promise<number> {
    const line = await this.cmdLine(`r/1 0x${addr.toString(16)}`);
    const m = line.match(/0x([0-9A-Fa-f]{2})/);
    return m ? parseInt(m[1], 16) : 0;
  }

  /** Lee N bytes con x/1 (una línea: '0x0000ADDR: AA BB ...'). */
  async readRange(addr: number, n: number): Promise<number[]> {
    const line = await this.cmdLine(`x/1 0x${addr.toString(16)} ${n}`);
    const hex = line.match(/:((?: [0-9A-Fa-f]{2})+)/);
    if (!hex) throw new Error(`x/1 sin bytes: ${line}`);
    return hex[1].trim().split(/\s+/).map(h => parseInt(h, 16));
  }

  /** Snapshot completo de un frame (§280) — con x/1 por objeto. */
  async snapshot(frameNo: number) {
    const battle: Record<string, number> = {};
    for (const [k, a] of Object.entries(ADDR)) {
      if (k === 'OBJ0' || k === 'OBJ1') continue;
      battle[k] = await this.readByte(a);
    }
    const obj0 = await this.readRange(ADDR.OBJ0, 19);
    const obj1 = await this.readRange(ADDR.OBJ1, 19);
    return {
      frame: frameNo,
      battle: {
        C0A0: battle.C0A0, CA01: battle.CA01, CA02: battle.CA02, CA03: battle.CA03,
        CA04: battle.CA04, CA06: battle.CA06, CA7E: battle.CA7E, CB77: battle.CB77,
      },
      actionObjects: [{ bytes: obj0 }, { bytes: obj1 }],
      activeObject: battle.C3C6,
      drawState: battle.C3C7,
      drawOrderFlag: battle.CA39,
      display: { scx: battle.SCX ?? 0, scy: battle.SCY ?? 0, lcdc: battle.LCDC ?? 0, stat: battle.STAT ?? 0 },
    };
  }

  async quit(): Promise<void> {
    try { await this.cmdLine('quit', 800); } catch { /* noop */ }
    this.proc.kill();
  }
}

/** CLI: captura N frames → capture.raw.json + metadata.json */
if (process.argv[1] && process.argv[1].endsWith('mgba-driver.ts')) {
  const [rom, sav, outDir, name, frames, side, outcome] = process.argv.slice(2);
  if (!rom || !outDir) {
    console.error('uso: node mgba-driver.ts <rom> [sav] <outDir> <name> <frames> <side> <outcome>');
    process.exit(1);
  }
  const d = new MgbaDriver(rom, sav || undefined);
  const n = Number(frames ?? 600);
  console.log('CALENTANDO (drena estado inicial del debugger)…');
  // drena las líneas de estado inicial (registros + disasm) sin comandos
  await new Promise(r => setTimeout(r, 800));
  d['buf'] = ''; // descarta el banner inicial
  const all: unknown[] = [];
  for (let i = 0; i < n; i++) {
    all.push(await d.snapshot(i));
    await d.frame();
    if (i % 30 === 0) console.log(`  frame ${i}/${n}`);
  }
  const dir = join(outDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'capture.raw.json'), JSON.stringify({ frames: all }, null, 1));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    source: {
      romSha256: '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee',
      romSize: 2097152, romLabel: 'dbz-lsw-usa',
      emulator: 'mGBA', emulatorVersion: '0.10.2', traceToolVersion: 'l9.2-driver',
    },
    attackerSide: side ?? 'LEFT', expectedOutcome: outcome ?? 'NORMAL_HIT',
    firstFrame: 0, lastFrame: n - 1,
    notes: 'driver debugger CLI mGBA (frame advance + r/1 + x/1)',
  }, null, 1));
  console.log(`CAPTURA OK: ${n} frames → ${dir}/`);
  await d.quit();
}
