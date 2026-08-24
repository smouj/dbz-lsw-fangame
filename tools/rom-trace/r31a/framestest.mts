import { RomDriver } from '../nav.ts';
const d = new RomDriver(process.argv[2], process.argv[3]);
const r1 = await d.cmd('frames 30 1');
console.log('FRAMES RAW:', JSON.stringify(r1));
const s = await d.cmd('state');
console.log('STATE RAW:', JSON.stringify(s));
await d.quit();
