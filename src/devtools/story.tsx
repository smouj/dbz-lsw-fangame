// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — STORY DIALOGUE CANON INSPECTOR
// ═══════════════════════════════════════════════════════════════════════
// 30 MAIN Stories + EX Story 1/2 in cartridge order. Dialogue presentation
// only: physical cutscene BG + Story portrait/form/emotion + text provenance.
// Story Map/RPG runtime is intentionally outside this tool.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { STORY_ENEMY_DECKS, STORY_AI_BOOSTS, TEAM_BATTLES } from '../data/enemy_decks';
import { panelsForChapter, characterName, type StoryPanel } from '../data/storyPanels';
import { canonicalStoryPortraitUrl } from '../data/storyPortraitCanon';
import { storyIdentityForSequence, CANONICAL_STORY_ORDER } from '../data/storyCanonical';
import { canonicalStoryNarrative } from '../data/storyNarrativeCanon';
import { getCard, cardColor } from '../data/cards';

const SEQUENCE_IDS = CANONICAL_STORY_ORDER.map((story) => story.sequenceIndex);

function resolvePortrait(c: { character: string; form?: string; emotion?: string }): string | undefined {
  return canonicalStoryPortraitUrl(c.character, c.form, c.emotion as never);
}

export function StoryModule() {
  const [sequenceIndex, setSequenceIndex] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStageScale(Math.min(1, el.clientWidth / 1082, el.clientHeight / 605));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const identity = storyIdentityForSequence(sequenceIndex);
  const narrative = canonicalStoryNarrative(sequenceIndex);
  const flow = panelsForChapter(sequenceIndex);
  const deck = STORY_ENEMY_DECKS[sequenceIndex] ?? [];
  const boost = STORY_AI_BOOSTS[sequenceIndex];
  const team = TEAM_BATTLES[sequenceIndex];

  const deckBreakdown = useMemo(() => {
    const map = new Map<number, number>();
    for (const id of deck) map.set(id, (map.get(id) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [deck]);

  const panels = flow.intro;
  const current: StoryPanel | null = selectedId
    ? panels.find((panel) => panel.id === selectedId) ?? null
    : panels.find((panel) => panel.dialogue) ?? panels[0] ?? null;

  const audit = useMemo(() => {
    let speakers = 0;
    let portraits = 0;
    const missing: string[] = [];
    for (const panel of panels) {
      for (const c of panel.characters ?? []) {
        speakers++;
        if (resolvePortrait(c)) portraits++;
        else missing.push(`${panel.id}:${c.character}:${c.form ?? 'base'}`);
      }
    }
    return { speakers, portraits, missing };
  }, [panels]);

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Story Studio — Dialogue Canon</h1>
        <p className="dev-sub">
          30 Stories + 2 EX · orden físico de ROM · diálogo/viñetas/retratos únicamente · Story Map/RPG excluido.
        </p>
      </header>

      <div className="dev-story-select">
        {SEQUENCE_IDS.map((seq) => {
          const story = storyIdentityForSequence(seq);
          return (
            <button
              key={story.id}
              className={`dev-story-chip ${sequenceIndex === seq ? 'active' : ''}`}
              onClick={() => { setSequenceIndex(seq); setSelectedId(null); }}
              title={`${story.id} · ROM storyId ${story.romStoryId}`}
            >
              {story.kind === 'EXTRA' ? `EX${story.storyNumber}` : story.storyNumber}
            </button>
          );
        })}
      </div>

      <section className="dev-story-card">
        <h2>{identity.label} — {identity.title}</h2>
        <div className="dev-story-meta">
          <div><label>sequenceIndex</label><strong>{identity.sequenceIndex}</strong></div>
          <div><label>ROM storyId</label><strong>{identity.romStoryId}</strong></div>
          <div><label>ROM</label><strong>Bank ${identity.rom.bank.toString(16).toUpperCase()} : ${identity.rom.address.toString(16).toUpperCase()}</strong></div>
          <div><label>Tipo</label><strong>{identity.kind}</strong></div>
          <div><label>Arco</label><strong>{identity.arc}</strong></div>
          <div><label>Texto</label><strong>{narrative.textEvidence}</strong></div>
          <div><label>Story Map</label><strong>EXCLUIDO</strong></div>
        </div>
      </section>

      {current && (
        <section className="dev-story-card dev-story-preview-wrap">
          <h2>Preview — {current.id}</h2>
          <p className="dev-muted" style={{ margin: '-4px 0 10px', fontSize: 12 }}>
            Mismo contrato visual que producción. El inspector muestra procedencia de texto, fondo y retrato para impedir que una reconstrucción se presente como ROM literal.
          </p>
          <div className="dev-story-preview-layout">
            <div className="dev-story-stage" ref={stageRef}>
              <div
                className={`story-panel story-panel-${current.layout.toLowerCase()}`}
                style={{ transform: `scale(${stageScale})`, transformOrigin: 'center center' }}
              >
                <div
                  className="story-panel-bg"
                  style={{ backgroundImage: `url(${current.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                <div className="story-panel-dim" />
                {current.title && (
                  <div className="story-panel-title">
                    <h2>{current.title}</h2>
                    {current.subtitle && <p>{current.subtitle}</p>}
                  </div>
                )}
                {(current.characters?.length ?? 0) > 0 && (
                  <div className={`story-characters layout-${current.layout.toLowerCase()}`}>
                    {current.characters!.map((c, i) => {
                      const url = resolvePortrait(c);
                      const side = c.side ?? (current.characters!.length === 1 ? 'center' : i === 0 ? 'left' : 'right');
                      return (
                        <div key={`${c.character}-${i}`} className={`story-character ${side} speaking`}>
                          {url
                            ? <img src={url} alt={characterName(c.character)} className="story-portrait" />
                            : <div className="story-portrait story-portrait-none">{characterName(c.character).slice(0, 1)}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {current.dialogue && (
                  <div className="story-dialogue">
                    <div className="story-speaker">{current.dialogue.speaker}</div>
                    <div className="story-text visible">{current.dialogue.text}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="dev-story-inspector">
              <h3>Binding canónico</h3>
              <div className="cfg-grid">
                <div className="cfg-row"><span className="cfg-key">Story</span><span className="cfg-val">{current.provenance?.canonicalStoryId ?? identity.id}</span></div>
                <div className="cfg-row"><span className="cfg-key">romStoryId</span><span className="cfg-val">{current.provenance?.romStoryId ?? identity.romStoryId}</span></div>
                <div className="cfg-row"><span className="cfg-key">layout</span><span className="cfg-val">{current.layout}</span></div>
                <div className="cfg-row"><span className="cfg-key">cutscene</span><span className="cfg-val">#{current.provenance?.backgroundAssetId ?? '?'} · {current.background.split('/').pop()}</span></div>
                <div className="cfg-row"><span className="cfg-key">BG evidence</span><span className="cfg-val">{current.provenance?.backgroundEvidence ?? '—'}</span></div>
                <div className="cfg-row"><span className="cfg-key">text evidence</span><span className="cfg-val">{current.provenance?.textEvidence ?? '—'}</span></div>
                <div className="cfg-row"><span className="cfg-key">portrait evidence</span><span className="cfg-val">{current.provenance?.portraitEvidence ?? '—'}</span></div>
                <div className="cfg-row"><span className="cfg-key">Story Map</span><span className="cfg-val">NO</span></div>
              </div>
              {(current.characters ?? []).map((c, i) => {
                const url = resolvePortrait(c);
                return (
                  <div key={i} className="cfg-grid" style={{ marginTop: 6 }}>
                    <div className="cfg-row"><span className="cfg-key">personaje</span><span className="cfg-val">{characterName(c.character)}</span></div>
                    <div className="cfg-row"><span className="cfg-key">form</span><span className="cfg-val">{c.form ?? 'base/fallback físico'}</span></div>
                    <div className="cfg-row"><span className="cfg-key">emotion</span><span className="cfg-val">{c.emotion ?? 'normal'}</span></div>
                    <div className="cfg-row"><span className="cfg-key">retrato</span><span className={`cfg-val ${url ? 'ok' : 'bad'}`}>{url?.split('/').pop() ?? 'MISSING'}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="dev-story-grid">
        <section className="dev-story-card">
          <h2>Combate / cobertura</h2>
          <div className="dev-story-meta">
            <div><label>Mazo enemigo</label><strong>{deck.length} cartas</strong></div>
            {boost && <div><label>AI boost</label><strong>HP+{boost.hp} STR+{boost.str} KI+{boost.ki} SPD+{boost.spd}</strong></div>}
            {team && <div><label>2v2</label><strong>+{characterName(team.enemy2)}{team.ally ? ` · ally ${characterName(team.ally)}` : ''}</strong></div>}
            <div><label>Retratos</label><strong>{audit.portraits}/{audit.speakers}</strong></div>
            <div><label>Paneles</label><strong>{panels.length}</strong></div>
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
          {audit.missing.length > 0 && <p className="dev-muted">Missing: {audit.missing.join(' · ')}</p>}
        </section>

        <section className="dev-story-card">
          <h2>Secuencia narrativa</h2>
          <div className="dev-panel-list">
            {panels.map((panel) => (
              <button
                key={panel.id}
                className={`dev-panel-row dev-panel-btn ${current?.id === panel.id ? 'active' : ''}`}
                onClick={() => setSelectedId(panel.id)}
              >
                <span className="dev-panel-layout">{panel.layout}</span>
                <span className="dev-panel-title">{panel.title ?? panel.dialogue?.speaker ?? panel.id}</span>
                <span className="dev-panel-sub">#{panel.provenance?.backgroundAssetId ?? '?'} {(panel.characters ?? []).map(c => characterName(c.character)).join('+')}</span>
                {panel.dialogue && <span className="dev-panel-dialogue">“{panel.dialogue.text}”</span>}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
