// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Story Studio
// Capítulos 1-32: mazo del jefe, AI boost, combates 2v2, viñetas.
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { STORY_ENEMY_DECKS, STORY_AI_BOOSTS, TEAM_BATTLES } from '../data/enemy_decks';
import { panelsForChapter, characterName } from '../data/storyPanels';
import { getCard, cardColor } from '../data/cards';

const CHAPTER_IDS = Object.keys(STORY_ENEMY_DECKS).map(Number).sort((a, b) => a - b);

export function StoryModule() {
  const [chapter, setChapter] = useState(1);

  const deck = STORY_ENEMY_DECKS[chapter] ?? [];
  const boost = STORY_AI_BOOSTS[chapter];
  const team = TEAM_BATTLES[chapter];
  const flow = panelsForChapter(chapter);

  // Contar cartas del mazo (id → copias)
  const deckBreakdown = useMemo(() => {
    const map = new Map<number, number>();
    for (const id of deck) map.set(id, (map.get(id) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [deck]);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Story Studio</h1>
        <p className="dev-sub">{CHAPTER_IDS.length} capítulos con mazo de jefe · viñetas motor-interpretadas.</p>
      </header>

      <div className="dev-story-select">
        {CHAPTER_IDS.map(ch => (
          <button key={ch} className={`dev-story-chip ${chapter === ch ? 'active' : ''}`} onClick={() => setChapter(ch)}>
            {ch}
          </button>
        ))}
      </div>

      <div className="dev-story-grid">
        <section className="dev-story-card">
          <h2>Capítulo {chapter}</h2>
          <div className="dev-story-meta">
            <div><label>Mazo del jefe</label><strong>{deck.length} cartas</strong></div>
            {boost && (
              <div><label>AI boost</label><strong>HP+{boost.hp} STR+{boost.str} KI+{boost.ki} SPD+{boost.spd}</strong></div>
            )}
            {team && (
              <div><label>2v2</label><strong>+{characterName(team.enemy2)}{team.ally ? ` (ally ${characterName(team.ally)})` : ' (solo)'}</strong></div>
            )}
            <div><label>Viñetas</label><strong>{flow.intro.length} intro{flow.outro ? ` + ${flow.outro.length} outro` : ''}</strong></div>
          </div>

          <h3>Mazo ({deckBreakdown.length} cartas distintas)</h3>
          <div className="dev-deck-list">
            {deckBreakdown.map(([id, copies]) => {
              const card = getCard(id);
              return (
                <div key={id} className="dev-deck-row">
                  <span className="dev-card-id">{String(id).padStart(3, '0')}</span>
                  <span className="dev-card-type" style={{ background: card ? cardColor(card.type) : '#666' }}>{card?.type?.[0]?.toUpperCase() ?? '?'}</span>
                  <span className="dev-card-name">{card?.name ?? `#${id}`}</span>
                  <span className="dev-deck-copies">×{copies}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="dev-story-card">
          <h2>Viñetas (intro)</h2>
          <div className="dev-panel-list">
            {flow.intro.map(p => (
              <div key={p.id} className="dev-panel-row">
                <span className="dev-panel-layout">{p.layout}</span>
                <span className="dev-panel-title">{p.title ?? p.id}</span>
                <span className="dev-panel-sub">{p.subtitle ?? ''}</span>
                {p.dialogue && <span className="dev-panel-dialogue">“{p.dialogue.text}”</span>}
              </div>
            ))}
          </div>
          {flow.outro && (
            <>
              <h2>Viñetas (outro)</h2>
              <div className="dev-panel-list">
                {flow.outro.map(p => (
                  <div key={p.id} className="dev-panel-row">
                    <span className="dev-panel-layout">{p.layout}</span>
                    <span className="dev-panel-title">{p.title ?? p.id}</span>
                    {p.dialogue && <span className="dev-panel-dialogue">“{p.dialogue.text}”</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
