import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Band = { lyStart: number; lyEnd: number; scx: number; scy: number };
type Frame = { frame: number; C405: number; C406: number; C407: number; C409: number; bands: Band[] };
type Fixture = {
  schema: string;
  source: { romSha256: string; rawTraceSha256: string; cardId: number; side: string; framesCaptured: number };
  observed: { activeFrameRanges: number[][]; restoreFrames: number[]; frames: Frame[] };
};

const failures: string[] = [];
let checks = 0;
const check = (condition: boolean, message: string): void => {
  checks++;
  if (!condition) failures.push(message);
};

const load = (name: string): Fixture =>
  JSON.parse(readFileSync(resolve(`fixtures/rom-trace/${name}`), 'utf8')) as Fixture;
const common = (fixture: Fixture, label: string, cardId: number, side: string, framesCaptured: number): void => {
  check(fixture.schema === 'dbzlsw.rom.beam-scanline.v1', `${label}: schema mismatch`);
  check(fixture.source.romSha256 === 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804', `${label}: non-canonical Spain ROM`);
  check(fixture.source.rawTraceSha256.length === 64, `${label}: raw trace SHA missing`);
  check(fixture.source.cardId === cardId && fixture.source.side === side, `${label}: capture identity mismatch`);
  check(fixture.source.framesCaptured === framesCaptured, `${label}: capture length mismatch`);
  check(fixture.observed.frames.length === 96, `${label}: expected 96 active raster frames`);
};

const fixture = load('beam-kame-left-scanline.json');
common(fixture, 'Kamehameha LEFT', 12, 'LEFT', 700);
check(JSON.stringify(fixture.observed.activeFrameRanges) === JSON.stringify([[408, 487], [644, 659]]), 'Kamehameha LEFT: active ranges changed');
check(JSON.stringify(fixture.observed.restoreFrames) === JSON.stringify([488, 660]), 'Kamehameha LEFT: restore boundaries changed');

const first = fixture.observed.frames.filter(frame => frame.frame >= 408 && frame.frame <= 487);
check(first.length === 80, 'first raster window must last 80 frames');
for (const frame of first) {
  check(frame.C405 === 0xfc && frame.C406 === 0x57, `frame ${frame.frame}: selector bytes differ`);
  check(frame.C407 === 0 && frame.C409 === 0, `frame ${frame.frame}: unexpected base scroll`);
  check(JSON.stringify(frame.bands) === JSON.stringify([
    { lyStart: 33, lyEnd: 33, scx: 0, scy: 0xff },
    { lyStart: 34, lyEnd: 34, scx: 0, scy: 0xfe },
    { lyStart: 35, lyEnd: 35, scx: 0, scy: 0xfd },
    { lyStart: 36, lyEnd: 96, scx: 0x57, scy: 0xfc },
  ]), `frame ${frame.frame}: scanline bands differ`);
}

const right = load('beam-sbeam-right-scanline.json');
common(right, 'S.Beam Can. RIGHT', 17, 'RIGHT', 900);
check(JSON.stringify(right.observed.activeFrameRanges) === JSON.stringify([[324, 403], [560, 575]]), 'S.Beam Can. RIGHT: active ranges changed');
check(JSON.stringify(right.observed.restoreFrames) === JSON.stringify([404, 576]), 'S.Beam Can. RIGHT: restore boundaries changed');

const rightWindow = right.observed.frames.filter(frame => frame.frame >= 324 && frame.frame <= 403);
check(rightWindow.length === 80, 'S.Beam Can. RIGHT: first raster window must last 80 frames');
for (const frame of rightWindow) {
  check(frame.C405 === 0 && frame.C406 === 0xaf, `RIGHT frame ${frame.frame}: selector bytes differ`);
  check(frame.C407 === 0 && frame.C409 === 0, `RIGHT frame ${frame.frame}: unexpected base scroll`);
  check(JSON.stringify(frame.bands) === JSON.stringify([
    { lyStart: 32, lyEnd: 96, scx: 0xaf, scy: 0 },
  ]), `RIGHT frame ${frame.frame}: scanline bands differ`);
}

const rightTravel = right.observed.frames.filter(frame => frame.frame >= 560);
check(rightTravel.length === 16, 'S.Beam Can. RIGHT: travel raster window must last 16 frames');
for (let index = 0; index < rightTravel.length; index++) {
  const frame = rightTravel[index];
  const expectedScx = (index + 1) * 6;
  check(frame.frame === 560 + index, `RIGHT travel frame ${index}: discontinuous tick`);
  check(frame.C405 === 0 && frame.C406 === expectedScx, `RIGHT frame ${frame.frame}: travel selector differs`);
  check(JSON.stringify(frame.bands) === JSON.stringify([
    { lyStart: 32, lyEnd: 96, scx: expectedScx, scy: 0 },
  ]), `RIGHT frame ${frame.frame}: travel band differs`);
}

const travel = fixture.observed.frames.filter(frame => frame.frame >= 644);
check(travel.length === 16, 'travel raster window must last 16 frames');
for (let index = 0; index < travel.length; index++) {
  const frame = travel[index];
  const expectedScx = 250 - index * 6;
  check(frame.frame === 644 + index, `travel frame ${index}: discontinuous tick`);
  check(frame.C405 === 0 && frame.C406 === expectedScx, `frame ${frame.frame}: travel selector differs`);
  check(JSON.stringify(frame.bands) === JSON.stringify([
    { lyStart: 32, lyEnd: 96, scx: expectedScx, scy: 0 },
  ]), `frame ${frame.frame}: travel band differs`);
}

if (failures.length) {
  console.error(`FAIL — beam scanline trace: ${failures.length}/${checks}`);
  failures.forEach(failure => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`PASS — beam scanline trace: ${checks}/${checks}`);
console.log('Kamehameha LEFT: 80-frame raster window + 16-frame projectile travel + explicit restore boundaries.');
console.log('S.Beam Can. RIGHT: 80-frame raster window + mirrored 16-frame projectile travel + explicit restore boundaries.');
