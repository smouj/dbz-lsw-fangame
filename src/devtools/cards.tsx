// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Card Database (125 cartas ROM)
// Filtros por tipo / CC / rareza + ficha detallada.
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { CARDS, cardColor, getCard, type CardType, type CardDef } from '../data/cards';
import { characterName } from '../data/storyPanels';
import { cardIconUrl } from '../data/icons';

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
    </div>
  );
}
