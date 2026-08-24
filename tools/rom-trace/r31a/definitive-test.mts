import { RomDriver } from '../nav.ts';
const [rom, sav] = process.argv.slice(2);
const d = new RomDriver(rom, sav);
// 1) Baseline: JOIN abierto sin patch → "3 Stage Atk"
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
await d.frames(8, 0x10); await d.frames(40, 0);
await d.frames(6, 0x01); await d.frames(50, 0);
await d.shot('r31a/dt-base.ppm');
// 2) TEST: patch hand[0] (CB41) = 29 ANTES de abrir → "Tail"
await d.loadstate('r31a/battle-base.ss0');
await d.frames(30, 0);
const orig = (await d.read(0xCB41, 1))[0];
await d.write(0xCB41, 29);        // ← patch en pausa
await d.frames(8, 0x10); await d.frames(40, 0);  // resume: RIGHT → JOIN
await d.frames(6, 0x01); await d.frames(50, 0);  // A → abrir mano
await d.shot('r31a/dt-tail.ppm');
const c = await d.read(0xCC01, 1);
console.log(`0xCC01 con Tail en hand[0]: ${c[0].toString(16)} (esperado 1d)`);
await d.write(0xCB41, orig);     // ← restaurar
await d.frames(20, 0);
const c2 = await d.read(0xCC01, 1);
console.log(`0xCC01 tras restaurar: ${c2[0].toString(16)} (esperado 1)`);
// 3) verificación readback
const rb = await d.read(0xCB41, 1);
console.log(`hand[0] restaurado = ${rb[0].toString(16)} (esperado ${orig.toString(16)})`);
await d.quit();
