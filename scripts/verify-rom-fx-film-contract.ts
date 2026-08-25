import { existsSync, readFileSync } from 'node:fs';
import {
  ROM_FX_ATTRIBUTE_STRIPS,
  ROM_FX_BUNDLE_GEOMETRY,
  ROM_FX_FILM_CONTRACT_SUMMARY,
  ROM_FX_EXECUTION_BY_CARD,
  ROM_FX_OPCODE0C_CALL_SITES,
} from '../src/data/generated/romFxFilmContract.generated';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

const jsonPath = 'generated/rom-fx/film_contract.json';
const mdPath = 'generated/rom-fx/film_contract.md';
const publicJsonPath = 'public/assets/rom-fx/film_contract.json';

check('film contract JSON exists', existsSync(jsonPath));
check('film contract MD exists', existsSync(mdPath));
check('public film contract JSON exists', existsSync(publicJsonPath));

check('summary declares STATIC_COMPLETE (not COMPLETE)', ROM_FX_FILM_CONTRACT_SUMMARY.status === 'ROM_FX_WINDOW_STATIC_COMPLETE', ROM_FX_FILM_CONTRACT_SUMMARY.status);
check('static-complete = 28, dynamic pending = 28, complete = 0', ROM_FX_FILM_CONTRACT_SUMMARY.totals.staticCompleteResources === 28 && ROM_FX_FILM_CONTRACT_SUMMARY.totals.dynamicPendingResources === 28 && ROM_FX_FILM_CONTRACT_SUMMARY.totals.completeResources === 0, JSON.stringify(ROM_FX_FILM_CONTRACT_SUMMARY.totals));

check('28 normal offensive bundle geometry rows', ROM_FX_BUNDLE_GEOMETRY.length === 28, String(ROM_FX_BUNDLE_GEOMETRY.length));

const badRelation = ROM_FX_BUNDLE_GEOMETRY.filter(g => g.prefixRelation !== 'DISTINCT_RESULT_GRAPHIC' && g.prefixRelation !== 'PURE_MAP_TRANSLATION');
const badBBox = ROM_FX_BUNDLE_GEOMETRY.filter(g => !g.prefixBBox || !g.resultBBox);
const badTileCount = ROM_FX_BUNDLE_GEOMETRY.filter(g => g.tileCount <= 0);
const pureWithoutDelta = ROM_FX_BUNDLE_GEOMETRY.filter(g => g.prefixRelation === 'PURE_MAP_TRANSLATION' && g.mapDeltaX == null);
const distinctWithDelta = ROM_FX_BUNDLE_GEOMETRY.filter(g => g.prefixRelation === 'DISTINCT_RESULT_GRAPHIC' && g.mapDeltaX != null);
check('every bundle has explicit prefix/result relation', badRelation.length === 0, badRelation.map(g => g.fxHex).join(', '));
check('every bundle has prefix + result BBox', badBBox.length === 0, badBBox.map(g => g.fxHex).join(', '));
check('every bundle has positive tile count', badTileCount.length === 0, String(badTileCount.length));
check('PURE_MAP_TRANSLATION bundles carry mapDeltaX', pureWithoutDelta.length === 0, pureWithoutDelta.map(g => g.fxHex).join(', '));
check('DISTINCT_RESULT_GRAPHIC bundles carry no mapDeltaX', distinctWithDelta.length === 0, distinctWithDelta.map(g => g.fxHex).join(', '));

check('two attribute strip sides present', ROM_FX_ATTRIBUTE_STRIPS.length === 2, String(ROM_FX_ATTRIBUTE_STRIPS.length));
const badStrip = ROM_FX_ATTRIBUTE_STRIPS.filter(s => s.bgPalette !== 4 || s.vramBank !== 1);
check('attribute strips use BG palette 4 + VRAM bank 1', badStrip.length === 0, badStrip.map(s => `side${s.side}`).join(', '));
const badBands = ROM_FX_ATTRIBUTE_STRIPS.filter(s => s.bands.length === 0 || s.bands.some(b => b.rows[0] > b.rows[1]));
check('attribute strips have well-formed bands', badBands.length === 0, String(badBands.length));

check('execution rows present (41)', ROM_FX_EXECUTION_BY_CARD.length === 41, String(ROM_FX_EXECUTION_BY_CARD.length));
check('opcode $0C call sites present (13)', ROM_FX_OPCODE0C_CALL_SITES.length === 13, String(ROM_FX_OPCODE0C_CALL_SITES.length));

// Execution rows must reference a known bundle geometry.
const bundleResources = new Set(ROM_FX_BUNDLE_GEOMETRY.map(g => g.fxResource));
const unknownResource = ROM_FX_EXECUTION_BY_CARD.filter(e => !bundleResources.has(e.fxResource));
check('every execution row references a known bundle', unknownResource.length === 0, unknownResource.map(e => `${e.cardId}:${e.fxHex}`).join(', '));

// JSON/md parity with generated TS.
if (existsSync(jsonPath)) {
  const json = JSON.parse(readFileSync(jsonPath, 'utf8')) as { totals: { normalOffensiveBundles: number; staticCompleteResources: number; dynamicPendingResources: number; completeResources: number } };
  check('JSON mirrors generated summary', json.totals.normalOffensiveBundles === ROM_FX_BUNDLE_GEOMETRY.length && json.totals.staticCompleteResources === 28 && json.totals.dynamicPendingResources === 28 && json.totals.completeResources === 0, JSON.stringify(json.totals));
}

console.log('');
console.log('═══ ROM FX FILM CONTRACT ═══');
console.log(`bundles=${ROM_FX_BUNDLE_GEOMETRY.length}`);
console.log(`staticComplete=${ROM_FX_FILM_CONTRACT_SUMMARY.totals.staticCompleteResources}`);
console.log(`dynamicPending=${ROM_FX_FILM_CONTRACT_SUMMARY.totals.dynamicPendingResources}`);
console.log(`complete=${ROM_FX_FILM_CONTRACT_SUMMARY.totals.completeResources}`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
