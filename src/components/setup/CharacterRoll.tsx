import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CharacterPowerPreview } from './CharacterPowerPreview';

export interface RollCharacterAsset {
  characterId: string;
  name: string;
  formId: string;
  formLabel?: string;
  idleUrl: string | undefined;
  powerUrl: string | undefined;
  auraUrl: string | undefined;
  locked?: boolean;
}

export interface CharacterRollProps {
  items: RollCharacterAsset[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
}

/** Presentation only: selection never advances the battle engine. */
export function CharacterRoll({ items, selectedIndex, onSelect, disabled }: CharacterRollProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const activeRailRef = useRef<HTMLButtonElement>(null);
  const safeIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
  const selected = items[safeIndex];

  // Keep identities stable as neighbours travel through the centre. The
  // shortest circular offset handles wraparound and small rosters too.
  const visible = useMemo(() => items.flatMap((item, index) => {
    let offset = (index - safeIndex + items.length) % items.length;
    if (offset > items.length / 2) offset -= items.length;
    return Math.abs(offset) <= 2 ? [{ item, index, offset }] : [];
  }), [items, safeIndex]);

  const select = (index: number) => {
    if (!disabled && items.length) onSelect((index + items.length) % items.length);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !items.length) return;
    const next = event.key === 'ArrowRight' ? safeIndex + 1
      : event.key === 'ArrowLeft' ? safeIndex - 1
      : event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
    // After arrow navigation Enter must not activate the old rail button.
    event.currentTarget.focus({ preventScroll: true });
  };

  useEffect(() => {
    const rail = railRef.current;
    const active = activeRailRef.current;
    if (!rail || !active) return;
    rail.scrollTo({
      left: Math.max(0, active.offsetLeft - (rail.clientWidth - active.clientWidth) / 2),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [safeIndex]);

  return (
    <div className="setup-roll" data-testid="character-roll" tabIndex={disabled ? -1 : 0}
      role="region" aria-label="Character selection" onKeyDown={onKeyDown}>
      <div className="setup-roll-heading" aria-hidden="true">
        <span>SELECT FIGHTER</span>
        <span>{String(items.length ? safeIndex + 1 : 0).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
      </div>
      <button type="button" className="setup-roll-nav setup-roll-nav-left"
        onClick={() => select(safeIndex - 1)} disabled={disabled || items.length < 2} aria-label="Previous character">
        <ChevronLeft size={22} strokeWidth={2} />
      </button>
      <button type="button" className="setup-roll-nav setup-roll-nav-right"
        onClick={() => select(safeIndex + 1)} disabled={disabled || items.length < 2} aria-label="Next character">
        <ChevronRight size={22} strokeWidth={2} />
      </button>
      <div className="setup-roll-stage" aria-hidden="true" />
      {visible.map(({ item, index, offset }) => {
        const distance = Math.abs(offset);
        const isCenter = offset === 0;
        const x = Math.sign(offset) * (distance === 2 ? 320 : distance * 172);
        return (
          <button key={item.characterId} type="button"
            className={`setup-roll-item${isCenter ? ' setup-roll-item-center' : ''}${item.locked ? ' setup-roll-locked' : ''}`}
            style={{ transform: `translate3d(${x}px, ${distance * 6}px, 0)`, opacity: [1, .78, .48][distance], zIndex: 10 - distance }}
            onClick={() => select(index)} disabled={disabled} tabIndex={-1}
            aria-label={item.name} aria-pressed={isCenter} data-selected={isCenter || undefined} data-distance={distance}>
            <span className="setup-roll-form">{isCenter ? item.formLabel : ''}</span>
            <span className="setup-roll-chibi">
              {isCenter ? (
                <CharacterPowerPreview key={`${item.characterId}:${item.formId}`} item={item} />
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
          <button key={item.characterId} ref={index === safeIndex ? activeRailRef : undefined}
            type="button" className={`setup-roll-rail-dot${index === safeIndex ? ' active' : ''}`}
            onClick={() => select(index)} aria-label={item.name} title={item.name}
            aria-current={index === safeIndex ? 'true' : undefined} disabled={disabled}>
            <span className="setup-roll-rail-dot-mark" />
          </button>
        ))}
      </div>
      <span className="setup-selection-announcement" role="status" aria-live="polite" aria-atomic="true">
        {selected ? `${selected.name}, ${selected.formLabel ?? ''}` : 'No characters available'}
      </span>
    </div>
  );
}
