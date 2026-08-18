// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Card Database (125 cartas ROM)
// Filtros por tipo / CC / rareza + ficha detallada.
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { CARDS, cardColor, getCard, type CardType, type CardDef } from '../data/cards';
import { characterName } from '../data/storyPanels';
import { cardIconUrl } from '../data/icons';
import { cardCinematic } from '../data/cardsCinematic';
import { actionSemanticsForCard, resolveActionProfile } from '../battle/actionProfiles';
import { canonForAction } from '../battle/animationCanon';

const TYPES: (CardType | 'all')[] = ['all', 'command', 'damage', 'beam', 'support', 'defense', 'special'];

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
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
        <p className="dev-sub">{CARDS.length} cartas de la tabla ROM 0x044315 · {filtered.length} visibles</p>
      </header>

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
          {filtered.map(c => (
            <button key={c.id} className={`dev-card-row ${selectedId === c.id ? 'active' : ''}`}
              onClick={() => setSelectedId(c.id)}>
              <span className="dev-card-id">{String(c.id).padStart(3, '0')}</span>
              <span className="dev-card-sprite">
                {cardIconUrl(c.id) ? <img src={cardIconUrl(c.id)} alt={c.name} loading="lazy" /> : <span className="dev-card-sprite-empty">—</span>}
              </span>
              <span className="dev-card-type" style={{ background: cardColor(c.type) }}>{c.type[0].toUpperCase()}</span>
              <span className="dev-card-name">{c.name}</span>
              <span className="dev-card-stats">⚔{c.atk} · ◎{c.acc}</span>
              <span className="dev-card-cc">{c.cc}CC</span>
              <span className="dev-card-rarity">{'★'.repeat(c.rarity)}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="dev-empty">Sin resultados</div>}
        </div>

        {selected && <CardDetail card={selected} />}
      </div>
    </div>
  );
}


// ── Ficha cinematográfica (contrato V2): plantilla T01-T12 + asset + directiva ──
function CinematicCardInfo({ id }: { id: number }) {
  const c = cardCinematic(id);
  if (!c) return (
    <div className="dev-card-compat">
      <h4>Cinemática (V2)</h4>
      <span className="dev-tag bad">Sin perfil en cardsCinematic.ts</span>
    </div>
  );
  const color = c.asset.startsWith('UNIQUE') ? '#e0b84c' : c.asset.startsWith('SUPPORT') ? '#7fd48a' : c.asset.startsWith('ITEM') ? '#6cb7e8' : '#8a93a8';
  return (
    <div className="dev-card-compat">
      <h4>Cinemática — contrato V2</h4>
      <div className="dev-compat-chips">
        <span className="dev-tag" style={{ background: '#2a2233', color: '#d9b0e8', border: '1px solid #6b4a7a' }}>{c.template}</span>
        <span className="dev-tag" style={{ background: color + '22', color, border: `1px solid ${color}66` }}>{c.asset}</span>
        <span className="dev-tag">{c.mechanics}</span>
      </div>
      <p className="dev-muted" style={{ marginTop: 6, fontSize: 12 }}>{c.directive}</p>
    </div>
  );
}

function CardDetail({ card }: { card: CardDef }) {
  return (
    <div className="dev-card-detail">
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
      <ActionCanonInfo card={card} />
      <CinematicCardInfo id={card.id} />
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
