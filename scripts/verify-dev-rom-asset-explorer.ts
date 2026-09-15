// ═══════════════════════════════════════════════════════════════════════
// verify:dev-rom-asset-explorer — DoD del tab `assets` (P0.4R-B8)
// ═══════════════════════════════════════════════════════════════════════
// El Explorer es el punto de entrada transversal que CONSUME la matriz B8
// generada. No puede ser otra fuente de verdad ni una página nueva.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs';
import {
  PRODUCTION_VISUAL_MATRIX_ROWS,
  PRODUCTION_VISUAL_MATRIX_COUNTS,
  PRODUCTION_VISUAL_MATRIX_FAMILIES,
} from '../src/devtools/romdisplay2/productionVisualMatrix.generated';
import { buildVisualMatrix } from './production-visual-matrix';

let checks = 0, failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  checks++;
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

const tabSrc = readFileSync('src/devtools/romdisplay2/assetsTab.tsx', 'utf8');
const indexSrc = readFileSync('src/devtools/romdisplay2/index.tsx', 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const tabCode = stripComments(tabSrc);

console.log('═══ Dev ROM Asset Explorer ═══');

// 1. Ninguna ruta/página Dev nueva y aislada.
check('new standalone Dev route/page = 0',
  !/createRoot|new Route|path:\s*['"]\/dev|registerDevPage/.test(tabCode),
  'el Explorer vive dentro de ROM Display Lab 2.0');

// 2. Ninguna matriz manual dentro de romdisplay2.
check('manual Production matrix inside romdisplay2 = 0',
  !/PRODUCTION_VISUAL_MATRIX_ROWS\s*:\s*\w+\[\]\s*=\s*\[\s*\{/.test(tabCode)
  && /from '\.\/productionVisualMatrix\.generated'/.test(tabSrc),
  'importa el bridge generado, no una tabla propia');

// 3. Familias representadas 14/14.
const fams = new Set(PRODUCTION_VISUAL_MATRIX_ROWS.map(r => r.family));
const missingFams = PRODUCTION_VISUAL_MATRIX_FAMILIES.filter(f => !fams.has(f));
check(`matrix families represented 14/14`, missingFams.length === 0,
  missingFams.length ? `faltan: ${missingFams.join(', ')}` : `${fams.size}/14`);

// 4. Conteos == B8 generado.
const live = buildVisualMatrix();
const countOf = (state: string) => live.filter(r => r.fidelity === state).length;
check('VERIFIED/PENDING/DEFERRED counts == generated B8',
  PRODUCTION_VISUAL_MATRIX_COUNTS.verified === countOf('VERIFIED')
  && PRODUCTION_VISUAL_MATRIX_COUNTS.pending === countOf('PENDING')
  && PRODUCTION_VISUAL_MATRIX_COUNTS.deferred === countOf('DEFERRED_TO_TRACE'),
  `generated ${PRODUCTION_VISUAL_MATRIX_COUNTS.verified}/${PRODUCTION_VISUAL_MATRIX_COUNTS.pending}/${PRODUCTION_VISUAL_MATRIX_COUNTS.deferred} vs live ${countOf('VERIFIED')}/${countOf('PENDING')}/${countOf('DEFERRED_TO_TRACE')}`);

// 5. Sin mapeo por NOMBRE (los assets salen de IDs/canónicos).
check('cardName/actionName → asset mapping = 0',
  !/nameMap|byName|nameToAsset|\.name\s*===\s*['"][^'"]+['"][^\n]*asset/i.test(tabCode),
  'se resuelve por cardId/formId, no por nombre');

// 6. Sin fallback silencioso de asset.
check('silent asset fallback = 0',
  /GENERATED_ASSET_MISSING/.test(tabCode) && !/fallback\s*:\s*['"]?(placeholder|generic|similar)/i.test(tabCode),
  'estado explícito, sin placeholder que parezca válido');

// 7. Sin assets web/externos.
check('web/external assets = 0',
  !/https?:\/\//.test(tabCode) && !/cdn\.|unpkg|jsdelivr/i.test(tabCode),
  'solo recursos locales de la ROM');

// 8. Provenance de BG $19/$1A conservada.
check('BG $19/$1A provenance retained',
  /\\\$1\[9A\]|bgUrl|rom-bg/.test(tabCode) && /bg/.test(tabCode),
  'el BG se muestra con su provenance y comando de build');

// 9. physicalId desde fuente canónica.
check('physicalId displayed from canonical source',
  /firstPhysicalId/.test(tabCode) && PRODUCTION_VISUAL_MATRIX_ROWS.some(r => r.firstPhysicalId !== null),
  'sale de la matriz generada (corpus físico)');

// 10. Production status viene de B8.
check('Production status comes from B8',
  /fidelity/.test(tabCode) && /PRODUCTION_VISUAL_MATRIX_COUNTS/.test(tabSrc),
  'el estado se lee del bridge generado');

// 11. Asset generado faltante = estado explícito.
check('missing generated asset explicit',
  /GENERATED_ASSET_MISSING/.test(tabCode) && /build:rom-bg-assembly/.test(tabCode),
  'resource + comando, sin sustitución');

// 12. Tabs existentes preservados, incluyendo ROM Sprite Atlas.
const tabs = ['visual-master', 'fighters', 'sprite-atlas', 'actions', 'fx', 'support', 'defense', 'palettes', 'provenance', 'assets'];
const missingTabs = tabs.filter(t => !new RegExp(`id: '${t}'`).test(indexSrc));
check('existing romdisplay2 tabs preserved', missingTabs.length === 0,
  missingTabs.length ? `faltan: ${missingTabs.join(', ')}` : `${tabs.length} tabs`);

// 13. El bridge generado existe.
check('generated bridge present',
  existsSync('src/devtools/romdisplay2/productionVisualMatrix.generated.ts'),
  'src/devtools/romdisplay2/productionVisualMatrix.generated.ts');

// 14. Visual Master consume evidencia framebuffer ROM; no manifests manuales.
const visualMasterSrc = existsSync('src/devtools/romdisplay2/visualMasterTab.tsx')
  ? readFileSync('src/devtools/romdisplay2/visualMasterTab.tsx', 'utf8') : '';
check('ROM Visual Master panel present and honest',
  /ROM VISUAL MASTER/.test(visualMasterSrc) &&
  /PENDING_REMAKE_CAPTURE/.test(visualMasterSrc) &&
  /docs\/rom\/generated\/visual-master/.test(visualMasterSrc) &&
  !/spriteManifest|Canonical_Frames_Official|OUT_frames/.test(visualMasterSrc),
  'ROM framebuffer + pending Pixi, sin autoridad manual');

console.log(`\nDev ROM Asset Explorer: ${checks} checks, ${failures} failed`);
console.log(failures ? '❌ verify:dev-rom-asset-explorer FAIL' : '✅ verify:dev-rom-asset-explorer PASS');
process.exit(failures ? 1 : 0);
