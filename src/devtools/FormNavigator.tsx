// ═══════════════════════════════════════════════════════════
// DEV STUDIO — FormNavigator (navegación personaje → formas)
// Mismo patrón que Character Studio (chips de personaje + tabs de
// forma), compartido por Sheets / Sprites / Animation para que TODAS
// las páginas queden cableadas igual: CHARACTERS (roster.ts) + formas
// canónicas. El contenido de cada página se carga por formId.
//
// Layout: tarjeta compacta de 2 filas — Personaje (chips pequeños) /
// Forma (tabs) + info técnica a la derecha. No roba protagonismo al
// contenido de la página.
// ═══════════════════════════════════════════════════════════
import { ROM_ORDERED_CHARACTERS, getForm } from '../data/roster';
import { spriteDirFor } from '../data/spriteManifest';

export function FormNavigator({ formId, onChange, showInfo = true, showSheet = true }: {
  formId: string;
  onChange: (formId: string) => void;
  showInfo?: boolean;
  showSheet?: boolean;
}) {
  const form = getForm(formId) ?? getForm(ROM_ORDERED_CHARACTERS[0]?.forms[0] ?? 'gohan_young');
  if (!form) return null;
  const char = ROM_ORDERED_CHARACTERS.find(c => c.forms.includes(form.id)) ?? ROM_ORDERED_CHARACTERS[0];
  const dir = spriteDirFor(form.id);

  const selectChar = (id: string) => {
    const c = ROM_ORDERED_CHARACTERS.find(x => x.id === id);
    if (c) onChange(c.forms[0]);
  };

  return (
    <div className="dev-navigator">
      <div className="dev-navigator-row">
        <span className="dev-navigator-label">Personaje</span>
        <div className="dev-char-list" role="list" aria-label="Personajes">
          {ROM_ORDERED_CHARACTERS.map(c => (
            <button key={c.id} className={`dev-char-chip ${c.id === char.id ? 'active' : ''}`}
              onClick={() => selectChar(c.id)}>
              <span className="dev-char-name">{c.name}</span>
              <span className="dev-char-forms">{c.forms.length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="dev-navigator-row dev-navigator-row-forms">
        <span className="dev-navigator-label">Forma</span>
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
          <div className="dev-form-info" title="Identificador canónico · sheet · sprite dir">
            <code>{form.id}</code>
            {form.sheet && <><span className="dev-form-info-sep">·</span><span>{form.sheet}</span></>}
            {dir && <><span className="dev-form-info-sep">·</span><span>dir {dir}</span></>}
          </div>
        )}
        {showSheet && form.sheet && (
          <div className="dev-navigator-sheet" title="Sheet fuente (catalog-v9 / atomic_sheet) → OUT_frames: OW · tile · composite · aura power + support">
            <span className="dev-navigator-label">Sheet fuente</span>
            <img className="dev-sheet-canonic" src={`/assets/sheets/${form.sheet}?t=${Date.now()}`} alt={form.sheet} loading="lazy" />
            <span className="dev-sheet-note">catalog-v9 → OUT_frames · OW · tile · composite · aura power+support</span>
          </div>
        )}
      </div>
    </div>
  );
}
