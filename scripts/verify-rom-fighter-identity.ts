// ═══════════════════════════════════════════════════════════════════════
// P0 — ROM fighter identity verifier.
// This is not a palette arithmetic check. It verifies raw Bank11 form records,
// Golden form separation, strong physical identity keys, and no weak cache
// patterns that can mix characters/frames.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ROM_FIGHTER_FORM_IDENTITY, ROM_FIGHTER_FORM_IDENTITY_META } from '../src/data/generated/romFighterFormIdentity.generated';

const ROOT = process.cwd();
const BUILDER = resolve(ROOT, 'scripts/build-rom-physical-corpus.ts');
const RENDERER = resolve(ROOT, 'tools/rom-research/scripts/render-fighter-physical.ts');
const RESOLVER = resolve(ROOT, 'src/battle/productionFrameResolver.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function row(formId: string) {
  return ROM_FIGHTER_FORM_IDENTITY.find(item => item.formId === formId);
}

check('identity table 48/48', ROM_FIGHTER_FORM_IDENTITY.length === 48, `${ROM_FIGHTER_FORM_IDENTITY.length}/48`);
check('identity table pinned to ROM SHA', ROM_FIGHTER_FORM_IDENTITY_META.romSha256 === 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804');
check('all rows source actor profile from raw Bank11 byte+1', ROM_FIGHTER_FORM_IDENTITY.every(item => item.rawRecord[1] === item.actorVisualProfileKey));
check('all rows graphicsBank == $31 + actorVisualProfileKey', ROM_FIGHTER_FORM_IDENTITY.every(item => item.graphicsBank === 0x31 + item.actorVisualProfileKey));
check('all rows paletteIndex == actorVisualProfileKey', ROM_FIGHTER_FORM_IDENTITY.every(item => item.paletteIndex === item.actorVisualProfileKey));
check('all rows profile source matches raw record', ROM_FIGHTER_FORM_IDENTITY.every(item => item.profileSourceMatchesRecord));

const highProfileForms = ['buu_gotenks', 'buu_gohan', 'buu_kid', 'ginyu_goku', 'gotenks_ssj', 'gotenks_ssj3', 'vegito_ssj'] as const;

check('0 UNVERIFIED_PHYSICAL identity rows', ROM_FIGHTER_FORM_IDENTITY.every(item => item.mappingStatus !== 'UNVERIFIED_PHYSICAL'), ROM_FIGHTER_FORM_IDENTITY.filter(item => item.mappingStatus === 'UNVERIFIED_PHYSICAL').map(item => item.formId).join(', ') || 'none');
check('all high-profile rows have independent identity closure', highProfileForms.every(formId => {
  const item = row(formId);
  return !!item &&
    item.mappingStatus === 'ROM_IDENTITY_VERIFIED' &&
    item.identityClosure?.priorStatus === 'UNVERIFIED_PHYSICAL' &&
    item.evidence.includes('CARD_COMPATIBILITY_CONSUMERS') &&
    item.evidence.includes('ROSTER_CHARACTER_FORM_GROUP') &&
    item.compatibleCardConsumers.length > 0 &&
    item.neighborRecords.length > 0;
}), highProfileForms.map(formId => `${formId}:${row(formId)?.mappingStatus ?? 'missing'}`).join(', '));

const gokuBase = row('goku_base');
const gokuSsj = row('goku_ssj');
const gokuSsj2 = row('goku_ssj2');
const gokuSsj3 = row('goku_ssj3');
const krillin = row('krillin_base');
const vegito = row('vegito_ssj');
const piccolo = row('piccolo_base');
const android16 = row('android_16');
const cellPerfect = row('cell_perfect');
const buu = row('buu_base');

check('Golden exists: Goku Base/SSJ/SSJ2/SSJ3', !!gokuBase && !!gokuSsj && !!gokuSsj2 && !!gokuSsj3);
check('Goku Base raw ROM record is form $08/profile $05', gokuBase?.romFormId === 8 && gokuBase.actorVisualProfileKey === 0x05, `form=${gokuBase?.romFormId} profile=${gokuBase?.actorVisualProfileKey}`);
check('Goku SSJ raw ROM record is form $09/profile $06', gokuSsj?.romFormId === 9 && gokuSsj.actorVisualProfileKey === 0x06, `form=${gokuSsj?.romFormId} profile=${gokuSsj?.actorVisualProfileKey}`);
check('Goku four forms are distinct ROM records', new Set([gokuBase?.romFormId, gokuSsj?.romFormId, gokuSsj2?.romFormId, gokuSsj3?.romFormId]).size === 4);
check('Goku four forms are distinct physical profiles', new Set([gokuBase?.actorVisualProfileKey, gokuSsj?.actorVisualProfileKey, gokuSsj2?.actorVisualProfileKey, gokuSsj3?.actorVisualProfileKey]).size === 4);
check('Krillin raw ROM record is not Goku', !!krillin && !!gokuBase && krillin.actorVisualProfileKey !== gokuBase.actorVisualProfileKey && krillin.graphicsBank !== gokuBase.graphicsBank, `krillin=${krillin?.actorVisualProfileKey} goku=${gokuBase?.actorVisualProfileKey}`);
check('Vegito SSJ identity exists only as vegito_ssj runtime form', !!vegito && vegito.formId === 'vegito_ssj' && !ROM_FIGHTER_FORM_IDENTITY.some(item => item.formId === 'vegito_base'));
check('Vegito SSJ high-profile identity is ROM-closed, not legacy/base', vegito?.mappingStatus === 'ROM_IDENTITY_VERIFIED' && vegito.actorVisualProfileKey === 0x2b && vegito.graphicsBank === 0x5c && vegito.compatibleCardConsumers.some(card => card.name === 'Big Bang Atk' || card.name === 'S.Kamehameha' || card.name === 'Atomic Break'));
check('Gotenks SSJ/SSJ3 are distinct ROM profiles', row('gotenks_ssj')?.actorVisualProfileKey !== row('gotenks_ssj3')?.actorVisualProfileKey && row('gotenks_ssj')?.graphicsBank !== row('gotenks_ssj3')?.graphicsBank);
check('Buu absorbed/Kid high-profile rows are distinct ROM profiles', new Set(['buu_gotenks', 'buu_gohan', 'buu_kid'].map(formId => row(formId)?.actorVisualProfileKey)).size === 3);
check('Ginyu Goku has its own ROM profile unless future trace proves sharing', row('ginyu_goku')?.actorVisualProfileKey === 0x28 && row('ginyu_goku')?.actorVisualProfileKey !== row('goku_base')?.actorVisualProfileKey);
check('Golden controls exist', !!piccolo && !!android16 && !!cellPerfect && !!buu);

const builder = readFileSync(BUILDER, 'utf8');
const renderer = readFileSync(RENDERER, 'utf8');
const resolver = readFileSync(RESOLVER, 'utf8');

check('physicalId includes graphics bank', builder.includes('-g${hex(meta.source.bank)}-'));
check('physicalId includes metasprite hash', builder.includes('metaspriteHash'));
check('physicalId includes graphics hash', builder.includes('graphicsHash'));
check('builder rejects render/form profile mismatch', builder.includes('render profile mismatch'));
check('builder stores pieceGraphics forensic data', builder.includes('pieceGraphics'));
check('renderer reads ROM_CGB_PALETTE_TABLE SSOT', renderer.includes('ROM_CGB_PALETTE_TABLE') && !renderer.includes('romFighterPalettes.generated'));
check('renderer records graphics block hashes', renderer.includes('graphicsBlockHash') && renderer.includes('tile0Hash') && renderer.includes('tile1Hash'));
check('resolver uses generated physicalFrameIndex instead of weak formula', resolver.includes('physicalFrameFor') && !resolver.includes('function physicalId('));

const weakCachePattern = /(?:frameCache|graphicsCache)\\.get\\([^\\n]*(?:visualFrameId|resourceId)[^\\n]*\\)/;
check('no obvious weak visualFrameId/resource cache in renderer/builder/resolver', !weakCachePattern.test(`${builder}\n${renderer}\n${resolver}`));

if (failures === 0) {
  console.log(`\n✅ verify:rom-fighter-identity PASS (${ROM_FIGHTER_FORM_IDENTITY.length} identities)`);
  process.exit(0);
}
console.log(`\n❌ verify:rom-fighter-identity FAIL (${failures})`);
process.exit(1);
