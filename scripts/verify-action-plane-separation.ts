// P0 — ACTION plane / OVERVIEW plane boundary gate
//
// ACTION is a cinematic 160×80 native plane. OVERVIEW is the tactical
// overworld field and owns BattlePosition/anchorFor(). This gate keeps the
// boundary explicit so a future UI refactor cannot silently place ACTION
// fighters with tactical anchors or with an overworld sprite.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const failures: string[] = [];
let checks = 0;
const check = (condition: boolean, message: string): void => {
  checks++;
  if (!condition) failures.push(message);
};

const actionGeometry = read('src/battle/actionPlaneGeometry.ts');
const positions = read('src/data/positions.ts');
const actionScene = read('src/renderer/pixi/scenes/ActionScene.ts');
const hud = read('src/devtools/hud.tsx');
const canon = read('src/devtools/CanonBattleField.tsx');
const positionLab = read('src/devtools/positions.tsx');
const main = read('src/main.tsx');

check(actionGeometry.includes('ACTION_PLANE_GEOMETRY'), 'ACTION plane SSOT is missing');
check(actionGeometry.includes("width: 160") && actionGeometry.includes("height: 80"), 'ACTION SSOT must be native 160×80');
check(actionGeometry.includes("scale: 2"), 'ACTION SSOT must declare the single ×2 projection');
check(actionGeometry.includes('actionPlaneAnchorFor') && actionGeometry.includes('actionPlaneAnchorPercentFor'), 'ACTION SSOT must expose native and DOM projections');

check(!positions.includes('export const ACTION_CENTER_ANCHOR'), 'legacy ACTION_CENTER_ANCHOR leaked back into tactical positions');
check(!positions.includes('export const ACTION_SPECIAL_ANCHOR'), 'legacy ACTION_SPECIAL_ANCHOR leaked back into tactical positions');
check(!positions.includes('export function actionAnchorFor'), 'legacy actionAnchorFor leaked back into tactical positions');

check(!actionScene.includes("data/positions") && !actionScene.includes('anchorFor('), 'ActionScene must never import/use tactical anchorFor');
check(!actionScene.includes('BattlePosition'), 'ActionScene must never depend on tactical BattlePosition');
check(actionScene.includes('ACTION_PLANE_GEOMETRY'), 'ActionScene must consume ACTION plane SSOT');

check(hud.includes('actionPlaneAnchorPercentFor') && canon.includes('actionPlaneAnchorPercentFor'), 'HUD and CanonBattleField must project ACTION anchors from the shared SSOT');
check(canon.includes('devAids && !isAction') && canon.includes('devAids && isAction'), 'CanonBattleField must keep tactical markers out of ACTION and expose cinematic markers there');
check(positionLab.includes('actionPlaneAnchorPercentFor'), 'Position Lab must use the ACTION plane SSOT');
check(positionLab.includes('resolveCharacterVisualSequence') && positionLab.includes('romPhysicalPreviewSequence'), 'Position Lab ACTION preview must use physical ROM frames');
check(hud.includes('dev-rom-preview-pending') && hud.includes('No se dibuja ningún PNG sustituto'), 'HUD must show an explicit pending state instead of a blank or invented ACTION frame');
check(hud.includes("const tacticalAnchors = bgMode === 'overview'"), 'HUD must resolve tactical anchors only inside OVERVIEW');
check(hud.includes("data-plane={bgMode === 'action' ? 'ACTION' : 'OVERVIEW'}"), 'HUD must expose an explicit tactical/cinematic plane boundary');
check(hud.includes("bgMode === 'action' ? 'view-action' : 'view-overview'"), 'HUD preview root must switch its plane class with the selected mode');
check(main.includes('actionPlaneAnchorPercentFor'), 'BattleScreen DOM fallback must project ACTION anchors from the shared SSOT');
check(main.includes('playerFieldAnchor') && main.includes('enemyFieldAnchor'), 'BattleScreen must resolve visual anchors by plane before rendering fighters');
check(main.includes("viewMode === 'OVERVIEW' ? `${POSITION_DATA[player.battlePos].altitude.toLowerCase()}"), 'BattleScreen must not apply tactical altitude/depth classes inside ACTION');
check(main.includes("viewMode === 'OVERVIEW' && qtePose === 'idle' && overworldUrl(activePlayerFormId)"), 'player overworld sprite must be restricted to OVERVIEW');
check(main.includes("viewMode === 'OVERVIEW' && enemyPose === 'idle' && overworldUrl(activeEnemyFormId)"), 'enemy overworld sprite must be restricted to OVERVIEW');

if (failures.length) {
  console.log(`ACTION plane separation: ${checks - failures.length} passed · ${failures.length} failed`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

console.log(`ACTION plane separation: ${checks} passed · 0 failed`);
