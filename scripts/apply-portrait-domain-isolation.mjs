import fs from 'node:fs';

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first < 0) throw new Error(`portrait migration: missing pattern: ${label}`);
  if (source.indexOf(from, first + from.length) >= 0) {
    throw new Error(`portrait migration: ambiguous pattern: ${label}`);
  }
  return source.slice(0, first) + to + source.slice(first + from.length);
}

const mainPath = 'src/main.tsx';
let main = fs.readFileSync(mainPath, 'utf8');

main = replaceOnce(
  main,
  "import { BATTLE_PORTRAITS } from './data/battlePortraits';\n",
  '',
  'remove direct BATTLE_PORTRAITS import',
);
main = replaceOnce(
  main,
  "import { resolveSpeakerPortrait } from './data/speakerPortraits';\n",
  '',
  'remove universal speaker import',
);
main = replaceOnce(
  main,
  "import { storyPortraitUrl } from './data/storyPortraits';\nimport { rosterPortraitAsset } from './data/rosterPortraits';\n",
  "import { resolveBattlePortraitStrict, resolveStoryPortraitStrict } from './data/portraitResolvers';\n",
  'install strict portrait imports',
);

main = replaceOnce(
  main,
  "interface Fighter {\n  id: string;\n  name: string;",
  "interface Fighter {\n  id: string;\n  formId: string;\n  name: string;",
  'Fighter form identity',
);
main = replaceOnce(
  main,
  "    id: getForm(f.id)?.character ?? f.id,\n    name: f.name, form: f.form, level: f.level,",
  "    id: getForm(f.id)?.character ?? f.id,\n    formId: f.id,\n    name: f.name, form: f.form, level: f.level,",
  'runtime fighter form projection',
);

main = replaceOnce(
  main,
  `// ─── Retratos (Sprite Database) ────────────────────────────\nconst PORTRAITS: Record<string, string> = MENU_PORTRAITS;\n\n// Alias de personajes separados → retrato del personaje base (GBC)\nconst CHAR_PORTRAIT_ALIAS: Record<string, string> = {\n  gohan_kid: 'gohan', gohan_adult: 'gohan',\n  trunks_kid: 'trunks', trunks_future: 'trunks',\n};\n\nfunction portraitFor(charId: string, formId?: string): string | undefined {\n  // Prioridad: retrato de BATALLA pixel-perfect por formId (32×24 del GBC)\n  if (formId && BATTLE_PORTRAITS[formId]) return BATTLE_PORTRAITS[formId];\n  return PORTRAITS[CHAR_PORTRAIT_ALIAS[charId] ?? charId];\n}\n`,
  `// ─── Retratos de batalla: dominio estricto por formId ─────\nfunction battlePortraitFor(formId: string): string | undefined {\n  return resolveBattlePortraitStrict(formId).url;\n}\n`,
  'remove universal portrait resolver',
);

main = replaceOnce(
  main,
  "      id: pf.character, name: getCharacter(pf.character)?.name || pf.character, form: pf.form,",
  "      id: pf.character, formId: playerFormId, name: getCharacter(pf.character)?.name || pf.character, form: pf.form,",
  'player exact form id',
);
main = replaceOnce(
  main,
  "      id: af.character, name: getCharacter(af.character)?.name || af.character, form: af.form,",
  "      id: af.character, formId: teamBattle.ally, name: getCharacter(af.character)?.name || af.character, form: af.form,",
  'ally exact form id',
);
main = replaceOnce(
  main,
  "      id: ef2.character, name: getCharacter(ef2.character)?.name || ef2.character, form: ef2.form,",
  "      id: ef2.character, formId: teamBattle.enemy2, name: getCharacter(ef2.character)?.name || ef2.character, form: ef2.form,",
  'enemy reserve exact form id',
);
main = replaceOnce(
  main,
  "      id: ef.character, name: getCharacter(ef.character)?.name || ef.character, form: ef.form,",
  "      id: ef.character, formId: enemyFormId, name: getCharacter(ef.character)?.name || ef.character, form: ef.form,",
  'enemy exact form id',
);

main = replaceOnce(
  main,
  "      BATTLE_PORTRAITS[playerFormId], BATTLE_PORTRAITS[enemyFormId],",
  "      resolveBattlePortraitStrict(playerFormId).url, resolveBattlePortraitStrict(enemyFormId).url,",
  'battle preload portraits',
);

const directBattleReplacements = [
  ["portraitFor(player.id, activePlayerFormId)", "battlePortraitFor(activePlayerFormId)"],
  ["portraitFor(enemy.id, enemyFormId)", "battlePortraitFor(enemyFormId)"],
  ["portraitFor(player2.id)", "battlePortraitFor(player2.formId)"],
  ["portraitFor(enemy2.id)", "battlePortraitFor(enemy2.formId)"],
  ["portraitFor(player.id)", "battlePortraitFor(activePlayerFormId)"],
  ["portraitFor(enemy.id)", "battlePortraitFor(enemyFormId)"],
];
for (const [from, to] of directBattleReplacements) {
  main = main.split(from).join(to);
}

main = replaceOnce(
  main,
  "          const spriteUrl = resolveSpeakerPortrait(speakerChar, speakerForm);",
  "          const spriteUrl = resolveStoryPortraitStrict(speakerChar, speakerForm).url;",
  'battle dialogue Story resolver',
);
main = replaceOnce(
  main,
  "            portraitUrl={resolveSpeakerPortrait(player.id, activePlayerFormId) ?? ''}",
  "            portraitUrl={resolveBattlePortraitStrict(activePlayerFormId).url ?? ''}",
  'Stage QTE Battle resolver',
);
main = replaceOnce(
  main,
  "              const url = storyPortraitUrl(c.character, c.form, emo) || MENU_PORTRAITS[CHAR_PORTRAIT_ALIAS[c.character] ?? c.character];",
  "              const url = resolveStoryPortraitStrict(c.character, c.form, emo).url;",
  'Story strict resolver without Menu fallback',
);

main = replaceOnce(
  main,
  "  const identityPortrait = rosterPortraitAsset(selChar.id, selected);\n  const battlePortrait = BATTLE_PORTRAITS[selected];",
  "  const identityPortrait = resolveBattlePortraitStrict(selected);",
  'Characters detail Battle resolver',
);
main = replaceOnce(
  main,
  "            const portrait = rosterPortraitAsset(c.id, baseForm.id);",
  "            const portrait = resolveBattlePortraitStrict(baseForm.id);",
  'Characters grid Battle resolver',
);
main = main.split("className={`char-thumb-story ${portrait.source}`}").join('className="char-thumb-story battle"');
main = main.split('className={identityPortrait.source}').join('className="battle"');
main = main.split("<span>{identityPortrait.source === 'story' ? 'STORY PORTRAIT' : identityPortrait.source === 'battle' ? 'BATTLE PORTRAIT' : 'CHARACTER PORTRAIT'}</span>").join('<span>BATTLE PORTRAIT</span>');

const assetRailBlock = `            {battlePortrait && identityPortrait.source !== 'battle' ? (\n              <div className="char-asset-chip">\n                <img src={battlePortrait} alt="" draggable={false} />\n                <span><b>BATTLE</b> HUD PORTRAIT</span>\n              </div>\n            ) : null}\n`;
if (main.includes(assetRailBlock)) main = main.replace(assetRailBlock, '');
else throw new Error('portrait migration: missing Characters duplicate Battle rail');

const forbiddenAfterMain = [
  'rosterPortraitAsset(',
  'storyPortraitUrl(',
  'resolveSpeakerPortrait(',
  'portraitFor(',
  'BATTLE_PORTRAITS[',
  'CHAR_PORTRAIT_ALIAS',
];
for (const forbidden of forbiddenAfterMain) {
  if (main.includes(forbidden)) throw new Error(`portrait migration: forbidden production token remains in main.tsx: ${forbidden}`);
}
fs.writeFileSync(mainPath, main);

// Keep the old approximate Story resolver explicitly named as a diagnostic API.
const storyPath = 'src/data/storyPortraits.ts';
let story = fs.readFileSync(storyPath, 'utf8');
story = replaceOnce(
  story,
  '/** Resolve the physical Story portrait for character + form + expression. */\nexport function storyPortraitUrl(',
  '/** DEV/diagnostic only: may approximate across Story forms. Production must use resolveStoryPortraitStrict(). */\nexport function storyPortraitUrlApproximate(',
  'name approximate Story resolver',
);
story += "\n/** @deprecated Diagnostic compatibility alias. Never use in production rendering. */\nexport const storyPortraitUrl = storyPortraitUrlApproximate;\n";
fs.writeFileSync(storyPath, story);

const packagePath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts ??= {};
pkg.scripts['verify:portrait-domains'] = 'esbuild --bundle --format=esm --platform=node scripts/verify-portrait-domains.ts --outfile=.vpd.mjs && node .vpd.mjs; code=$?; rm -f .vpd.mjs; exit $code';
if (typeof pkg.scripts['verify:ci'] === 'string' && !pkg.scripts['verify:ci'].includes('verify:portrait-domains')) {
  pkg.scripts['verify:ci'] += ' && npm run verify:portrait-domains';
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log('portrait-domain migration applied');
