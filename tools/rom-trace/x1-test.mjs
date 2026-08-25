// Test x/1 con distintos formatos de dirección
import { spawn } from 'child_process';
const p = spawn('script', ['-qec', "/usr/games/mgba -d /home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc", '/dev/null'], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
p.stdout.on('data', c => { buf += c.toString().replace(/\r/g, ''); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function send(c) {
  console.log('>>', c);
  p.stdin.write(c + '\n');
  await sleep(700);
  const lines = buf.split('\n').filter(l => l.trim() && !l.includes('libEGL') && !l.includes('MESA'));
  console.log('  <-', lines.slice(-3).join(' | '));
  buf = '';
}
await sleep(1500);
await send('x/1 0xC3A0 19');
await send('x/1 C3A0 19');
await send('x/1 $C3A0 19');
await send('x 0xC3A0');
await send('quit');
p.kill(); process.exit(0);
