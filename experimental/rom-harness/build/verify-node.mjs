// verify-node.mjs — smoke test headless del harness H0 (sin navegador).
// Prueba: ROM load + frame step + framebuffer + read8 + direct access + input + save/load state.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import createSameBoyHarness from './out/sameboy_harness.mjs';

const ROM_PATH = process.env.ROM_PATH
  || 'rom-research/13_raw_rom/dbz-lsw-spain.gbc';
const SPAIN_SHA = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const Module = await createSameBoyHarness();

// ---- ROM hash ----
const rom = new Uint8Array(readFileSync(ROM_PATH));
const sha = createHash('sha256').update(Buffer.from(rom)).digest('hex');
check('ROM LOAD (hash canónico)', sha === SPAIN_SHA, `sha=${sha.slice(0, 12)}…`);

// ---- init ----
const initRc = Module._harness_init();
check('WASM CORE (init, CGB_E)', initRc === 0, `rc=${initRc}`);

// ---- load ROM into core ----
const romPtr = Module._malloc(rom.length);
Module.HEAPU8.set(rom, romPtr);
const loadRc = Module._harness_load_rom(romPtr, rom.length);
Module._free(romPtr);
check('ROM LOAD (into core)', loadRc === 0, `rc=${loadRc}`);

// ---- frame step ----
let elapsed = 0;
for (let i = 0; i < 60; i++) elapsed += Number(Module._harness_run_frame());
check('FRAME STEP (60×GB_run_frame)', elapsed > 0, `elapsedNs=${elapsed}`);

// ---- framebuffer ----
const pxPtr = Module._harness_get_pixels();
const px = Module.HEAPU32.subarray(pxPtr / 4, pxPtr / 4 + 160 * 144);
let nonzero = 0;
for (let i = 0; i < px.length; i++) if (px[i] !== 0) nonzero++;
check('FRAMEBUFFER (non-blank)', nonzero > 0, `nonzero=${nonzero}/${px.length}`);

// ---- read8 CPU-semántico ----
const scy = Module._harness_read8(0xFF42);
const scx = Module._harness_read8(0xFF43);
const wram0 = Module._harness_read8(0xC000);
check('CPU read8 (SCY/SCX/WRAM)', true, `SCY=0x${scy.toString(16).padStart(2, '0')} SCX=0x${scx.toString(16).padStart(2, '0')} WRAM[0xC000]=0x${wram0.toString(16).padStart(2, '0')}`);

// ---- direct access WRAM ----
const sizePtr = Module._malloc(4);
const bankPtr = Module._malloc(2);
const wramDirect = Module._harness_direct_access(1 /* GB_DIRECT_ACCESS_RAM */, sizePtr, bankPtr);
const wramSize = Module.getValue(sizePtr, 'i32');
const wramBank = Module.getValue(bankPtr, 'i16');
check('DIRECT WRAM ACCESS', wramDirect !== 0 && wramSize > 0, `ptr=0x${wramDirect.toString(16)} size=${wramSize} bank=${wramBank}`);

// ---- direct access VRAM / OAM / IO (probar que existen) ----
for (const [name, code] of [['VRAM', 3], ['OAM', 7], ['IO', 5], ['HRAM', 4]]) {
  const p = Module._harness_direct_access(code, sizePtr, bankPtr);
  const sz = Module.getValue(sizePtr, 'i32');
  check(`DIRECT ${name} ACCESS`, p !== 0 && sz > 0, `ptr=0x${p.toString(16)} size=${sz}`);
}

// ---- consistencia direct-vs-CPU (SCX/SCY vía IO directo) ----
const ioDirect = Module._harness_direct_access(5 /* IO */, sizePtr, bankPtr);
if (ioDirect !== 0) {
  const ioScx = Module.HEAPU8[ioDirect + 0x43];
  const ioScy = Module.HEAPU8[ioDirect + 0x42];
  check('sample consistency (SCX/SCY direct vs CPU)', ioScx === scx && ioScy === scy,
    `direct SCX=0x${ioScx.toString(16)}/CPU=${scx.toString(16)} SCY=0x${ioScy.toString(16)}/CPU=${scy.toString(16)}`);
} else {
  check('sample consistency (SCX/SCY direct vs CPU)', false, 'no IO directo');
}
Module._free(sizePtr); Module._free(bankPtr);

// ---- input (joypad) — soft check: no crash + JOYP legible ----
Module._harness_set_key(4 /* A */, 1);
Module._harness_run_frame();
const joyp = Module._harness_read8(0xFF00);
Module._harness_set_key(4, 0);
check('INPUT (GB_set_key_state)', true, `JOYP=0x${(joyp & 0xff).toString(16).padStart(2, '0')} (A pulsado, no crash)`);

// ---- save state ----
const ssSize = Module._harness_save_state_size();
check('SAVE STATE (size)', ssSize > 0, `size=${ssSize}`);
const ssPtr = Module._malloc(ssSize);
const ssWritten = Module._harness_save_state(ssPtr, ssSize);
check('SAVE STATE (write)', ssWritten > 0, `written=${ssWritten}`);

// snapshot A (probe addresses: WRAM + SCY/SCX/LY)
const probeAddrs = [0xC000, 0xC001, 0xFF42, 0xFF43, 0xFF44];
const probeA = probeAddrs.map(a => Module._harness_read8(a));

// advance 120 frames
for (let i = 0; i < 120; i++) Module._harness_run_frame();

// load state A
const loadRc2 = Module._harness_load_state(ssPtr, ssSize);
const probeA2 = probeAddrs.map(a => Module._harness_read8(a));
const restoreOk = probeA.every((v, i) => v === probeA2[i]);
check('LOAD STATE + A==A\'', loadRc2 === 0 && restoreOk,
  `rc=${loadRc2} A=[${probeA.join(',')}] A'=[${probeA2.join(',')}]`);

// ---- determinismo Z1 == Z2 (input script) ----
function runScript(key, frames) {
  Module._harness_set_key(key, 1);
  for (let i = 0; i < frames; i++) Module._harness_run_frame();
  Module._harness_set_key(key, 0);
  return [Module._harness_read8(0xC000), Module._harness_read8(0xFF42), Module._harness_read8(0xFF43)];
}
// re-save current state A (estamos en A tras restore)
const ss2Ptr = Module._malloc(ssSize);
Module._harness_save_state(ss2Ptr, ssSize);
const z1 = runScript(5 /* B */, 60);
Module._harness_load_state(ss2Ptr, ssSize);
const z2 = runScript(5 /* B */, 60);
const zOk = z1.every((v, i) => v === z2[i]);
check('DETERMINISTIC RESTORE (Z1==Z2, input script B×60)', zOk, `Z1=[${z1.join(',')}] Z2=[${z2.join(',')}]`);
Module._free(ss2Ptr);
Module._free(ssPtr);

// ---- battery ----
const battSize = Module._harness_battery_size();
check('BATTERY (size)', battSize > 0, `size=${battSize}`);

Module._harness_free();

const passed = results.filter(r => r.ok).length;
console.log(`\n=== ${passed}/${results.length} checks PASS ===`);
process.exit(passed === results.length ? 0 : 1);
