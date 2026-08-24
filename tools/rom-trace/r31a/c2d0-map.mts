import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const [card, label] of [[1, 'stage1-CONF'], [29, 'tail-CONF'], [10, 'masenko-X'], [12, 'kame-X'], [57, 'pc-X'], [124, 'shock-X']] as const) {
  await d.loadstate('r31a/gohan-offense-base.ss0');
  await d.frames(5, 0);
  await d.write(0xCB41, card);
  await d.frames(15, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(8, 0x01);
  await d.frames(15, 0);
  const r = await d.read(0xC2D0, 3);
  const st = await d.state();
  console.log(`${label} (${String(card).padStart(2)}): C2D0-C2D2=[${r.map(v=>v.toString(16)).join(' ')}] C0A0=${(st.C0A0??0).toString(16)}`);
}
await d.quit();
