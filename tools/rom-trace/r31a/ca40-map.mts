import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
for (const [card, label] of [[29, 'tail-CONF'], [12, 'kame-X'], [1, 'stage1-CONF'], [10, 'masenko-X']] as const) {
  await d.loadstate('r31a/gohan-offense-base.ss0');
  await d.frames(5, 0);
  await d.write(0xCB41, card);
  await d.frames(15, 0x10); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.frames(8, 0x01);
  await d.frames(15, 0);
  const r = await d.read(0xCA3C, 16);
  const st = await d.state();
  console.log(`${label}: CA3C=[${r.map(v=>v.toString(16).padStart(2,'0')).join(' ')}] CA40=${r[4].toString(16)} C0A0=${(st.C0A0??0).toString(16)}`);
}
await d.quit();
