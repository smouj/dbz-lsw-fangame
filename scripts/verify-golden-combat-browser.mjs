/**
 * verify-golden-combat:browser — evidencia en navegador REAL (Deliverable 2).
 *
 * Abre el Dev Studio → Combat Lab → Action Trace Inspector (?dev=1#dev/lab) y,
 * para cada acción golden representable como preset del inspector (mismos
 * fixtures deterministas del runtime: GOLDEN_ACTIONS), ejecuta el trace LIVE:
 *   - 0 errores JS (pageerror) capturados durante TODA la sesión;
 *   - alarmas visibles del inspector (MIXED/LEGACY/UNRESOLVED/GENERATED≠CONSUMED)
 *     registradas por acción — nunca ocultadas;
 *   - source de presentación + cues generados/consumidos + rom frames leídos
 *     del DOM (PRESENTATION panel);
 *   - screenshot por acción en .tmp/golden-combat/<id>.png;
 *   - evidence.json con el resultado estructural por acción.
 *
 * NO va en verify:ci (necesita dev server) — igual que verify:game-shell.
 * Uso:  npm run dev  (en otra terminal)  →  npm run verify:golden-combat:browser
 * ENV:  UI_BASE_URL (default http://127.0.0.1:5178/) ·
 *       PLAYWRIGHT_CHROMIUM_EXECUTABLE (opcional; si no, descubrimiento normal)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.UI_BASE_URL || 'http://127.0.0.1:5178/';
const output = '.tmp/golden-combat';
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : process.platform === 'win32' ? { channel: 'msedge' } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message ?? e)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText ?? ''}`));

// Golden action presets (combatTrace.GOLDEN_ACTIONS) → chip del inspector.
const PRESETS = [
  { id: 'stage3', label: '3 Stage', golden: '3 Stage (QTE)' },
  { id: 'standard_damage', label: 'Standard Damage', golden: 'Cont.Punch #5' },
  { id: 'kamehameha', label: 'Kamehameha', golden: 'Kamehameha #12' },
  { id: 'gather', label: 'Gather Power', golden: 'Gather Power' },
  { id: 'guard', label: 'Guard', golden: 'Guard' },
  { id: 'move_h', label: 'Move Horizontal', golden: 'Move H' },
  { id: 'move_v', label: 'Move Vertical', golden: 'Move V' },
  { id: 'defense_card', label: 'Defense Card', golden: 'Defense Card (Taiyoken #19)' },
  { id: 'support', label: 'Support', golden: 'Support #16 (BLOCKED headless)' },
  { id: 'defense_limit', label: 'Defense LIMIT', golden: '(extra — Defense LIMIT)' },
  { id: 'ko', label: 'KO', golden: 'KO' },
  { id: 'goku_ssj_kamehameha', label: 'Goku SSJ Kamehameha', golden: '(pilot beam)' },
  { id: 'piccolo_beam', label: 'Piccolo Beam', golden: '(pilot beam)' },
  { id: 'android16_beam', label: 'Android 16 Beam', golden: '(pilot beam)' },
];

/** Lee un .ati-kv por su label dentro del primer panel que lo contenga. */
async function kv(label) {
  return page.evaluate((lbl) => {
    const kvEls = [...document.querySelectorAll('.ati-kv')];
    const el = kvEls.find((k) => k.querySelector('span')?.textContent === lbl);
    return el ? el.querySelector('b')?.textContent ?? null : null;
  }, label);
}

const evidence = [];

try {
  await page.goto(`${url}?dev=1#dev/lab`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // Dev Studio cargado → Combat Lab → pestaña Trace Inspector.
  await page.waitForSelector('.dev-lab-tab', { timeout: 60000 });
  await page.locator('.dev-lab-tab', { hasText: 'Trace Inspector' }).click();
  await page.waitForSelector('.ati-chip', { timeout: 30000 });
  await page.waitForTimeout(800); // primer trace montado

  for (const preset of PRESETS) {
    const chip = page.locator('.ati-chip', { hasText: preset.label }).first();
    if ((await chip.count()) === 0) {
      evidence.push({ id: preset.id, golden: preset.golden, error: 'chip not found' });
      continue;
    }
    const beforeErrors = pageErrors.length;
    await chip.click();
    await page.waitForTimeout(900); // trace + frames render
    const alarms = await page.evaluate(() =>
      [...document.querySelectorAll('.ati-alarm')].map((a) => a.textContent.trim()));
    const source = await kv('source');
    const cues = await kv('cues');
    const romFrames = await kv('rom frames');
    const profile = await kv('profile');
    const card = await kv('card');
    const outcome = await kv('outcome');
    await page.screenshot({ path: `${output}/${preset.id}.png` });
    evidence.push({
      id: preset.id, golden: preset.golden, chip: preset.label,
      alarms, source, cues, romFrames: romFrames != null ? Number(romFrames) : null,
      profile, card, outcome,
      jsErrorsInRun: pageErrors.length - beforeErrors,
      screenshot: `${preset.id}.png`,
    });
    console.log(`${preset.id.padEnd(20)} source=${source} cues=${cues} romFrames=${romFrames} alarms=[${alarms.join('; ')}]`);
  }

  // Determinismo en browser: RUN ↻ 2× sobre Kamehameha → mismo read-out.
  const kame = page.locator('.ati-chip', { hasText: 'Kamehameha' }).first();
  await kame.click();
  await page.waitForTimeout(600);
  const readOut = async () => page.evaluate(() =>
    [...document.querySelectorAll('.ati-kv')].map((k) => `${k.querySelector('span')?.textContent}=${k.querySelector('b')?.textContent}`).join('|'));
  const runA = await readOut();
  await page.locator('.ati-rerun').click();
  await page.waitForTimeout(600);
  const runB = await readOut();
  evidence.push({ id: 'determinism_run', golden: 'browser determinism', a: runA, b: runB, equal: runA === runB });
  console.log(`determinism RUN↻ ×2: ${runA === runB ? 'IDENTICAL' : 'DIVERGENT'}`);

  await writeFile(`${output}/evidence.json`, JSON.stringify({ pageErrors, consoleErrors, failedRequests, evidence }, null, 2));
  console.log(`\nevidence.json → .tmp/golden-combat/`);
  console.log(`pageerrors=${pageErrors.length} consoleErrors=${consoleErrors.length} failedRequests=${failedRequests.length}`);
  if (pageErrors.length > 0) {
    for (const e of pageErrors) console.log(`  PAGEERROR: ${e}`);
    process.exitCode = 1;
  } else {
    console.log('PASS — 0 errores JS en la sesión de evidencia golden (navegador real).');
  }
} catch (e) {
  console.error(`FATAL: ${String(e)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
