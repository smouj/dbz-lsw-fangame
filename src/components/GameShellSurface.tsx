import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GAME_DESIGN_W, GAME_DESIGN_H } from './GameViewport';

/** Keep the menu composition in design pixels at every viewport size.
 * The battle retains its own native renderer and never enters this surface. */
export function GameShellSurface({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const viewport = ref.current?.closest('.game-viewport');
    if (!viewport) return;
    const update = () => {
      const { width, height } = viewport.getBoundingClientRect();
      setScale(Math.min(width / GAME_DESIGN_W, height / GAME_DESIGN_H));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="shell-surface" style={{ width: GAME_DESIGN_W, height: GAME_DESIGN_H, transform: `scale(${scale})` }}
    onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !onBack) return;
      if ((event.target as HTMLElement).closest('input, textarea, select, [role="dialog"]')) return;
      event.preventDefault();
      onBack();
    }}>{children}</div>;
}
