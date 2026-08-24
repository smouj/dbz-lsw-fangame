import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const [load, card, label] of [
  ['r31a/gohan-offense-base.ss0', 29, 'GOHAN+tail'],
  ['r31a/gohan-offense-base.ss0', 1, 'GOHAN+stage1'],
  ['r31a/gohan-offense-base.ss0', 12, 'GOHAN+kame'],
  ['r31a/pc_left_base.ss0', null, 'JEICE+pc'],
] as const) {
  await d.loadstate(load);
  await d.frames(5, 0);
  if (card !== null) await d.write(0xCB41, card);
  await d.frames(15, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(10, 0);
  const r = await d.read(0xC2D0, 3);
  const st = await d.state();
  console.log(`${label}: pre-A C2D0-C2D2=[${r.map(v=>v.toString(16)).join(' ')}] C0A0=${(st.C0A0??0).toString(16)}`);
}
await d.quit();
