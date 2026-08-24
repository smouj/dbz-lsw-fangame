import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
async function snap(i: number) {
  const r = await d.read(0xCA00, 8);
  const c55 = await d.read(0xCA55, 4);
  const c2 = await d.read(0xC2D0, 3);
  const a0 = await d.read(0xC0A0, 1);
  const pw = await d.read(0xCA40, 1);
  console.log(`f${String(i).padStart(2,'0')}: CA03=${r[3].toString(16)} CA07=${r[7].toString(16)} C0A0=${a0[0].toString(16)} PW=${pw[0]} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] C2D0-2=[${c2.map(v=>v.toString(16)).join(' ')}]`);
}
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB1D, [card]);   // limit[0] = card 83
await d.write(0xCA40, [5]);      // powerWindowCounter = 5 (Gather!)
await d.frames(6, 0x01); await d.frames(50, 0);  // abrir select LIMIT
await snap(0);
// 2ª A para confirmar
for (let i = 0; i < 45; i++) {
  await snap(i);
  if (i < 6) await d.frames(1, 0x01);
  else await d.frames(1, 0x00);
}
await d.shot('r31a/r5-9-limit-commit.ppm');
await d.quit();
