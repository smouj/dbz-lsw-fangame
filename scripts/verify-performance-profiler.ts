// VERIFY: PERFORMANCE-PROFILER — contrato del panel Dev-only de medición.
// No ejecuta un navegador: protege la frontera de bundles y evita que el
// panel empiece a inventar métricas o se cuele en producción.
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, condition: boolean, detail?: string) {
  if (condition) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failed += 1; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const studio = readFileSync('src/devtools/DevStudio.tsx', 'utf8');
const profiler = readFileSync('src/devtools/performance/runtimeProfiler.ts', 'utf8');
const panel = readFileSync('src/devtools/performance.tsx', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');
const stub = readFileSync('src/devtools/DevStudioStub.tsx', 'utf8');
const vite = readFileSync('vite.config.ts', 'utf8');

check('performance: módulo registrado en DEV_MODULES', studio.includes("id: 'performance'"));
check('performance: área Runtime incluye el módulo', studio.includes("modules: ['lab', 'timeline', 'combat', 'positions', 'hud', 'performance']"));
check('performance: render switch cubre la ruta', studio.includes("module === 'performance'"));
check('performance: módulos Dev se cargan con React.lazy', studio.includes("const PerformanceModule = lazy(() => import('./performance')"));
check('performance: el cambio de módulo está protegido por Suspense', studio.includes('<Suspense fallback='));
check('performance: no hay imports estáticos de módulos pesados', !/^import .* from ['"]\.\/(dashboard|characters|cards|romdisplay2|hud|lab)['"];?$/mu.test(studio));
check('performance: profiler usa requestAnimationFrame', profiler.includes('requestAnimationFrame(this.onFrame)'));
check('performance: profiler mide tareas largas reales', profiler.includes("entryTypes: ['longtask']") && profiler.includes('this.longTasks'));
check('performance: profiler mide recursos del navegador', profiler.includes("getEntriesByType('resource')") && profiler.includes('resourceBytes'));
check(
  'performance: heap no soportado se muestra como null',
  profiler.includes('heapUsedBytes: typeof memory?.usedJSHeapSize')
    && profiler.includes("? memory.usedJSHeapSize : null")
);
check('performance: no inventa draw calls ni texturas GPU', panel.includes('no se estiman texturas ni draw calls') && panel.includes('No inventado'));
check('performance: captura persiste al salir del módulo', panel.includes('keep collecting while the Dev page is unmounted'));
check('performance: producción mantiene DevStudio stub', stub.includes('export function DevStudio') && !stub.includes('PerformanceModule'));
check('performance: entrypoint mantiene DevStudio lazy', main.includes('const DevStudioLazy = lazy(() => import(\'./devtools/DevStudio\')'));
check('performance: release sigue aliasando DevStudio al stub', vite.includes('DevStudioStub.tsx'));

console.log(`\n═══ RESULTADO: ${passed} passed · ${failed} failed ═══`);
if (failed > 0) {
  console.log('\nFallos:');
  failures.forEach(failure => console.log(` - ${failure}`));
  process.exit(1);
}
