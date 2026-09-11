import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ROM_DEFENSE_SLOT8_SEQUENCE_SELECTORS, ROM_DEFENSE_SLOT8_UNRESOLVED } from '../src/data/generated/romDefenseSlot8SequenceSelectors.generated';
import { getBindingForCard } from '../src/data/romActionSequenceBinding';
import { resolveRomSequenceSelector } from '../src/battle/romSequenceSelectors';
import { resolveProductionFrame } from '../src/battle/productionFrameResolver';
import { ROM_FIGHTER_FORM_IDENTITY } from '../src/data/generated/romFighterFormIdentity.generated';

const ROM_PATH = process.env.ROM_PATH ?? resolve(process.cwd(), '../dbz-lsw-decomp/13_raw_rom/dbz-lsw-spain.gbc');
if (!existsSync(ROM_PATH)) { console.log('SKIP: ROM no presente (verify:rom-local)'); process.exit(0); }
const rom = readFileSync(ROM_PATH);
let failures = 0;
const check = (name: string, ok: boolean, detail = '') => { if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); } };
check('canonical Spain ROM SHA-256', createHash('sha256').update(rom).digest('hex') === 'bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804');

const bankBase = 0x30 * 0x4000;
const selectorRoot = bankBase + (0x6900 - 0x4000);
const selectorEnd = bankBase + (0x6d28 - 0x4000); // first shared empty-token pointer ($2B..$41)
for (const row of ROM_DEFENSE_SLOT8_SEQUENCE_SELECTORS) {
  const address = Number.parseInt(row.rowAddress.split(':')[1], 16);
  const offset = bankBase + (address - 0x4000);
  check(`row ${row.cardId}/${row.actorVisualProfileKey}:profile`, rom[offset] === row.actorVisualProfileKey);
  check(`row ${row.cardId}/${row.actorVisualProfileKey}:sequence`, rom[offset + 1] === row.sequence);
  const ptrOffset = selectorRoot + row.resource * 2;
  const relative = rom[ptrOffset] | (rom[ptrOffset + 1] << 8);
  const start = selectorRoot + relative;
  let first = -1;
  for (let cursor = start; cursor < selectorEnd; cursor += 4) {
    if (rom[cursor] === row.actorVisualProfileKey) { first = cursor; break; }
  }
  check(`row ${row.cardId}/${row.actorVisualProfileKey}:first ROM match`, first === offset, `${first.toString(16)}/${offset.toString(16)}`);
  check(`row ${row.cardId}/${row.actorVisualProfileKey}:sequence in range`, row.sequence < (getBindingForCard(row.cardId)?.tracks.find(t => t.trackId === 'actor')?.sequences.length ?? 0));
}

for (const pending of ROM_DEFENSE_SLOT8_UNRESOLVED) {
  const ptrOffset = selectorRoot + pending.resource * 2;
  const relative = rom[ptrOffset] | (rom[ptrOffset + 1] << 8);
  const start = selectorRoot + relative;
  let found = false;
  for (let cursor = start; cursor < selectorEnd; cursor += 4) found ||= rom[cursor] === pending.actorVisualProfileKey;
  check(`unresolved ${pending.cardId}/${pending.formId}:no ROM row`, !found);
}

for (const cardId of [45, 53]) {
  const rows = ROM_DEFENSE_SLOT8_SEQUENCE_SELECTORS.filter(row => row.cardId === cardId);
  check(`card ${cardId}:selector closed`, getBindingForCard(cardId)?.tracks.find(t => t.trackId === 'actor')?.selector.kind === 'DEFENSE_SLOT8_PROFILE');
  for (const row of rows) {
    const form = ROM_FIGHTER_FORM_IDENTITY.find(item => item.actorVisualProfileKey === row.actorVisualProfileKey);
    if (!form) { check(`card ${cardId}/profile ${row.actorVisualProfileKey}:form`, false); continue; }
    const selected = resolveRomSequenceSelector({ cardId, formId: form.formId, animationResource: row.resource });
    check(`card ${cardId}/${form.formId}:runtime selector`, selected.sequence === row.sequence && selected.evidence === 'DEFENSE_SLOT8_SELECTOR_TABLE_ROM');
    const physical = resolveProductionFrame({ formId: form.formId, animationResource: row.resource, sequenceSelector: row.sequence, frameIndex: 0 });
    check(`card ${cardId}/${form.formId}:physical frame`, physical.source === 'ROM_PHYSICAL', physical.source);
  }
}
check('Taiyoken remains honestly pending', getBindingForCard(19)?.tracks.find(t => t.trackId === 'actor')?.selector.kind === 'DYNAMIC_PENDING');
check('no card-name selector hardcode', !readFileSync(resolve(process.cwd(), 'src/battle/romSequenceSelectors.ts'), 'utf8').includes("cardName ==="));

console.log(`AnimationSlot8 ROM selectors: ${ROM_DEFENSE_SLOT8_SEQUENCE_SELECTORS.length} proven rows, ${ROM_DEFENSE_SLOT8_UNRESOLVED.length} precise blocker.`);
console.log(failures ? `${failures} CHECKS FAILED` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
