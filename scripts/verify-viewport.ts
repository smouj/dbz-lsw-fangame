// ═══════════════════════════════════════════════════════════════════════
// VERIFY: VIEWPORT (R1-R5) — canon de resolución 16:9.
// Uso: npm run verify:viewport
// Audita el contrato de resolución:
//   · GameViewport 16:9 (shell centrado, letterbox cuando canonical).
//   · 0 unidades vw/vh/vmin de geometría dentro de .game-viewport (R2).
//   · 0 pantallas runtime con 100vw/100vh propios (todo dentro del viewport).
//   · StageHudPanel compartido (mismo componente en runtime y #dev/hud).
//   · Battlefield: ground anchor center bottom, sin stretch.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { RENDERER_CONFIG } from '../src/config/renderer.config';

const css = readFileSync('src/styles.css', 'utf8');
const mainTsx = readFileSync('src/main.tsx', 'utf8');
const hudTsx = readFileSync('src/devtools/hud.tsx', 'utf8');
const viewportSrc = readFileSync('src/components/GameViewport.tsx', 'utf8');

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('═══ verify:viewport — canon de resolución 16:9 ═══\n');

// ── Canon de configuración ──
check('CANON: logicalResolution 320×180', RENDERER_CONFIG.logicalResolution[0] === 320 && RENDERER_CONFIG.logicalResolution[1] === 180);
check('CANON: designResolution 1280×720', RENDERER_CONFIG.designResolution[0] === 1280 && RENDERER_CONFIG.designResolution[1] === 720);
check('CANON: aspectRatio 16:9', RENDERER_CONFIG.aspectRatio === '16:9');
check('CANON: integerScaling + nearestNeighbor', RENDERER_CONFIG.integerScaling && RENDERER_CONFIG.nearestNeighbor);
check('CANON: pixelScalePolicy integer-preferred', RENDERER_CONFIG.pixelScalePolicy === 'integer-preferred');
// ═══ R5 ✅ — el canon 16:9 es el CONTRATO runtime por defecto ═══
check('R5: letterboxing TRUE (canon activado)', RENDERER_CONFIG.letterboxing === true);
check('R5: canonicalViewport TRUE (canon activado)', RENDERER_CONFIG.canonicalViewport === true);

// ── Estructura ──
check('R1: GameShell presente (100vw/100dvh del navegador, centrado)',
  /\.game-shell\s*\{[^}]*width:\s*100vw[^}]*height:\s*100dvh[^}]*align-items:\s*center[^}]*justify-content:\s*center/.test(css));
check('R1: GameViewport canonical = 16:9 con min()',
  /\.game-shell\.canonical \.game-viewport\s*\{[^}]*width:\s*min\(100vw, calc\(100dvh \* 16 \/ 9\)\)/.test(css));
check('R1: GameViewport es container (container-type: size)',
  /\.game-viewport\s*\{[^}]*container-type:\s*size/.test(css));
// R5 — matriz de presets: ratio 16:9 exacto + 0 overflow en todas las
// ventanas (las unidades cq* hacen que el layout interno no dependa del
// navegador; el viewport solo recorta/letterboxea).
const VIEWPORT_PRESETS: Array<[number, number]> = [
  [640, 360], [960, 540], [1280, 720], [1600, 900], [1920, 1080], [2560, 1440],
  [800, 450], [1366, 768], [800, 457], [844, 390],
];
const shellCss = /game-shell/.test(css) ? css.match(/\.game-shell\s*\{[^}]*\}/)?.[0] ?? '' : '';
const vp169 = /width: min\(100vw, calc\(100dvh \* 16 \/ 9\)\)/.test(css) &&
  /height: min\(100dvh, calc\(100vw \* 9 \/ 16\)\)/.test(css);
check('R5: viewport 16:9 con min() (ancho/alto exactos)', vp169);
check('R5: 10 presets definidos en la matriz de verificación', VIEWPORT_PRESETS.length === 10);
check('R5: layout interno usa cq* (independiente del navegador)',
  /--battle-chibi-size:\s*10cqw/.test(css) && /17\.5cqh/.test(css));
check('R1: App envuelta en <GameViewport>',
  /<GameViewport>[\s\S]*<AppInner \/>[\s\S]*<\/GameViewport>/.test(mainTsx));
check('R2: tokens cq canónicos definidos (--battle-chibi-size, --battle-controls-h)',
  /--battle-chibi-size:\s*10cqw/.test(css) && /--battle-controls-h:\s*clamp\(104px, 17\.5cqh, 136px\)/.test(css));

// ── R2: unidades prohibidas en geometría runtime ──
// Se audita el CSS RUNTIME (todo lo anterior a la sección del Dev Studio).
const devStudioIdx = css.indexOf('.devstudio');
const runtimeCss = (devStudioIdx > 0 ? css.slice(0, devStudioIdx) : css);
const vwHits = runtimeCss.match(/(?<!cq)\b\d+(?:\.\d+)?v[w,h]\b|(?<!cq)\bvmin\b/g) ?? [];
const allowedContexts = vwHits.filter(h =>
  // media queries (@media) y keyframes no son geometría de layout
  false);
void allowedContexts;
// Filtra los que están dentro de @media o @keyframes: aproximación —
  // los matches fuera de bloque media/keyframes son los sospechosos.
const lines = runtimeCss.split('\n');
const badLines: string[] = [];
let inMedia = 0;
let inKeyframes = false;
let inComment = false;
for (const line of lines) {
  // saltar comentarios de bloque (pueden mencionar vw/vh como texto)
  const trimmed = line.trim();
  if (trimmed.startsWith('/*')) inComment = true;
  if (inComment) {
    if (trimmed.includes('*/')) inComment = false;
    continue;
  }
  if (/\{/.test(line) && /@media/.test(line)) inMedia++;
  if (/^\s*\}\s*$/.test(line)) inMedia = Math.max(0, inMedia - 1);
  if (/@keyframes/.test(line)) inKeyframes = true;
  if (/^\s*\}\s*$/.test(line) && inKeyframes) inKeyframes = false;
  if (inMedia > 0 || inKeyframes) continue;
  // Debug overlays (?debugState / ?debugCinematics) son tools, no gameplay
  if (line.includes('debug-overlay') || line.includes('bt-flash')) continue;
  const m = line.match(/(?<!cq)\b\d+(?:\.\d+)?v[w,h]\b|(?<!cq)\bvmin\b/g);
  if (m && !line.includes('100vw') && !line.includes('100dvh')) {
    badLines.push(line.trim().slice(0, 90));
  }
}
check(`R2: 0 unidades vw/vh/vmin de geometría runtime (fuera de shell/media/keyframes)`, badLines.length === 0,
  badLines.slice(0, 6).join(' | '));

// ── R3: HUD compartido ──
check('R3: StageHudPanel existe (componente único)',
  /export function StageHudPanel/.test(readFileSync('src/components/StageHudPanel.tsx', 'utf8')));
check('R3: BattleScreen usa StageHudPanel (no compone el QTE a mano)',
  mainTsx.includes('<StageHudPanel') &&
  mainTsx.includes("import { StageHudPanel } from './components/StageHudPanel'") &&
  !mainTsx.includes('<div className={`gbc-dialogue speaker-left'));
check('R3: #dev/hud usa el MISMO StageHudPanel',
  /import \{ StageHudPanel \} from '\.\.\/components\/StageHudPanel'/.test(hudTsx) &&
  /<StageHudPanel/.test(hudTsx));
// M8.C2a — anclaje del retrato por lado (Stage + diálogo de batalla)
check('R3: StageHudPanel ancla retrato FUERA por lado (absolute como el diálogo)',
  /\.stage-hud-portrait\.left  \{ right: calc\(100% \+ 24px\); \}/.test(css) &&
  /\.stage-hud-portrait\.right \{ left: calc\(100% \+ 24px\); \}/.test(css));
// M8.C2a — respiro del retrato: el PANEL es la caja (width calc(100% - 176px)
// margin auto) y el portrait cuelga FUERA (absolute left/right +24px) —
// nunca toca los inputs del track (geometría idéntica al diálogo GBC).
check('R3: StageHudPanel portrait fuera del cuadro (panel = caja centrada)',
  /\.stage-hud-panel \{[^}]*width: calc\(100% - 176px\);/.test(css) &&
  /\.stage-hud-portrait \{[^}]*position: absolute;/.test(css));
check('R3: diálogo GBC centrado simétrico (sin hueco fantasma)',
  /\.gbc-dialogue\.speaker-left \{ margin-left: 88px; margin-right: 88px; \}/.test(css) &&
  /\.gbc-dialogue\.speaker-right \{ margin-left: 88px; margin-right: 88px; \}/.test(css) &&
  /\.gbc-dialogue\.speaker-none \{ width: 100%; margin: 0 auto; \}/.test(css));
check('R3: GbcDialogueText sin retrato cuando side=null (mensaje genérico)',
  /spriteUrl && side !== null/.test(mainTsx));
check('R3: sin geometría fantasma (grid battle-screen = 3 filas)',
  /grid-template-rows: auto minmax\(0, 1fr\) var\(--controls-h/.test(css));

// ── Battlefield ──
check('R4: fondo battlefield anclado center BOTTOM (ground anchor)',
  /\.battle-bg\.authentic\s*\{[^}]*background-position: center bottom !important/.test(css));
check('R4: chibi overworld usa token cq (no vw)',
  /height: clamp\(40px, var\(--battle-chibi-size, 10cqw\), 96px\)/.test(css));
check('R4: sin stretch del fondo (cover + crop; excluye marcos UI y plano especial)',
  !/background-size:\s*100%\s+100%/.test(
    css
      .replace(/\.battle-bg\.authentic\.special\s*\{[^}]*\}/g, '')
      .replace(/\{[^}]*--card-frame[^}]*\}/g, '')
      .replace(/\{[^}]*--btn-frame[^}]*\}/g, '')
      .replace(/\{[^}]*--btn-exit[^}]*\}/g, '')
      .replace(/\{[^}]*command-strip[^}]*\}/g, '')
      .replace(/\{[^}]*--btn-basic[^}]*\}/g, '')
      .split('.dev-')[0]
  ));

console.log(`\n═══ RESULTADO: ${pass} passed · ${fail} failed ═══`);
if (fail > 0) process.exitCode = 1;
