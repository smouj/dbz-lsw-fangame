// ═══════════════════════════════════════════════════════════════════════
// ROM COMPLETION AUDIT (R0) — genera docs/rom/ROM_COMPLETION_MATRIX.md/.json
// Escanea el HEAD actual (no conteos históricos) buscando los tokens de
// deuda y agrupa por dominio. La matriz canónica fusiona el escaneo con la
// lista de deuda conocida del combate (anchors, handlers, AI, audio, etc.).
// Uso: node tools/rom-research/scripts/completion-audit.mjs
// ═══════════════════════════════════════════════════════════════════════
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCOPES = [
  'docs/rom',
  'src/battle/rom',
  'src/battle/presentation',
  'src/battle/engine',
  'src/battle/runtime',
  'src/battle',
  'src/data',
  'src/devtools/romdisplay2',
  'scripts',
  'tools/rom-trace',
  'tools/rom-research',
];

const TOKENS = ['PENDING_ROM_TRACE', 'ROM_PENDING', 'UNRESOLVED', 'UNLINKED', 'PARTIAL', 'INFERRED', 'FUTURE', 'LEGACY', 'UNKNOWN'];
const tokens = TOKENS;

// dominios por ruta/patrón
function domainOf(rel, line) {
  if (/^src\/battle\/engine/.test(rel) && !/ActionObject|handler|macro|display/i.test(line)) return 'Engine';
  if (/^src\/data\//.test(rel)) return 'Data';
  if (/^tools\/rom-trace/.test(rel)) return 'Tracer';
  if (/ActionObject|ACTOR_HOME|TARGET_HOME|CONTACT_POINT|slot.*binding|multi-actor|mirror/i.test(rel + ' ' + line)) return 'ActionObject';
  if (/enemyController|enemyIntent|AI|policy|cpu/i.test(rel + ' ' + line)) return 'AI';
  if (/audio|sfx|music|bgm|sound/i.test(rel + ' ' + line)) return 'Audio';
  if (/romDisplay|RomDisplay|display|tilemap|BG19|shadow|C3CE|C3CF|C3D0|0B07/i.test(rel + ' ' + line)) return 'Display';
  if (/handler|tail|comet|suicide|special/i.test(rel + ' ' + line)) return 'Handler';
  if (/tactical|ACTION.*FIELD|FIELD.*ACTION|palette.*transition|transition/i.test(rel + ' ' + line)) return 'Cinematic';
  if (/macro/i.test(line)) return 'Macros';
  if (/defense.*limit|DEFENSE_LIMIT|defendLimit/i.test(line)) return 'DefenseLIMIT';
  if (/fighter|physical|metasprite|graphicsBlock|extract/i.test(rel + ' ' + line)) return 'FighterPhysical';
  if (/story|chapter|dialogue/i.test(rel + ' ' + line)) return 'Story';
  if (/support|defense|presentationProfile|compile/i.test(rel)) return 'Presentation';
  return 'Other';
}

function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mjs|js|md|json)$/.test(e)) out.push(p);
  }
  return out;
}

const hits = [];;
const files = new Set();
for (const scope of SCOPES) {
  const base = join(ROOT, scope);
  for (const f of walk(base)) {
    const rel = relative(ROOT, f);
    files.add(rel);
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const tok of TOKENS) {
        if (lines[i].includes(tok)) {
          hits.push({ file: rel, line: i + 1, token: tok, text: lines[i].trim().slice(0, 140), domain: domainOf(rel, lines[i]) });
        }
      }
    }
  }
}

// ── agregación por dominio+token ──
const byDomain = new Map();
for (const h of hits) {
  const d = byDomain.get(h.domain) ?? {};
  d[h.token] = (d[h.token] ?? 0) + 1;
  byDomain.set(h.domain, d);
}

// ── matriz canónica de deuda (fusiona escaneo con la deuda conocida) ──
const CANONICAL = [
  { domain: 'ActionObject', item: 'slot semantic binding (slot0/slot1 role)', evidence: 'layout 19B estático decodificado (research-v3)', missing: 'identidad actor/target por rol', method: 'TRACE', impact: 'High', cls: 'DYNAMIC' },
  { domain: 'ActionObject', item: 'ACTOR_HOME / TARGET_HOME', evidence: 'sin coordenadas universales (v3 PENDING)', missing: 'coordenadas absolutas de anclaje', method: 'TRACE', impact: 'High', cls: 'DYNAMIC' },
  { domain: 'ActionObject', item: 'CONTACT_POINT', evidence: 'sin punto de contacto universal demostrado', missing: 'geometría de contacto', method: 'TRACE', impact: 'High', cls: 'DYNAMIC' },
  { domain: 'ActionObject', item: 'left/right mirroring', evidence: 'flip documentado, sin dump de confirmación', missing: 'inversión LEFT↔RIGHT observada', method: 'TRACE', impact: 'Medium', cls: 'DYNAMIC' },
  { domain: 'ActionObject', item: 'multi-actor binding ($0D/$0E)', evidence: 'MULTI_ACTOR_SCRIPT estático', missing: 'binding semántico por slot', method: 'TRACE', impact: 'High', cls: 'DYNAMIC' },
  { domain: 'FighterPhysical', item: 'fighter sprite re-extraction', evidence: 'cadena 411/411 ROM_STATIC_VERIFIED (v3)', missing: 'direcciones de tabla de metasprites no persistidas + extractor', method: 'REEXTRACT', impact: 'High', cls: 'DYNAMIC' },
  { domain: 'Handler', item: 'Tail $0B FSM', evidence: 'static partial (worker $61C5)', missing: 'FSM observada (hit/miss, L/R)', method: 'TRACE', impact: 'Medium', cls: 'DYNAMIC' },
  { domain: 'Handler', item: 'Purple Comet $0D / P.Comet Z $0E', evidence: 'MULTI_ACTOR_SCRIPT estático', missing: 'actividad por slot + cleanup', method: 'TRACE', impact: 'Medium', cls: 'DYNAMIC' },
  { domain: 'Handler', item: 'Suicide $08 / V-ball Crash $0C', evidence: 'worker $5E67/$62D4 estático', missing: 'FSM observada', method: 'TRACE', impact: 'Medium', cls: 'DYNAMIC' },
  { domain: 'Handler', item: 'Rocket Punch $05 / Potbelly Atk $06', evidence: 'launch profiles estáticos', missing: 'FSM completa', method: 'TRACE', impact: 'Low', cls: 'DYNAMIC' },
  { domain: 'DefenseLIMIT', item: 'DEFENSE_LIMIT_LEGACY (runtime debt)', evidence: 'defendLimit → resolveDefenseCard legacy (PA11)', missing: 'contrato ROM real del LIMIT defensivo (CA55/CA02/slot8/CA83)', method: 'STATIC+TRACE', impact: 'Medium', cls: 'RUNTIME_DEBT' },
  { domain: 'Cinematic', item: 'TACTICAL ↔ ACTION cadence', evidence: '$07F4/$080C palette interpolation CGB', missing: 'timing exacto: palette/tilemap/visibility/worker start', method: 'TRACE', impact: 'Medium', cls: 'DYNAMIC' },
  { domain: 'Macros', item: 'semantic macro meaning $2B/$2C/$34/$35', evidence: 'programas literales COMPLETE', missing: 'significado humano (requiere binding actor/objeto)', method: 'STATIC', impact: 'Low', cls: 'STATIC' },
  { domain: 'AI', item: 'ROM CPU decision model', evidence: 'EnemyController Alpha (PA11)', missing: 'policy original (elección/pesos/RNG/CC)', method: 'STATIC+TRACE', impact: 'Medium', cls: 'NON_BLOCKING' },
  { domain: 'Audio', item: 'SFX/BGM map completo', evidence: 'opcodes $13/$14 + IDs parciales', missing: 'mapa acción→sonido + BGM por contexto', method: 'STATIC', impact: 'Medium', cls: 'NON_BLOCKING' },
  { domain: 'Display', item: '$0B07 exact internal format', evidence: 'parcial (composición tilemap)', missing: 'contrato interno exacto', method: 'STATIC', impact: 'Low', cls: 'NON_BLOCKING' },
  { domain: 'Display', item: '$C3CE/$C3CF/$C3D0', evidence: 'en backlog deliberado (V7)', missing: 'significado', method: 'STATIC', impact: 'Low', cls: 'NON_BLOCKING' },
  { domain: 'Display', item: 'direct BG vs shadow $9800/$DD00-$DE00', evidence: 'ambas rutas vistas', missing: 'cuándo usa cada una', method: 'TRACE', impact: 'Low', cls: 'NON_BLOCKING' },
  { domain: 'Story', item: 'Story ROM map (order/battles/dialogue)', evidence: 'excluida del remake (RPG layer)', missing: 'mapeo orden/battle configs/portraits/unlocks', method: 'STATIC', impact: 'Low', cls: 'NON_BLOCKING' },
  { domain: 'Presentation', item: 'UNLINKED_CARD_BYTE8 → CC15', evidence: 'card.byte8 UNLINKED (V7 backlog)', missing: 'enlace byte8→CC15', method: 'STATIC', impact: 'Low', cls: 'NON_BLOCKING' },
];

// ── JSON ──
const json = {
  generatedAt: new Date().toISOString(),
  scannedFiles: files.size,
  tokenHits: hits.length,
  tokens,
  byDomain: Object.fromEntries(byDomain),
  canonicalDebt: CANONICAL,
  samples: hits.slice(0, 40).map((h) => ({ file: h.file, line: h.line, token: h.token, domain: h.domain, text: h.text })),
};
mkdirSync(join(ROOT, 'docs/rom'), { recursive: true });
writeFileSync(join(ROOT, 'docs/rom/ROM_COMPLETION_MATRIX.json'), JSON.stringify(json, null, 2));

// ── MD ──
const md = [];
md.push('# ROM COMPLETION MATRIX — R0 (generado desde el HEAD, no conteos históricos)');
md.push('');
md.push(`Generado: ${new Date().toISOString()} · archivos escaneados: ${files.size} · hits de tokens: ${hits.length}`);
md.push('');
md.push('## Deuda canónica de combate (matriz)');
md.push('');
md.push('| Domain | Item | Current evidence | Missing | Method | Runtime impact | Class |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const c of CANONICAL) {
  md.push(`| ${c.domain} | ${c.item} | ${c.evidence} | ${c.missing} | ${c.method} | ${c.impact} | ${c.cls} |`);
}
md.push('');
md.push('## Hits de tokens por dominio');
md.push('');
md.push('| Domain | ' + TOKENS.map((t) => `\`${t}\``).join(' | ') + ' |');
md.push('| --- |' + ' --- |'.repeat(TOKENS.length));
const doms = [...byDomain.keys()].sort();
for (const d of doms) {
  const row = TOKENS.map((t) => byDomain.get(d)?.[t] ?? 0).join(' | ');
  md.push(`| ${d} | ${row} |`);
}
md.push('');
md.push('## Muestra de hits (primeros 40)');
md.push('');
for (const s of json.samples) {
  md.push(`- \`${s.token}\` ${s.file}:${s.line} (${s.domain}) — ${s.text}`);
}
md.push('');
md.push('## Gate de cierre');
md.push('');
md.push('```text');
md.push('combat PENDING_ROM_TRACE = 0 · combat ROM_PENDING = 0 · combat UNRESOLVED = 0');
md.push('(excepto lo documentado explícitamente como irrelevante para el remake)');
md.push('```');
writeFileSync(join(ROOT, 'docs/rom/ROM_COMPLETION_MATRIX.md'), md.join('\n'));

console.log(`ROM_COMPLETION_MATRIX generado: ${hits.length} hits en ${files.size} archivos → docs/rom/ROM_COMPLETION_MATRIX.md/.json`);
console.log('Top dominios:', doms.slice(0, 12).map((d) => `${d}=${Object.values(byDomain.get(d) ?? {}).reduce((a, b) => a + b, 0)}`).join(' · '));
