// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Card Database (125 cartas ROM)
// Filtros por tipo / CC / rareza + ficha detallada.
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { CARDS, cardColor, getCard, type CardType, type CardDef } from '../data/cards';
import { FORMS } from '../data/roster';
import { spriteDirFor } from '../data/spriteManifest';
import { characterName } from '../data/storyPanels';
import { cardIconUrl } from '../data/icons';
import { cardCinematic } from '../data/cardsCinematic';
import { actionSemanticsForCard, resolveActionProfile } from '../battle/actionProfiles';
import { DEFENSE_ROM_RULES, STANDARD_ATTACK_HANDLERS, impactClassForPower, standardAttackProfileFor, SPECIAL_HANDLER_DESCRIPTORS, specialHandlerForCard, type RomActionHandlerDescriptor } from '../battle/engine/rom/romDescriptors';
import { canonForAction } from '../battle/animationCanon';
import { animationTaxonomyForCard } from '../battle/animationTaxonomy';
import { animationResourceById, type AnimationResourceCompletionDisposition } from '../battle/animationResources';
import { cardPhysicalCoverageForCard, type CardPhysicalCoverageStatus } from '../battle/cardPhysicalCoverage';
import { physicalMappingSummaryForCard, staticGapCauseForResourceId } from '../battle/physicalFrameReconciliation';
import { romActionExecutionDescriptorForCard } from '../battle/romActionExecutionDescriptors';
import { romPresentationProfileForCard } from '../battle/romPresentationProfiles';
import { romPresentationTimelineForCard } from '../battle/romPresentationForCard';
import { AttackPreview } from './AttackPreview';
import { PhysicalReconciliationSummary } from './PhysicalReconciliationSummary';

const TYPES: (CardType | 'all')[] = ['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'];

const PHYSICAL_STATUS_LABEL: Record<CardPhysicalCoverageStatus, string> = {
  NO_ROM_ANIMATION: 'NO ANIM',
  ROM_RESOURCE_MISSING: 'MISSING',
  RESOURCE_DECODED_COMPLETE: 'PHYS OK',
  RESOURCE_DECODED_PARTIAL: 'PHYS PART',
  RESOURCE_DECODED_UNRESOLVED: 'PHYS TODO',
  RESOURCE_PARTIAL: 'STATIC PART',
  RESOURCE_SPECIAL: 'SPECIAL',
  RESOURCE_UNKNOWN: 'UNKNOWN',
};

function physicalStatusClass(status: CardPhysicalCoverageStatus): string {
  if (status === 'RESOURCE_DECODED_COMPLETE') return 'ok';
  if (status === 'RESOURCE_DECODED_PARTIAL') return 'warn';
  if (status === 'RESOURCE_DECODED_UNRESOLVED' || status === 'RESOURCE_PARTIAL' || status === 'RESOURCE_SPECIAL') return 'pending';
  if (status === 'ROM_RESOURCE_MISSING' || status === 'RESOURCE_UNKNOWN') return 'bad';
  return 'neutral';
}

function completionDispositionClass(disposition: AnimationResourceCompletionDisposition | undefined): string {
  if (disposition === 'STATICALLY_CLOSED') return 'ok';
  if (disposition === 'STATICALLY_CLOSABLE') return 'warn';
  if (disposition === 'NEEDS_DYNAMIC_TRACE') return 'pending';
  if (disposition === 'STATIC_LIMIT_REACHED') return 'neutral';
  return 'neutral';
}

const EFFECT_LABEL: Record<string, string> = {
  command_3: '3 Stage', command_4: '4 Stage', command_5: '5 Stage', command_6: '6 Stage',
  damage: 'Damage', damage_pierce: 'Pierce', damage_special: 'Damage+', damage_special_team: 'Team', damage_special_lowacc: 'LowACC', damage_low_acc: 'LowACC',
  beam: 'Beam', beam_team: 'Team', beam_suicide: 'Suicide', beam_varhp: 'Body Change',
  heal_25pct: 'Heal 25%', heal_strong: 'Heal+', heal_light: 'Heal',
  buff_kaio: 'Kaio', buff_ki8: 'KI+', buff_str8: 'STR+', buff_speed8: 'SPD+', buff_guard8: 'G+', buff_str_ki8: 'STR/KI+',
  debuff_str8: 'STR−', debuff_ki8: 'KI−', debuff_speed8: 'SPD−', debuff_speed8_lowacc: 'SPD−', debuff_guard8: 'G−',
  attack_power_down: 'PWR−', powerdown_cleanse: 'Cleanse', powerup_dispel: 'Dispel', support_dispel: 'Dispel',
  avoid_beam: 'Avoid beam', avoid_damage: 'Avoid dmg', avoid_damage_taiyoken: 'Taiyoken', reduce_damage: 'Reduce', absorb_beam: 'Absorb',
  command_cancel: 'Cancel', accuracy_up: 'ACC+', evasion_up: 'EVA+', knockdown_dmg: 'Knock', knockdown_min: 'Knock', medical_machine: 'Medic',
  life_drain: 'Drain', cc_recovery: 'CC+', lock_on: 'Lock', sunglasses: 'Sunglasses', gamebomb: 'Bomb', candy: 'Candy', naughty_book: 'Book',
  beam_shield: 'Beam guard', damage_shield: 'Dmg guard', ohko_lowacc: 'OHKO', android_kill: 'Android kill', special_card: 'Special',
};

export function CardsModule() {
  const [type, setType] = useState<CardType | 'all'>('all');
  const [q, setQ] = useState('');
  const [ccMax, setCcMax] = useState(99);
  const [selectedId, setSelectedId] = useState<number | null>(12);

  const filtered = useMemo(() => {
    return CARDS.filter(c => {
      if (type !== 'all' && c.type !== type) return false;
      if (c.cc > ccMax) return false;
      if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [type, q, ccMax]);

  const selected = selectedId !== null ? getCard(selectedId) : null;

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Card Database</h1>
        <p className="dev-sub">{CARDS.length} cartas de la tabla ROM RO11:$4320 · {filtered.length} visibles</p>
      </header>

      <PhysicalReconciliationSummary />

      <div className="dev-filters">
        <div className="dev-filter-group">
          {TYPES.map(t => (
            <button key={t} className={`dev-filter-chip ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        <input className="dev-search" placeholder="Buscar carta…" value={q} onChange={e => setQ(e.target.value)} />
        <label className="dev-cc-filter">
          CC ≤ <input type="number" min={0} max={99} value={ccMax} onChange={e => setCcMax(Number(e.target.value))} />
        </label>
      </div>

      <div className="dev-cards-layout">
        <div className="dev-card-list">
          {filtered.map(c => {
            const coverage = cardPhysicalCoverageForCard(c);
            return (
              <button key={c.id} className={`dev-card-row ${selectedId === c.id ? 'active' : ''}`}
                onClick={() => setSelectedId(c.id)}>
                <span className="dev-card-id">{String(c.id).padStart(3, '0')}</span>
                <span className="dev-card-sprite">
                  {cardIconUrl(c.id) ? <img src={cardIconUrl(c.id)} alt={c.name} loading="lazy" /> : <span className="dev-card-sprite-empty">—</span>}
                </span>
                {/* M8.F0 — frame del ataque de la carta (preview estática del
                    primer frame de su pose canónica) */}
                <span className="dev-card-attack-frame">
                  <AttackPreview card={c} size={40} />
                </span>
                <span className="dev-card-type" style={{ background: cardColor(c.type) }}>{c.type[0].toUpperCase()}</span>
                <span className="dev-card-name">{c.name}</span>
                <span className="dev-card-stats">⚔{c.atk} · ◎{c.acc}</span>
                <span className={`dev-card-physical-chip ${physicalStatusClass(coverage.physicalStatus)}`}>
                  {PHYSICAL_STATUS_LABEL[coverage.physicalStatus]}
                </span>
                <span className="dev-card-cc">{c.cc}CC</span>
                <span className="dev-card-rarity">{'★'.repeat(c.rarity)}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <div className="dev-empty">Sin resultados</div>}
        </div>

        {selected && <CardDetail card={selected} />}
        {!selected && (
          <div className="dev-card-detail dev-card-detail-empty">
            <div className="dev-empty">Selecciona una carta para ver su ficha RUNTIME + canon de animación</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Ficha RUNTIME (DEV-SYNC): separa DATOS ROM / RUNTIME (ActionProfile) /
// GBC FIDELITY. El contrato V2 (cardsCinematic.ts) se muestra SOLO como
// referencia legacy etiquetada — nunca como canon cinematográfico.
function CinematicCardInfo({ card }: { card: CardDef }) {
  const profile = resolveActionProfile(card.name);
  const legacy = cardCinematic(card.id);
  // ROM LOTE 6 (§192/§206) — descriptor ROM por identidad real de carta
  const defRule = DEFENSE_ROM_RULES[card.id];
  const isSupport = card.type === 'support';
  // ROM LOTE 7 (§239) — perfil STANDARD_ATTACK para Damage/Beam
  const stdProfile = (card.type === 'damage' || card.type === 'beam')
    ? standardAttackProfileFor(card)
    : null;
  const impactClass = stdProfile ? impactClassForPower(card.atk) : null;
  // ROM LOTE 8 (§273) — handler especial ($08/$0B/$0C/$0D/$0E)
  const specialHandler = specialHandlerForCard(card);
  const color = legacy ? (legacy.asset.startsWith('UNIQUE') ? '#e0b84c' : legacy.asset.startsWith('SUPPORT') ? '#7fd48a' : legacy.asset.startsWith('ITEM') ? '#6cb7e8' : '#8a93a8') : '#8a93a8';
  const fid = profile?.fidelity ?? 'INFERRED';
  const fidOk = fid === 'FRAME_VERIFIED' || fid === 'VERIFIED';
  return (
    <div className="dev-card-compat">
      <h4>RUNTIME — ActionProfile</h4>
      <div className="dev-compat-chips">
        <span className="dev-tag" style={{ background: '#1a2730', color: '#ffe9a3', border: '1px solid #5a4a20' }}>profile: {profile?.id ?? `generic_${actionSemanticsForCard(card).animation}`}</span>
        <span className="dev-tag">actor: {profile?.actor?.beats?.map(b => b.pose).join(' → ') ?? '—'}</span>
        <span className="dev-tag">target: {profile?.impact?.targetPose ?? '—'}</span>
        <span className="dev-tag">projectile: {profile?.projectile?.kind ?? '—'}</span>
        <span className={`dev-tag ${fidOk ? 'ok' : ''}`}>fidelity: {fid}</span>
      </div>
      <div className="dev-card-compat">
        <h4>GBC FIDELITY</h4>
        <div className="dev-compat-chips">
          {profile?.fidelity
            ? <span className={`dev-tag ${fidOk ? 'ok' : ''}`}>{fid} {fidOk ? '(canon GBC — F0)' : '(RUNTIME SEQUENCE — no canon hasta F0)'}</span>
            : <span className="dev-tag">INFERRED (sin perfil firma)</span>}
          {legacy && (
            <span className="dev-tag" style={{ background: color + '22', color, border: `1px solid ${color}66` }} title="Referencia del contrato V2 — solo informativa, no es canon cinematográfico">
              legacy V2: {legacy.template} · {legacy.asset}
            </span>
          )}
        </div>
      </div>
      {/* ROM V5 — descriptor ROM real (Support/Defense). Runtime provisional
          ≠ canon: cualquier entrada generic_support_effect es provisional. */}
      {(isSupport || defRule) && (
        <div className="dev-card-compat">
          <h4>ROM V5 — Support/Defense descriptor</h4>
          <div className="dev-compat-chips">
            {defRule ? (
              <>
                <span className="dev-tag" style={{ background: '#3a2040', color: '#ffb0e0', border: '1px solid #7a4a80' }}>CA83 0x{defRule.ca83.toString(16).padStart(2, '0')}</span>
                <span className="dev-tag" style={{ background: '#3a2040', color: '#ffb0e0', border: '1px solid #7a4a80' }}>family CA53={defRule.resultFamily}</span>
                <span className="dev-tag" style={{ background: '#3a2040', color: '#ffd0a0', border: '1px solid #7a5a30' }}>{defRule.result}</span>
              </>
            ) : (
              <span className="dev-tag" style={{ background: '#203a2a', color: '#a0ffc0', border: '1px solid #2a5a3a' }}>SUPPORT: card-indexed visual load $2C30 + category-scoped worker</span>
            )}
            <span className="dev-tag">rom operation: {defRule?.rule ?? (isSupport ? 'card-specific (§183-184) — NO generic +stat' : '—')}</span>
            <span className="dev-tag">guardrail: no auto-play resource field</span>
            <span className="dev-tag">fidelity: ROM_CONFIRMED</span>
          </div>
        </div>
      )}
      {/* ROM LOTE 7 — perfil STANDARD_ATTACK (Damage/Beam) */}
      {stdProfile && (
        <div className="dev-card-compat">
          <h4>ROM LOTE 7 — STANDARD_ATTACK</h4>
          <div className="dev-compat-chips">
            <span className="dev-tag" style={{ background: '#202a3a', color: '#a0d0ff', border: '1px solid #2a4a6a' }}>handler $0x{stdProfile.handler.toString(16).padStart(2, '0')} → Bank03:$0x{STANDARD_ATTACK_HANDLERS[stdProfile.handler]?.toString(16).toUpperCase() ?? '—'}</span>
            <span className="dev-tag">anim ${stdProfile.actorAnimationResource?.toString(16).padStart(2, '0') ?? '—'}</span>
            <span className="dev-tag">FX ${stdProfile.effectResource?.toString(16).padStart(2, '0') ?? '—'}</span>
            <span className="dev-tag">pal ${stdProfile.paletteId?.toString(16).padStart(2, '0') ?? '—'}</span>
            <span className="dev-tag">audio ${stdProfile.audioScriptId?.toString(16).padStart(2, '0') ?? '—'}</span>
            <span className="dev-tag">release frame {stdProfile.launch?.syncFrame ?? '—'}</span>
            <span className={`dev-tag ${impactClass === 'HIGH_POWER' ? 'ok' : ''}`}>impactClass: {impactClass}</span>
            <span className="dev-tag">hit ${stdProfile.resolution.normalHitMacro?.toString(16).padStart(2, '0') ?? '—'} · miss ${stdProfile.resolution.normalMissMacro?.toString(16).padStart(2, '0') ?? '—'} · hi ${stdProfile.resolution.highPowerHitMacro?.toString(16).padStart(2, '0') ?? '—'}</span>
          </div>
        </div>
      )}
      {/* ROM LOTE 8 — handler especial ($08/$0B/$0C/$0D/$0E) */}
      {specialHandler && (
        <div className="dev-card-compat">
          <h4>ROM LOTE 8 — handler especial</h4>
          <div className="dev-compat-chips">
            <span className="dev-tag" style={{ background: '#2a203a', color: '#e0b0ff', border: '1px solid #5a3a7a' }}>handler $0x{specialHandler.subtype.toString(16).padStart(2, '0')}</span>
            <span className="dev-tag">worker Bank{specialHandler.worker.bank}:0x{specialHandler.worker.address.toString(16).toUpperCase()}</span>
            <span className="dev-tag">family: {specialHandler.family}</span>
            {specialHandler.variant && <span className="dev-tag">variant: {specialHandler.variant}</span>}
            <span className="dev-tag">sequence: {specialHandler.evidence}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CardDetail({ card }: { card: CardDef }) {
  return (
    <div className="dev-card-detail">
      {/* M8.F0 — preview animada del ataque (gif con frames reales del
          manifest) + ficha */}
      <div className="dev-card-hero">
        <div className="dev-card-hero-id">{String(card.id).padStart(3, '0')}</div>
        <div className="dev-card-hero-sprite">
          {cardIconUrl(card.id) ? <img src={cardIconUrl(card.id)} alt={card.name} /> : <span className="dev-card-sprite-empty">Sin sprite</span>}
        </div>
        <h2 style={{ color: cardColor(card.type) }}>{card.name}</h2>
        <div className="dev-card-hero-tags">
          <span className="dev-tag" style={{ background: cardColor(card.type) }}>{card.type}</span>
          <span className="dev-tag">effect: {EFFECT_LABEL[card.effect] ?? card.effect}</span>
          <span className="dev-tag">rarity {'★'.repeat(card.rarity)}</span>
        </div>
      </div>
      <div className="dev-card-attack-preview-big">
        <AttackPreview card={card} size={128} />
      </div>
      <div className="dev-card-stats-big">
        <div><label>ATK</label><strong>{card.atk}</strong></div>
        <div><label>ACC</label><strong>{card.acc}</strong></div>
        <div><label>CC</label><strong>{card.cc}</strong></div>
      </div>
      {card.description && <p className="dev-card-desc">{card.description}</p>}
      <div className="dev-card-compat">
        <h4>Usable por</h4>
        {card.compatible
          ? <div className="dev-compat-chips">{card.compatible.map(c => <span key={c} className="dev-tag">{characterName(c)}</span>)}</div>
          : card.notCompatible && card.notCompatible.length > 0
            ? <div className="dev-compat-chips"><span className="dev-tag ok">Todos excepto</span>{card.notCompatible.map(c => <span key={c} className="dev-tag">{characterName(c)}</span>)}</div>
            : <span className="dev-tag ok">Todos (CSV Users=48)</span>}
      </div>
      <div className="dev-card-code">
        <code>{JSON.stringify({ id: card.id, type: card.type, effect: card.effect, atk: card.atk, acc: card.acc, cc: card.cc, rarity: card.rarity, compatible: card.compatible ?? null, notCompatible: card.notCompatible ?? null }, null, 2)}</code>
      </div>
      <AnimationTaxonomyInfo card={card} />
      <RomActionExecutionInfo card={card} />
      <RomPhysicalCardProductionInfo card={card} />
      <RomPresentationProfileInfo card={card} />
      <ActionCanonInfo card={card} />
      <CinematicCardInfo card={card} />
    </div>
  );
}

function RomActionExecutionInfo({ card }: { card: CardDef }) {
  const descriptor = romActionExecutionDescriptorForCard(card);
  const branches = descriptor.result.branches;
  return (
    <div className="dev-card-compat">
      <h4>ROM Action Execution Descriptor</h4>
      <div className="dev-compat-chips">
        <span className="dev-tag" style={{ background: '#1a2730', color: '#ffe9a3', border: '1px solid #5a4a20' }}>
          handler: {descriptor.execution.handlerHex} · {descriptor.execution.workerFamily}
        </span>
        <span className="dev-tag">worker: {descriptor.execution.workerAddress ?? '—'}</span>
        <span className="dev-tag">actor: {descriptor.actorAnimation.resourceHex ?? '—'} · {descriptor.actorAnimation.resourceStatus}</span>
        <span className={`dev-tag ${completionDispositionClass(descriptor.actorAnimation.completion?.disposition)}`}>
          completion: {descriptor.actorAnimation.completion?.disposition ?? 'NO_ROM_ANIMATION'}
        </span>
        <span className="dev-tag">seq source: {descriptor.actorAnimation.sequenceSource?.module ?? '—'}</span>
        <span className="dev-tag">sequences: {descriptor.actorAnimation.sequenceSource?.sequenceCount ?? 0}</span>
        <span className="dev-tag">frames: {descriptor.actorAnimation.sequenceSource?.physicalFrameCount ?? 0}</span>
        <span className="dev-tag">FX: {descriptor.visualEffect.resourceHex ?? '—'}</span>
        <span className="dev-tag">palette: {descriptor.visualEffect.paletteHex ?? '—'}</span>
        <span className={`dev-tag ${branches.length > 0 ? 'ok' : descriptor.result.pending.length ? 'pending' : 'neutral'}`}>
          result: {descriptor.result.family} · {branches.length} branches
        </span>
      </div>
      <div className="dev-canon-beats">
        <span className="dev-canon-beat-label">STEPS</span>
        {descriptor.handlerScript.steps.map(step => (
          <code key={step.id}>{step.id}:{step.evidence}</code>
        ))}
        {branches.length > 0 && (
          <>
            <span className="dev-canon-beat-label">RESULT</span>
            {branches.map(branch => (
              <code key={`${branch.family}-${branch.macroHex ?? branch.result}`}>
                {branch.family}:{branch.macroHex ?? branch.result}
              </code>
            ))}
          </>
        )}
        {descriptor.result.pending.length > 0 && (
          <>
            <span className="dev-canon-beat-label">PENDING</span>
            <code>{descriptor.result.pending.join(' · ')}</code>
          </>
        )}
      </div>
    </div>
  );
}

function firstCompatibleForm(card: CardDef): string {
  const forms = Object.values(FORMS);
  const compatible = forms.find(form => {
    if (card.notCompatible?.includes(form.character)) return false;
    if (card.compatible && !card.compatible.includes(form.character)) return false;
    return !!spriteDirFor(form.id);
  });
  return compatible?.id ?? 'goku_base';
}

function RomPhysicalCardProductionInfo({ card }: { card: CardDef }) {
  const [formId, setFormId] = useState(() => firstCompatibleForm(card));
  const compatibleForms = useMemo(() => Object.values(FORMS)
    .filter(form => {
      if (card.notCompatible?.includes(form.character)) return false;
      if (card.compatible && !card.compatible.includes(form.character)) return false;
      return !!spriteDirFor(form.id);
    })
    .sort((a, b) => a.id.localeCompare(b.id)), [card]);

  const timeline = useMemo(() => romPresentationTimelineForCard(card, 'player', formId), [card, formId]);
  const physicalCues = useMemo(() => timeline?.timeline.entries
    .map(entry => ({ tick: entry.cue.tick, cue: entry.cue }))
    .filter(entry => entry.cue.type === 'ROM_PHYSICAL_FRAME') ?? [], [timeline]);
  const dir = spriteDirFor(formId);

  return (
    <div className="dev-card-compat dev-card-rom-physical">
      <h4>Production physical preview</h4>
      <div className="dev-compat-chips">
        <span className={`dev-tag ${timeline ? 'ok' : 'pending'}`}>presentation: {timeline ? 'ROM' : 'LEGACY/UNRESOLVED'}</span>
        <span className="dev-tag">form selector</span>
        <select className="dev-mini-select" value={formId} onChange={event => setFormId(event.target.value)}>
          {compatibleForms.map(form => <option key={form.id} value={form.id}>{form.id}</option>)}
        </select>
        <span className="dev-tag">physical cues: {physicalCues.length}</span>
      </div>
      {physicalCues.length === 0 ? (
        <div className="dev-hint">Esta carta todavía no emite ROM_PHYSICAL_FRAME para {formId}; si se renderiza, debe quedar como fallback explícito.</div>
      ) : (
        <div className="dev-rom-card-frame-strip">
          {physicalCues.map(({ tick, cue }, index) => {
            const c = cue as Extract<typeof cue, { type: 'ROM_PHYSICAL_FRAME' }>;
            return (
              <div key={`${tick}-${index}-${c.frameInstanceId}`} className="dev-rom-frame-card compact">
                <div className="dev-rom-frame-img">
                  {dir && c.file
                    ? <img src={`/assets/sprites/${dir}/${c.file}`} alt={c.physicalId ?? c.frameInstanceId ?? 'ROM physical frame'} loading="lazy" />
                    : <span>—</span>}
                </div>
                <code>tick {tick} · {c.frameInstanceId}</code>
                <span>{c.physicalId ?? 'unresolved'} · {c.durationTicks}t</span>
                <span>dx {c.offsetX} dy {c.offsetY} · {c.source}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RomPresentationProfileInfo({ card }: { card: CardDef }) {
  const profile = romPresentationProfileForCard(card);
  return (
    <div className="dev-card-compat">
      <h4>ROM-derived Presentation Profile</h4>
      <div className="dev-compat-chips">
        <span className="dev-tag" style={{ background: '#1a2730', color: '#b9f6ff', border: '1px solid #2a4a5a' }}>
          kind: {profile.kind}
        </span>
        <span className="dev-tag">program: {profile.program.length} steps</span>
        <span className="dev-tag">branches: {profile.resultBranches.length}</span>
        <span className={`dev-tag ${profile.completion.static === 'COMPLETE' ? 'ok' : 'pending'}`}>
          static: {profile.completion.static}
        </span>
        <span className={`dev-tag ${profile.completion.dynamic === 'NOT_REQUIRED' ? 'ok' : 'pending'}`}>
          dynamic: {profile.completion.dynamic}
        </span>
        <span className="dev-tag">actor: {profile.dependencies.animationResourceHex ?? '—'}</span>
        <span className="dev-tag">FX: {profile.dependencies.fxResourceHex ?? '—'}</span>
        <span className="dev-tag">palette: {profile.dependencies.paletteHex ?? '—'}</span>
      </div>
      <div className="dev-canon-beats">
        <span className="dev-canon-beat-label">ROM PROGRAM</span>
        {profile.program.slice(0, 12).map(step => (
          <code key={step.id}>
            {step.id}:{step.kind}{step.durationTicks ? `/${step.durationTicks}t` : ''}{step.macroHex ? `/${step.macroHex}` : ''}
          </code>
        ))}
        {profile.program.length > 12 && <code>+{profile.program.length - 12} more</code>}
        {profile.resultBranches.length > 0 && (
          <>
            <span className="dev-canon-beat-label">BRANCH</span>
            {profile.resultBranches.map(branch => (
              <code key={`${branch.family}-${branch.condition}`}>{branch.condition}:{branch.macroHex ?? branch.result}</code>
            ))}
          </>
        )}
        {profile.completion.pending.length > 0 && (
          <>
            <span className="dev-canon-beat-label">PENDING</span>
            <code>{profile.completion.pending.slice(0, 3).join(' · ')}</code>
          </>
        )}
      </div>
    </div>
  );
}

function AnimationTaxonomyInfo({ card }: { card: CardDef }) {
  const row = animationTaxonomyForCard(card);
  const coverage = cardPhysicalCoverageForCard(card);
  const resource = coverage.animationResource == null ? null : animationResourceById(coverage.animationResource);
  const physical = physicalMappingSummaryForCard(card);
  const gap = row.actorAnimation.animationResource == null ? null : staticGapCauseForResourceId(row.actorAnimation.animationResource);
  return (
    <div className="dev-card-compat">
      <h4>Animation Taxonomy Canon — 125/125</h4>
      <div className="dev-compat-chips">
        <span className="dev-tag" style={{ background: '#1a2730', color: '#ffe9a3', border: '1px solid #5a4a20' }}>
          execution: {row.execution.family} {row.execution.handlerHex}
        </span>
        <span className="dev-tag">worker: {row.execution.workerAddress ?? '—'}</span>
        <span className="dev-tag">AnimationResource: {row.actorAnimation.animationResourceHex ?? '—'}</span>
        <span className={`dev-tag ${physicalStatusClass(coverage.physicalStatus)}`}>
          card physical: {PHYSICAL_STATUS_LABEL[coverage.physicalStatus]}
        </span>
        {resource && (
          <span className={`dev-tag ${completionDispositionClass(resource.completion.disposition)}`}>
            resource completion: {resource.completion.disposition} · {resource.completion.cause}
          </span>
        )}
        <span className={`dev-tag ${row.actorAnimation.evidence === 'ROM_SEQUENCE_VERIFIED' ? 'ok' : ''}`}>
          resource: {row.actorAnimation.evidence === 'ROM_SEQUENCE_VERIFIED' ? 'DECODED' : gap ?? '—'}
        </span>
        <span className="dev-tag">gap: {coverage.gapCause}</span>
        <span className="dev-tag">profile: {row.actorAnimation.actionProfileId ?? `generic_${row.runtimeMapping.animationKind}`}</span>
        <span className="dev-tag">frames: {row.actorAnimation.physicalFrameCount || 'pending static decode'}</span>
        {physical && (
          <span className={`dev-tag ${physical.unresolved === 0 ? 'ok' : ''}`}>
            physical map: {physical.exact}/{physical.romFrames} EXACT · {physical.shared}/{physical.romFrames} SHARED · {physical.unresolved}/{physical.romFrames} unresolved
          </span>
        )}
        <span className="dev-tag">FX: {row.visualEffect.fxResourceHex ?? '—'}</span>
        <span className="dev-tag">palette: {row.visualEffect.paletteHex ?? '—'}</span>
        <span className="dev-tag">visual: {row.visualEffect.visual}</span>
        <span className="dev-tag">aura: {row.visualEffect.aura}</span>
      </div>
      <div className="dev-canon-beats">
        <span className="dev-canon-beat-label">ACTOR</span>
        {row.actorAnimation.actorSequence.map(beat => <code key={beat}>{beat}</code>)}
        {row.actorAnimation.targetSequence.length > 0 && (
          <>
            <span className="dev-canon-beat-label">TARGET</span>
            {row.actorAnimation.targetSequence.map(beat => <code key={`t-${beat}`}>{beat}</code>)}
          </>
        )}
        <span className="dev-canon-beat-label">DYNAMIC</span>
        <code>{row.runtimeMapping.traceDynamicNeededFor.join(' · ')}</code>
      </div>
    </div>
  );
}

// ── Canon de acción (M4/M5 + animationCanon): qué animación canónica
// dispara la carta y qué poses consume — misma fuente que la presentación.
function ActionCanonInfo({ card }: { card: CardDef }) {
  const sem = actionSemanticsForCard(card);
  const profile = resolveActionProfile(card.name);
  const canon = canonForAction({
    id: profile?.id ?? `generic_${sem.animation}`,
    label: card.name,
    kind: sem.animation === 'stage' ? 'command' : sem.animation === 'melee' ? 'damage' : sem.animation === 'beam' ? 'beam' : 'support',
    visual: sem.visual,
    fidelity: profile?.fidelity ?? 'INFERRED',
  });
  const kindColor: Record<string, string> = {
    command: '#d9b0e8', damage: '#e08a6a', beam: '#6cb7e8', support: '#7fd48a', gather: '#e0c060', guard: '#aab2bf', move: '#aab2bf',
  };
  return (
    <div className="dev-card-compat">
      <h4>Canon de animación — M4/M5</h4>
      <div className="dev-compat-chips">
        <span className="dev-tag" style={{ background: '#1a2730', color: kindColor[canon.kind] ?? '#fff', border: '1px solid #2a4a5a' }}>kind: {canon.kind}</span>
        <span className="dev-tag" style={{ background: '#1a2730', color: '#7fd4ff', border: '1px solid #2a4a5a' }}>visual: {canon.visual}</span>
        <span className="dev-tag" style={{ background: '#1a2730', color: '#ffe9a3', border: '1px solid #5a4a20' }}>profile: {profile?.id ?? `generic_${sem.animation}`}</span>
        <span className={`dev-tag ${profile?.fidelity === 'VERIFIED' || profile?.fidelity === 'FRAME_VERIFIED' ? 'ok' : ''}`}>fidelity: {profile?.fidelity ?? 'INFERRED'}</span>
        <span className="dev-tag" style={{ background: canon.aura === 'support' ? '#122433' : canon.aura === 'power' ? '#2a2414' : '#14171b', color: canon.aura === 'support' ? '#6cb7e8' : canon.aura === 'power' ? '#e0c060' : '#8a93a3', border: '1px solid #262b33' }}>aura: {canon.aura}</span>
      </div>
      <div className="dev-canon-beats">
        <span className="dev-canon-beat-label">ACTOR</span>
        {canon.actor.map(b => <code key={`${b.frame}-${b.pose}`}>{b.frame}:{b.pose}</code>)}
        {canon.target.length > 0 && <><span className="dev-canon-beat-label">TARGET</span>{canon.target.map(b => <code key={`t-${b.frame}-${b.pose}`}>{b.frame}:{b.pose}</code>)}</>}
        {canon.contactFrame > 0 && <span className="dev-canon-beat-label">HIT@{canon.contactFrame}</span>}
      </div>
    </div>
  );
}
