/**
 * VERIFY: DEV STUDIO NAVIGATION
 *
 * The Studio keeps every canonical module reachable, but presents them through
 * six workflow areas. This is intentionally a static gate: importing the
 * React module would pull browser-only CSS into the verifier.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const source = readFileSync(join(ROOT, 'src/devtools/DevStudio.tsx'), 'utf8');
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const areaIds = ['overview', 'combat', 'visuals', 'game-data', 'content', 'qa-rom'];
const areaSection = source.match(/export const DEV_AREAS:[\s\S]*?\n\];/u)?.[0] ?? '';
const areaBlocks = [...areaSection.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?modules:\s*\[([^\]]*)\]/g)];
const areas = areaBlocks.map(match => ({ id: match[1], modules: [...match[2].matchAll(/'([^']+)'/g)].map(item => item[1]) }));

check('navigation: six workflow areas declared', areas.length === 6, `found ${areas.length}`);
check('navigation: canonical area ids', areaIds.every(id => areas.some(area => area.id === id)));
check('navigation: area ids unique', new Set(areas.map(area => area.id)).size === areas.length);

const modulesSection = source.match(/export const DEV_MODULES:[\s\S]*?\n\];/u)?.[0] ?? '';
const moduleIds = [...modulesSection.matchAll(/\{ id:\s*'([^']+)'/g)].map(match => match[1]);
const areaModules = areas.flatMap(area => area.modules);
const duplicateModules = areaModules.filter((id, index) => areaModules.indexOf(id) !== index);
const missingModules = moduleIds.filter(id => !areaModules.includes(id));
const unexpectedModules = areaModules.filter(id => !moduleIds.includes(id));

check('navigation: every canonical module appears once', duplicateModules.length === 0 && missingModules.length === 0 && unexpectedModules.length === 0,
  [...new Set([...duplicateModules, ...missingModules, ...unexpectedModules])].join(', '));
check('navigation: six area labels are visible', ['Overview', 'Combat', 'Visuals', 'Game Data', 'Content', 'QA & ROM'].every(label => source.includes(`label: '${label}'`)));
check('navigation: primary area tablist exists', source.includes('className="dev-area-nav"') && source.includes('role="tablist"'));
check('navigation: contextual secondary nav exists', source.includes('className="dev-subnav"') && source.includes('aria-label={`${areaForModule(module).label} modules`}'));
check('navigation: area selection opens a canonical module', source.includes('onClick={() => navigate(area.modules[0])}'));
check('navigation: module buttons remain deep-linkable', source.includes('onClick={() => navigate(item.id)}'));
check('navigation: legacy flat sidebar loop removed', !source.includes('DEV_MODULES.map((m, i)'));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed) process.exit(1);
