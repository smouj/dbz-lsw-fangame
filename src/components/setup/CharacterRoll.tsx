// ═══════════════════════════════════════════════════════════════════════
// CHARACTER ROLL — selector principal del Team Setup
// ═══════════════════════════════════════════════════════════════════════
// Cinta de personajes en falsa perspectiva usando sprites OVERWORLD/chibi.
// Profundidad DISCRETA (nunca deforma el pixel art): cada distancia del
// centro define x/y/scale/opacity/zIndex pixel-perfect al asentarse.
// El personaje central destaca con su secuencia OW real de POWER UP
// (gather_power_pose + aura del battle overworld; fallback al chibi).
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveOverworldAura } from '../../data/characterAssets';

export interface RollCharacterAsset {
  characterId: string;
  name: string;
  /** Forma del chibi (base para laterales · forma activa para el centro). */
  formId: string;
  /** Etiqueta de forma legible (Base/SSJ/…), mostrada solo en el centro. */
  formLabel?: string;
  /** Chibi overworld (panel_sprites). */
  idleUrl: string | undefined;
  /** Pose OW de gather power (power-up real). */
  powerUrl: string | undefined;
  /** Aura OW del gather power. */
  auraUrl: string | undefined;
}

export interface CharacterRollProps {
  items: RollCharacterAsset[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

/** Parámetros discretos de profundidad por distancia al centro. */
const DEPTH = [
  { scale: 1.0, opacity: 1.0, z: 12, dx: 0 },    // selected
  { scale: 0.84, opacity: 0.82, z: 10, dx: 108 }, // ±1
  { scale: 0.68, opacity: 0.58, z: 8, dx: 184 },  // ±2
  { scale: 0.54, opacity: 0.32, z: 6, dx: 244 },  // ±3
];

function depthFor(offset: number) {
  const a = Math.abs(offset);
  const d = DEPTH[Math.min(a, 3)];
  return { ...d, sign: offset < 0 ? -1 : 1 };
}

/** Estados puramente UI del roll (nunca BattleState). */
type RollState = 'REST' | 'ROLLING' | 'SETTLE' | 'CHARGE' | 'POWER_UP_LOOP';

export function CharacterRoll({ items, selectedIndex, onSelect, disabled }: CharacterRollProps) {
  const [rollState, setRollState] = useState<RollState>('REST');
  const [powerUpOn, setPowerUpOn] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);
  const activeRailRef = useRef<HTMLButtonElement | null>(null);

  const safeIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
  const selected = items[safeIndex];

  // Aura del power-up del personaje central (battle overworld real).
  // Si el padre ya la pasó, se respeta; si no, se resuelve aquí (async).
  const [resolvedAura, setResolvedAura] = useState<string | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (selected?.auraUrl) { setResolvedAura(selected.auraUrl); return; }
    if (selected?.formId) {
      setResolvedAura(undefined);
      resolveOverworldAura(selected.formId).then(url => { if (alive) setResolvedAura(url); });
    }
    return () => { alive = false; };
  }, [selected?.characterId, selected?.auraUrl, selected?.formId]);

  // Identidad visual del centro = personaje + forma. Cambiar de PERSONAJE
  // re-roda el carrusel (ROLLING → settle → charge → power-up); cambiar de
  // FORMA en el mismo personaje solo recarga el power-up sin re-rodar.
  const selectedKey = `${selected?.characterId ?? ''}:${selected?.formId ?? ''}`;
  const prevKeyRef = useRef(selectedKey);

  useEffect(() => {
    const prevKey = prevKeyRef.current;
    prevKeyRef.current = selectedKey;
    const charChanged = prevKey.split(':')[0] !== selectedKey.split(':')[0];

    if (charChanged) {
      setRollState('ROLLING');
      setPowerUpOn(false);
      const t1 = setTimeout(() => setRollState('SETTLE'), 90);
      const t2 = setTimeout(() => setRollState('CHARGE'), 330);
      const t3 = setTimeout(() => { setRollState('POWER_UP_LOOP'); setPowerUpOn(true); }, 560);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }

    // Montaje inicial o cambio de forma: carga breve (pose sin aura → loop).
    // NOTA: CHARGE es REMAKE_PRESENTATION hasta S-OW1 (el jitter CSS no es GBC).
    setRollState('CHARGE');
    setPowerUpOn(false);
    const t = setTimeout(() => { setRollState('POWER_UP_LOOP'); setPowerUpOn(true); }, 260);
    return () => clearTimeout(t);
  }, [selectedKey]);

  // Navegación con teclado (LEFT/RIGHT). El foco del roll se gestiona
  // desde el TeamSetup (la pantalla completa es navegable sin ratón).
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled || items.length === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSelect((safeIndex + 1) % items.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSelect((safeIndex - 1 + items.length) % items.length);
    }
  }, [disabled, items.length, safeIndex, onSelect]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    const rail = railRef.current;
    const activeRail = activeRailRef.current;
    if (!rail || !activeRail) return;
    const left = activeRail.offsetLeft - (rail.clientWidth - activeRail.clientWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [safeIndex]);

  // Render: los ±3 alrededor del centro; el resto oculto.
  const visible = useMemo(() => {
    const out: { item: RollCharacterAsset; offset: number }[] = [];
    for (let i = -3; i <= 3; i++) {
      const idx = (safeIndex + i + items.length) % items.length;
      out.push({ item: items[idx], offset: i });
    }
    return out;
  }, [items, safeIndex]);

  const rolling = rollState === 'ROLLING';
  const charging = rollState === 'CHARGE';
  const powerUp = powerUpOn && rollState === 'POWER_UP_LOOP';
  const selectPrev = () => { if (!disabled && items.length > 0) onSelect((safeIndex - 1 + items.length) % items.length); };
  const selectNext = () => { if (!disabled && items.length > 0) onSelect((safeIndex + 1) % items.length); };

  return (
    <div className={`setup-roll ${rolling ? 'setup-roll-rolling' : ''}`} data-testid="character-roll">
      <button type="button" className="setup-roll-nav setup-roll-nav-left" onClick={selectPrev} disabled={disabled} aria-label="Previous character">
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>
      <button type="button" className="setup-roll-nav setup-roll-nav-right" onClick={selectNext} disabled={disabled} aria-label="Next character">
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>
      <div className="setup-roll-stage" aria-hidden />
      {visible.map(({ item, offset }) => {
        const d = depthFor(offset);
        const isCenter = offset === 0;
        const auraUrl = isCenter ? resolvedAura : undefined;
        const showPower = isCenter && (charging || powerUp) && !!item.powerUrl;
        return (
          <button
            key={item.characterId}
            type="button"
            className={`setup-roll-item${isCenter ? ' setup-roll-item-center' : ''}${isCenter && charging ? ' charging' : ''}`}
            style={{
              left: `calc(50% + ${d.sign * d.dx}px)`,
              transform: `translateX(-50%) scale(${d.scale})`,
              opacity: d.opacity,
              zIndex: d.z,
              imageRendering: 'pixelated',
            }}
            onClick={() => { if (!disabled) onSelect(items.indexOf(item)); }}
            tabIndex={-1}
            aria-label={item.name}
            data-selected={isCenter || undefined}
          >
            {isCenter ? <span className="setup-roll-source">OW ROM</span> : null}
            <span className="setup-roll-form">{isCenter ? (item.formLabel ?? '') : ''}</span>
            <span className="setup-roll-chibi">
              {showPower ? (
                <>
                  <img src={item.powerUrl} alt="" className="setup-roll-power" draggable={false} />
                  {powerUp && auraUrl ? (
                    <img src={auraUrl} alt="" className="setup-roll-aura" draggable={false} />
                  ) : null}
                </>
              ) : item.idleUrl ? (
                <img src={item.idleUrl} alt="" className="setup-roll-idle" draggable={false} />
              ) : null}
            </span>
            <span className="setup-roll-name">{item.name}</span>
          </button>
        );
      })}
      <div className="setup-roll-rail" aria-label="Character quick select" ref={railRef}>
        {items.map((item, index) => (
          <button
            key={`${item.characterId}-rail`}
            ref={index === safeIndex ? activeRailRef : undefined}
            type="button"
            className={`setup-roll-rail-dot${index === safeIndex ? ' active' : ''}`}
            onClick={() => { if (!disabled) onSelect(index); }}
            aria-label={item.name}
            aria-current={index === safeIndex ? 'true' : undefined}
          >
            {item.idleUrl ? <img src={item.idleUrl} alt="" draggable={false} /> : <span />}
          </button>
        ))}
      </div>
    </div>
  );
}
