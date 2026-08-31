import { useEffect, useState } from 'react';
import { battleOverworldAuraUrl } from '../../data/battleOverworld';
import { startPowerPreview, type PowerPreviewFrame } from './powerPreviewPlayback';
import type { RollCharacterAsset } from './CharacterRoll';

/** Only OW assets: combat aura frames can contain a full-size fighter.
 * Keyed by character + form so old loads never power the next selection. */
export function CharacterPowerPreview({ item }: { item: RollCharacterAsset }) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [frame, setFrame] = useState<PowerPreviewFrame>({ phase: 'settling' });

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => startPowerPreview({
    powerUrl: item.powerUrl,
    auraUrl: item.auraUrl ?? battleOverworldAuraUrl(item.formId),
    reducedMotion,
  }, setFrame), [item.powerUrl, item.auraUrl, item.formId, reducedMotion]);

  const power = frame.phase !== 'settling' && frame.power;
  return (
    <span className="setup-power-preview" data-phase={frame.phase} data-form={item.formId} aria-hidden="true">
      {frame.phase === 'powered' && frame.aura ? (
        <span className="setup-power-aura-layer">
          <img src={frame.aura} alt="" className="setup-roll-aura" draggable={false} />
        </span>
      ) : null}
      {(power || item.idleUrl) ? (
        <img src={power || item.idleUrl} alt="" className={power ? 'setup-roll-power' : 'setup-roll-idle'} draggable={false} />
      ) : null}
    </span>
  );
}
