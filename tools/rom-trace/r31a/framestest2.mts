import { RomDriver } from '../nav.ts';
const d = new RomDriver(process.argv[2], process.argv[3]);
d.proc.stdout.on('data', (c: Buffer) => { process.stderr.write(`[STDOUT-CHUNK] ${JSON.stringify(c.toString())}\n`); });
const r1 = await d.cmd('frames 30 1');
process.stderr.write(`R1=${JSON.stringify(r1)}\n`);
const s = await d.cmd('state');
process.stderr.write(`S=${JSON.stringify(s)}\n`);
await d.quit();
