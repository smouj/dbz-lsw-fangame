import fs from 'node:fs';
import path from 'node:path';
import { FORMS } from '../src/data/roster';
import {
  resolveBattlePortraitStrict,
  resolveMenuPortrait,
  resolveStoryPortraitStrict,
} from '../src/data/portraitResolvers';

interface PortraitMatrixRow {
  formId: string;
  storyExactAvailable: boolean;
  storyExpressions: string[];
  battleExactAvailable: boolean;
  menuAvailable: boolean;
}

const failures: string[] = [];
const matrix: PortraitMatrixRow[] = [];
const expressionCandidates = [
  'smile', 'surprised', 'angry', 'wounded', 'visor', 'scared',
  'screaming', 'serious', 'grinding', 'crying', 'final_angry',
] as const;

for (const form of Object.values(FORMS)) {
  const story = resolveStoryPortraitStrict(form.character, form.id);
  const battle = resolveBattlePortraitStrict(form.id);
  const menu = resolveMenuPortrait(form.character);

  if (story.resolvedFormId && story.resolvedFormId !== story.requestedFormId) {
    failures.push(`CROSS_FORM Story ${story.requestedFormId} -> ${story.resolvedFormId}`);
  }
  if (battle.resolvedFormId && battle.resolvedFormId !== battle.requestedFormId) {
    failures.push(`CROSS_FORM Battle ${battle.requestedFormId} -> ${battle.resolvedFormId}`);
  }

  const storyExpressions: string[] = [];
  for (const expression of expressionCandidates) {
    const resolved = resolveStoryPortraitStrict(form.character, form.id, expression);
    if (resolved.status === 'EXACT') storyExpressions.push(expression);
    if (resolved.status === 'EXPRESSION_FALLBACK') {
      if (resolved.requestedFormId !== resolved.resolvedFormId) {
        failures.push(`EXPRESSION_FALLBACK crossed form ${resolved.requestedFormId} -> ${resolved.resolvedFormId}`);
      }
      if (!resolved.url) failures.push(`EXPRESSION_FALLBACK without URL for ${form.id}/${expression}`);
    }
  }

  matrix.push({
    formId: form.id,
    storyExactAvailable: story.status !== 'MISSING',
    storyExpressions,
    battleExactAvailable: battle.status === 'EXACT',
    menuAvailable: menu.status === 'EXACT',
  });
}

// Known regression-prone forms: Story must never silently impersonate another form.
for (const formId of [
  'goku_ssj2', 'goku_ssj3', 'gohan_adult_ssj2', 'trunks_kid_ssj',
  'trunks_ssj', 'goten_ssj', 'gotenks_ssj', 'piccolo_evil', 'buu_gotenks',
]) {
  const form = FORMS[formId];
  if (!form) continue;
  const resolved = resolveStoryPortraitStrict(form.character, form.id);
  if (resolved.status !== 'MISSING') {
    failures.push(`Expected exact Story MISSING for ${formId}, got ${resolved.status}`);
  }
}

function walk(root: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const srcFiles = walk('src');
const productionFiles = srcFiles.filter(file => !file.includes(`${path.sep}devtools${path.sep}`));

const forbiddenProductionPatterns: Array<[RegExp, string]> = [
  [/rosterPortraitAsset\s*\(/, 'universal roster portrait resolver'],
  [/storyPortraitUrl\s*\(/, 'legacy approximate Story resolver'],
  [/storyPortraitUrlApproximate\b/, 'approximate Story resolver'],
];

for (const file of productionFiles) {
  if (file.endsWith(path.join('data', 'storyPortraits.ts'))) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const [pattern, label] of forbiddenProductionPatterns) {
    if (pattern.test(source)) failures.push(`${label} used in production: ${file}`);
  }
}

const main = fs.readFileSync('src/main.tsx', 'utf8');
const speaker = fs.readFileSync('src/data/speakerPortraits.ts', 'utf8');
const roster = fs.readFileSync('src/data/rosterPortraits.ts', 'utf8');
const storyPortraits = fs.readFileSync('src/data/storyPortraits.ts', 'utf8');
const teamSetup = fs.readFileSync('src/components/setup/TeamSetup.tsx', 'utf8');
const characterDetails = fs.readFileSync('src/components/setup/CharacterDetails.tsx', 'utf8');
const characterAssets = fs.readFileSync('src/data/characterAssets.ts', 'utf8');

const crossDomain = {
  'Story -> Battle': 0,
  'Story -> Menu': 0,
  'Battle -> Story': 0,
  'Battle -> Menu': 0,
  'Stage -> Story': 0,
};

if (/storyPortraitUrl\s*\([^\n]+\)\s*\|\|\s*MENU_PORTRAITS/.test(main)) crossDomain['Story -> Menu']++;
if (/rosterPortraitAsset\s*\(/.test(main)) {
  crossDomain['Story -> Battle']++;
  crossDomain['Battle -> Story']++;
  crossDomain['Battle -> Menu']++;
}
if (/StageHudPanel[\s\S]{0,500}resolve(?:Speaker|Story)Portrait/.test(main)) crossDomain['Stage -> Story']++;
if (/MENU_PORTRAITS|BATTLE_PORTRAITS/.test(speaker)) crossDomain['Story -> Menu']++;
if (/source:\s*['"](?:story|battle|menu)['"]|rosterPortraitAsset/.test(roster)) crossDomain['Battle -> Story']++;

for (const [name, count] of Object.entries(crossDomain)) {
  if (count !== 0) failures.push(`${name}: ${count}`);
}

// Production wiring assertions.
if (!/StageHudPanel[\s\S]{0,500}resolveBattlePortraitStrict/.test(main)) {
  failures.push('StageHudPanel is not explicitly wired to resolveBattlePortraitStrict');
}
if (!/resolveStoryPortraitStrict\(c\.character, c\.form, emo\)\.url/.test(main)) {
  failures.push('StoryScene is not explicitly wired to resolveStoryPortraitStrict');
}
if (!/resolveBattlePortraitStrict\(selected\)/.test(main)) {
  failures.push('Characters detail is not explicitly wired to Battle portraits');
}
if (!/resolveBattlePortraitStrict\(m\.formId\)/.test(teamSetup)) {
  failures.push('Battle Setup team slots are not explicitly wired to resolveBattlePortraitStrict');
}
if (/resolveStoryPortraitStrict|resolveSpeakerPortrait|MENU_PORTRAITS|rosterPortraitAsset/.test(teamSetup)) {
  failures.push('Battle Setup contains a non-Battle portrait dependency');
}
if (!/(?:BATTLE_PORTRAITS\[form\.id\]|resolveBattlePortraitStrict\(form\.id\))/.test(characterDetails)) {
  failures.push('CharacterDetails is not explicitly wired to an exact Battle portrait');
}
if (/export const storyPortraitUrl\b/.test(storyPortraits)) {
  failures.push('Legacy storyPortraitUrl compatibility alias is still exported');
}

// Dev/diagnostic aggregation is allowed only as independent labelled columns.
if (!/portraits:\s*\{\s*battle:\s*string \| undefined;\s*menu:\s*string \| undefined;\s*story:\s*StoryPortraitAsset\[\];\s*\}/m.test(characterAssets)) {
  failures.push('Dev character asset bundle does not expose Story/Battle/Menu as separate portrait columns');
}
if (/resolveStoryPortraitStrict[\s\S]{0,120}\|\|[\s\S]{0,120}resolveBattlePortraitStrict/.test(characterAssets)) {
  failures.push('Dev character asset bundle silently falls back Story -> Battle');
}

console.log('\nPORTRAIT DOMAIN MATRIX');
console.table(matrix);
console.log('\nCROSS DOMAIN FALLBACKS');
for (const [name, count] of Object.entries(crossDomain)) console.log(`${name.padEnd(18)} ${count}`);
console.log('\nCROSS FORM FALLBACKS IN PRODUCTION');
console.log(`requestedFormId != resolvedFormId   ${failures.filter(x => x.startsWith('CROSS_FORM')).length}`);

if (failures.length > 0) {
  console.error('\nPORTRAIT DOMAIN GATE: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nPORTRAIT DOMAIN GATE: PASS');
