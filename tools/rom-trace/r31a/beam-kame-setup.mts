import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// Replica de tail-setup.mts, pero con Kamehameha (card 12 = 0x0C) en hand[0].
// 1) desde gohan-battle-base: defender con GUARD
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x10); await d.frames(40, 0); // RIGHT → JOIN
await d.frames(8, 0x10); await d.frames(40, 0); // RIGHT → BASIC
await d.frames(6, 0x01); await d.frames(50, 0); // A → GUARD
await d.frames(6, 0x01); await d.frames(50, 0); // A → confirmar
// 2) avanzar hasta menú ofensivo (C0A0==6 tras ver otros estados)
let s = await d.state();
const seen = new Set<number>();
for (let f = 0; f < 900; f++) {
  await d.frames(15, 0);
  s = await d.state();
  const c = s.C0A0 ?? 0;
  seen.add(c);
  if (c === 6 && seen.size > 2 && f > 30) break;
}
await d.shot('r31a/bk-1-offense.ppm');
// 3) parchear en PAUSA: hand[0]=12 (Kamehameha), CC=30
const h0 = (await d.read(0xCB41, 1))[0];
const cc0 = (await d.read(0xCA3E, 1))[0];
await d.write(0xCB41, 12);
await d.write(0xCA3E, 30);
console.log(`patch: hand[0] ${h0}→12, CC ${cc0}→30`);
// 4) abrir JOIN picker (RIGHT → JOIN → A)
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.shot('r31a/bk-2-kame.ppm');
const csel = await d.read(0xCC01, 1);
console.log(`0xCC01 (select)=${csel[0].toString(16)} (esperado 0c)`);
// 5) savestate kame_left_base (picker abierto en Kamehameha, pre-confirm)
await d.savestate('r31a/kame_left_base.ss0');
const st = await d.state();
console.log(`kame_left_base.ss0 guardado. C0A0=${(st.C0A0 ?? 0).toString(16)} C3C6=${(st.C3C6 ?? 0).toString(16)}`);
await d.quit();
