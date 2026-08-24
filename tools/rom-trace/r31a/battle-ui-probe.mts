import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
const shot = async (l: string) => { await d.shot(`r31a/bui-${l}.ppm`); };
await shot('start');
for (const [k, name] of [[0x20,'left'],[0x10,'right'],[0x40,'up'],[0x80,'down']] as const) {
  await d.frames(8, k); await d.frames(40, 0); await shot(name);
}
await d.frames(8, 0x01); await d.frames(60, 0); await shot('a');
await d.frames(8, 0x02); await d.frames(60, 0); await shot('b');
await d.quit();
