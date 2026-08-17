// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Story Studio
// Capítulos 1-32: mazo del jefe, AI boost, combates 2v2, viñetas
// + PREVIEW DE DIÁLOGO: cómo y dónde se colocan los sprites de
// personajes (retrato real GBC, side left/right, emoción, fallback)
// exactamente como los renderiza StorySceneScreen.
// ═══════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { STORY_ENEMY_DECKS, STORY_AI_BOOSTS, TEAM_BATTLES } from '../data/enemy_decks';
import { panelsForChapter, characterName, type StoryPanel } from '../data/storyPanels';
import { storyPortraitUrl } from '../data/storyPortraits';
import { MENU_PORTRAITS, MINI_PORTRAITS } from '../data/icons';
import { getCard, cardColor } from '../data/cards';

const CHAPTER_IDS = Object.keys(STORY_ENEMY_DECKS).map(Number).sort((a, b) => a - b);

// Alias idéntico al del juego (main.tsx CHAR_PORTRAIT_ALIAS)
const CHAR_PORTRAIT_ALIAS: Record<string, string> = {
  gohan_kid: 'gohan', gohan_adult: 'gohan',
  trunks_kid: 'trunks', trunks_future: 'trunks',
};

function miniPortraitFor(charId: string): string | undefined {
  return MINI_PORTRAITS[CHAR_PORTRAIT_ALIAS[charId] ?? charId];
}

/** Resolución canónica del retrato de una viñeta (igual que StorySceneScreen). */
function resolvePortrait(c: { character: string; form?: string; emotion?: string }): string | undefined {
  return storyPortraitUrl(c.character, c.form, c.emotion as never)
    || miniPortraitFor(c.character)
    || MENU_PORTRAITS[CHAR_PORTRAIT_ALIAS[c.character] ?? c.character];
}

export function StoryModule() {
  const [chapter, setChapter] = useState(1);
  const [selected, setSelected] = useState<{ phase: 'intro' | 'outro'; id: string } | null>(null);

  const deck = STORY_ENEMY_DECKS[chapter] ?? [];
  const boost = STORY_AI_BOOSTS[chapter];
  const team = TEAM_BATTLES[chapter];
  const flow = panelsForChapter(chapter);

  const deckBreakdown = useMemo(() => {
    const map = new Map<number, number>();
    for (const id of deck) map.set(id, (map.get(id) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [deck]);

  // Viñeta seleccionada
  const allPanels: { phase: 'intro' | 'outro'; panel: StoryPanel }[] = [
    ...flow.intro.map(p => ({ phase: 'intro' as const, panel: p })),
    ...(flow.outro ?? []).map(p => ({ phase: 'outro' as const, panel: p })),
  ];
  const current = selected
    ? allPanels.find(x => x.phase === selected.phase && x.panel.id === selected.id) ?? null
    : (allPanels.find(x => x.panel.dialogue || (x.panel.characters?.length ?? 0) > 0) ?? null);

  // Auditoría de cobertura de retratos del capítulo
  const audit = useMemo(() => {
    let withChars = 0, realPortraits = 0, fallbacks = 0;
    const missing: string[] = [];
    for (const { panel } of allPanels) {
      for (const c of panel.characters ?? []) {
        withChars++;
        const url = resolvePortrait(c);
        if (url) realPortraits++;
        else { fallbacks++; missing.push(`${panel.id}:${c.character}`); }
      }
    }
    return { withChars, realPortraits, fallbacks, missing };
  }, [chapter]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (phase: 'intro' | 'outro', id: string) => setSelected({ phase, id });

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Story Studio</h1>
        <p className="dev-sub">{CHAPTER_IDS.length} capítulos · viñetas motor-interpretadas · preview de diálogo con los sprites del juego.</p>
      </header>

      <div className="dev-story-select">
        {CHAPTER_IDS.map(ch => (
          <button key={ch} className={`dev-story-chip ${chapter === ch ? 'active' : ''}`} onClick={() => setChapter(ch)}>
            {ch}
          </button>
        ))}
      </div>

      {/* ══ PREVIEW DE VIÑETA (render idéntico al juego) ══ */}
      {current && (
        <section className="dev-story-card dev-story-preview-wrap">
          <h2>Preview de diálogo — {current.panel.id} ({current.phase})</h2>
          <p className="dev-muted" style={{ margin: '-4px 0 10px', fontSize: 12 }}>
            Render idéntico a <code>StorySceneScreen</code>: retrato real GBC → mini → menú; posición por <code>side</code>; nombre bajo el retrato; caja de diálogo con speaker.
          </p>
          <div className="dev-story-preview-layout">
            <div className={`story-panel story-panel-${current.panel.layout.toLowerCase()} fx-zoom`}>
              <div className="story-panel-bg" style={{ backgroundImage: `url(${current.panel.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="story-panel-dim" />
              {current.panel.title && (
                <div className="story-panel-title">
                  <h2>{current.panel.title}</h2>
                  {current.panel.subtitle && <p>{current.panel.subtitle}</p>}
                </div>
              )}
              {current.panel.characters && current.panel.characters.length > 0 && (
                <div className={`story-characters layout-${current.panel.layout.toLowerCase()}`}>
                  {current.panel.characters.map((c, i) => {
                    const url = resolvePortrait(c);
                    const side = c.side ?? (i === 0 ? 'left' : 'right');
                    return (
                      <div key={i} className={`story-character ${side}`}>
                        {url
                          ? <img src={url} alt={characterName(c.character)} className="story-portrait" />
                          : <div className="story-portrait story-portrait-none">{characterName(c.character).slice(0, 1)}</div>}
                        <span className="story-character-name">{characterName(c.character)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {current.panel.dialogue && (
                <div className="story-dialogue">
                  <div className="story-speaker">{current.panel.dialogue.speaker}</div>
                  <div className="story-text visible">{current.panel.dialogue.text}</div>
                </div>
              )}
            </div>

            {/* Datos canónicos de la viñeta */}
            <div className="dev-story-inspector">
              <h3>Datos de la viñeta</h3>
              <div className="cfg-grid">
                <div className="cfg-row"><span className="cfg-key">layout</span><span className="cfg-val">{current.panel.layout}</span></div>
                <div className="cfg-row"><span className="cfg-key">background</span><span className="cfg-val">{current.panel.background.split('/').pop()}</span></div>
                <div className="cfg-row"><span className="cfg-key">effects</span><span className="cfg-val">{(current.panel.effects ?? []).join(', ') || '—'}</span></div>
                <div className="cfg-row"><span className="cfg-key">transition</span><span className="cfg-val">{current.panel.transition ?? '—'}</span></div>
              </div>
              {(current.panel.characters ?? []).map((c, i) => {
                const url = resolvePortrait(c);
                const side = c.side ?? (i === 0 ? 'left' : 'right');
                return (
                  <div key={i} className="cfg-grid" style={{ marginTop: 6 }}>
                    <div className="cfg-row"><span className="cfg-key">personaje {i + 1}</span><span className="cfg-val">{characterName(c.character)}</span></div>
                    <div className="cfg-row"><span className="cfg-key">side</span><span className="cfg-val">{side}</span></div>
                    <div className="cfg-row"><span className="cfg-key">form</span><span className="cfg-val">{c.form ?? '—'}</span></div>
                    <div className="cfg-row"><span className="cfg-key">emotion</span><span className="cfg-val">{c.emotion ?? '—'}</span></div>
                    <div className="cfg-row"><span className="cfg-key">retrato</span>
                      <span className={`cfg-val ${url ? 'ok' : 'bad'}`}>{url ? url.split('/').pop() : 'FALLBACK/MISSING'}</span>
                    </div>
                  </div>
                );
              })}
              {current.panel.dialogue && (
                <div className="cfg-grid" style={{ marginTop: 6 }}>
                  <div className="cfg-row"><span className="cfg-key">speaker</span><span className="cfg-val">{current.panel.dialogue.speaker}</span></div>
                  <div className="cfg-row"><span className="cfg-key">side diálogo</span><span className="cfg-val">{current.panel.dialogue.side ?? '—'}</span></div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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

          <h3>Cobertura de retratos (capítulo)</h3>
          <div className="dev-tag-row">
            <span className="dev-tag ok">✓ {audit.realPortraits}/{audit.withChars} con retrato real</span>
            {audit.fallbacks > 0 && <span className="dev-tag bad">⚠ {audit.fallbacks} con fallback</span>}
          </div>
          {audit.missing.length > 0 && (
            <p className="dev-muted" style={{ marginTop: 6, fontSize: 11 }}>
              Sin retrato real: {audit.missing.slice(0, 6).join(' · ')}{audit.missing.length > 6 ? ` +${audit.missing.length - 6}` : ''}
            </p>
          )}
        </section>

        <section className="dev-story-card">
          <h2>Viñetas — selecciona para previsualizar</h2>
          <div className="dev-panel-list">
            {flow.intro.map(p => (
              <button key={p.id}
                className={`dev-panel-row dev-panel-btn ${current?.panel.id === p.id && current?.phase === 'intro' ? 'active' : ''}`}
                onClick={() => select('intro', p.id)}>
                <span className="dev-panel-layout">{p.layout}</span>
                <span className="dev-panel-title">{p.title ?? p.id}</span>
                <span className="dev-panel-sub">{(p.characters ?? []).map(c => characterName(c.character)).join('+')}</span>
                {p.dialogue && <span className="dev-panel-dialogue">“{p.dialogue.text}”</span>}
              </button>
            ))}
            {flow.outro?.map(p => (
              <button key={p.id}
                className={`dev-panel-row dev-panel-btn ${current?.panel.id === p.id && current?.phase === 'outro' ? 'active' : ''}`}
                onClick={() => select('outro', p.id)}>
                <span className="dev-panel-layout">{p.layout}</span>
                <span className="dev-panel-title">{p.title ?? p.id}</span>
                <span className="dev-panel-sub">{(p.characters ?? []).map(c => characterName(c.character)).join('+')}</span>
                {p.dialogue && <span className="dev-panel-dialogue">“{p.dialogue.text}”</span>}
              </button>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
}