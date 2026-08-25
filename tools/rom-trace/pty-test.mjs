// Test PTY mínimo: ¿llega la salida del debugger en vivo a través de script -qec?
import { spawn } from 'child_process';

const p = spawn('script', ['-qec', '/usr/games/mgba -d /home/local-user/.openclaw/workspace/dbz-lsw-decomp/13_raw_rom/dbz-lsw-usa.gbc', '/dev/null'], { stdio: ['pipe', 'pipe', 'pipe'] });
let out = '';
p.stdout.on('data', c => { out += c.toString(); console.log('CHUNK:', JSON.stringify(c.toString().slice(0, 100))); });
setTimeout(() => {
  console.log('--- escribiendo frame ---');
  p.stdin.write('frame\n');
}, 3000);
setTimeout(() => {
  console.log('--- escribiendo r/1 ---');
  p.stdin.write('r/1 0xC0A0\n');
}, 5000);
setTimeout(() => { p.kill(); process.exit(0); }, 8000);
