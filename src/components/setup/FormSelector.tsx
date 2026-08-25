// ═══════════════════════════════════════════════════════════════════════
// FORM SELECTOR — cinta de formas del personaje central del roll
// ═══════════════════════════════════════════════════════════════════════
// FUENTE ÚNICA: roster.CHARACTERS[].forms — nunca inventa formas.
// ═══════════════════════════════════════════════════════════════════════

import { getCharacter, getForm } from '../../data/roster';

export interface FormSelectorProps {
  characterId: string;
  selectedFormId: string;
  onSelect: (formId: string) => void;
  /** Desbloqueos por nivel (isFormUnlocked) — opcional. */
  isUnlocked?: (formId: string) => boolean;
}

export function FormSelector({ characterId, selectedFormId, onSelect, isUnlocked }: FormSelectorProps) {
  const char = getCharacter(characterId);
  if (!char) return null;
  const forms = char.forms;

  return (
    <div className="setup-form-selector" data-testid="form-selector">
      <span className="setup-form-label">FORM</span>
      <div className="setup-form-chips">
        {forms.map(fid => {
          const f = getForm(fid);
          if (!f) return null;
          const unlocked = isUnlocked ? isUnlocked(fid) : true;
          return (
            <button
              key={fid}
              type="button"
              className={`setup-form-chip${fid === selectedFormId ? ' active' : ''}${unlocked ? '' : ' locked'}`}
              onClick={() => { if (unlocked) onSelect(fid); }}
              disabled={!unlocked}
            >
              {f.form}
            </button>
          );
        })}
      </div>
    </div>
  );
}
