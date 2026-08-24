import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function dumpState(label: string) {
  const s = await d.read(0xCA00, 0x40);
  const c = await d.read(0xCC01, 2);
  const ca36 = await d.read(0xCA36, 3);
  console.log(`${label}: CA00-CA3F=[${s.map(v=>v.toString(16).padStart(2,'0')).join(' ')}] CC01-02=[${c.map(v=>v.toString(16)).join(' ')}] CA36-38=[${ca36.map(v=>v.toString(16)).join(' ')}]`);
}
// estado inicial (menú defensivo Gohan)
await d.loadstate('r31a/gohan-battle-base.ss0');
await d.frames(30, 0);
await dumpState('menu-inicial');
await d.shot('r31a/r5-0-menu.ppm');
// A en LIMIT → select
await d.frames(6, 0x01); await d.frames(50, 0);
await dumpState('tras-A-limit');
await d.shot('r31a/r5-1-limit.ppm');
// intentar confirmar con A
await d.frames(8, 0x01); await d.frames(40, 0);
await dumpState('tras-A-confirm');
await d.shot('r31a/r5-2-a.ppm');
// B para volver
await d.frames(6, 0x02); await d.frames(40, 0);
// RIGHT → JOIN
await d.frames(15, 0x10); await d.frames(40, 0);
await dumpState('tras-RIGHT-join');
await d.quit();
