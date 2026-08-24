import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
const open = async (label: string) => {
  await d.loadstate('r31a/battle-base.ss0');
  await d.frames(30, 0);
  await d.frames(8, 0x20); await d.frames(40, 0);
  await d.frames(6, 0x01); await d.frames(50, 0);
  await d.shot(`r31a/jk-${label}-pre.ppm`);
};
await open('start'); await d.frames(8, 0x08); await d.frames(50, 0); await d.shot('r31a/jk-start.ppm');
await open('sel');   await d.frames(8, 0x04); await d.frames(50, 0); await d.shot('r31a/jk-sel.ppm');
await open('b');     await d.frames(8, 0x02); await d.frames(50, 0); await d.shot('r31a/jk-b.ppm');
await open('a2');    await d.frames(8, 0x01); await d.frames(50, 0); await d.shot('r31a/jk-a2.ppm');
await open('right'); await d.frames(8, 0x10); await d.frames(50, 0); await d.shot('r31a/jk-right.ppm');
await d.quit();
