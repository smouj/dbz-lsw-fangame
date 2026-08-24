import { RomDriver } from '../nav.ts';
const d = new RomDriver(process.argv[2], process.argv[3]);
const raw = await d.cmd('state');
console.log('RAW:', JSON.stringify(raw));
const s = await d.state();
console.log('PARSED:', JSON.stringify(s));
await d.quit();
