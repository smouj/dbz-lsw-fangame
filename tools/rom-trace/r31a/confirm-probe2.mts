import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
async function tryConfirm(load: string, patch: number | null, label: string) {
  await d.loadstate(load);
  await d.frames(5, 0);
  if (patch !== null) await d.write(0xCB41, patch);
  await d.frames(8, 0x10); await d.frames(40, 0); // JOIN
  await d.frames(6, 0x01); await d.frames(50, 0); // A → picker
  const sel = (await d.read(0xCC01, 1))[0];
  await d.frames(8, 0x01); // A → confirmar
  let result = 'stuck(5)';
  for (let i = 0; i < 12; i++) {
    await d.frames(10, 0);
    const st = await d.state();
    const c = st.C0A0 ?? 0;
    if (c !== 5) { result = `C0A0=${c.toString(16)}`; break; }
  }
  console.log(`${label}: select=${sel.toString(16)} → ${result}`);
}
// Jeice con su carta natural (124)
await tryConfirm('r31a/jeice-offense-base.ss0', null, 'jeice-natural');
// Jeice con 57
await tryConfirm('r31a/jeice-offense-base.ss0', 57, 'jeice-pc57');
// Gohan con 57 (compatibilidad?)
await tryConfirm('r31a/gohan-offense-base.ss0', 57, 'gohan-pc57');
// Jeice con 29 (Tail — incompatible)
await tryConfirm('r31a/jeice-offense-base.ss0', 29, 'jeice-tail29');
await d.quit();
