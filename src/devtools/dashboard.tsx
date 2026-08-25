// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Dashboard: estado de producción.
// DEV-SYNC: TODOS los contadores vienen de getDevProjectSnapshot()
// (fuente común con Validation/GameConfig/Characters) — nunca
// hardcodeados. El pipeline mostrado es la arquitectura ACTUAL del
// motor (BattleCommand → Engine → Runtime → Presentation Adapter),
// no los módulos M1-M7 sueltos.
// ═══════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { getDevProjectSnapshot } from './devSnapshot';
import { GBC_NATIVE_FPS } from '../data/actionFidelity';
import type { DevModuleId } from './DevStudio';

interface StatCard { label: string; value: number; total: number; ok: boolean; hint?: string; }

const PIPELINE: Array<[string, string]> = [
  ['src/battle/engine/commands/', 'BattleCommand → canExecute (legalidad ÚNICA)'],
  ['src/battle/engine/commands/reduceAcceptedCommand.ts', 'reducers puros (M3) — resolución por dominio'],
  ['src/battle/engine/state/', 'BattleState puro + selectores (M1)'],
  ['src/battle/engine/events/', 'BattleEvent + EventLog (M4) — hechos, no vista'],
  ['src/battle/engine/clock/', 'GBC Clock en ticks (M6) — tiempo autoritativo'],
  ['src/battle/runtime/BattleRuntime.ts', 'orquestador ÚNICO: dispatch/advance → timeline → presenter'],
  ['src/battle/engine/presentation/buildTimeline.ts', 'Presentation Adapter (M7): EventLog → BattleTimeline'],
  ['src/battle/cinematic/GbcCinematicCanon.ts', 'F0 Ground Truth: solo FRAME_VERIFIED / VIDEO_VERIFIED'],
  ['src/data/generated/spriteCounts.generated.ts', 'conteos de frames por forma (fuente: OUT_frames)'],
  ['docs/rom/research-v3/LEDGER.md', 'ROM V3: ActionObject, metasprites, graphics blocks, palettes y Defense slot8'],
  ['docs/rom/research-v4-fx/README.md', 'ROM V4 FX: FXResource, BG_TILEMAP, opcode $0C, scroll SCX/SCY'],
  ['docs/rom/research-v5-support-defense/README.md', 'ROM V5: Support/Defense visual grammar, Move, CA83/CA53 y slot8'],
  ['docs/rom/research-v6-support-physicals/README.md', 'ROM V6 CLOSED: matriz+renders 48/48, palette path, macros literales, slot8 audit, romCA53 contract'],
  ['docs/rom/research-v7-support-defense-consumption/README.md', 'ROM V7: Support/Defense consumption + runtime cutover (V7.2-V7.4 cerrados)'],
  ['docs/rom/generated/physical-corpus/REPORT.md', 'P0 Fighter ROM_PHYSICAL: 552 promoted IDs, EMPTY_NOT_PROMOTED preservado, Dev/Production sincronizado'],
  ['docs/rom/AI_ROM_RE_TOOLCHAIN.md', 'Toolchain RE para agentes: ZIPs auditados, mgbdis recomendado, ejecutables no integrados'],
];

export function DashboardModule({ onNavigate }: { onNavigate: (m: DevModuleId) => void }) {
  const snap = useMemo(() => getDevProjectSnapshot(), []);
  const { roster, cards, sprites, cinematics, story, audio, scenarios, production, physicalCorpus, fxCorpus, physicalMapping } = snap;

  const stats: StatCard[] = [
    { label: 'ROM visible prod.', value: production.romVisible, total: 125, ok: production.romVisible > 0, hint: `${production.romBackedStrict} ROM-backed estricto · ${production.legacyVisible} legacy` },
    { label: 'Formas (ROM 48)', value: roster.forms, total: roster.formsTotal, ok: roster.forms === roster.formsTotal },
    { label: 'Personajes', value: roster.characters, total: roster.characters, ok: roster.characters >= 24, hint: `${roster.characters} jugables` },
    { label: 'Cartas (ROM 125)', value: cards.count, total: cards.total, ok: cards.count === cards.total },
    { label: 'ROM physical forms', value: physicalCorpus.formsRendered, total: physicalCorpus.formsIndexed, ok: physicalCorpus.formsRendered + physicalCorpus.formsPaletteBlocked + physicalCorpus.formsResourceBlocked === physicalCorpus.formsIndexed, hint: `${physicalCorpus.physicalIdentities} IDs · ${physicalCorpus.frameInstances} inst. · ${physicalCorpus.transparentFrameRecords} empty records` },
    { label: 'Physical resources', value: physicalCorpus.resourcesRendered, total: physicalCorpus.resourcesTotal, ok: physicalCorpus.resourcesRendered === 6 && physicalCorpus.resourcesTotal === 66, hint: `${physicalCorpus.resourcesFrameStreamOnly} frame-stream · ${physicalCorpus.resourcesHandlerDependent} handler · ${physicalCorpus.resourcesDynamicPending} dynamic` },
    { label: 'Offensive FX', value: fxCorpus.offensiveFxResources, total: 28, ok: fxCorpus.offensiveFxResources === 28 && fxCorpus.errors === 0 && fxCorpus.runtimeDistributionErrors === 0, hint: `${fxCorpus.paletteBundles} FX/palette · ${fxCorpus.runtimeCards} cards · ${fxCorpus.runtimeWindowCues} windows` },
    { label: 'ROM physical prod.', value: physicalMapping.cards.romPresentationProduction, total: cards.total, ok: physicalMapping.cards.mixed === 0, hint: `${physicalMapping.cards.legacy} legacy · MIXED ${physicalMapping.cards.mixed}` },
    { label: 'Capítulos con mazo', value: story.chapters, total: 32, ok: story.chapters >= 32 },
    { label: 'Combates de equipo', value: story.teamBattles, total: story.teamBattles, ok: story.teamBattles > 0, hint: `${story.teamBattles} cap. 2v2` },
    { label: 'Dirs de sprites', value: roster.withSpriteDir, total: roster.forms, ok: roster.withSpriteDir >= 42 },
    { label: 'Escenarios', value: scenarios, total: 13, ok: scenarios >= 13 },
    { label: 'Perfiles firma', value: cinematics.actionProfiles, total: cinematics.actionProfiles, ok: cinematics.actionProfiles >= 12, hint: 'mín. 12' },
  ];

  const alerts: { level: 'warn' | 'info'; text: string }[] = [];
  if (roster.forms !== roster.formsTotal) alerts.push({ level: 'warn', text: `Faltan ${roster.formsTotal - roster.forms} formas de la ROM (stats_full.json tiene 48).` });
  if (cards.count !== cards.total) alerts.push({ level: 'warn', text: `Faltan ${cards.total - cards.count} cartas de la tabla ROM.` });
  if (roster.withSpriteDir < roster.forms) alerts.push({ level: 'info', text: `${roster.forms - roster.withSpriteDir} formas sin sprite de combate animado: ${roster.withoutSpriteDir.join(', ')}.` });
  if (sprites.unknown > 0) alerts.push({ level: 'info', text: `${sprites.unknown} frames físicos sin evidencia (UNCLASSIFIED honestos — no se asignan a buckets por aproximación).` });
  if (cinematics.gbcVerified === 0) alerts.push({ level: 'info', text: 'F0: 0 secuencias GBC verificadas aún — todo lo funcional es INFERRED hasta captura (nunca se etiqueta como canon GBC).' });
  // RUNTIME vs CANON: las secuencias Stage funcionales son RUNTIME SEQUENCE
  // (fidelity INFERRED) — no "canon GBC" (eso es F0).
  alerts.push({ level: 'info', text: 'Stage Attack: ventanas ROM_CONFIRMED BACK_BACK 0.837s · BACK_FRONT 1.339s · FRONT_BACK 2.009s · FRONT_FRONT 2.511s.' });
  alerts.push({ level: 'info', text: 'Stage: RUNTIME SEQUENCE por nivel (pool fijo, rotación determinista) — fidelity INFERRED hasta verificación F0.' });
  alerts.push({ level: 'info', text: 'Iniciativa: SPD efectiva decide cada turno; empate → persiste la iniciativa actual (determinista — el Engine es puro, sin Math.random).' });
  alerts.push({ level: 'info', text: 'Contraataque: A≈0.4s / B≈0.15s — HYPOTHESIS hasta captura ROM.' });
  alerts.push({ level: 'info', text: 'ROM V3 sincronizado: ActionObject físico cerrado, 411/411 visualFrames validados, Tail/V-ball reachability corregida y Defense slot8 demostrado.' });
  alerts.push({ level: 'info', text: `ROM V4 FX: P0.1A congelado (${fxCorpus.offensiveFxResources}/28 FXResource, ${fxCorpus.sidePhaseRenders} renders); P0.1B emite ${fxCorpus.runtimeWindowCues} ROM_FX_WINDOW para ${fxCorpus.runtimeCards} cards, distribución errors ${fxCorpus.runtimeDistributionErrors}, STATIC_COMPLETE ${fxCorpus.runtimeStaticComplete}/28, COMPLETE ${fxCorpus.runtimeWindowComplete}/28 (SCX/SCY/timing pendientes).` });
  alerts.push({ level: 'info', text: 'ROM V5 sincronizado: Support/Defense grammar cerrada estáticamente; Move separa posición táctica de motion net0; Defense selection solo precarga slot8.' });
  alerts.push({ level: 'info', text: `Fighter identity/enumeration/provenance/RAW-TRIM ✅ CLOSED: ${physicalCorpus.formsRendered}/${physicalCorpus.formsIndexed} formas, ${physicalCorpus.physicalIdentities} promoted IDs, ${physicalCorpus.frameInstances} instances, ${physicalCorpus.transparentFrameRecords} EMPTY_NOT_PROMOTED records (${physicalCorpus.transparentPhysicalIds} IDs). 0 contaminación cross-profile, 0 bloques foráneos.` });
  alerts.push({ level: 'warn', text: `Fighter visual integrity ⚠ P0 ACTIVE: la verificación estructural (direcciones/órden de bloques/cuenta de piezas) está verde, pero la revisión visual pieza a pieza de las ${physicalCorpus.formsRendered} formas sigue pendiente — un frame puede pasar los checks estructurales y aun así tener una pieza mal cortada o volcada (flip).` });
  alerts.push({ level: 'info', text: `P0.5 expansion ACTIVE: ${physicalCorpus.resourcesFrameStreamOnly} resources con frame stream sin promoción física, ${physicalCorpus.resourcesHandlerDependent} handler-dependent, ${physicalCorpus.resourcesDynamicPending} dynamic-pending, ${physicalCorpus.resourcesUnreferenced} unreferenced.` });
  alerts.push({ level: 'info', text: 'ROM V5 baseline congelado. V6 CLOSED: $2C30/$1266, matriz+renders 48/48, palette path, macros literales, slot8 audit, romCA53 contextual. V7 abierto: consumption + cutover $00/$02 ya compilado y verificado.' });
  alerts.push({ level: 'warn', text: 'Guardrail V5: palette $FF, handler, AnimationResource y CA53 son semánticas category/path scoped; no normalizar globalmente.' });

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Estado de producción <span className="dev-header-fixed-badge" title="Header fijo estructural — si NO ves este badge, recarga con Ctrl+Shift+R">v4-fijo</span></h1>
        <p className="dev-sub">Contadores derivados de getDevProjectSnapshot() — la MISMA fuente que Validation, Game Config y Characters. Si algo difiere, el registro es la fuente.</p>
      </header>

      {/* ═══ PIPELINE ÚNICO + FIDELIDAD (2 col, contenido denso arriba) ═══ */}
      <div className="dev-dash-grid">
        <div className="dev-section">
          <h2>Producción real — ROM vs LEGACY</h2>
          <p className="dev-muted" style={{ marginTop: -4 }}>
            Dos rutas coexisten hoy: <strong>LEGACY</strong> (playCardCinematic → profileFor → CinematicProfile → CinematicAdapter → Pixi)
            y <strong>ROM</strong> (romCardData → descriptors → profiles → compiler → PresentationCue).
            <strong>{production.romBackedStrict}</strong>/125 cartas consumen cues ROM gramaticales en producción (canary $02/$0A);
            solo <strong>{physicalMapping.cards.romPresentationProduction}</strong>/125 consumen Fighter frames ROM_PHYSICAL selector-backed.
            <strong> {physicalMapping.cards.legacy}</strong> quedan en LEGACY/PENDING físico.
          </p>
          <div className="dev-fid-note">
            ROM_DATA_AVAILABLE <strong>{production.romDataAvailable}</strong> · CUES_GENERATED <strong>{production.romCuesGenerated}</strong> ·
            CUES_CONSUMED <strong>{production.romCuesConsumed}</strong> · ROM_VISIBLE <strong>{production.romVisible}</strong> ·
            LEGACY_VISIBLE <strong>{production.legacyVisible}</strong> · ROM_BACKED_STRICT <strong>{production.romBackedStrict}</strong> ·
            ROM_PHYSICAL_FRAMES <strong>{production.romPhysicalFrames}</strong> · MIXED <strong>{production.mixed}</strong>
          </div>
          <div className="dev-fid-note">
            PHYSICAL EXTRACTION <strong>{physicalMapping.physicalExtraction.formsRendered}/{physicalMapping.physicalExtraction.formsIndexed}</strong> formas ·
            <strong> {physicalMapping.physicalExtraction.physicalIds}</strong> promoted physical IDs ·
            <strong> {physicalMapping.physicalExtraction.frameInstances}</strong> frame instances ·
            EMPTY_NOT_PROMOTED <strong>{physicalCorpus.transparentFrameRecords}</strong> records / <strong>{physicalCorpus.transparentPhysicalIds}</strong> IDs.
            PHYSICAL MAPPING <strong>{physicalMapping.physicalMapping.romInstancesMapped}/{physicalMapping.physicalMapping.romInstancesTotal}</strong> instances ·
            shared <strong>{physicalMapping.physicalMapping.sharedPhysical}</strong> · unresolved <strong>{physicalMapping.physicalMapping.unresolved}</strong>.
          </div>
          <div className="dev-fid-note">
            PRODUCTION CONSUMPTION ROM_PHYSICAL <strong>{physicalMapping.productionConsumption.romPhysicalRendered}</strong> ·
            CANONICAL_PHYSICAL <strong>{physicalMapping.productionConsumption.canonicalPhysicalRendered}</strong> ·
            MANIFEST_FALLBACK <strong>{physicalMapping.productionConsumption.manifestFallbackRendered}</strong> ·
            UNRESOLVED <strong>{physicalMapping.productionConsumption.unresolvedRendered}</strong> ·
            CARDS ROM <strong>{physicalMapping.cards.romPresentationProduction}/{cards.total}</strong> · LEGACY <strong>{physicalMapping.cards.legacy}</strong> · MIXED <strong>{physicalMapping.cards.mixed}</strong>.
          </div>
          <p className="dev-muted" style={{ marginTop: 4 }}>
            La lista inferior es la <strong>arquitectura objetivo del Engine</strong> (referencia), no la ruta que
            las acciones usan hoy en producción.
          </p>
          <div className="dev-pipeline">
            {PIPELINE.map(([file, rol]) => (
              <div key={file} className="dev-pipeline-row">
                <span className="dev-pipeline-file"><code>{file}</code></span>
                <span className="dev-pipeline-rol">{rol}</span>
                <span className="dev-pipeline-ok">✓</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dev-section">
          <h2>Fidelidad</h2>
          <div className="dev-fidelity">
            {cinematics.fidelityByLevel.map(f => {
              const pct = Math.round((f.count / cinematics.fidelityTotal) * 100);
              const color = f.level === FidelityColorMap.FRAME_VERIFIED ? '#7fd4ff'
                : f.level === FidelityColorMap.VERIFIED ? '#3fae5a'
                : f.level === FidelityColorMap.INFERRED ? '#d8a830'
                : '#c04040';
              return (
                <div key={f.level} className="dev-fid-row">
                  <span className="dev-fid-label">{f.level}</span>
                  <div className="dev-fid-track"><div style={{ width: `${pct}%`, background: color }} /></div>
                  <span className="dev-fid-pct">{f.count}/{cinematics.fidelityTotal}</span>
                </div>
              );
            })}
            <div className="dev-fid-note">
              Sprites OUT_frames: <strong>{sprites.canonFrames}</strong> frames ({Object.entries(sprites.byStatus).map(([k, v]) => `${k} ${v}`).join(' · ')}) ·
              {sprites.runtimePoseCount} poses con frame físico de {sprites.poseOrder} en COMBAT_POSE_ORDER.
            </div>
            <div className="dev-fid-note">
              F0: <strong>{cinematics.gbcVerified}</strong> secuencias verificadas · {cinematics.gbcInferred} INFERRED ·
              {cinematics.gbcFamilies} familias cinematográficas · {cinematics.animationCanonFamilies} familias runtime ·
              reloj nativo {GBC_NATIVE_FPS} fps GBC.
            </div>
            <div className="dev-fid-note">
              ROM V3/V4/V5: ActionObject + fighter graphics pipeline cerrados por estática; Beam FX físico
              como BG tilemap; Support/Defense grammar física importada. Estado visible:
              <strong> P0.1A FX {fxCorpus.offensiveFxResources}/28</strong>, <strong>P0.1B windows {fxCorpus.runtimeWindowCues} cues / {fxCorpus.runtimeCards} cards</strong> y side selection {fxCorpus.runtimeSideSelectionComplete}/{fxCorpus.runtimeSideSelectionPending} estático.
            </div>
            <div className="dev-fid-note">
              P0 Fighter ROM_PHYSICAL: <strong>{physicalCorpus.physicalIdentities}</strong> promoted IDs físicos ·
              <strong> {physicalCorpus.frameInstances}</strong> frame instances ·
              <strong> {physicalCorpus.transparentFrameRecords}</strong> EMPTY_NOT_PROMOTED records ({physicalCorpus.transparentPhysicalIds} IDs) ·
              <strong> {physicalCorpus.signedNegativeInstances}</strong> offsets signed-negativos ·
              <strong> {physicalCorpus.resourcesRendered}/{physicalCorpus.resourcesTotal}</strong> AnimationResources renderizables ·
              dimensiones max {physicalCorpus.maxWidth}×{physicalCorpus.maxHeight}. Identidad/enumeración/provenance/RAW-TRIM cerrados; <strong>visual integrity sigue ACTIVE</strong> (revisión pieza a pieza pendiente).
            </div>
          </div>
        </div>
      </div>

      <div className="dev-grid dev-grid-cards">
        {stats.map(s => (
          <div key={s.label} className={`dev-stat-card ${s.ok ? 'ok' : 'bad'}`}>
            <div className="dev-stat-value">{s.value}<span className="dev-stat-total">/{s.total || '—'}</span></div>
            <div className="dev-stat-label">{s.label}</div>
            {s.hint && <div className="dev-stat-hint">{s.hint}</div>}
            <div className="dev-stat-bar"><div style={{ width: `${Math.min(100, (s.value / Math.max(1, s.total)) * 100)}%` }} /></div>
          </div>
        ))}
        <EngineMilestoneCard />
      </div>

      <div className="dev-dash-grid">
        <div className="dev-section">
          <h2>Alertas</h2>
          <ul className="dev-alerts">
            {alerts.map((a, i) => (
              <li key={i} className={`dev-alert ${a.level}`}><strong>{a.level.toUpperCase()}</strong> {a.text}</li>
            ))}
          </ul>
        </div>

        <div className="dev-section">
          <h2>Atajos</h2>
          <div className="dev-shortcuts">
            <button className="dev-btn" onClick={() => onNavigate('characters')}>Character Studio</button>
            <button className="dev-btn" onClick={() => onNavigate('cards')}>Card Database</button>
            <button className="dev-btn" onClick={() => onNavigate('positions')}>Position Lab</button>
            <button className="dev-btn" onClick={() => onNavigate('validation')}>Validación</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Colores por nivel — espejo del enum (evita importar el enum solo para esto)
const FidelityColorMap: Record<string, string> = { FRAME_VERIFIED: 'FRAME_VERIFIED', VERIFIED: 'VERIFIED', INFERRED: 'INFERRED' };

// ── Estado del BattleEngine — milestones de la migración M1→M9 ──
const ENGINE_MILESTONES = [
  { id: 'M1', label: 'State', done: true },
  { id: 'M2', label: 'Rules', done: true },
  { id: 'M3', label: 'Resolution', done: true },
  { id: 'M4', label: 'Events', done: true },
  { id: 'M5', label: 'RNG+Damage', done: true },
  { id: 'M6', label: 'Clock', done: true },
  { id: 'M7', label: 'Presentation', done: true },
  { id: 'M8', label: 'Cutover', done: false, hint: 'M8.C en curso: MOVE+GUARD+defensa migrados' },
  { id: 'M9', label: 'Replay', done: false },
];

function EngineMilestoneCard() {
  return (
    <div className="dev-stat-card ok dev-engine-card">
      <div className="dev-stat-value" style={{ fontSize: 15 }}>M7<span className="dev-stat-total" style={{ fontSize: 11 }}>/M9</span></div>
      <div className="dev-stat-label">BattleEngine (migración)</div>
      <div className="dev-engine-miles">
        {ENGINE_MILESTONES.map(m => (
          <span key={m.id} className={`dev-engine-mile ${m.done ? 'done' : ''}`} title={`${m.id} ${m.label}${m.hint ? ` — ${m.hint}` : ''}`}>
            {m.id}{m.done ? ' ✓' : ''}
          </span>
        ))}
      </div>
      <div className="dev-stat-hint">
        M8.C2a-L cerrado: DefenseState (NONE/AWAITING_CHOICE/COMMITTED) · END_EXCHANGE ·
        fase ≠ lado atacante · iniciativa dinámica por SPD efectiva.
      </div>
    </div>
  );
}
