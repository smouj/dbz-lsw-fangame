import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Band = { lyStart: number; lyEnd: number; scx: number; scy: number };
type Frame = { frame: number; C405: number; C406: number; C407: number; C409: number; bands: Band[] };
type Fixture = {
  schema: string;
  source: { romSha256: string; rawTraceSha256: string; cardId: number; side: string; framesCaptured: number };
  observed: { activeFrameRanges: number[][]; restoreFrames: number[]; frames: Frame[] };
};

const fixture = JSON.parse(readFileSync(resolve('fixtures/rom-trace/beam-kame-left-scanline.json'), 'utf8')) as Fixture;
const failures: string[] = [];
let checks = 0;
const check = (condition: boolean, message: string): void => {
  checks++;
  if (!condition) failures.push(message);
};

check(fixture.schema === 'dbzlsw.rom.beam-scanline.v1', 'schema mismatch');
check(fixture.source.romSha256 === 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804', 'non-canonical Spain ROM');
check(fixture.source.rawTraceSha256.length === 64, 'raw trace SHA missing');
check(fixture.source.cardId === 12 && fixture.source.side === 'LEFT', 'capture identity mismatch');
check(fixture.source.framesCaptured === 700, 'capture length mismatch');
check(JSON.stringify(fixture.observed.activeFrameRanges) === JSON.stringify([[408, 487], [644, 659]]), 'active ranges changed');
check(JSON.stringify(fixture.observed.restoreFrames) === JSON.stringify([488, 660]), 'restore boundaries changed');
check(fixture.observed.frames.length === 96, 'expected 96 active raster frames');

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
