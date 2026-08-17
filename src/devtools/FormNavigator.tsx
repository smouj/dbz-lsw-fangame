// ═══════════════════════════════════════════════════════════
// DEV STUDIO — FormNavigator (navegación personaje → formas)
// Mismo patrón que Character Studio (chips de personaje + tabs de
// forma), compartido por Sheets / Sprites / Animation para que TODAS
// las páginas queden cableadas igual: CHARACTERS (roster.ts) + formas
// canónicas. El contenido de cada página se carga por formId.
// ═══════════════════════════════════════════════════════════
import { CHARACTERS, getForm } from '../data/roster';
import { spriteDirFor } from '../data/spriteManifest';

export function FormNavigator({ formId, onChange, showInfo = true }: {
  formId: string;
  onChange: (formId: string) => void;
  showInfo?: boolean;
}) {
  const form = getForm(formId) ?? getForm(CHARACTERS[0]?.forms[0] ?? 'goku_base');
  if (!form) return null;
  const char = CHARACTERS.find(c => c.forms.includes(form.id)) ?? CHARACTERS[0];
  const dir = spriteDirFor(form.id);

  const selectChar = (id: string) => {
    const c = CHARACTERS.find(x => x.id === id);
    if (c) onChange(c.forms[0]);
  };

  return (
    <div className="dev-navigator">
      <div className="dev-char-list" role="list" aria-label="Personajes">
        {CHARACTERS.map(c => (
          <button key={c.id} className={`dev-char-chip ${c.id === char.id ? 'active' : ''}`}
            onClick={() => selectChar(c.id)}>
            <span className="dev-char-name">{c.name}</span>
            <span className="dev-char-forms">{c.forms.length}</span>
          </button>
        ))}
      </div>
      <div className="dev-navigator-main">
        <div className="dev-form-tabs" role="tablist" aria-label="Formas">
          {char.forms.map(fid => {
            const f = getForm(fid);
            return (
              <button key={fid} className={`dev-form-tab ${fid === form.id ? 'active' : ''}`}
                onClick={() => onChange(fid)}>
                {f?.form ?? fid}
              </button>
            );
          })}
        </div>
        {showInfo && (
          <div className="dev-form-info">
            <div className="dev-form-id-row">
              <code>{form.id}</code>
              {form.sheet && <span className="dev-tag">{form.sheet}</span>}
              {dir && <span className="dev-tag ok">sprite dir: {dir}</span>}
              {!dir && <span className="dev-tag bad">sin dir animado</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
