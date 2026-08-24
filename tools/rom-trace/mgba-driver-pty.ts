// ═══════════════════════════════════════════════════════════════════════
// ROM L9 — mgba-driver-pty.ts v3: driver robusto vía debugger CLI de mGBA.
// Parseo por PROMPT: cada comando escribe, luego espera a que la salida
// termine con '> ' (prompt del debugger) y toma la última línea sustancial.
// VERIFICADO: frame / r/1 / x/1 responden con prompt '> ' en PTY.
// ═══════════════════════════════════════════════════════════════════════
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ADDR: Record<string, number> = {
  C0A0: 0xC0A0, CA01: 0xCA01, CA02: 0xCA02, CA03: 0xCA03, CA04: 0xCA04,
  CA06: 0xCA06, CA7E: 0xCA7E, CB77: 0xCB77,
  OBJ0: 0xC3A0, OBJ1: 0xC3B3, C3C6: 0xC3C6, C3C7: 0xC3C7, CA39: 0xCA39,
  SCX: 0xFF43, SCY: 0xFF42, LCDC: 0xFF40, STAT: 0xFF41,
};

export class MgbaPtyDriver {
  private proc: ChildProcessWithoutNullStreams;
  private buf = '';
  private pending: Array<{ resolve: (out: string) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }> = [];

  constructor(romPath: string, savPath?: string) {
    const inner = `/usr/games/mgba -d ${savPath ? `-t '${savPath}' ` : ''}'${romPath}'`;
    this.proc = spawn('script', ['-qec', inner, '/dev/null'], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', (c: Buffer) => this.onData(c.toString()));
    this.proc.stderr.on('data', () => { /* mesa warnings */ });
  }

  private onData(chunk: string) {
    this.buf += chunk.replace(/\r/g, '');
    // cuando aparece el prompt '> ' al final, la respuesta está completa
    while (true) {
      const pi = this.buf.lastIndexOf('> ');
      if (pi < 0) break;
      const response = this.buf.slice(0, pi);
      this.buf = this.buf.slice(pi + 2);
      const p = this.pending.shift();
      if (p) {
        clearTimeout(p.timer);
        p.resolve(response);
      }
      if (this.pending.length === 0) break;
    }
  }

  private cmd(c: string, timeoutMs = 15000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.pending.indexOf(p);
        if (i >= 0) this.pending.splice(i, 1);
        reject(new Error(`timeout: ${c}`));
      }, timeoutMs);
      const p = { resolve, reject, timer };
      this.pending.push(p);
      this.proc.stdin.write(c + '\n');
    });
  }

  /** Espera arranque + warmup (2 frames). */
  async ready(): Promise<void> {
    let quiet = 0;
    while (quiet < 1000) {
      const before = this.buf.length;
      await new Promise(r => setTimeout(r, 100));
      if (this.buf.length === before) quiet += 100;
      else quiet = 0;
    }
    this.buf = '';
    await this.frame();
    await this.frame();
  }

  /** Ejecuta un comando y devuelve la última línea sustancial de la respuesta. */
  private async lastLine(c: string): Promise<string> {
    const resp = await this.cmd(c);
    const lines = resp.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) throw new Error(`sin respuesta: ${c}`);
    return lines[lines.length - 1];
  }

  async frame(): Promise<void> { await this.cmd('frame'); }

  async readByte(addr: number): Promise<number> {
    const line = await this.lastLine(`r/1 0x${addr.toString(16)}`);
    const m = line.match(/0x([0-9A-Fa-f]{2})/);
    if (!m) throw new Error(`r/1 sin valor: ${line.slice(0, 60)}`);
    return parseInt(m[1], 16);
  }

  async readRange(addr: number, n: number): Promise<number[]> {
    const out: number[] = [];
    let cur = addr;
    let got = 0;
    while (got < n) {
      const line = await this.lastLine(`x/1 0x${cur.toString(16)} ${n - got}`);
      const hex = line.match(/:((?: [0-9A-Fa-f]{2}){1,16})/);
      if (!hex) throw new Error(`x/1 sin bytes: ${line.slice(0, 80)}`);
      const bytes = hex[1].trim().split(/\s+/).map(h => parseInt(h, 16));
      out.push(...bytes);
      got += bytes.length;
      cur += bytes.length;
    }
    return out.slice(0, n);
  }

  async snapshot(frameNo: number) {
    const battle: Record<string, number> = {};
    for (const k of Object.keys(ADDR)) {
      if (k === 'OBJ0' || k === 'OBJ1') continue;
      battle[k] = await this.readByte(ADDR[k]);
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
    try { await this.cmd('quit', 2000); } catch { /* noop */ }
    this.proc.kill();
  }
}

/** CLI: captura N frames → capture.raw.json + metadata.json */
if (process.argv[1] && /mgba-driver-pty\.(ts|mjs|js)$/.test(process.argv[1])) {
  const [rom, sav, outDir, name, frames, side, outcome] = process.argv.slice(2);
  if (!rom || !outDir) {
    console.error('uso: node mgba-driver-pty.mjs <rom> [sav] <outDir> <name> <frames> <side> <outcome>');
    process.exit(1);
  }
  const d = new MgbaPtyDriver(rom, sav || undefined);
  await d.ready();
  console.log('READY — capturando…');
  const n = Number(frames ?? 600);
  const all: unknown[] = [];
  try {
    for (let i = 0; i < n; i++) {
      all.push(await d.snapshot(i));
      await d.frame();
      if (i % 30 === 0) console.log(`  frame ${i}/${n}`);
    }
  } catch (e) {
    console.error('CAPTURE_ERR:', (e as Error).message);
    process.exit(1);
  }
  const dir = join(outDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'capture.raw.json'), JSON.stringify({ frames: all }, null, 1));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify({
    source: {
      romSha256: '8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee',
      romSize: 2097152, romLabel: 'dbz-lsw-usa',
      emulator: 'mGBA', emulatorVersion: '0.10.2', traceToolVersion: 'l9.2-pty',
    },
    attackerSide: side ?? 'LEFT', expectedOutcome: outcome ?? 'NORMAL_HIT',
    firstFrame: 0, lastFrame: n - 1,
    notes: 'driver PTY mGBA (script -qec) — frame advance + r/1 + x/1',
  }, null, 1));
  console.log(`CAPTURA OK: ${n} frames → ${dir}/`);
  await d.quit();
}
