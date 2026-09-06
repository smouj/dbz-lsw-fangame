// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Dashboard: estado de producción.
// DEV-SYNC: todos los contadores vienen de getDevProjectSnapshot().
// ═══════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { Activity, AlertTriangle, Boxes, CheckCircle2, Film, Layers3, LucideIcon, PlayCircle, ShieldAlert, Swords } from 'lucide-react';
import { getDevProjectSnapshot } from './devSnapshot';
import { GBC_NATIVE_FPS } from '../data/actionFidelity';
import type { DevModuleId } from './DevStudio';

type Status = 'ok' | 'warn' | 'info' | 'bad';

interface StatCard {
  label: string;
  value: number | string;
  total?: number | string;
  status: Status;
  hint?: string;
  progress?: number;
}

interface MetricGroup {
  title: string;
  icon: LucideIcon;
  status: Status;
  summary: string;
  stats: StatCard[];
  action?: { label: string; module: DevModuleId };
}

interface DashboardNote {
  level: 'warn' | 'info';
  title: string;
  text: string;
}

const PIPELINE: Array<[string, string, Status]> = [
  ['BattleCommand', 'Legalidad unica antes de resolver acciones', 'ok'],
  ['Reducers puros', 'Resolucion por dominio sin tocar vista', 'ok'],
  ['BattleState', 'Estado/selectores como fuente del runtime', 'ok'],
  ['EventLog', 'Hechos del combate consumibles por replay y presentacion', 'ok'],
  ['GBC Clock', 'Ticks como tiempo autoritativo', 'ok'],
  ['BattleRuntime', 'dispatch/advance -> timeline -> presenter', 'ok'],
  ['Presentation Adapter', 'EventLog -> BattleTimeline -> Pixi', 'ok'],
  ['ROM Cutover', 'Ruta ROM y LEGACY conviven con deuda presupuestada', 'warn'],
  ['Replay', 'Pendiente para cierre M9', 'info'],
];

const ENGINE_MILESTONES = [
  { id: 'M1', label: 'State', done: true },
  { id: 'M2', label: 'Rules', done: true },
  { id: 'M3', label: 'Resolution', done: true },
  { id: 'M4', label: 'Events', done: true },
  { id: 'M5', label: 'RNG+Damage', done: true },
  { id: 'M6', label: 'Clock', done: true },
  { id: 'M7', label: 'Presentation', done: true },
  { id: 'M8', label: 'Cutover', done: false },
  { id: 'M9', label: 'Replay', done: false },
];

function pct(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function ratio(value: number, total: number): string {
  return `${value}/${total}`;
}

export function DashboardModule({ onNavigate }: { onNavigate: (m: DevModuleId) => void }) {
  const snap = useMemo(() => getDevProjectSnapshot(), []);
  const { roster, cards, sprites, cinematics, story, audio, scenarios, production, presentationDeployment, runtimeClassification, physicalCorpus, fxCorpus, physicalMapping, romTiming } = snap;

  const healthWarnings = [
    roster.forms !== roster.formsTotal,
    cards.count !== cards.total,
    physicalMapping.cards.mixed > 0,
    fxCorpus.errors > 0,
    fxCorpus.runtimeDistributionErrors > 0,
    romTiming.missingDurationTicks > 0,
    romTiming.sequenceBoundaryErrors > 0,
  ].filter(Boolean).length;

  const headlineStatus: Status = healthWarnings === 0 ? 'ok' : 'warn';

  const groups: MetricGroup[] = [
    {
      title: 'Salud general',
      icon: CheckCircle2,
      status: headlineStatus,
      summary: healthWarnings === 0
        ? 'Snapshot coherente: los checks criticos de conteo y timing no reportan errores activos.'
        : `${healthWarnings} checks requieren atencion antes de considerar el panel limpio.`,
      stats: [
        { label: 'Formas ROM', value: roster.forms, total: roster.formsTotal, status: roster.forms === roster.formsTotal ? 'ok' : 'warn', progress: pct(roster.forms, roster.formsTotal) },
        { label: 'Cartas ROM', value: cards.count, total: cards.total, status: cards.count === cards.total ? 'ok' : 'warn', progress: pct(cards.count, cards.total) },
        { label: 'Capitulos', value: story.chapters, total: 32, status: story.chapters >= 32 ? 'ok' : 'warn', progress: pct(story.chapters, 32) },
        { label: 'Escenarios', value: scenarios, total: 13, status: scenarios >= 13 ? 'ok' : 'warn', progress: pct(scenarios, 13) },
      ],
      action: { label: 'Abrir validacion', module: 'validation' },
    },
    {
      title: 'Deployment de presentacion',
      icon: PlayCircle,
      status: presentationDeployment.pixiActiveByDefault ? 'ok' : 'warn',
      summary: 'Separa capacidad ROM, consumo del adapter y lo que BattleScreen muestra por defecto. La sonda headless no equivale al renderer activo del jugador.',
      stats: [
        { label: 'ROM data available', value: production.romDataAvailable, total: cards.total, status: 'info', progress: pct(production.romDataAvailable, cards.total), hint: 'estructura/perfil disponible' },
        { label: 'ROM route available', value: runtimeClassification.romBacked, total: cards.total, status: runtimeClassification.romBacked === cards.total ? 'ok' : 'warn', progress: pct(runtimeClassification.romBacked, cards.total), hint: `${runtimeClassification.legacy} rutas legacy` },
        { label: 'ROM adapter capable', value: production.romBackedStrict, total: cards.total, status: production.mixed === 0 ? 'info' : 'warn', progress: pct(production.romBackedStrict, cards.total), hint: 'sonda headless, no BattleScreen live' },
        { label: 'Default player visible', value: presentationDeployment.defaultRenderer, status: 'warn', hint: `Pixi: ?${presentationDeployment.pixiQuery}` },
        { label: 'Completion owner', value: presentationDeployment.completionOwnership, status: 'warn', hint: `${presentationDeployment.romCompletionRoutes.join(', ')} → ROM con Pixi` },
      ],
      action: { label: 'Abrir Combat Lab', module: 'lab' },
    },
    {
      title: 'Corpus ROM fisico',
      icon: Boxes,
      status: physicalCorpus.formsRendered === physicalCorpus.formsIndexed ? 'ok' : 'warn',
      summary: `${physicalCorpus.phase} desde ${physicalCorpus.source}; identidad fisica y provenance sincronizados.`,
      stats: [
        { label: 'Formas renderizadas', value: physicalCorpus.formsRendered, total: physicalCorpus.formsIndexed, status: physicalCorpus.formsRendered === physicalCorpus.formsIndexed ? 'ok' : 'warn', progress: pct(physicalCorpus.formsRendered, physicalCorpus.formsIndexed) },
        { label: 'Promoted physical IDs', value: physicalCorpus.physicalIdentities, status: 'ok', hint: `promoted physical IDs · ${physicalCorpus.frameInstances} frame instances` },
        { label: 'Fighter rendered', value: physicalCorpus.resourcesRendered, total: physicalCorpus.resourcesReachable, status: physicalCorpus.resourcesRendered === physicalCorpus.resourcesReachable ? 'ok' : 'warn', progress: pct(physicalCorpus.resourcesRendered, physicalCorpus.resourcesReachable), hint: `${physicalCorpus.resourcesRendererPending} renderer pending · 5 Stage Bank $61` },
        { label: 'Empty records', value: physicalCorpus.transparentFrameRecords, status: 'info', hint: `${physicalCorpus.transparentPhysicalIds} IDs (EMPTY_NOT_PROMOTED)` },
      ],
      action: { label: 'Abrir Characters', module: 'characters' },
    },
    {
      title: 'FX y soporte ROM',
      icon: Layers3,
      status: fxCorpus.errors === 0 && fxCorpus.runtimeDistributionErrors === 0 ? 'ok' : 'warn',
      summary: `Fase ${fxCorpus.phase} (P0.1A offensive FX); offensive FX, windows runtime y support/defense desde registros generados.`,
      stats: [
        { label: 'Offensive FX', value: fxCorpus.offensiveFxResources, total: 28, status: fxCorpus.offensiveFxResources === 28 ? 'ok' : 'warn', progress: pct(fxCorpus.offensiveFxResources, 28) },
        { label: 'Runtime cards', value: fxCorpus.runtimeCards, status: 'ok', hint: `${fxCorpus.runtimeWindowCues} window cues` },
        { label: 'Static complete', value: fxCorpus.runtimeStaticComplete, total: 28, status: fxCorpus.runtimeStaticComplete === 28 ? 'ok' : 'info', progress: pct(fxCorpus.runtimeStaticComplete, 28) },
        { label: 'Distribution errors', value: fxCorpus.runtimeDistributionErrors, status: fxCorpus.runtimeDistributionErrors === 0 ? 'ok' : 'warn' },
      ],
      action: { label: 'Abrir ROM Display', module: 'romdisplay' },
    },
    {
      title: 'Timing ROM',
      icon: Activity,
      status: romTiming.missingDurationTicks === 0 && romTiming.sequenceBoundaryErrors === 0 ? 'ok' : 'warn',
      summary: `Cadencia ${romTiming.powerWindowCadence}; reloj nativo ${GBC_NATIVE_FPS} fps GBC.`,
      stats: [
        { label: 'Cards ROM ticks', value: romTiming.cardsRomTicks, total: cards.total, status: romTiming.cardsRomTicks > 0 ? 'ok' : 'warn', progress: pct(romTiming.cardsRomTicks, cards.total) },
        { label: 'Timed frames', value: romTiming.frameInstancesTimed, status: 'ok', hint: `${romTiming.sequencesVerified} sequences` },
        { label: 'Missing duration', value: romTiming.missingDurationTicks, status: romTiming.missingDurationTicks === 0 ? 'ok' : 'warn' },
        { label: 'Boundary errors', value: romTiming.sequenceBoundaryErrors, status: romTiming.sequenceBoundaryErrors === 0 ? 'ok' : 'warn' },
      ],
      action: { label: 'Abrir Animation', module: 'animation-studio' },
    },
    {
      title: 'Contenido y assets',
      icon: Film,
      status: roster.withSpriteDir >= 42 ? 'ok' : 'warn',
      summary: 'Cobertura jugable y assets principales visibles para revisar el estado del contenido.',
      stats: [
        { label: 'Sprite dirs', value: roster.withSpriteDir, total: roster.forms, status: roster.withSpriteDir === roster.forms ? 'ok' : 'info', progress: pct(roster.withSpriteDir, roster.forms), hint: `${roster.withoutSpriteDir.length} sin dir` },
        { label: 'OUT frames', value: sprites.canonFrames, status: 'ok', hint: `${sprites.runtimePoseCount}/${sprites.poseOrder} poses` },
        { label: 'Audio', value: audio.musicTracks, total: audio.sfx, status: 'ok', hint: 'music/sfx' },
        { label: 'Team battles', value: story.teamBattles, status: story.teamBattles > 0 ? 'ok' : 'warn' },
      ],
      action: { label: 'Abrir Assets', module: 'assets' },
    },
  ];

  const notes: DashboardNote[] = [
    ...(roster.withoutSpriteDir.length > 0 ? [{
      level: 'info' as const,
      title: 'Sprites combat legacy',
      text: `${roster.withoutSpriteDir.length} formas no tienen directorio de sprite de combate: ${roster.withoutSpriteDir.join(', ')}.`,
    }] : []),
    {
      level: 'warn',
      title: 'Gap ROM -> runtime',
      text: `${runtimeClassification.legacy} cartas siguen usando ruta LEGACY; el renderer visible por defecto es ${presentationDeployment.defaultRenderer} y Pixi ROM requiere ?${presentationDeployment.pixiQuery}.`,
    },
    {
      level: 'warn',
      title: 'Visual integrity P0 active',
      text: `La verificacion estructural esta verde, pero falta revision visual pieza a pieza de ${physicalCorpus.formsRendered} formas; un frame puede pasar estructura y aun tener flip/corte incorrecto.`,
    },
    {
      level: 'info',
      title: 'Stage Attack',
      text: 'Ventanas ROM_CONFIRMED: BACK_BACK 0.837s, BACK_FRONT 1.339s, FRONT_BACK 2.009s, FRONT_FRONT 2.511s.',
    },
    {
      level: 'info',
      title: 'Runtime determinista',
      text: 'La iniciativa usa SPD efectiva; empate conserva la iniciativa actual. Engine puro, sin Math.random.',
    },
    {
      level: 'warn',
      title: 'Guardrail V5',
      text: 'palette $FF, handler, AnimationResource y CA53 son semanticas category/path scoped; no normalizar globalmente.',
    },
  ];

  return (
    <div className="dev-panel dev-dashboard">
      <section className={`dev-dash-hero ${headlineStatus}`}>
        <div>
          <div className="dev-kicker">Production snapshot</div>
          <h1>DBZ LSW Dev Dashboard</h1>
          <p>
            Lectura rapida de salud, cobertura ROM, produccion visual y deuda activa.
            Todos los datos salen de <code>getDevProjectSnapshot()</code>.
          </p>
        </div>
        <div className="dev-dash-score">
          <span>{healthWarnings === 0 ? 'OK' : `${healthWarnings} WARN`}</span>
          <small>estado actual</small>
        </div>
      </section>

      <section className="dev-dash-groups">
        {groups.map(group => (
          <MetricGroupCard key={group.title} group={group} onNavigate={onNavigate} />
        ))}
      </section>

      <section className="dev-dash-row">
        <div className="dev-section dev-dashboard-section">
          <div className="dev-section-title">
            <Swords size={16} />
            <h2>BattleEngine pipeline</h2>
          </div>
          <div className="dev-engine-strip">
            {ENGINE_MILESTONES.map(m => (
              <span key={m.id} className={`dev-engine-mile ${m.done ? 'done' : ''}`} title={`${m.id} ${m.label}`}>
                {m.id}
              </span>
            ))}
          </div>
          <div className="dev-pipeline">
            {PIPELINE.map(([stage, detail, status]) => (
              <div key={stage} className={`dev-pipeline-row ${status}`}>
                <span className="dev-pipeline-file">{stage}</span>
                <span className="dev-pipeline-rol">{detail}</span>
                <span className="dev-pipeline-ok">{status === 'ok' ? 'OK' : status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dev-section dev-dashboard-section">
          <div className="dev-section-title">
            <ShieldAlert size={16} />
            <h2>Alertas y guardrails</h2>
          </div>
          <ul className="dev-alerts dev-dashboard-alerts">
            {notes.map(note => (
              <li key={note.title} className={`dev-alert ${note.level}`}>
                {note.level === 'warn' ? <AlertTriangle size={14} /> : <Activity size={14} />}
                <span><strong>{note.title}</strong>{note.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dev-section dev-dashboard-section">
        <div className="dev-section-title">
          <Film size={16} />
          <h2>Fidelidad cinematica</h2>
        </div>
        <div className="dev-fidelity">
          {cinematics.fidelityByLevel.map(f => {
            const percent = pct(f.count, cinematics.fidelityTotal);
            return (
              <div key={f.level} className={`dev-fid-row ${f.level.toLowerCase()}`}>
                <span className="dev-fid-label">{f.level}</span>
                <div className="dev-fid-track"><div style={{ width: `${percent}%` }} /></div>
                <span className="dev-fid-pct">{ratio(f.count, cinematics.fidelityTotal)}</span>
              </div>
            );
          })}
        </div>
        <div className="dev-dashboard-footer-grid">
          <MiniReadout label="GBC verified" value={cinematics.gbcVerified} hint={`${cinematics.gbcInferred} inferred`} />
          <MiniReadout label="Families" value={cinematics.gbcFamilies} hint={`${cinematics.animationCanonFamilies} runtime`} />
          <MiniReadout label="Action profiles" value={cinematics.actionProfiles} hint="firma runtime" />
          <MiniReadout label="Card types" value={Object.entries(cards.byType).map(([k, v]) => `${k}:${v}`).join('  ')} />
        </div>
      </section>
    </div>
  );
}

function MetricGroupCard({ group, onNavigate }: { group: MetricGroup; onNavigate: (m: DevModuleId) => void }) {
  const Icon = group.icon;
  return (
    <article className={`dev-dashboard-card ${group.status}`}>
      <header className="dev-dashboard-card-head">
        <div>
          <Icon size={17} />
          <h2>{group.title}</h2>
        </div>
        <span className={`dev-status-pill ${group.status}`}>{group.status.toUpperCase()}</span>
      </header>
      <p>{group.summary}</p>
      <div className="dev-dashboard-metrics">
        {group.stats.map(stat => <MetricCard key={stat.label} stat={stat} />)}
      </div>
      {group.action && (
        <button className="dev-btn dev-dashboard-action" onClick={() => onNavigate(group.action!.module)}>
          {group.action.label}
        </button>
      )}
    </article>
  );
}

function MetricCard({ stat }: { stat: StatCard }) {
  return (
    <div className={`dev-dashboard-metric ${stat.status}`}>
      <span className="dev-dashboard-metric-label">{stat.label}</span>
      <strong>
        {stat.value}
        {stat.total !== undefined && <small>/{stat.total}</small>}
      </strong>
      {stat.hint && <em>{stat.hint}</em>}
      {stat.progress !== undefined && (
        <div className="dev-dashboard-progress"><div style={{ width: `${stat.progress}%` }} /></div>
      )}
    </div>
  );
}

function MiniReadout({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="dev-dashboard-readout">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <em>{hint}</em>}
    </div>
  );
}
