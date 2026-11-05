import type { KeyboardEvent, RefObject } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

export type MainMenuDestination = 'story' | 'versus' | 'deck' | 'characters' | 'cards' | 'settings';

export interface MainMenuPresentationItem {
  screen: MainMenuDestination;
  label: string;
  desc: string;
  Icon: LucideIcon;
}

interface MainMenuPresentationProps {
  items: MainMenuPresentationItem[];
  playerLevel: number;
  chapterNumber: number;
  chapterCount: number;
  chapterName: string;
  storyLabel: string;
  continueLabel: string;
  chooseStoryLabel: string;
  playerLabel: string;
  mainMenuLabel: string;
  navigateLabel: string;
  selectLabel: string;
  navRef?: RefObject<HTMLElement | null>;
  onMenuKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  onNavigate?: (screen: MainMenuDestination) => void;
  preview?: boolean;
}

/** Shared visual composition for the production main menu and HUD Studio. */
export function MainMenuPresentation({
  items, playerLevel, chapterNumber, chapterCount, chapterName, storyLabel,
  continueLabel, chooseStoryLabel, playerLabel, mainMenuLabel, navigateLabel,
  selectLabel, navRef, onMenuKeyDown, onNavigate, preview = false,
}: MainMenuPresentationProps) {
  return <main className={`shell-menu${preview ? ' dev-menu-preview' : ''}`}>
    <header className="shell-masthead">
      <img src="/logo-dbz-title.png" className="shell-brand" alt="Dragon Ball Z" />
      <div className="shell-edition"><span>LEGENDARY SUPER WARRIORS</span><strong>{chooseStoryLabel}</strong></div>
      <div className="shell-player"><span>{playerLabel}</span><strong>LV. {playerLevel.toString().padStart(2, '0')}</strong></div>
    </header>
    <nav className="shell-panels" ref={navRef} aria-label={mainMenuLabel} onKeyDown={onMenuKeyDown}>
      {items.map(({ screen, label, desc, Icon }, index) => <button key={screen} type="button"
        className={`shell-panel shell-panel-${screen}`} data-screen={screen} onClick={() => onNavigate?.(screen)}>
        <span className="shell-panel-index">0{index + 1}</span>
        <Icon className="shell-panel-icon" aria-hidden="true" />
        <span className="shell-panel-copy"><strong>{label}</strong><span>{desc}</span></span>
        {screen === 'story' && <span className="shell-story-progress">
          <span>{storyLabel} {String(chapterNumber).padStart(2, '0')} / {chapterCount}</span>
          <strong>{chapterName}</strong>
          <span className="shell-story-cta">{continueLabel} <ChevronRight size={22} aria-hidden="true" /></span>
        </span>}
        {screen !== 'story' && <ChevronRight className="shell-panel-arrow" aria-hidden="true" />}
      </button>)}
    </nav>
    <footer className="shell-footer"><span>DBZ LSW FANGAME · FAN GAME</span><span>↑ ↓ ← → {navigateLabel} <b>ENTER</b> {selectLabel}</span></footer>
  </main>;
}
