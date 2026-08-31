// ═══════════════════════════════════════════════════════════════════════
// P0 — ROM fighter identity verifier.
// This is not a palette arithmetic check. It verifies raw Bank11 form records,
// Golden form separation, strong physical identity keys, and no weak cache
// patterns that can mix characters/frames.
// ═══════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ROM_FIGHTER_FORM_IDENTITY, ROM_FIGHTER_FORM_IDENTITY_META } from '../src/data/generated/romFighterFormIdentity.generated';

const ROOT = process.cwd();
const BUILDER = resolve(ROOT, 'scripts/build-rom-physical-corpus.ts');
const RENDERER = resolve(ROOT, 'tools/rom-research/scripts/render-fighter-physical.ts');
const RESOLVER = resolve(ROOT, 'src/battle/productionFrameResolver.ts');
const ROSTER = resolve(ROOT, 'src/data/roster.ts');
const CHARACTER_STUDIO = resolve(ROOT, 'src/devtools/characters.tsx');
const EXPORT_ROM_FIGHTERS = resolve(ROOT, 'scripts/export-rom-fighter-assets.ts');
const FORM_DECODE_TABLE = resolve(ROOT, 'docs/rom/generated/fighters/form_identity_48.json');
const FIGHTER_IDENTITY_AUDIT = resolve(ROOT, 'docs/rom/generated/fighters/P0_FIGHTER_IDENTITY_AUDIT.md');
const IDENTITY_DECODE_DOC = resolve(ROOT, 'docs/rom/generated/fighters/P0_IDENTITY_DECODE.md');
const REQUIRE_ROM_FIGHTER_IDENTITY_DOCS = process.env.REQUIRE_ROM_FIGHTER_IDENTITY_DOCS === '1';

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

const romFormOracle: Array<{ formId: string; romFormId: number; actorVisualProfileKey: number; graphicsBank: number }> = [
  { formId: 'gohan_young', romFormId: 1, actorVisualProfileKey: 0x00, graphicsBank: 0x31 },
  { formId: 'gohan_young_ssj', romFormId: 2, actorVisualProfileKey: 0x01, graphicsBank: 0x32 },
  { formId: 'gohan_young_ssj2', romFormId: 3, actorVisualProfileKey: 0x02, graphicsBank: 0x33 },
  { formId: 'piccolo_evil', romFormId: 4, actorVisualProfileKey: 0x03, graphicsBank: 0x34 },
  { formId: 'piccolo_base', romFormId: 5, actorVisualProfileKey: 0x03, graphicsBank: 0x34 },
  { formId: 'piccolo_kami', romFormId: 6, actorVisualProfileKey: 0x03, graphicsBank: 0x34 },
  { formId: 'krillin_base', romFormId: 7, actorVisualProfileKey: 0x04, graphicsBank: 0x35 },
  { formId: 'goku_base', romFormId: 8, actorVisualProfileKey: 0x05, graphicsBank: 0x36 },
  { formId: 'goku_ssj', romFormId: 9, actorVisualProfileKey: 0x06, graphicsBank: 0x37 },
  { formId: 'goku_ssj2', romFormId: 10, actorVisualProfileKey: 0x07, graphicsBank: 0x38 },
  { formId: 'goku_ssj3', romFormId: 11, actorVisualProfileKey: 0x08, graphicsBank: 0x39 },
  { formId: 'vegeta_base', romFormId: 12, actorVisualProfileKey: 0x09, graphicsBank: 0x3a },
  { formId: 'vegeta_ssj', romFormId: 13, actorVisualProfileKey: 0x0a, graphicsBank: 0x3b },
  { formId: 'vegeta_majin', romFormId: 14, actorVisualProfileKey: 0x0a, graphicsBank: 0x3b },
  { formId: 'gohan_adult_ssj', romFormId: 15, actorVisualProfileKey: 0x0c, graphicsBank: 0x3d },
  { formId: 'gohan_adult_ssj2', romFormId: 16, actorVisualProfileKey: 0x0c, graphicsBank: 0x3d },
  { formId: 'gohan_adult_ultimate', romFormId: 17, actorVisualProfileKey: 0x0b, graphicsBank: 0x3c },
  { formId: 'trunks_future', romFormId: 18, actorVisualProfileKey: 0x0d, graphicsBank: 0x3e },
  { formId: 'trunks_ssj', romFormId: 19, actorVisualProfileKey: 0x0e, graphicsBank: 0x3f },
  { formId: 'goten_base', romFormId: 20, actorVisualProfileKey: 0x0f, graphicsBank: 0x40 },
  { formId: 'goten_ssj', romFormId: 21, actorVisualProfileKey: 0x10, graphicsBank: 0x41 },
  { formId: 'trunks_kid', romFormId: 22, actorVisualProfileKey: 0x11, graphicsBank: 0x42 },
  { formId: 'trunks_kid_ssj', romFormId: 23, actorVisualProfileKey: 0x12, graphicsBank: 0x43 },
  { formId: 'gotenks_ssj', romFormId: 24, actorVisualProfileKey: 0x13, graphicsBank: 0x44 },
  { formId: 'gotenks_ssj3', romFormId: 25, actorVisualProfileKey: 0x14, graphicsBank: 0x45 },
  { formId: 'vegito_ssj', romFormId: 26, actorVisualProfileKey: 0x15, graphicsBank: 0x46 },
  { formId: 'nappa', romFormId: 27, actorVisualProfileKey: 0x16, graphicsBank: 0x47 },
  { formId: 'guldo', romFormId: 28, actorVisualProfileKey: 0x17, graphicsBank: 0x48 },
  { formId: 'recoome', romFormId: 29, actorVisualProfileKey: 0x18, graphicsBank: 0x49 },
  { formId: 'jeice', romFormId: 30, actorVisualProfileKey: 0x19, graphicsBank: 0x4a },
  { formId: 'burter', romFormId: 31, actorVisualProfileKey: 0x1a, graphicsBank: 0x4b },
  { formId: 'ginyu', romFormId: 32, actorVisualProfileKey: 0x1b, graphicsBank: 0x4c },
  { formId: 'frieza_final', romFormId: 33, actorVisualProfileKey: 0x1c, graphicsBank: 0x4d },
  { formId: 'android_16', romFormId: 34, actorVisualProfileKey: 0x1d, graphicsBank: 0x4e },
  { formId: 'android_17', romFormId: 35, actorVisualProfileKey: 0x1e, graphicsBank: 0x4f },
  { formId: 'android_18', romFormId: 36, actorVisualProfileKey: 0x1f, graphicsBank: 0x50 },
  { formId: 'android_19', romFormId: 37, actorVisualProfileKey: 0x20, graphicsBank: 0x51 },
  { formId: 'android_20', romFormId: 38, actorVisualProfileKey: 0x21, graphicsBank: 0x52 },
  { formId: 'cell_imperfect', romFormId: 39, actorVisualProfileKey: 0x22, graphicsBank: 0x53 },
  { formId: 'cell_semi', romFormId: 40, actorVisualProfileKey: 0x23, graphicsBank: 0x54 },
  { formId: 'cell_perfect', romFormId: 41, actorVisualProfileKey: 0x24, graphicsBank: 0x55 },
  { formId: 'cell_jr', romFormId: 42, actorVisualProfileKey: 0x25, graphicsBank: 0x56 },
  { formId: 'buu_base', romFormId: 43, actorVisualProfileKey: 0x26, graphicsBank: 0x57 },
  { formId: 'buu_super', romFormId: 44, actorVisualProfileKey: 0x27, graphicsBank: 0x58 },
  { formId: 'buu_gotenks', romFormId: 45, actorVisualProfileKey: 0x28, graphicsBank: 0x59 },
  { formId: 'buu_gohan', romFormId: 46, actorVisualProfileKey: 0x29, graphicsBank: 0x5a },
  { formId: 'buu_kid', romFormId: 47, actorVisualProfileKey: 0x2a, graphicsBank: 0x5b },
  { formId: 'ginyu_goku', romFormId: 48, actorVisualProfileKey: 0x2b, graphicsBank: 0x5c },
];

check('full Char Form Data/Bank11 oracle has 48 unique rows',
  romFormOracle.length === 48 &&
  new Set(romFormOracle.map(item => item.formId)).size === 48 &&
  new Set(romFormOracle.map(item => item.romFormId)).size === 48);
check('all 48 rows match Char Form Data/Bank11 oracle', romFormOracle.every(oracle => {
  const item = row(oracle.formId);
  return !!item &&
    item.romFormId === oracle.romFormId &&
    item.actorVisualProfileKey === oracle.actorVisualProfileKey &&
    item.graphicsBank === oracle.graphicsBank &&
    item.paletteIndex === oracle.actorVisualProfileKey;
}), romFormOracle
  .filter(oracle => {
    const item = row(oracle.formId);
    return !item ||
      item.romFormId !== oracle.romFormId ||
      item.actorVisualProfileKey !== oracle.actorVisualProfileKey ||
      item.graphicsBank !== oracle.graphicsBank ||
      item.paletteIndex !== oracle.actorVisualProfileKey;
  })
  .map(oracle => {
    const item = row(oracle.formId);
    return `${oracle.formId}: expected f$${oracle.romFormId.toString(16).padStart(2, '0')}/p$${oracle.actorVisualProfileKey.toString(16).padStart(2, '0')}/g$${oracle.graphicsBank.toString(16).padStart(2, '0')}, got f$${item?.romFormId.toString(16).padStart(2, '0') ?? '??'}/p$${item?.actorVisualProfileKey.toString(16).padStart(2, '0') ?? '??'}/g$${item?.graphicsBank.toString(16).padStart(2, '0') ?? '??'}`;
  }).join(' | ') || 'none');

type DecodeRow = {
  formId?: string;
  projectForm?: string;
  romFormId: number;
  actorVisualProfileKey?: number;
  graphicsBank?: number;
};
const docsPresent = [FORM_DECODE_TABLE, FIGHTER_IDENTITY_AUDIT, IDENTITY_DECODE_DOC].every(path => existsSync(path));
let decodeRows: DecodeRow[] = [];
if (docsPresent) {
  decodeRows = JSON.parse(readFileSync(FORM_DECODE_TABLE, 'utf8')) as DecodeRow[];
  check('form_identity_48.json has 48 ROM-order rows', decodeRows.length === 48, `${decodeRows.length}/48`);
  check('form_identity_48.json matches current 48/48 oracle', romFormOracle.every(oracle => {
    const item = decodeRows.find(row => (row.formId ?? row.projectForm) === oracle.formId);
    return !!item &&
      item.romFormId === oracle.romFormId &&
      item.actorVisualProfileKey === oracle.actorVisualProfileKey &&
      item.graphicsBank === oracle.graphicsBank;
  }), romFormOracle
    .filter(oracle => {
      const item = decodeRows.find(row => (row.formId ?? row.projectForm) === oracle.formId);
      return !item ||
        item.romFormId !== oracle.romFormId ||
        item.actorVisualProfileKey !== oracle.actorVisualProfileKey ||
        item.graphicsBank !== oracle.graphicsBank;
    })
    .map(oracle => {
      const item = decodeRows.find(row => (row.formId ?? row.projectForm) === oracle.formId);
      return `${oracle.formId}: expected f$${oracle.romFormId.toString(16).padStart(2, '0')}/p$${oracle.actorVisualProfileKey.toString(16).padStart(2, '0')}/g$${oracle.graphicsBank.toString(16).padStart(2, '0')}, got f$${item?.romFormId.toString(16).padStart(2, '0') ?? '??'}/p$${item?.actorVisualProfileKey?.toString(16).padStart(2, '0') ?? '??'}/g$${item?.graphicsBank?.toString(16).padStart(2, '0') ?? '??'}`;
    }).join(' | ') || 'none');

  const auditDoc = readFileSync(FIGHTER_IDENTITY_AUDIT, 'utf8');
  const identityDecodeDoc = readFileSync(IDENTITY_DECODE_DOC, 'utf8');
  const staleIdentityClaims = [
    /`vegito_ssj`\s*\|\s*`\$30`/,
    /`vegito_ssj`[^\n]*`\$2b`[^\n]*`\$5c`/,
    /`ginyu_goku`\s*\|\s*`\$2d`/,
    /`ginyu_goku`[^\n]*`\$28`[^\n]*`\$59`/,
    /mappingUncertain \(7\)/,
    /High-risk identities:\s*`7\/7 ROM_IDENTITY_VERIFIED`/,
  ];
  check('P0 identity docs contain corrected Vegito/Ginyu-Goku claims',
    auditDoc.includes('`vegito_ssj` | `$1a`') &&
    auditDoc.includes('`ginyu_goku` | `$30`') &&
    auditDoc.includes('`$2b / $12 / $b2 / $10` is Ginyu-Goku, never Vegito') &&
    identityDecodeDoc.includes('`vegito_ssj` is `$41A0 / p15 / g46`') &&
    identityDecodeDoc.includes('`ginyu_goku` is `$4300 / p2b / g5c`'));
  check('P0 identity docs have no stale roster-order identity claims',
    !staleIdentityClaims.some(pattern => pattern.test(`${auditDoc}\n${identityDecodeDoc}`)));
} else {
  check('ROM fighter identity docs present', !REQUIRE_ROM_FIGHTER_IDENTITY_DOCS, 'regenerate with npm run gen:fighter-identity');
  if (!REQUIRE_ROM_FIGHTER_IDENTITY_DOCS) {
    console.log('SKIP ROM fighter identity docs: docs/rom/generated/fighters identity reports are not committed; set REQUIRE_ROM_FIGHTER_IDENTITY_DOCS=1 after npm run gen:fighter-identity for the strict local gate.');
  }
}

const highProfileForms = ['buu_gotenks', 'buu_gohan', 'buu_kid', 'ginyu_goku', 'gotenks_ssj', 'gotenks_ssj3', 'vegito_ssj'] as const;
const rawTailOracle: Record<string, { romFormId: number; actorVisualProfileKey: number; battleName: number; statusName: number; charGroup: number }> = {
  gotenks_ssj: { romFormId: 24, actorVisualProfileKey: 0x13, battleName: 0x2e, statusName: 0x17, charGroup: 0x09 },
  gotenks_ssj3: { romFormId: 25, actorVisualProfileKey: 0x14, battleName: 0x2e, statusName: 0x18, charGroup: 0x09 },
  vegito_ssj: { romFormId: 26, actorVisualProfileKey: 0x15, battleName: 0x30, statusName: 0x19, charGroup: 0x0a },
  nappa: { romFormId: 27, actorVisualProfileKey: 0x16, battleName: 0x04, statusName: 0x1a, charGroup: 0x0b },
  ginyu_goku: { romFormId: 48, actorVisualProfileKey: 0x2b, battleName: 0x12, statusName: 0xb2, charGroup: 0x10 },
};

const allowedProfileSharing = new Map<number, string[]>([
  [0x03, ['piccolo_evil', 'piccolo_base', 'piccolo_kami']],
  [0x0a, ['vegeta_ssj', 'vegeta_majin']],
  [0x0c, ['gohan_adult_ssj', 'gohan_adult_ssj2']],
]);

check('0 UNVERIFIED_PHYSICAL identity rows', ROM_FIGHTER_FORM_IDENTITY.every(item => item.mappingStatus !== 'UNVERIFIED_PHYSICAL'), ROM_FIGHTER_FORM_IDENTITY.filter(item => item.mappingStatus === 'UNVERIFIED_PHYSICAL').map(item => item.formId).join(', ') || 'none');
check('all high-profile rows have independent identity closure', highProfileForms.every(formId => {
  const item = row(formId);
  return !!item &&
    item.mappingStatus === 'ROM_RECORD_VERIFIED' &&
    item.identityClosure?.priorStatus === 'ROM_RECORD_VERIFIED' &&
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
check('Vegito SSJ raw ROM record is form $1A/profile $15', vegito?.romFormId === 26 && vegito.actorVisualProfileKey === 0x15 && vegito.graphicsBank === 0x46, `form=${vegito?.romFormId} profile=${vegito?.actorVisualProfileKey}`);
check('Vegito SSJ is not the Ginyu-Goku raw record', !!vegito && vegito.rawRecord[1] !== 0x2b && vegito.rawRecord[2] !== 0x12 && vegito.rawRecord[3] !== 0xb2 && vegito.rawRecord[5] !== 0x10, `raw=${vegito?.rawRecord.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
check('Gotenks SSJ/SSJ3 are distinct ROM profiles', row('gotenks_ssj')?.actorVisualProfileKey !== row('gotenks_ssj3')?.actorVisualProfileKey && row('gotenks_ssj')?.graphicsBank !== row('gotenks_ssj3')?.graphicsBank);
check('Buu absorbed/Kid high-profile rows are distinct ROM profiles', new Set(['buu_gotenks', 'buu_gohan', 'buu_kid'].map(formId => row(formId)?.actorVisualProfileKey)).size === 3);
check('Ginyu Goku raw ROM record is form $30/profile $2B', row('ginyu_goku')?.romFormId === 48 && row('ginyu_goku')?.actorVisualProfileKey === 0x2b && row('ginyu_goku')?.graphicsBank === 0x5c);
check('Ginyu Goku has its own ROM profile unless future trace proves sharing', row('ginyu_goku')?.actorVisualProfileKey === 0x2b && row('ginyu_goku')?.actorVisualProfileKey !== row('goku_base')?.actorVisualProfileKey);
check('Golden controls exist', !!piccolo && !!android16 && !!cellPerfect && !!buu);

for (const [formId, oracle] of Object.entries(rawTailOracle)) {
  const item = row(formId);
  check(`${formId} matches Char Form Data/Bank11 oracle`,
    !!item &&
    item.romFormId === oracle.romFormId &&
    item.actorVisualProfileKey === oracle.actorVisualProfileKey &&
    item.rawRecord[2] === oracle.battleName &&
    item.rawRecord[3] === oracle.statusName &&
    item.rawRecord[5] === oracle.charGroup,
    item ? `form=$${item.romFormId.toString(16)} profile=$${item.actorVisualProfileKey.toString(16)} raw=${item.rawRecord.slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join(' ')}` : 'missing');
}

for (const [profile, allowedForms] of allowedProfileSharing) {
  const actual = ROM_FIGHTER_FORM_IDENTITY
    .filter(item => item.actorVisualProfileKey === profile)
    .map(item => item.formId)
    .sort();
  check(`profile $${profile.toString(16).padStart(2, '0')} sharing is oracle-approved`,
    actual.join(',') === [...allowedForms].sort().join(','),
    actual.join(', ') || 'none');
}

// ── Trunks golden gate (P0.4R-TRUNKS): kid ↔ future were historically
//    swapped. Char Form Data oracle (stats_gid_1992672511.csv) + sprite
//    silhouette (kid 30×37 chibi vs future 27×41 adult) lock the correct
//    form→profile→bank routing. This must never regress.
const trunksGate: Record<string, { romFormId: number; profile: number; bank: number }> = {
  trunks_future: { romFormId: 18, profile: 0x0d, bank: 0x3e },
  trunks_ssj: { romFormId: 19, profile: 0x0e, bank: 0x3f },
  trunks_kid: { romFormId: 22, profile: 0x11, bank: 0x42 },
  trunks_kid_ssj: { romFormId: 23, profile: 0x12, bank: 0x43 },
};
check('Trunks golden gate: kid ↔ future physical identity not swapped',
  Object.entries(trunksGate).every(([formId, oracle]) => {
    const item = row(formId);
    return !!item && item.romFormId === oracle.romFormId && item.actorVisualProfileKey === oracle.profile && item.graphicsBank === oracle.bank;
  }),
  Object.entries(trunksGate).map(([formId, oracle]) => {
    const item = row(formId);
    const got = item ? `f$${item.romFormId.toString(16)}/p$${item.actorVisualProfileKey.toString(16)}/g$${item.graphicsBank.toString(16)}` : 'missing';
    return `${formId}: got ${got}, want f$${oracle.romFormId.toString(16)}/p$${oracle.profile.toString(16)}/g$${oracle.bank.toString(16)}`;
  }).join(' | '));

const sharedNonOracleProfiles = [...new Map(ROM_FIGHTER_FORM_IDENTITY.map(item => [
  item.actorVisualProfileKey,
  ROM_FIGHTER_FORM_IDENTITY.filter(other => other.actorVisualProfileKey === item.actorVisualProfileKey).map(other => other.formId),
] as const))]
  .filter(([profile, forms]) => forms.length > 1 && !allowedProfileSharing.has(profile));
check('no non-oracle profile sharing', sharedNonOracleProfiles.length === 0, sharedNonOracleProfiles.map(([profile, forms]) => `$${profile.toString(16)}:${forms.join(',')}`).join(' | ') || 'none');

const builder = readFileSync(BUILDER, 'utf8');
const renderer = readFileSync(RENDERER, 'utf8');
const resolver = readFileSync(RESOLVER, 'utf8');
const roster = readFileSync(ROSTER, 'utf8');
const characterStudio = readFileSync(CHARACTER_STUDIO, 'utf8');
const exportRomFighters = readFileSync(EXPORT_ROM_FIGHTERS, 'utf8');

check('physicalId includes graphics bank', builder.includes('-g${hex(meta.source.bank)}-'));
check('physicalId includes metasprite hash', builder.includes('metaspriteHash'));
check('physicalId includes graphics hash', builder.includes('graphicsHash'));
check('builder rejects render/form profile mismatch', builder.includes('render profile mismatch'));
check('builder stores pieceGraphics forensic data', builder.includes('pieceGraphics'));
check('renderer reads ROM_CGB_PALETTE_TABLE SSOT', renderer.includes('ROM_CGB_PALETTE_TABLE') && !renderer.includes('romFighterPalettes.generated'));
check('renderer records graphics block hashes', renderer.includes('graphicsBlockHash') && renderer.includes('tile0Hash') && renderer.includes('tile1Hash'));
check('resolver uses generated physicalFrameIndex instead of weak formula', resolver.includes('romPhysicalFrameIndex') && !resolver.includes('physicalFrameFor'));
check('roster exports ROM ordered forms and characters from ROM_FIGHTER_FORM_IDENTITY',
  roster.includes('ROM_ORDERED_FORM_IDS') &&
  roster.includes('ROM_ORDERED_CHARACTERS') &&
  roster.includes('ROM_FIGHTER_FORM_IDENTITY.map(row => row.formId)') &&
  roster.includes('ROM_FORM_ORDER'));
check('Character Studio uses shared ROM ordered character navigation',
  characterStudio.includes('ROM_ORDERED_CHARACTERS') &&
  !characterStudio.includes('const ROM_ORDERED_CHARACTERS = CHARACTERS'));
check('Character Studio action masks use romFormId instead of FORMS object order',
  characterStudio.includes('identity.romFormId - 1') &&
  !characterStudio.includes('Object.keys(FORMS)'));
check('visual ROM fighter export is ROM ordered, not alphabetical',
  exportRomFighters.includes('ROM_FIGHTER_FORM_IDENTITY.find(item => item.formId === a)') &&
  exportRomFighters.includes('romFormId') &&
  !/\.filter\(formId => existsSync\(join\(PUBLIC_SPRITES, formId, 'rom-physical\.manifest\.json'\)\).*\.sort\(\);/s.test(exportRomFighters));

const weakCachePattern = /(?:frameCache|graphicsCache)\\.get\\([^\\n]*(?:visualFrameId|resourceId)[^\\n]*\\)/;
check('no obvious weak visualFrameId/resource cache in renderer/builder/resolver', !weakCachePattern.test(`${builder}\n${renderer}\n${resolver}`));

if (failures === 0) {
  console.log(`\n✅ verify:rom-fighter-identity PASS (${ROM_FIGHTER_FORM_IDENTITY.length} identities)`);
  process.exit(0);
}
console.log(`\n❌ verify:rom-fighter-identity FAIL (${failures})`);
process.exit(1);
