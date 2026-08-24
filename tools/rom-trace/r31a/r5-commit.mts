import { RomDriver } from '../nav.ts';
const [rom, sav, cardId] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const card = parseInt(cardId || '19', 16);
async function dump(label: string) {
  const s = await d.read(0xCA00, 8);
  const cc = await d.read(0xCA3E, 1);
  const c55 = await d.read(0xCA55, 4);
  const c82 = await d.read(0xCA82, 2);
  const c2 = await d.read(0xC2D0, 2);
  const cc01 = await d.read(0xCC01, 1);
  console.log(`${label}: CA03=${s[3].toString(16)} CA07=${s[7].toString(16)} CC=${cc[0]} CA55-58=[${c55.map(v=>v.toString(16)).join(' ')}] CA82-3=[${c82.map(v=>v.toString(16)).join(' ')}] C2D0-1=[${c2.map(v=>v.toString(16)).join(' ')}] CC01=${cc01[0].toString(16)}`);
}
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(20, 0);
// parchear limit[0] del bloque jugador (0xCB1D) con la carta + CC alto (30) para eliminar el gate de CC
await d.write(0xCB1D, [card]);
await d.write(0xCA3E, [30]);
await dump('parcheado');
// A en LIMIT → select
await d.frames(6, 0x01); await d.frames(50, 0);
await dump('select');
await d.shot('r31a/r5-3-select.ppm');
// A para confirmar
await d.frames(6, 0x01); await d.frames(60, 0);
await dump('A-confirm');
// esperar la secuencia
await d.frames(120, 0);
await dump('+120f');
await d.shot('r31a/r5-4-after.ppm');
await d.quit();
