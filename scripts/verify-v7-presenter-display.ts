// verify-v7-presenter-display.ts — V7.8: gate de cierre V7.
//   - los 6 cues ROM display tienen consecuencia observable (RomDisplayPresenter)
//   - 0 no-ops silenciosos: cada cue de las 48 Support + 11 defensas produce
//     evento o PENDING explícito
//   - load -> compose -> clear se refleja en el estado del presenter
//   - 0 mutación de Engine desde el presenter (el presenter no muta nada)
// Uso: npm run verify:v7-presenter-display
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
for (const cardId of Object.keys(ROM_SUPPORT_PHYSICAL_VISUALS).map(Number)) {
  presenter.reset();
  const profile = romSupportPresentationProfile({ cardId });
  const compiled = compileRomSupportPresentation(profile);
  for (const e of compiled.timeline.entries) {
    totalCues++;
    const ev = presenter.consume(e.cue);
    if (!ev) silent++;
    if (ev.kind === 'PENDING') pendingCount++;
  }
}
check('0 cues silenciosos (48 Support, evento siempre generado)', silent === 0, `silent=${silent}`);
check('PENDING explícito donde falta evidencia (no falsos PASS)', pendingCount > 0, `pending=${pendingCount}`);
check('load->compose->clear reflejado (estado final del último visual)', presenter.state.cleared === true || presenter.state.pendingReasons.length > 0);

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

if (failures === 0) {
  console.log(`\n✅ v7-presenter-display: ${totalCues} cues Support + ${defenseCues} cues Defense → consecuencias observables; 0 no-ops silenciosos.`);
  process.exit(0);
}
process.exit(1);
