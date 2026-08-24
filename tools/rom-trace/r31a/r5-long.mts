import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
let log = '';
async function snap(i: number) {
  const r = await d.read(0xCA00, 8);
  const c55 = await d.read(0xCA55, 4);
  const c82 = await d.read(0xCA82, 2);
  const c53 = await d.read(0xCA53, 1);
  const c7f = await d.read(0xCA7F, 1);
  const cc = await d.read(0xCA3E, 1);
  const pw = await d.read(0xCA40, 1);
  const a0 = await d.read(0xC0A0, 1);
  log += `f${String(i).padStart(4,'0')}: C0A0=${a0[0].toString(16)} CA03=${r[3].toString(16)} CC=${cc[0]} PW=${pw[0]} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] CA82-3=[${c82.map(v=>v.toString(16)).join(' ')}] CA53=${c53[0].toString(16)} CA7F=${c7f[0].toString(16)}\n`;
}
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB1D, [card]);
await d.write(0xCA40, [5]);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.frames(6, 0x01); await d.frames(10, 0x00);
for (let i = 0; i < 600; i++) { await d.frames(2, 0x00); if (i % 4 === 0) await snap(i * 2); }
await d.shot('r31a/r5-12-long.ppm');
const fs = await import('fs');
fs.writeFileSync('r31a/r5-long.log', log);
await d.quit();
