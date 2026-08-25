// ═══════════════════════════════════════════════════════════════════════
// DEV — Team Builder (reutiliza los componentes del runtime setup)
// Mismos componentes que el juego: CharacterRoll/Details/Limits + el hook.
// Añade diagnósticos reales (characterId/formId/owIdle/owPower/limitCapacity…).
// ═══════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { CHARACTERS, getCharacter, getForm } from '../data/roster';
import { getLimitCapacity, getLimitLoadoutDefinition } from '../data/limitLoadout';
import { overworldUrl } from '../data/overworld';
import { battleOverworldActorUrl } from '../data/battleOverworld';
import { CharacterRoll, type RollCharacterAsset } from '../components/setup/CharacterRoll';
import { CharacterDetails } from '../components/setup/CharacterDetails';
import { LimitLoadoutPanel } from '../components/setup/LimitLoadoutPanel';
import { useTeamSetupState } from '../components/setup/useTeamSetupState';
import { baseFormIdOf, nextRollIndex, prevRollIndex } from '../components/setup/setupLogic';
import { DECK_SIZE } from '../data/cards';

export function TeamBuilderModule() {
  const setup = useTeamSetupState({ fallbackDeck: [] });
  const { active } = setup;
  // eslint-disable-next-line no-console
  console.log('[team-builder] active:', active.characterId, active.limits, 'state:', setup.state.members.map(m => m.limits));
  const [diagChar, setDiagChar] = useState('goku');

  const items: RollCharacterAsset[] = CHARACTERS.map(c => {
    const fid = baseFormIdOf(c.id);
    return {
      characterId: c.id,
      name: c.name,
      formId: fid,
      idleUrl: overworldUrl(fid),
      powerUrl: battleOverworldActorUrl(fid, 'gather_power_pose') ?? undefined,
      auraUrl: undefined,
    };
  });

  const idx = Math.max(0, CHARACTERS.findIndex(c => c.id === diagChar));
  const diag = getCharacter(diagChar);
  const diagForm = diag ? getForm(baseFormIdOf(diag.id)) : undefined;
  const cap = getLimitCapacity(diagChar);
  const defaults = getLimitLoadoutDefinition(diagChar);

  return (
    <div className="dev-module dev-team-builder">
      <h3>TEAM BUILDER — mismos componentes del runtime</h3>
      <CharacterRoll
        items={items}
        selectedIndex={idx}
        onSelect={i => { setDiagChar(CHARACTERS[i].id); setup.selectCharacter(CHARACTERS[i].id); }}
      />
      <div className="dev-diag-grid">
        <div className="dev-diag-card">
          <b>CHARACTER ROLL DIAGNOSTICS</b>
          <div>characterId: <code>{diagChar}</code></div>
          <div>formId (base): <code>{diagForm?.id ?? '—'}</code></div>
          <div>owIdle: <code>{diagForm ? (overworldUrl(diagForm.id) ?? 'fallback chibi') : '—'}</code></div>
          <div>owPower: <code>{diagForm ? (battleOverworldActorUrl(diagForm.id, 'gather_power_pose') ?? 'no pose (chibi)') : '—'}</code></div>
          <div>limitCapacity: <code>{cap}</code></div>
          <div>equippedLimits: <code>[{defaults.join(', ') || '—'}]</code></div>
          <div>compatibleLimitCount: <code>{defaults.length}/{cap}</code></div>
        </div>
        <div className="dev-diag-card">
          <b>NAVIGATION</b>
          <div>next: <code>{CHARACTERS[nextRollIndex(idx, CHARACTERS.length)]?.id}</code></div>
          <div>prev: <code>{CHARACTERS[prevRollIndex(idx, CHARACTERS.length)]?.id}</code></div>
          <div>members: <code>{setup.state.members.length}</code></div>
          <div>deckValid: <code>{String(setup.deckValid)}</code> ({active.jointDeck.length}/{DECK_SIZE})</div>
          <div>limits equipped: <code>{active.limits.filter(id => id !== 0).length}/{active.limits.length}</code></div>
        </div>
      </div>
      <CharacterDetails formId={active.formId} />
      <LimitLoadoutPanel
        characterId={active.characterId}
        limits={active.limits}
        onEquip={setup.equipLimit}
        onClear={setup.clearLimitSlot}
        showIncompatible
      />
    </div>
  );
}
