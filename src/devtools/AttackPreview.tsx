// ═══════════════════════════════════════════════════════════════════════
// AttackPreview — PREVIEW ANIMADA del ataque de una carta (Card Database).
// Reproduce la secuencia REAL de frames de la pose de la carta (canon
// cardBattlePose → resolvePoseFrameSequence) sobre un personaje compatible:
// un "gif" hecho con frames del manifest, no una imagen estática.
//
//   card → cardBattlePose (beam_charge/attack_fwd/guard/gather_power…)
//        → resolvePoseFrameSequence (frames reales del manifest)
//        → <img> que cicla los frames a velocidad GBC (~12 fps)
//
// Para beams se reproduce la cadena completa: charge → fire (→ ray si el
// manifest tiene frames de proyectil separados). Fuente ÚNICA: el manifest
// de la forma — nunca tablas locales.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import type { CardDef } from '../data/cards';
import { cardBattlePose } from '../battle/cardPoses';
import { resolveCombatPose, resolvePoseFrameSequence } from '../battle/spriteConfig';
import { spriteFrameUrl, _spriteManifestInternals, spriteDirFor } from '../data/spriteManifest';
import { getForm } from '../data/roster';

const PREVIEW_FPS = 12; // ~12 fps: suficiente para ver la secuencia sin lag

interface Props {
  card: CardDef;
  /** formId del personaje sobre el que previsualizar (default: primer compatible). */
  formId?: string;
  /** Altura del frame en px (los sprites son ~46px nativos, x2 = 92). */
  size?: number;
}

export function AttackPreview({ card, formId, size = 96 }: Props) {
  const [manifest, setManifest] = useState<Record<string, { frames?: unknown[] }> | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);

  // Personaje: el formId dado o el primer compatible del roster.
  const resolvedForm = useMemo(() => {
    if (formId) return formId;
    const compat = card.compatible?.[0] ?? 'goku';
    const f = getForm(compat);
    return f?.id ?? 'goku_base';
  }, [card, formId]);

  useEffect(() => {
    let alive = true;
    setManifest(null);
    _spriteManifestInternals.loadManifestFor(resolvedForm).then(m => {
      if (alive) setManifest(m as Record<string, { frames?: unknown[] }> | null);
    });
    return () => { alive = false; };
  }, [resolvedForm]);

  // Secuencia de frames de la pose de la carta (canon cardBattlePose).
  // El manifest indexa por POSE (attack_fwd → frames[]); available() debe
  // buscar el archivo en CUALQUIER pose (el mismo frame físico puede estar
  // en varias).
  const dir = spriteDirFor(resolvedForm);
  const fileSet = useMemo(() => {
    const s = new Set<string>();
    if (!manifest) return s;
    for (const pv of Object.values(manifest)) {
      const frames = (pv as { frames?: Array<{ file?: string } | string> })?.frames ?? [];
      for (const f of frames) {
        const file = typeof f === 'string' ? f : f?.file;
        if (file) s.add(file);
      }
    }
    return s;
  }, [manifest]);
  const files = useMemo(() => {
    if (!manifest || !dir) return [];
    const pose = cardBattlePose(card);
    const available = (file: string) => fileSet.has(file);
    return resolvePoseFrameSequence(pose, dir, available);
  }, [manifest, dir, card, fileSet]);

  // Cadena beam: si la carta es beam, añadimos fire + ray tras el charge.
  const allFiles = useMemo(() => {
    if (card.type !== 'beam' || !dir) return files;
    const avail = (f: string) => fileSet.has(f);
    const fireFiles = resolvePoseFrameSequence('beam_fire', dir, avail);
    return [...files, ...fireFiles];
  }, [card.type, dir, files, fileSet]);

  // Ciclo: avanza frame cada 1000/PREVIEW_FPS ms, vuelve al inicio.
  useEffect(() => {
    if (allFiles.length <= 1) { setFrameIdx(0); return; }
    const id = setInterval(() => setFrameIdx(i => (i + 1) % allFiles.length), 1000 / PREVIEW_FPS);
    return () => clearInterval(id);
  }, [allFiles.length]);

  const src = allFiles[frameIdx] ? spriteFrameUrl(resolvedForm, allFiles[frameIdx]) : undefined;
  const pose = cardBattlePose(card);
  const resolvedPose = resolveCombatPose(pose, p => !!manifest?.[p]?.frames?.length);
  return (
    <div className="dev-attack-preview" title={`${card.name} — pose ${pose}${resolvedPose && resolvedPose !== pose ? ` → ${resolvedPose}` : ''} · ${allFiles.length} frames @${PREVIEW_FPS}fps`}>
      <div className="dev-attack-preview-stage">
        {src ? (
          <img src={src} alt={card.name} className="dev-attack-preview-img"
            style={{ width: size, height: size }} draggable={false} />
        ) : (
          <span className="dev-attack-preview-empty">—</span>
        )}
      </div>
      <div className="dev-attack-preview-meta">
        <span className="dev-attack-preview-pose">{pose}</span>
        <span className="dev-attack-preview-frames">{allFiles.length} fr</span>
        {card.type === 'beam' && <span className="dev-attack-preview-beam">beam</span>}
      </div>
    </div>
  );
}
