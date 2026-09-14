// verify:rom-sprite-atlas — ROM Sprite Atlas contract.
//
// The atlas is a projection of the ROM physical corpus, not a second sprite
// database.  This gate intentionally validates identity/provenance metadata;
// generated PNGs remain reproducible build output (public/assets/.../physical).
import { readFileSync } from 'node:fs';
import { ROM_FIGHTER_FORM_IDENTITY } from '../src/data/generated/romFighterFormIdentity.generated';
import { ROM_PHYSICAL_CORPUS_SUMMARY } from '../src/data/generated/romPhysicalCorpus.generated';
import { ROM_SPRITE_ATLAS_FORMS, romSpriteAtlasExport, romSpriteAtlasMetrics } from '../src/devtools/romdisplay2/romSpriteAtlas';

let checks = 0;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('═══ ROM Sprite Atlas ═══');
const source = readFileSync('src/devtools/romdisplay2/romSpriteAtlas.ts', 'utf8');
const tab = readFileSync('src/devtools/romdisplay2/spriteAtlasTab.tsx', 'utf8');
const exporter = readFileSync('scripts/build-rom-sprite-atlas.ts', 'utf8');

const metrics = romSpriteAtlasMetrics();
const allFrames = ROM_SPRITE_ATLAS_FORMS.flatMap(form => form.frames);

check('forms represented from ROM identity', metrics.forms === ROM_FIGHTER_FORM_IDENTITY.length && metrics.forms === 48, `${metrics.forms}/48`);
check('physical frame catalog non-empty', metrics.physicalFrames === ROM_PHYSICAL_CORPUS_SUMMARY.totals.fighterPhysicalIdentities, `${metrics.physicalFrames} fighter physical identities`);
check('ROM physical corpus is the source of truth', /ROM_PHYSICAL_CORPUS_SUMMARY/.test(source) && /ROM_FIGHTER_FORM_IDENTITY/.test(source), 'no parallel sprite source');
check('no manual/external image authority', !/https?:\/\/|sprites-source|Canonical_Frames_Official/.test(source + tab), 'only local ROM materializations');
check('physical atlas and animation map views present', /PHYSICAL ATLAS/.test(tab) && /ANIMATION MAP/.test(tab), 'both projections available');
check('ROM palette inspection modes are explicit', /ROM PALETTE/.test(tab) && /RAW 2BPP/.test(tab) && /GRAYSCALE/.test(tab) && /rawImageFile/.test(source + tab), 'ROM/RAW/grayscale are display-only projections');
check('provenance inspector present', /metasprite hash/.test(tab) && /graphics hash/.test(tab) && /sourceProvenanceHash/.test(tab), 'identity hashes are inspectable');
check('deterministic JSON export present', /romSpriteAtlasExport/.test(tab) && /DOWNLOAD ATLAS\.JSON/.test(tab), 'export derives from the same model');
check('filesystem atlas exporter present', /ROM_SPRITE_ATLAS_FORMS/.test(exporter) && /atlas\.json/.test(exporter) && /atlas\.png/.test(exporter) && /frames/.test(exporter), 'atlas.json + atlas.png + frames/');
check('exporter keeps missing materialization explicit', /materialized/.test(exporter) && /missing/.test(exporter), 'no synthetic image on missing source');

const duplicateIds: string[] = [];
let broken = 0;
let unresolved = 0;
let bankMismatches = 0;
for (const form of ROM_SPRITE_ATLAS_FORMS) {
  const ids = new Set<string>();
  const identity = ROM_FIGHTER_FORM_IDENTITY.find(row => row.formId === form.formId);
  for (const frame of form.frames) {
    if (ids.has(frame.physicalId)) duplicateIds.push(`${form.formId}:${frame.physicalId}`);
    ids.add(frame.physicalId);
    const validHashes = [frame.metaspriteHash, frame.graphicsHash, frame.sourceProvenanceHash, frame.trimmedPixelHash].every(hash => hash && hash !== '—');
    const validFile = frame.file.startsWith('physical/') && frame.file.endsWith('.png');
    const validVFID = Number.isInteger(frame.visualFrameId) && frame.visualFrameId >= 0;
    if (!frame.physicalId.startsWith('rom-p') || !validFile || !validHashes || !validVFID) broken++;
    if (frame.source !== 'ROM_PHYSICAL') unresolved++;
    if (!identity || frame.actorVisualProfileKey !== identity.actorVisualProfileKey || frame.graphicsBank !== identity.graphicsBank) bankMismatches++;
  }
}
check('physicalId unique per form', duplicateIds.length === 0, duplicateIds.length ? duplicateIds.slice(0, 3).join(', ') : `${metrics.physicalFrames} entries`);
check('metasprite/graphics/pixel provenance complete', broken === 0, `${broken} broken`);
check('form → profile/bank identity matches ROM', bankMismatches === 0, `${bankMismatches} mismatches`);
check('visualFrameId and physical file resolved', unresolved === 0, `${unresolved} unresolved`);
check('no empty rendered identity', metrics.brokenFrames === 0, `${metrics.brokenFrames} broken`);
check('export stable across repeated serialization', ROM_SPRITE_ATLAS_FORMS.every(form => JSON.stringify(romSpriteAtlasExport(form)) === JSON.stringify(romSpriteAtlasExport(form))), 'deterministic');
check('mapped usage data comes from ROM animation catalog', metrics.mappedUsages > 0 && /animationResourceById/.test(source), `${metrics.mappedUsages} mapped usages`);

console.log(`\nMetrics: Forms ${metrics.forms} · Physical frames ${metrics.physicalFrames} · Unique rendered frames ${metrics.uniqueRenderedFrames} · Duplicate aliases ${metrics.duplicateAliases} · Mapped usages ${metrics.mappedUsages} · Palettes ${metrics.palettes} · Broken frames ${metrics.brokenFrames} · Unresolved ${metrics.unresolved}`);
console.log(`\nROM Sprite Atlas: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:rom-sprite-atlas FAIL' : '✅ verify:rom-sprite-atlas PASS');
process.exit(failures ? 1 : 0);
