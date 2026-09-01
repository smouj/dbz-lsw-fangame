// ═══════════════════════════════════════════════════════════════════════
// CHARACTER DETAILS — stats reales de la forma (0 stats inventadas)
// ═══════════════════════════════════════════════════════════════════════
// Fuente única: roster.FormDef (hp/str/ki/spd/tier) + curvas de crecimiento
// reales por cuartos (niv 25/50/75/100) vía statAtLevel.
// ═══════════════════════════════════════════════════════════════════════

import { getCharacter, getForm, statAtLevel } from '../../data/roster';
import { resolveBattlePortraitStrict } from '../../data/portraitResolvers';

export interface CharacterDetailsProps {
  formId: string;
  /** Nivel a mostrar (default 1 = stats base ROM). */
  level?: number;
}

const STAT_ROWS: { key: 'hp' | 'str' | 'ki' | 'spd'; label: string }[] = [
  { key: 'hp', label: 'MAX LIFE' },
  { key: 'str', label: 'STRENGTH' },
  { key: 'ki', label: 'KI' },
  { key: 'spd', label: 'SPEED' },
];

export function CharacterDetails({ formId, level = 1 }: CharacterDetailsProps) {
  const form = getForm(formId);
  if (!form) return null;
  const char = getCharacter(form.character);
  // Battle Setup consumes Battle portraits only (domain isolation contract).
  const portrait = resolveBattlePortraitStrict(form.id);
  const pct = (v: number) => Math.min(100, Math.round((v / 40) * 100));

  return (
    <div className="setup-details" data-testid="character-details">
      <div className="setup-details-head">
        {portrait.url ? (
          <img className="setup-details-portrait battle" src={portrait.url} alt="" draggable={false} />
        ) : null}
        <span className="setup-details-name">{char?.name ?? form.character}</span>
        <span className="setup-details-form">{form.form}</span>
        {form.rom ? <span className="setup-details-rom">ROM: {form.rom}</span> : null}
      </div>
      <div className="setup-details-stats">
        {STAT_ROWS.map(row => {
          const v = statAtLevel(form, level, row.key);
          return (
            <div key={row.key} className="setup-details-stat">
              <span className="setup-details-stat-label">{row.label}</span>
              <div className="ui-stat-track"><div className={`ui-stat-fill ${row.key}`} style={{ width: `${pct(v)}%` }} /></div>
              <span className="setup-details-stat-val">{v}</span>
            </div>
          );
        })}
      </div>
      <div className="setup-details-meta">
        <span>TIER {form.tier}</span>
        {char ? <span>SAGA {char.saga.toUpperCase()}</span> : null}
        {form.curves ? <span>GROWTH {form.curves.hp.length}×</span> : null}
      </div>
      {form.curves ? (
        <details className="setup-details-growth-disclosure">
        <summary>LEVEL PROGRESSION</summary>
        <div className="setup-details-growth">
          {([25, 50, 75, 100] as const).map(lv => (
            <span key={lv} className="setup-details-growth-col">
              <b>LV{lv}</b>
              <i>HP {statAtLevel(form, lv, 'hp')}</i>
              <i>STR {statAtLevel(form, lv, 'str')}</i>
              <i>KI {statAtLevel(form, lv, 'ki')}</i>
              <i>SPD {statAtLevel(form, lv, 'spd')}</i>
            </span>
          ))}
        </div>
        </details>
      ) : null}
    </div>
  );
}
