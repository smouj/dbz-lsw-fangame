// ═══════════════════════════════════════════════════════════════════════
// ROM R3.1A — nav.ts: navegación operativa hasta combate real.
//
// Conduce rom-driver (libmgba) por stdin/stdout: avanza frames con teclas
// y reporta estado de batalla + screenshots periódicos. Uso exploratorio
// para mapear el flujo historia → batalla con el save 100%.
//
//   npx tsx nav.ts <comando...>
//     run <frames> [keys]          → avanza y reporta state
//     tap <key> [hold] [release]   → pulsa una tecla
//     shot <path.ppm>
// ═══════════════════════════════════════════════════════════════════════
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const KEY = {
  A: 0x01, B: 0x02, SELECT: 0x04, START: 0x08,
  RIGHT: 0x10, LEFT: 0x20, UP: 0x40, DOWN: 0x80,
} as const;

export class RomDriver {
  private proc: ChildProcessWithoutNullStreams;
  private buf = '';
  private queue: Array<(line: string) => void> = [];
  private noise: string[] = [];

  constructor(rom: string, sav?: string) {
    this.proc = spawn(join(__dirname, 'rom-driver'), sav ? [rom, sav] : [rom], { cwd: __dirname, stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', (c: Buffer) => {
      this.buf += c.toString();
      this.drain();
    });
    this.proc.stderr.on('data', () => { /* GB I/O warnings etc */ });
  }

  private drain() {
    while (this.queue.length > 0) {
      const nl = this.buf.indexOf('\n');
      if (nl < 0) break;
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (line.startsWith('OK') || line.startsWith('ERR')) {
        this.queue.shift()!(line);
      } else {
        this.noise.push(line); // warnings GB I/O de libmgba van por stdout
      }
    }
  }

  cmd(line: string, timeoutMs = 15000): Promise<string> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        const i = this.queue.indexOf(h);
        if (i >= 0) this.queue.splice(i, 1);
        reject(new Error(`timeout: ${line}`));
      }, timeoutMs);
      const h = (l: string) => { clearTimeout(t); resolve(l); };
      this.queue.push(h);
      this.proc.stdin.write(line + '\n');
      this.drain();
    });
  }

  async frames(n: number, keys = 0): Promise<string> {
    return this.cmd(`frames ${n}${keys ? ` ${keys}` : ''}`);
  }
  async state(): Promise<Record<string, number>> {
    const line = await this.cmd('state');
    const out: Record<string, number> = {};
    for (const m of line.matchAll(/([A-Z0-9]+)=([0-9A-F]{2})/g)) out[m[1]] = parseInt(m[2], 16);
    return out;
  }
  async read(addr: number, n: number): Promise<number[]> {
    const line = await this.cmd(`read ${addr} ${n}`);
    const hex = line.slice(3).trim().split(/\s+/);
    return hex.map(h => parseInt(h, 16));
  }
  async write(addr: number, val: number): Promise<void> {
    await this.cmd(`write ${addr} ${val}`);
  }
  async shot(path: string): Promise<void> {
    await this.cmd(`shot ${path}`);
  }
  async memdump(path: string, start: number, len: number): Promise<void> {
    await this.cmd(`memdump ${path} ${start} ${len}`);
  }
  async savestate(path: string): Promise<void> {
    await this.cmd(`savestate ${path}`);
  }
  async loadstate(path: string): Promise<void> {
    await this.cmd(`loadstate ${path}`);
  }
  async trace(path: string, n: number, keyspec = ''): Promise<void> {
    await this.cmd(`trace ${path} ${n}${keyspec ? ` ${keyspec}` : ''}`);
  }
  async quit(): Promise<void> {
    try { await this.cmd('quit', 1000); } catch { /* noop */ }
    this.proc.kill();
  }
}

// CLI exploratorio
if (process.argv[1] && process.argv[1].endsWith('nav.ts')) {
  const [rom, sav] = process.argv.slice(2, 4);
  const d = new RomDriver(rom, sav);
  const line = process.argv.slice(4).join(' ');
  const parts = line.split(' ');
  const op = parts[0];
  if (op === 'run') {
    const n = Number(parts[1] ?? 100);
    const keys = Number(parts[2] ?? 0);
    const r = await d.frames(n, keys);
    const s = await d.state();
    console.log(r);
    console.log('STATE ' + Object.entries(s).map(([k, v]) => `${k}=${v.toString(16).padStart(2, '0')}`).join(' '));
  } else if (op === 'tap') {
    const key = KEY[parts[1] as keyof typeof KEY] ?? 0;
    const hold = Number(parts[2] ?? 10);
    const release = Number(parts[3] ?? 10);
    await d.frames(hold, key);
    await d.frames(release, 0);
    console.log(`TAP ${parts[1]} (${hold}+${release})`);
  } else if (op === 'shot') {
    await d.shot(parts[1]);
    console.log('SHOT ' + parts[1]);
  } else if (op === 'state') {
    const s = await d.state();
    console.log(Object.entries(s).map(([k, v]) => `${k}=${v.toString(16).padStart(2, '0')}`).join(' '));
  }
  await d.quit();
}
