// ═══════════════════════════════════════════════════════════════════════
// AttackPreview — inspector ROM de la acción de una carta.
//
// La tarjeta no inventa una película a partir de PNGs o fallbacks del
// manifest. Su pose semántica se resuelve para la forma seleccionada en el
// mapa físico-ROM; si no hay un frame reconciliado, lo expone como pendiente.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import type { CardDef } from '../data/cards';
import { cardBattlePose } from '../battle/cardPoses';
import { romPresentationTimelineForCard } from '../battle/romPresentationForCard';
import { spriteDirFor } from '../data/spriteManifest';
import { FORMS, getForm } from '../data/roster';

const PREVIEW_FPS = 12;

interface Props {
  card: CardDef;
  /** formId del personaje sobre el que previsualizar (default: primer compatible). */
  formId?: string;
  /** Altura del frame en px (los sprites son ~46px nativos, x2 = 92). */
  size?: number;
}

type PreviewFrame = {
  file: string;
  url: string;
  durationTicks: number;
  role: string;
  physicalId: string | null;
};

export function AttackPreview({ card, formId, size = 96 }: Props) {
  const [frameIdx, setFrameIdx] = useState(0);
  const resolvedForm = useMemo(() => {
    if (formId) return formId;
    const compat = card.compatible?.[0] ?? 'goku';
    // Card compatibility is stored by character family ("buu", "goku"…),
    // whereas getForm() expects a concrete form id. Resolve that family
    // against the ROM roster before falling back to Goku Base.
    return getForm(compat)?.id
      ?? Object.values(FORMS).find(form => form.character === compat)?.id
      ?? 'goku_base';
  }, [card, formId]);
  const pose = cardBattlePose(card);

  const route = useMemo(
    () => romPresentationTimelineForCard(card, 'player', resolvedForm),
    [card, resolvedForm],
  );
  const frames = useMemo(() => {
    const directory = spriteDirFor(resolvedForm);
    if (!route || !directory) return [] as PreviewFrame[];
    return route.timeline.entries.flatMap(entry => {
      const cue = entry.cue;
      if (cue.type !== 'ROM_PHYSICAL_FRAME' || cue.source === 'UNRESOLVED' || !cue.file) return [];
      return [{
        file: cue.file,
        url: `/assets/sprites/${directory}/${cue.file}`,
        durationTicks: cue.durationTicks,
        // Card-level production cues describe a physical occurrence rather
        // than a UI pose label; the card's declared semantic pose is the
        // correct label for this compact preview.
        role: pose,
        physicalId: cue.physicalId ?? null,
      }];
    });
  }, [pose, resolvedForm, route]);

  useEffect(() => {
    setFrameIdx(0);
  }, [card.id, resolvedForm]);
  useEffect(() => {
    if (frames.length <= 1) return;
    const frame = frames[frameIdx];
    const delay = frame?.durationTicks ? Math.max(50, frame.durationTicks * (1000 / 60)) : 1000 / PREVIEW_FPS;
    const id = window.setTimeout(() => setFrameIdx(i => (i + 1) % frames.length), delay);
    return () => window.clearTimeout(id);
  }, [frameIdx, frames]);

  const frame = frames[frameIdx];
  const source = frames.length > 0 ? 'ROM PHYSICAL' : route ? 'ROM PENDING' : 'NO ROM ROUTE';

  return (
    <div className="dev-attack-preview" title={`${card.name} — ${pose} · ${source} · ${frames.length} frames`}>
      <div className="dev-attack-preview-stage">
        {frame ? (
          <img src={frame.url} alt={card.name} className="dev-attack-preview-img"
            style={{ width: size, height: size }} draggable={false} />
        ) : (
          <span className="dev-attack-preview-empty">—</span>
        )}
      </div>
      <div className="dev-attack-preview-meta">
        <span className="dev-attack-preview-source">{source}</span>
        <span className="dev-attack-preview-pose">{frame?.role ?? pose}</span>
        <span className="dev-attack-preview-frames">{frames.length} fr</span>
        {card.type === 'beam' && <span className="dev-attack-preview-beam">beam</span>}
      </div>
    </div>
  );
}
