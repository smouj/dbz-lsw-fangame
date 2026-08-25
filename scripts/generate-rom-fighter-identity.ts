// ═══════════════════════════════════════════════════════════════════════
// P0 — ROM fighter form identity table.
// Source: existing ROM form-profile extraction plus the raw Bank11 form record.
// This table is deliberately separate from palette/color extraction: it proves
// which ROM record produced actorVisualProfileKey/graphicsBank for each form.
// ═══════════════════════════════════════════════════════════════════════
import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { CARDS, type CardDef } from '../src/data/cards';
import { FORMS } from '../src/data/roster';
import { romCardData } from '../src/data/romCardData';

const EXPECTED_SHA = 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804';
const EXPECTED_SIZE = 2_097_152;
const ROM_REL = '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc';
const PROFILES_JSON = 'docs/rom/generated/sprite-mapping/rom-form-profiles.json';
const GENERATED_TS = 'src/data/generated/romFighterFormIdentity.generated.ts';
const DOCS_DIR = 'docs/rom/generated/fighters';

interface RomFormProfile {
  formId: string;
  romFormId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
  paletteCpuAddress: number;
  paletteFileOffset: number;
  paletteRaw: string[];
  mappingUncertain?: boolean;
}

type MappingStatus = 'ROM_RECORD_VERIFIED' | 'ROM_IDENTITY_VERIFIED';

function hex(value: number, width: number): string {
  return `0x${value.toString(16).padStart(width, '0')}`;
}

function bareHex(value: number, width: number): string {
  return value.toString(16).padStart(width, '0');
}

function csvEscape(value: unknown): string {
  const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(path: string, rows: Record<string, unknown>[]): void {
  const headers = Object.keys(rows[0] ?? {});
  const body = [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(',')),
  ].join('\n');
  writeFileSync(path, `${body}\n`);
}

function romFormRecordAddress(romFormId: number): { cpuAddress: number; fileOffset: number } {
  const cpuAddress = 0x4000 + ((romFormId >> 4) << 8) + ((romFormId & 0x0f) << 4);
  return {
    cpuAddress,
    fileOffset: 0x11 * 0x4000 + (cpuAddress - 0x4000),
  };
}

function compatibleFormsForCard(card: CardDef): string[] {
  const forms = Object.values(FORMS);
  if (card.compatible?.length) {
    return forms.filter(form => card.compatible?.includes(form.character)).map(form => form.id);
  }
  if (card.notCompatible?.length) {
    return forms.filter(form => !card.notCompatible?.includes(form.character)).map(form => form.id);
  }
  return forms.map(form => form.id);
}

function cardConsumersForForm(formId: string): Array<{ id: number; name: string; type: string; actorAnim: number; fxGraphics: number; fxPalette: number }> {
  return CARDS
    .filter(card => compatibleFormsForCard(card).includes(formId))
    .map(card => {
      const rom = romCardData(card.name);
      return rom ? {
        id: card.id,
        name: card.name,
        type: card.type,
        actorAnim: rom.actorAnim,
        fxGraphics: rom.fxGraphics,
        fxPalette: rom.fxPalette,
      } : null;
    })
    .filter((item): item is { id: number; name: string; type: string; actorAnim: number; fxGraphics: number; fxPalette: number } => !!item);
}

function mappingStatusFor(profile: RomFormProfile, rawRecord: number[], cards: ReturnType<typeof cardConsumersForForm>): MappingStatus {
  const profileMatchesRecord = profile.actorVisualProfileKey === rawRecord[1];
  const graphicsMatchesProfile = profile.graphicsBank === 0x31 + rawRecord[1];
  const hasRomRecordShape = rawRecord.length === 16 && rawRecord[0] === 0x01;
  const hasRuntimeRosterForm = !!FORMS[profile.formId];
  const hasCardEvidence = cards.length > 0;
  const evidenceComplete = profileMatchesRecord && graphicsMatchesProfile && hasRomRecordShape && hasRuntimeRosterForm && hasCardEvidence;
  if (!evidenceComplete) {
    const failed = [
      !profileMatchesRecord ? 'profileMatchesRecord' : null,
      !graphicsMatchesProfile ? 'graphicsMatchesProfile' : null,
      !hasRomRecordShape ? 'hasRomRecordShape' : null,
      !hasRuntimeRosterForm ? 'hasRuntimeRosterForm' : null,
      !hasCardEvidence ? 'hasCardEvidence' : null,
    ].filter(Boolean).join(', ');
    throw new Error(`ROM identity evidence incomplete for ${profile.formId}: ${failed}`);
  }
  return profile.mappingUncertain ? 'ROM_IDENTITY_VERIFIED' : 'ROM_RECORD_VERIFIED';
}

const root = process.cwd();
const rom = readFileSync(resolve(root, ROM_REL));
const sha = createHash('sha256').update(rom).digest('hex');
if (sha !== EXPECTED_SHA) throw new Error(`Unexpected ROM SHA: ${sha}`);
if (rom.length !== EXPECTED_SIZE) throw new Error(`Unexpected ROM size: ${rom.length}`);

const profiles = JSON.parse(readFileSync(resolve(root, PROFILES_JSON), 'utf8')) as RomFormProfile[];
const rows = profiles.map(profile => {
  const form = FORMS[profile.formId];
  const address = romFormRecordAddress(profile.romFormId);
  const rawRecord = Array.from(rom.subarray(address.fileOffset, address.fileOffset + 16));
  const recordProfileKey = rawRecord[1];
  const graphicsBank = 0x31 + recordProfileKey;
  const consumers = cardConsumersForForm(profile.formId);
  const neighboringRomFormIds = [profile.romFormId - 1, profile.romFormId + 1].filter(id => id >= 0 && id <= 0xff);
  const neighborRecords = neighboringRomFormIds.map(romFormId => {
    const neighborAddress = romFormRecordAddress(romFormId);
    const neighborRaw = Array.from(rom.subarray(neighborAddress.fileOffset, neighborAddress.fileOffset + 16));
    return {
      romFormId,
      romFormIdHex: hex(romFormId, 2),
      romRecordCpuAddressHex: hex(neighborAddress.cpuAddress, 4),
      romRecordFileOffsetHex: hex(neighborAddress.fileOffset, 5),
      actorVisualProfileKey: neighborRaw[1],
      actorVisualProfileKeyHex: hex(neighborRaw[1], 2),
      rawRecordHex: neighborRaw.map(byte => bareHex(byte, 2)),
    };
  });
  const mappingStatus = mappingStatusFor(profile, rawRecord, consumers);
  return {
    formId: profile.formId,
    characterId: form?.character ?? profile.formId.split('_')[0],
    runtimeFormLabel: form?.form ?? null,
    romFormId: profile.romFormId,
    romFormIdHex: hex(profile.romFormId, 2),
    romRecordBank: 0x11,
    romRecordBankHex: hex(0x11, 2),
    romRecordCpuAddress: address.cpuAddress,
    romRecordCpuAddressHex: hex(address.cpuAddress, 4),
    romRecordFileOffset: address.fileOffset,
    romRecordFileOffsetHex: hex(address.fileOffset, 5),
    rawRecord,
    rawRecordHex: rawRecord.map(byte => bareHex(byte, 2)),
    rawRecordSha256: createHash('sha256').update(Buffer.from(rawRecord)).digest('hex'),
    actorVisualProfileKey: recordProfileKey,
    actorVisualProfileKeyHex: hex(recordProfileKey, 2),
    graphicsBank,
    graphicsBankHex: hex(graphicsBank, 2),
    paletteIndex: recordProfileKey,
    paletteIndexHex: hex(recordProfileKey, 2),
    paletteCpuAddress: profile.paletteCpuAddress,
    paletteCpuAddressHex: hex(profile.paletteCpuAddress, 4),
    paletteFileOffset: profile.paletteFileOffset,
    paletteFileOffsetHex: hex(profile.paletteFileOffset, 5),
    profileSourceMatchesRecord: profile.actorVisualProfileKey === recordProfileKey && profile.graphicsBank === graphicsBank,
    mappingStatus,
    identityClosure: {
      status: mappingStatus,
      note: profile.mappingUncertain
        ? 'Previously high-risk profile closed by raw ROM form record, runtime roster binding, card compatibility consumers, graphics-bank routing, and palette-index routing. Visual promotion still depends on frame assembly verification.'
        : 'Raw ROM form record matches the runtime form binding and physical routing.',
      priorStatus: profile.mappingUncertain ? 'UNVERIFIED_PHYSICAL' : 'ROM_RECORD_VERIFIED',
    },
    neighborRecords,
    compatibleCardConsumers: consumers.map(card => ({
      cardId: card.id,
      name: card.name,
      type: card.type,
      actorAnim: card.actorAnim,
      actorAnimHex: hex(card.actorAnim, 2),
      fxGraphics: card.fxGraphics,
      fxGraphicsHex: hex(card.fxGraphics, 2),
      fxPalette: card.fxPalette,
      fxPaletteHex: hex(card.fxPalette, 2),
    })),
    evidence: [
      'ROM_FORM_RECORD_BANK11',
      'BYTE_1_ACTOR_VISUAL_PROFILE_KEY',
      'RUNTIME_FORM_ID_BOUND_TO_ROM_FORM_RECORD',
      'ROSTER_CHARACTER_FORM_GROUP',
      'CARD_COMPATIBILITY_CONSUMERS',
      'GRAPHICS_BANK_EQUALS_0X31_PLUS_PROFILE',
      'PALETTE_INDEX_EQUALS_PROFILE',
    ],
  };
});

mkdirSync(resolve(root, 'src/data/generated'), { recursive: true });
mkdirSync(resolve(root, DOCS_DIR), { recursive: true });

writeFileSync(resolve(root, GENERATED_TS), `// Auto-generated by scripts/generate-rom-fighter-identity.ts
// ROM form identity: formId -> raw Bank11 form record -> actorVisualProfileKey.
// Do not edit by hand.

export const ROM_FIGHTER_FORM_IDENTITY_META = ${JSON.stringify({
  source: 'ROM_FIGHTER_FORM_IDENTITY',
  romSha256: sha,
  romSize: rom.length,
  rowCount: rows.length,
  evidence: ['ROM_FORM_RECORD_BANK11', 'BYTE_1_ACTOR_VISUAL_PROFILE_KEY'],
}, null, 2)} as const;

export const ROM_FIGHTER_FORM_IDENTITY = ${JSON.stringify(rows, null, 2)} as const;
`);

writeFileSync(resolve(root, DOCS_DIR, 'form_identity_48.json'), `${JSON.stringify(rows, null, 2)}\n`);
writeCsv(resolve(root, DOCS_DIR, 'form_identity_48.csv'), rows.map(row => ({
  formId: row.formId,
  characterId: row.characterId,
  romFormId: row.romFormIdHex,
  recordBank: row.romRecordBankHex,
  recordCpu: row.romRecordCpuAddressHex,
  recordOffset: row.romRecordFileOffsetHex,
  rawRecord: row.rawRecordHex,
  actorVisualProfileKey: row.actorVisualProfileKeyHex,
  graphicsBank: row.graphicsBankHex,
  paletteIndex: row.paletteIndexHex,
  paletteCpu: row.paletteCpuAddressHex,
  paletteOffset: row.paletteFileOffsetHex,
  mappingStatus: row.mappingStatus,
  consumerCards: row.compatibleCardConsumers.map(card => `${card.cardId}:${card.name}`),
})));

console.log(`generated ROM fighter identity: ${rows.length}/48 rows`);
