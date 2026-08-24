// ═══════════════════════════════════════════════════════════════════════
// S-MAP1 — sprite-mapping/build.ts
// Genera docs/rom/generated/sprite-mapping/ (9 salidas ROM-FIRST).
//   npx tsx tools/sprite-mapping/build.ts
// NO toca Engine/Runtime. V9 queda fuera de toda autoridad física.
// ═══════════════════════════════════════════════════════════════════════
import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { classifyForm, loadFormManifest, SPRITES_DIR } from './classify.ts';
import { MOVEMENT_FX, type RuntimeSpriteBinding, type SpriteClassification } from './taxonomy.ts';

const ROOT = process.cwd() || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'docs/rom/generated/sprite-mapping');

// ── SPRITE_DIRS del runtime (formId → dir) — import desde el TS del runtime.
import { spriteDirs } from '../../src/data/spriteManifest.ts';

const SPRITE_DIRS = spriteDirs();

const forms = Object.keys(SPRITE_DIRS).sort();
const dirs = [...new Set(Object.values(SPRITE_DIRS))].sort();

// ── 1) physical-actor-index: poses físicas reales (sin composites/FX/aliases) ──
const PHYSICAL = new Set<SpriteClassification>(['ROM_PHYSICAL', 'CANONICAL_PHYSICAL', 'SHARED_PHYSICAL']);

interface PhysicalEntry {
  formId: string;
  dir: string;
  pose: string;
  classification: SpriteClassification;
  ownerPose?: string;
  files: string[];
  provenance: string;
}

const physicalActorIndex: PhysicalEntry[] = [];

// ── 2) runtime-pose-bindings: el registro maestro ──
const runtimePoseBindings: Record<string, RuntimeSpriteBinding[]> = {};

// ── 3) runtime-composites ──
const runtimeComposites: RuntimeSpriteBinding[] = [];

// ── 4) fx-reference-index ──
const fxReferenceIndex: Record<string, unknown> = { poses: [], movementFx: MOVEMENT_FX };

// ── 5) form-sharing ──
const shared: Record<string, string[]> = {};
for (const [form, dir] of Object.entries(SPRITE_DIRS)) {
  (shared[dir] ??= []).push(form);
}
const formSharing = Object.entries(shared).map(([dir, forms2]) => ({
  dir,
  forms: forms2,
  classification: forms2.length > 1 ? 'SHARED_RUNTIME_DIR' : 'EXCLUSIVE_DIR',
  note: forms2.length > 1
    ? 'Mismo directorio runtime — NO implica identidad física ROM (requiere actorVisualProfileKey+graphics bank+palette)'
    : 'Directorio exclusivo',
}));

// ── 6) canonical-source-index: archivo → registro ──
const canonicalSourceIndex: unknown[] = [];

// ── 7) source-only ──
const sourceOnly: unknown[] = [];

// ── 8) unresolved ──
const unresolved: unknown[] = [];

// Orphan files (no referenciados por el manifest) por dir.
function orphanFiles(dir: string): string[] {
  const m = loadFormManifest(dir);
  if (!m) return [];
  const referenced = new Set<string>();
  for (const p of Object.values(m.poses)) for (const f of p.frames) referenced.add(f.file);
  const p = join(SPRITES_DIR, dir);
  if (!existsSync(p)) return [];
  return readdirSync(p).filter((f) => f.endsWith('.png') && !referenced.has(f));
}

for (const form of forms) {
  const dir = SPRITE_DIRS[form]!;
  const bindings = classifyForm(form, dir);
  if (!bindings) {
    unresolved.push({ formId: form, issue: 'manifest.json ausente' });
    continue;
  }
  runtimePoseBindings[form] = bindings;
  for (const b of bindings) {
    // canonical-source-index: por archivo
    for (const file of b.files) {
      canonicalSourceIndex.push({
        file,
        formId: form,
        dir,
        pose: b.runtimePose,
        classification: b.classification,
        canonicalId: `${form}.${b.runtimePose}.${b.files.indexOf(file)}.${file}`,
        source: 'public/assets/sprites/<dir>/manifest.json (Canonical_Frames_Official)',
        v9Role: null,
      });
    }
    if (PHYSICAL.has(b.classification)) {
      physicalActorIndex.push({
        formId: form, dir, pose: b.runtimePose, classification: b.classification,
        ownerPose: b.ownerPose, files: b.files,
        provenance: b.evidence.join('; '),
      });
    }
    if (b.classification === 'COMPOSITE') runtimeComposites.push(b);
    if (b.classification === 'REFERENCE_FX') {
      fxReferenceIndex.poses.push({
        formId: form, pose: b.runtimePose, files: b.files,
        note: 'Dominio FX/BG, no FighterActor',
      });
    }
    if (b.classification === 'MISSING' || b.classification === 'UNRESOLVED') {
      unresolved.push({ formId: form, pose: b.runtimePose, classification: b.classification, evidence: b.evidence });
    }
  }
  // archivos huérfanos
  for (const f of orphanFiles(dir)) {
    unresolved.push({ formId: form, dir, file: f, issue: 'archivo no referenciado por el manifest (SOURCE_ONLY o UNRESOLVED)' });
  }
}

// ── source-only (histórico/documentado; no presentes en HEAD) ──
sourceOnly.push(
  { formId: 'vegito_base', status: 'SOURCE_ONLY / PROJECT_DERIVED', note: 'Recolor generado por el proyecto; NO es forma física GBC. HEAD solo tiene vegito_ssj (CANONICAL candidate).' },
  { formId: 'cell_custom_standing', status: 'NOT_PRESENT_IN_HEAD', note: 'Custom Standing Pose de Cell documentada históricamente; sin referencias en HEAD actual.' },
  { formId: 'piccolo_unused_sprites', status: 'NOT_PRESENT_IN_HEAD', note: 'Sprites Piccolo documentados como unused; sin referencias en HEAD actual.' },
);

// ── REPORT.md ──
const totalBindings = Object.values(runtimePoseBindings).reduce((n, v) => n + v.length, 0);
const count = (cls: SpriteClassification) =>
  Object.values(runtimePoseBindings).reduce((n, v) => n + v.filter((b) => b.classification === cls).length, 0);
const physicalCount = count('CANONICAL_PHYSICAL') + count('SHARED_PHYSICAL') + count('ROM_PHYSICAL');
const runtimeCoverage = (totalBindings / (totalBindings + count('MISSING'))) * 100;

const report = `# S-MAP1 — ROM-FIRST SPRITE MAPPING (REPORT)

Generado: ${new Date().toISOString()} · HEAD local (origin/main puede estar atrasado).

## Principio

\`\`\`text
RUNTIME_RESOLVED ≠ PHYSICAL
ROM_PHYSICAL ≠ CANONICAL_PHYSICAL ≠ MANIFEST_POSE ≠ COMPOSITE ≠ FALLBACK ≠ FX
\`\`\`

## Cobertura

| Métrica | Valor |
| --- | --- |
| Formas indexadas (SPRITE_DIRS) | ${forms.length} / ${forms.length} (100%) |
| Directorios físicos | ${dirs.length} |
| Bindings form×pose | ${totalBindings} |
| Runtime coverage (presentes / total) | ${runtimeCoverage.toFixed(1)} % |
| Physical coverage (CANONICAL+SHARED+ROM) | ${physicalCount} bindings (${((physicalCount / totalBindings) * 100).toFixed(1)} %) |
| Composite coverage | ${count('COMPOSITE')} |
| FX coverage | ${count('REFERENCE_FX')} |
| Alias coverage | ${count('SEMANTIC_ALIAS')} |
| Fallback coverage | ${count('FALLBACK')} |
| Missing | ${count('MISSING')} |
| Unresolved | ${count('UNRESOLVED')} |

> **Physical coverage NO tiene obligación de ser 100 %.** Toda clasificación física
> exige provenance; si no existe → UNRESOLVED.

## Clasificaciones por estado

| Estado | Count |
| --- | --- |
${Object.keys(countByClass()).map((k) => `| ${k} | ${countByClass()[k]} |`).join('\n')}

## Decisiones clave

- \`beam_ray\`, \`beam_ray_tip\`, \`aura_power\`, \`aura_support\` → **REFERENCE_FX** (dominio BG/FX: FXResource → VRAM \$8800 → BG \$9800 → SCX/SCY). Fuera de FIGHTER PHYSICAL POSES.
- \`punch_right/left\`, \`kick_right\`, \`knockback_*\`, \`beam_guard\`, \`evade\` → **COMPOSITE** (secuencias de idle/attack_fwd/attack_ud/hurt/guard/move_back). No incrementan PHYSICAL_POSE_COUNT.
- \`power_up\` → **SEMANTIC_ALIAS** de \`gather_power\` (mismo PNG; la ROM debe demostrar identidad física independiente).
- \`move_back\` → **SHARED_PHYSICAL** de \`move_front\` (reutilización física, función distinta).
- Form sharing (\`vegeta_majin→vegeta_ssj\`, \`piccolo_kami/evil→piccolo_base\`, \`gohan_adult_ssj2→gohan_adult_ssj\`) = **SHARED_RUNTIME_DIR**: runtime válido, identidad física ROM NO demostrada.
- Destruct-Disk / S.Destruc-D. = familia Beam handler \$07 (lanzamiento/waits/FX/screen path propios). **Ningún asset de disco es guard** (REFUTED si algún manifest histórico lo decía).
- Movement stripes = \`move_horizontal_fx\` / \`move_vertical_fx\` → **Movement FX Registry** (Basic > Move), NUNCA la carta Avoiding.
- V9 (\`spriteCanon.generated.ts\`, \`build-sprite-canon.py\`, \`import-canonical-frames.py\`) = **LEGACY_SEMANTIC_REFERENCE**: prohibido como upstream del canon físico. El mapping usa manifests runtime + Canonical_Frames_Official.
- \`vegito_base\` = SOURCE_ONLY/PROJECT_DERIVED (HEAD solo tiene vegito_ssj).
- Cell custom standing pose / Piccolo unused: NO presentes en HEAD (histórico).

## Salidas

\`\`\`text
physical-actor-index.json
canonical-source-index.json
runtime-pose-bindings.json
runtime-composites.json
fx-reference-index.json
form-sharing.json
source-only.json
unresolved.json
REPORT.md
\`\`\`

## Verificación

\`\`\`bash
npm run verify:sprite-mapping
\`\`\`
`;

function countByClass(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of Object.values(runtimePoseBindings)) {
    for (const b of v) out[b.classification] = (out[b.classification] ?? 0) + 1;
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
const json = (o: unknown) => JSON.stringify(o, null, 1);
writeFileSync(join(OUT, 'physical-actor-index.json'), json(physicalActorIndex));
writeFileSync(join(OUT, 'canonical-source-index.json'), json(canonicalSourceIndex));
writeFileSync(join(OUT, 'runtime-pose-bindings.json'), json(runtimePoseBindings));
writeFileSync(join(OUT, 'runtime-composites.json'), json(runtimeComposites));
writeFileSync(join(OUT, 'fx-reference-index.json'), json(fxReferenceIndex));
writeFileSync(join(OUT, 'form-sharing.json'), json(formSharing));
writeFileSync(join(OUT, 'source-only.json'), json(sourceOnly));
writeFileSync(join(OUT, 'unresolved.json'), json(unresolved));
writeFileSync(join(OUT, 'REPORT.md'), report);

console.log(`S-MAP1: ${forms.length} formas · ${totalBindings} bindings · salidas en docs/rom/generated/sprite-mapping/`);
console.log(`  física=${physicalCount} composite=${count('COMPOSITE')} fx=${count('REFERENCE_FX')} alias=${count('SEMANTIC_ALIAS')} fallback=${count('FALLBACK')} missing=${count('MISSING')}`);
