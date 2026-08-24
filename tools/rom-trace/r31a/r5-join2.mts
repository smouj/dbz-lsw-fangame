import { RomDriver } from '../nav.ts';
const [rom, sav, cardHex] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardHex, 16);
async function snap(i: number, label: string) {
  const r = await d.read(0xCA00, 8);
  const c55 = await d.read(0xCA55, 4);
  const c2 = await d.read(0xC2D0, 3);
  const a0 = await d.read(0xC0A0, 1);
  console.log(`${label} f${String(i).padStart(2,'0')}: CA03=${r[3].toString(16)} CA07=${r[7].toString(16)} C0A0=${a0[0].toString(16)} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] C2D0-2=[${c2.map(v=>v.toString(16)).join(' ')}]`);
}
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
await d.write(0xCB41, [card]);          // hand[0] = card 83
await d.frames(15, 0x10); await d.frames(40, 0);  // RIGHT → JOIN
await snap(0, 'menu-join');
await d.frames(6, 0x01); await d.frames(40, 0);   // A abrir picker
await snap(0, 'picker');
// 2ª A para confirmar
for (let i = 0; i < 50; i++) {
  await snap(i, 'A2');
  if (i < 6) await d.frames(1, 0x01);
  else await d.frames(1, 0x00);
}
await d.shot('r31a/r5-8-join2.ppm');
await d.quit();
