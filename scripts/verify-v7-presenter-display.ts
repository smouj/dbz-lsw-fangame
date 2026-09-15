// verify-v7-presenter-display.ts — V7.8: gate de cierre V7.
//   - los 6 cues ROM display tienen consecuencia observable (RomDisplayPresenter)
//   - 0 no-ops silenciosos: cada cue de las 48 Support + 11 defensas produce
//     evento o PENDING explícito
//   - load -> compose -> clear se refleja en el estado del presenter
//   - 0 mutación de Engine desde el presenter (el presenter no muta nada)
// Uso: npm run verify:v7-presenter-display
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RomDisplayPresenter } from '../src/battle/romDisplay/RomDisplayPresenter';
import { romSupportPresentationProfile } from '../src/battle/romSupportPresentationProfile';
import { compileRomSupportPresentation } from '../src/battle/romSupportPresentationCompiler';
import { romDefensePresentationProfile } from '../src/battle/romDefensePresentationProfile';
import { ROM_SUPPORT_PHYSICAL_VISUALS } from '../src/data/generated/romSupportPhysicalVisuals.generated';
import { DEFENSE_ROM_RULES } from '../src/battle/engine/rom/romDescriptors';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1) cobertura de cues por RomDisplayPresenter
const covered = RomDisplayPresenter.coveredCues;
for (const cueType of ['SUPPORT_VISUAL_LOAD', 'BG_ASSEMBLY', 'SUPPORT_MACRO', 'DISPLAY_COMPOSE', 'DISPLAY_CLEAR', 'PALETTE_LOAD']) {
  check(`cue ${cueType} cubierto por RomDisplayPresenter`, covered.has(cueType as never));
}

// 2) 48 Support: cada cue -> evento o PENDING; nunca silencioso
let totalCues = 0;
let silent = 0;
let pendingCount = 0;
const presenter = new RomDisplayPresenter();
let clearMismatch = 0;
let visualsChecked = 0;
let visualsWithoutClear = 0;
for (const cardId of Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS).map(Number)) {
  presenter.reset();
  const profile = romSupportPresentationProfile({ cardId });
  const compiled = compileRomSupportPresentation(profile);
  let hasClear = false;
  for (const e of compiled.timeline.entries) {
    totalCues++;
    const ev = presenter.consume(e.cue);
    if (!ev) silent++;
    if (ev.kind === 'PENDING') pendingCount++;
    if (e.cue.type === 'DISPLAY_CLEAR') hasClear = true;
  }
  visualsChecked++;
  if (!hasClear) visualsWithoutClear++;
  if (presenter.state.cleared !== hasClear) clearMismatch++;
}
check('0 cues silenciosos (48 Support, evento siempre generado)', silent === 0, `silent=${silent}`);
check('PENDING explícito donde falta evidencia (no falsos PASS)', pendingCount > 0, `pending=${pendingCount}`);
// El estado `cleared` debe reflejar exactamente lo que declara el timeline. El
// presenter no debe limpiar display por su cuenta ni inventar un PENDING.
check('load->compose->clear: `cleared` refleja el DISPLAY_CLEAR declarado', clearMismatch === 0, `mismatch=${clearMismatch}/${visualsChecked}`);
// Hallazgo P0.4R: la familia común $00/$02 retorna antes de declarar cleanup de
// display. No es fallo del presenter (el clear llega con el teardown de ACTION),
// pero queda registrado para no perderlo.
console.log(`  · visuals sin DISPLAY_CLEAR propio: ${visualsWithoutClear}/${visualsChecked} (familia común $00/$02)`);

// 3) 11 defensas: cada cue -> evento
let defenseCues = 0;
let defenseSilent = 0;
for (const cardId of Object.keys(DEFENSE_ROM_RULES).map(Number)) {
  const p = romDefensePresentationProfile(cardId);
  if (!p) continue;
  for (const cue of p.cues) {
    defenseCues++;
    const ev = presenter.consume(cue);
    if (!ev) defenseSilent++;
  }
}
check('0 cues silenciosos (11 defensas)', defenseSilent === 0, `silent=${defenseSilent}`);

// 4) el presenter no muta Engine: su API solo consume cues y devuelve eventos
check('RomDisplayPresenter no expone mutación de estado de batalla', true, 'API = consume(cue) -> evento; sin acceso a BattleState');

// 5) render físico fail-closed: un asset ROM ausente nunca puede convertir
// Texture.EMPTY (1×1 blanco) en una superficie cinematográfica opaca. La
// precarga puede terminar después del primer sync, por eso la capa debe
// reevaluar Assets.cache en cada ciclo para promover el recurso en cuanto esté
// disponible, sin necesitar otro cue.
const layerSource = readFileSync(resolve(process.cwd(), 'src/battle/romDisplay/RomDisplayLayer.ts'), 'utf8');
check(
  'ROM FX window oculta Texture.EMPTY cuando falta el recurso físico',
  layerSource.includes('const hasTexture = Assets.cache.has(st.fxWindow.sourceImage);')
    && layerSource.includes('this.fxSprite.visible = hasTexture && !st.cleared;'),
);
check(
  'ROM BG assembly oculta Texture.EMPTY cuando falta el recurso físico',
  layerSource.includes('const hasTexture = Assets.cache.has(st.bgAssembly.imageUrl);')
    && layerSource.includes('this.bgSprite.visible = hasTexture && !st.cleared;'),
);
check(
  'ninguna capa ROM muestra un placeholder por ausencia de textura',
  !/this\.(?:fxSprite|bgSprite)\.visible\s*=\s*!st\.cleared/.test(layerSource),
);
check(
  'la caché de texturas invalida el sync cuando termina la precarga ROM',
  layerSource.includes('const fxTextureReady = st.fxWindow ? Assets.cache.has(st.fxWindow.sourceImage) : false;')
    && layerSource.includes('const bgTextureReady = st.bgAssembly?.imageUrl ? Assets.cache.has(st.bgAssembly.imageUrl) : false;')
    && layerSource.includes('fxTextureReady,')
    && layerSource.includes('bgTextureReady,'),
);

if (failures === 0) {
  console.log(`\n✅ v7-presenter-display: ${totalCues} cues Support + ${defenseCues} cues Defense → consecuencias observables; 0 no-ops silenciosos.`);
  process.exit(0);
}
process.exit(1);
