// VERIFY: DEV ENGINE EDITOR
// Garantiza que el editor interno sigue siendo una proyección del runtime de
// producción y no vuelve a introducir previews DOM/PNG paralelos.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = readFileSync(join(root, 'src/devtools/editor.tsx'), 'utf8');
const studio = readFileSync(join(root, 'src/devtools/DevStudio.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/devtools/dev-layout.css'), 'utf8');
let passed = 0;
let failed = 0;
function check(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}`); }
}

check('editor: módulo existe y se carga de forma lazy', studio.includes("lazy(() => import('./editor')"));
check('editor: registrado en DevModuleId y Overview', studio.includes("| 'editor'") && studio.includes("modules: ['editor', 'system-hub'"));
check('editor: render switch dedicado', studio.includes("module === 'editor' && <EditorModule />"));
check('editor: monta BattlePixiStage de producción', source.includes("import { BattlePixiStage } from '../battle/BattlePixiStage'"));
check('editor: no importa CanonBattleField ni preview DOM', !source.includes('CanonBattleField') && !source.includes('BattleTimeline'));
check('editor: expone transporte Play/Pause/Step/Restart', ['Play', 'Pause', 'Step 1 tick', 'Step 10 ticks', 'Restart'].every(token => source.includes(token)));
check('editor: tiene GAME, HIERARCHY e INSPECTOR reales', ['GAME', 'HIERARCHY', 'INSPECTOR', 'LIVE RUNTIME'].every(token => source.includes(token)));
check('editor: contiene docks Project/Scripts/Timeline/Console/Profiler/ROM', ['PROJECT', 'SCRIPTS', 'TIMELINE', 'CONSOLE', 'PROFILER', 'ROM'].every(token => source.includes(`'${token}'`)));
check('editor: geometría ACTION nativa 160×80 y world scale', source.includes('ACTION_NATIVE_W') && source.includes('ACTION_NATIVE_H') && source.includes('ACTION_WORLD_SCALE'));
check('editor: inspector expone facing efectivo, base y autoridad ROM',
  source.includes('facing') && source.includes('baseFacing') && source.includes('orientationSource') && source.includes('ROM_PHYSICAL_FRAME'));
check('editor: overlays no interfieren con el canvas', css.includes('.dev-editor-grid-overlay') && css.includes('pointer-events:none'));
check('editor: escenario configurable desde SCENARIOS canónicos', source.includes("import { SCENARIOS } from '../data/scenarios'") && source.includes('scenarioId'));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed) process.exit(1);
