// Depuración mínima del driver mGBA: arranca, lee 3 bytes, avanza frame, lee otra vez.
import { spawn } from 'child_process';

const proc = spawn('xvfb-run', ['-a', '/usr/games/mgba', '-d', '/home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
let log: string[] = [];
proc.stdout.on('data', (c: Buffer) => { buf += c.toString(); console.log('OUT:', JSON.stringify(c.toString().slice(-200))); });
proc.stderr.on('data', (c: Buffer) => { /* ignore */ });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function send(c: string) {
  console.log('>>', c);
  proc.stdin.write(c + '\n');
  await sleep(600);
  const idx = buf.indexOf('\n');
  if (idx >= 0) {
    const line = buf.slice(0, idx).trimEnd();
    buf = buf.slice(idx + 1);
    console.log('LINE:', JSON.stringify(line));
  }
}

await sleep(1200);
buf = ''; // descarta banner
await send('r/1 0xC0A0');
await send('r/1 0xC3A0');
await send('frame');
await send('r/1 0xC0A0');
await send('quit');
proc.kill();
console.log('DONE');
process.exit(0);
