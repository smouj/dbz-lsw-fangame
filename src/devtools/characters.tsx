// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — Character Studio (integra Sprites + Sheets)
// Personaje → formas → stats · assets · poses de combate · browser de
// frames con inspección (bbox/alpha/specks/duplicados/usos semánticos).
// Las antiguas vistas Sprites/Sheets se fusionaron AQUÍ: hay UNA sola
// inspección de frames (el manifest V9 de la forma), sin pipelines
// paralelos que puedan quedar obsoletos o descanonizados.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  CHARACTERS, FORMS, getForm, statAtLevel, sheetUrl, idleSpriteUrl, LIMIT_DEFAULTS,
} from '../data/roster';
import { spriteDirFor, spriteManifestUrl, spriteFrameUrl, spritePoseFrameUrl, _spriteManifestInternals } from '../data/spriteManifest';
import { CARDS, getCard, CARD_COLORS, CARD_TYPE_NAMES } from '../data/cards';
import { cardBattlePose, cardUsableBy } from '../battle/cardPoses';
import { resolveCombatPose } from '../battle/spriteConfig';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { MINI_PORTRAITS, MENU_PORTRAITS } from '../data/icons';
import { STORY_PORTRAITS, storyPortraitUrl } from '../data/storyPortraits';
import { overworldUrl } from '../data/overworld';
import { battleOverworldActorUrl, battleOverworldAuraUrlAsync } from '../data/battleOverworld';
import { characterName } from '../data/storyPanels';
import { SPRITE_CANON, type CanonStatus } from '../data/generated/spriteCanon.generated';
import { COMBAT_POSE_ORDER, COMBAT_REQUIRED_POSES } from '../battle/spriteConfig';
import { useSheetAnalysis, groupFramesByPose, type FrameAnalysis } from './frameAnalysis';
import { getCharacterAssetBundle, resolveBundlePoses, type CombatPoseAsset } from '../data/characterAssets';
import { poseSemantics, parseFrameName } from './frameSemantics';
import { FormPreview } from './FormPreview';
import type { DevLinkedTarget, DevModuleId } from './DevStudio';

const STATS: { key: 'hp' | 'str' | 'ki' | 'spd'; label: string; color: string }[] = [
  { key: 'hp', label: 'HP', color: '#e04a4a' },
  { key: 'str', label: 'STR', color: '#e08a3a' },
  { key: 'ki', label: 'KI', color: '#4a9ae0' },
  { key: 'spd', label: 'SPD', color: '#5ac05a' },
];

export function CharactersModule({ onOpenModule }: {
  onOpenModule?: (id: DevModuleId, target: Omit<DevLinkedTarget, 'nonce'>) => void;
}) {
  const [charId, setCharId] = useState(CHARACTERS[0]?.id ?? 'goku');
  const [formId, setFormId] = useState(CHARACTERS[0]?.forms[0] ?? 'goku_base');
  const [level, setLevel] = useState(50);

  const char = CHARACTERS.find(c => c.id === charId) ?? CHARACTERS[0];
  const form = getForm(formId) ?? getForm(char.forms[0])!;
  const spriteDir = spriteDirFor(form.id);
  const manifestUrl = spriteManifestUrl(form.id);
  const idleUrl = spriteDir ? spriteFrameUrl(form.id, `${spriteDir}_idle_00.png`) : idleSpriteUrl(form);
  const owFallback = overworldUrl(form.id);
  const battleOwIdle = battleOverworldActorUrl(form.id, 'idle') ?? owFallback;
  const battleOwPower = battleOverworldActorUrl(form.id, 'gather_power_pose') ?? owFallback;
  const [battleOwAura, setBattleOwAura] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    battleOverworldAuraUrlAsync(form.id).then(url => { if (!cancelled) setBattleOwAura(url); });
    return () => { cancelled = true; };
  }, [form.id]);
  const portrait = BATTLE_PORTRAITS[form.id];

  const analysis = useSheetAnalysis(form.id, spriteDir);

  const selectChar = (id: string) => {
    setCharId(id);
    const c = CHARACTERS.find(x => x.id === id);
    if (c) setFormId(c.forms[0]);
  };

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Character Studio</h1>
        <p className="dev-sub">
          Ficha por forma: stats ROM · assets · poses de combate · <strong>browser de frames</strong>{' '}
          (inspector con bbox/alpha/specks/duplicados — antes en Sprites/Sheets). Todo desde el
          manifest V9 de la forma, una sola fuente.
        </p>
      </header>

      <div className="dev-chars-layout">
        {/* Lista de personajes */}
        <div className="dev-char-list">
          {CHARACTERS.map(c => (
            <button key={c.id} className={`dev-char-chip ${c.id === charId ? 'active' : ''}`}
              onClick={() => selectChar(c.id)}>
              <span className="dev-char-name">{c.name}</span>
              <span className="dev-char-forms">{c.forms.length}</span>
            </button>
          ))}
        </div>

        {/* Detalle */}
        <div className="dev-char-detail">
          <div className="dev-char-head">
            <div className="dev-char-portrait">
              {portrait && <img src={portrait} alt="" />}
            </div>
            <div className="dev-char-id">
              <h2>{char.name}</h2>
              <div className="dev-char-meta">
                <span className="dev-tag">Saga {char.saga}</span>
                <span className="dev-tag">Tier {char.tier}/5</span>
                <span className="dev-tag">{char.forms.length} formas</span>
                <span className="dev-tag ok">{spriteDir ? `sprite: ${spriteDir}` : 'sin dir animado'}</span>
              </div>
              <div className="dev-linked-actions">
                <button className="dev-btn" disabled={!spriteDir} onClick={() => onOpenModule?.('animation', { formId: form.id, pose: 'idle' })}>Abrir Animation →</button>
              </div>
            </div>
          </div>

          {/* Selector de forma */}
          <div className="dev-form-tabs">
            {char.forms.map(fid => {
              const f = getForm(fid);
              return (
                <button key={fid} className={`dev-form-tab ${fid === formId ? 'active' : ''}`}
                  onClick={() => setFormId(fid)}>
                  {f?.form ?? fid}
                </button>
              );
            })}
          </div>

          {/* ═══ M8.F0 — PÁGINA ÚNICA ORGANIZADA (sin pestañas): todo visible
              de una vez, jerarquía clara de arriba a abajo:
                1. PREVIEW + datos (personaje grande + stats + assets)
                2. POSES (grid canónico con TODOS los frames)
                3. FRAMES (browser completo con inspector)
                4. ATAQUES (cartas → pose → beam chain)
                5. V9 (frames atómicos del sheet) */}

          {/* SECCIÓN 1 — PREVIEW + DATOS */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">Vista general</h3>
            <div className="dev-vista-grid">
              <FormPreview formId={form.id} dir={spriteDir} analysis={analysis} />
              <div className="dev-vista-col">
                <h3 className="dev-form-col-title">Forma</h3>
                <div className="dev-form-id-row">
                  <code>{form.id}</code>
                  {form.tier && <span className="dev-tag">tier {form.tier}</span>}
                  {form.sheet && <span className="dev-tag">{form.sheet}</span>}
                </div>
                <div className="dev-level-row">
                  <span className="dev-level-label">Level</span>
                  <input type="range" min={1} max={100} value={level}
                    onChange={e => setLevel(Number(e.target.value))} className="dev-range" />
                  <span className="dev-level-value">{level}</span>
                </div>
                <div className="dev-stats-grid dev-stats-compact">
                  {STATS.map(s => {
                    const base = form[s.key];
                    const val = statAtLevel(form, level, s.key);
                    const growth = form.curves ? (form.curves[s.key][3] - base) : 0;
                    const pct = Math.min(100, (val / Math.max(1, form.curves ? form.curves[s.key][3] : val)) * 100);
                    return (
                      <div key={s.key} className="dev-stat">
                        <div className="dev-stat-head">
                          <span style={{ color: s.color }}>{s.label}</span>
                          <strong>{val}</strong>
                          <small>base {base}</small>
                        </div>
                        <div className="dev-stat-bar"><div style={{ width: `${pct}%`, background: s.color }} /></div>
                        <div className="dev-stat-growth">+{growth} @100</div>
                      </div>
                    );
                  })}
                </div>
                {manifestUrl && (
                  <a className="dev-manifest-link" href={manifestUrl} target="_blank" rel="noreferrer">manifest.json ↗</a>
                )}
              </div>
              <div className="dev-vista-col">
                <h3 className="dev-form-col-title">Assets</h3>
                <div className="dev-asset-grid">
                  <AssetCell label="Portrait" src={portrait} />
                  <AssetCell label="Overworld" src={overworldUrl(form.id)} />
                  <AssetCell label="Idle (combate)" src={idleUrl} />
                  <AssetCell label="Battle OW idle" src={battleOwIdle} />
                  <PowerUpCell poseSrc={battleOwPower} auraSrc={battleOwAura} />
                  {form.sheet && <AssetCell label="ROM sheet ref" src={sheetUrl(form)} wide />}
                </div>
                <div className="dev-poses-section dev-retratos">
                  <h3>Retratos del personaje</h3>
                  <div className="dev-retratos-grid">
                    <AssetCell label="Battle (forma)" src={BATTLE_PORTRAITS[form.id]} small />
                    <AssetCell label="Mini" src={MINI_PORTRAITS[char.id]} small />
                    <AssetCell label="Menú" src={MENU_PORTRAITS[char.id]} small />
                    <StoryPortraitsGrid charId={form.character} formId={form.id} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2 — POSES (grid canónico completo) */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">Poses de combate — canon completo</h3>
            <AllPosesGrid formId={form.id} />
          </section>

          {/* SECCIÓN 3 — FRAMES (browser con inspector) */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">
              Frames del manifest
              <span className="dev-sheets-count">{analysis.frames.length} · {analysis.problemCount} avisos</span>
            </h3>
            {analysis.overridden && (
              <div className="dev-wip-banner">
                Overrides locales activos — los frames pueden diferir del canon V9.{' '}
                <button className="dev-btn" onClick={analysis.clearOverrideLocal}>Limpiar override</button>
              </div>
            )}
            <FrameBrowser formId={form.id} analysis={analysis} dir={spriteDir} />
          </section>

          {/* SECCIÓN 4 — ATAQUES (cartas → pose → beam) */}
          <section className="dev-char-block">
            <h3 className="dev-char-block-title">Ataques disponibles — cartas → pose cinematográfica</h3>
            <CharacterAttacks charId={char.id} formId={form.id} />
          </section>

          {/* SECCIÓN 5 — V9 (frames atómicos del sheet) */}
          {form.sheet && (
            <section className="dev-char-block">
              <h3 className="dev-char-block-title">Frames atómicos V9 (sheet canónico)</h3>
              <AtomicFrames sheet={form.sheet} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ FRAME BROWSER (antiguas Sprites + Sheets) ═════════════════════════
// Pose → grid de frames con indicadores (borde/specks/duplicado) → click
// → inspector (zoom + bbox + alpha + usos semánticos reales del manifest).
function FrameBrowser({ formId, analysis, dir }: {
  formId: string;
  analysis: ReturnType<typeof useSheetAnalysis>;
  dir: string | undefined;
}) {
  const [pose, setPose] = useState('idle');
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(6);

  const groups = groupFramesByPose(analysis.frames, dir);
  const activeGroup = groups.find(g => g.pose === pose) ?? groups[0];

  // mantener la pose seleccionada si existe, si no caer a idle
  useEffect(() => {
    if (groups.length > 0 && !groups.some(g => g.pose === pose)) setPose('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.frames]);

  const selFrame = analysis.frames.find(f => f.file === selected) ?? null;
  const selUsages = selFrame ? (analysis.usages[selFrame.file] ?? []) : [];

  return (
    <div className="dev-frames">
      {/* Pose pills con conteo */}
      <div className="dev-pose-pills dev-frames-pills">
        {groups.map(g => (
          <button key={g.pose} className={`dev-pose-pill ${g.pose === pose ? 'active' : ''}`}
            onClick={() => { setPose(g.pose); setSelected(g.frames[0]?.file ?? null); }}
            title={`${g.sem.meaning} — ${g.frames.length} frames`}>
            {g.pose} <em>{g.frames.length}</em>
          </button>
        ))}
        {groups.length === 0 && <span className="dev-hint">Sin frames en el manifest (carga…)</span>}
      </div>

      {/* Grid de frames de la pose activa */}
      {activeGroup && (
        <div className="dev-pose-group">
          <div className={`dev-pose-group-head cat-${activeGroup.sem.category.toLowerCase()}`}>
            <span className="dev-pose-group-name">{activeGroup.pose}</span>
            <span className="dev-pose-group-cat">{activeGroup.sem.category}</span>
            <span className="dev-pose-group-meaning">{activeGroup.sem.meaning}</span>
          </div>
          <div className="dev-sheets-grid" role="list" aria-label={`${activeGroup.pose} sprite frames`}>
            {activeGroup.frames.map(f => (
              <button key={f.file}
                className={`dev-sheet-cell ${selected === f.file ? 'active' : ''} ${f.touchesEdge && f.touchTop > 3 ? 'edge' : ''} ${f.bgSpecks > 0 ? 'speck' : ''} ${f.dupeOf ? 'dupe' : ''}`}
                onClick={() => setSelected(f.file)}
                title={`${f.file}\n${f.w}×${f.h} · ${activeGroup.sem.meaning}\n${f.touchesEdge ? '⚠ toca borde' : ''}${f.bgSpecks ? `\n${f.bgSpecks} specks` : ''}${f.dupeOf ? `\n⧉ duplicado de ${f.dupeOf}` : ''}`}>
                <span className="dev-sheet-thumb">
                  <img src={spriteFrameUrl(formId, f.file)} alt={f.file}
                    width={f.w} height={f.h} style={{ width: f.w * 2, height: f.h * 2 }} />
                </span>
                <span className="dev-sheet-name">{f.file.replace(`${dir ?? ''}_`, '').replace('.png', '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inspector */}
      {selFrame ? (() => {
        const { pose: fpose } = parseFrameName(selFrame.file, dir ?? '');
        const sem = poseSemantics(fpose);
        return (
          <div className="dev-sheets-inspector dev-frames-inspector">
            <div className="dev-sheets-zoom">
              <label>Zoom</label>
              <div className="dev-zoom-row">
                {[2, 4, 6, 8, 12].map(z => (
                  <button key={z} className={`dev-zoom-btn ${zoom === z ? 'active' : ''}`} onClick={() => setZoom(z)}>x{z}</button>
                ))}
              </div>
            </div>
            <h3>{selFrame.file} <small>{selFrame.w}×{selFrame.h}px · {selFrame.alphaPct}% alpha</small></h3>
            <div className={`dev-pose-group-head cat-${sem.category.toLowerCase()}`}>
              <span className="dev-pose-group-name">{fpose}</span>
              <span className="dev-pose-group-cat">{sem.category}</span>
            </div>
            <p className="dev-sheet-sem-meaning">{sem.meaning}</p>
            <div className="dev-checker-bg">
              <FrameZoom imgSrc={spriteFrameUrl(formId, selFrame.file)} w={selFrame.w} h={selFrame.h} zoom={zoom} bbox={selFrame.opaque} />
            </div>
            <div className="dev-sheet-details">
              <div className={selFrame.touchesEdge && selFrame.touchTop > 3 ? 'warn' : 'ok'}>
                {selFrame.touchesEdge && selFrame.touchTop > 3
                  ? `⚠ Contenido tocando el borde superior (${selFrame.touchTop} px) — posible cabeza cortada`
                  : '✓ Sin contenido pegado al borde superior'}
              </div>
              <div className={selFrame.bgSpecks > 0 ? 'warn' : 'ok'}>
                {selFrame.bgSpecks > 0 ? `${selFrame.bgSpecks} specks de color de fondo` : '✓ Sin specks'}
              </div>
              <div className={selFrame.dupeOf ? 'info' : 'ok'}>
                {selFrame.dupeOf ? `⧉ Contenido idéntico a ${selFrame.dupeOf}` : '✓ Frame único'}
              </div>
            </div>
            {selUsages.length > 0 && (
              <div className="dev-sheet-sem-used">
                <strong>Usos reales en manifest:</strong>
                <ul>
                  {selUsages.map(u => (
                    <li key={`${u.pose}-${u.index}`}><code>{u.pose}[{u.index}]</code> · {u.semantic}</li>
                  ))}
                </ul>
              </div>
            )}
            <code className="dev-manifest-path">{spriteFrameUrl(formId, selFrame.file)}</code>
          </div>
        );
      })() : (
        <div className="dev-empty">Selecciona un frame para inspeccionarlo</div>
      )}
    </div>
  );
}

/** Frame ampliado con bbox dorado (inspector). */
function FrameZoom({ imgSrc, w, h, zoom, bbox }: { imgSrc: string; w: number; h: number; zoom: number; bbox: FrameAnalysis['opaque'] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const img = new Image();
    img.onload = () => {
      cv.width = w * zoom;
      cv.height = h * zoom;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      if (bbox) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bbox.x * zoom, bbox.y * zoom, bbox.w * zoom, bbox.h * zoom);
      }
    };
    img.src = imgSrc;
  }, [imgSrc, w, h, zoom, bbox]);
  return <canvas ref={ref} className="dev-sprite-canvas" />;
}

// ═══ ATAQUES (canon cartas → pose) ═════════════════════════════════════
const EFFECT_LABELS: Record<string, string> = {
  damage: 'Daño', damage_pierce: 'Daño perforante', damage_special: 'Daño especial',
  damage_support: 'Daño + soporte', beam: 'Rayo', beam_team: 'Rayo equipo', beam_suicide: 'Rayo sacrificio',
  beam_varhp: 'Rayo vida', heal_25pct: 'Cura 25%', heal_strong: 'Cura fuerte', heal_light: 'Cura leve',
  life_drain: 'Drenar vida', knockdown_dmg: 'Derribo + daño', knockdown_min: 'Derribo',
  gamebomb: 'Bomba de juego', candy: 'Convertir en caramelo', naughty_book: 'Libro pervertido',
  ohko_lowacc: 'OHKO baja acc', android_kill: 'Matar androide',
  avoid_beam: 'Esquivar rayo', avoid_damage: 'Esquivar daño', avoid_damage_taiyoken: 'Esquivar (Taiyoken)',
  reduce_damage: 'Reducir daño', absorb_beam: 'Absorber rayo', beam_shield: 'Escudo rayo',
  damage_shield: 'Escudo daño', command_cancel: 'Cancelar comando',
};

const CARD_TYPE_ORDER: Array<{ type: string; label: string }> = [
  { type: 'beam', label: 'Rayo (beam)' },
  { type: 'damage', label: 'Daño físico' },
  { type: 'command', label: 'Comando' },
  { type: 'support', label: 'Soporte' },
  { type: 'defense', label: 'Defensa' },
  { type: 'special', label: 'Especial' },
];

function CharacterAttacks({ charId, formId }: { charId: string; formId: string }) {
  const [manifest, setManifest] = useState<Record<string, { frames?: unknown[] }> | null>(null);
  useEffect(() => {
    let alive = true;
    _spriteManifestInternals.loadManifestFor(formId).then(m => { if (alive) setManifest(m as Record<string, { frames?: unknown[] }> | null); });
    return () => { alive = false; };
  }, [formId]);

  const limitIds = LIMIT_DEFAULTS[charId] ?? [];
  const limitCards = limitIds.map(id => getCard(id)).filter((c): c is NonNullable<typeof c> => !!c);
  const usable = CARDS.filter(c => cardUsableBy(c, charId));
  const usableIds = new Set(usable.map(c => c.id));
  const deckCards = usable.filter(c => !limitIds.includes(c.id));

  const poseFrames = (pose: string): number => {
    if (!manifest) return 0;
    const resolved = resolveCombatPose(pose, p => (manifest[p]?.frames?.length ?? 0) > 0);
    if (!resolved) return 0;
    return manifest[resolved]?.frames?.length ?? 0;
  };

  const CardRow = ({ card, isLimit }: { card: NonNullable<ReturnType<typeof getCard>>; isLimit: boolean }) => {
    const pose = cardBattlePose(card);
    const poseFx = card.type === 'beam' ? 'beam_fire' : null;
    const n = poseFrames(pose);
    const color = CARD_COLORS[card.type];
    // M8.F0 — BEAMS: cada carta beam expone su cadena visual completa
    // (charge → fire → ray → tip) con los frames REALES del manifest, para
    // que la asociación ataque↔beam sea visible y verificable (no un nombre
    // suelto). Las miniaturas salen del canon V9 cuando hay frames.
    const beamChain = card.type === 'beam' ? ['beam_charge', 'beam_fire', 'beam_ray', 'beam_ray_tip'] : [];
    return (
      <div className="dev-attack-card" style={{ borderLeftColor: color }}>
        <span className="dev-attack-id">{String(card.id).padStart(2, '0')}</span>
        <span className="dev-attack-name" style={{ color }}>{card.name}</span>
        <span className="dev-attack-type">{CARD_TYPE_NAMES[card.type]}</span>
        <span className="dev-attack-effect" title={card.description ?? ''}>{EFFECT_LABELS[card.effect] ?? card.effect}</span>
        <span className="dev-attack-stat">CC {card.cc}</span>
        <span className="dev-attack-stat">ATK {card.atk}</span>
        {isLimit && <span className="dev-tag ok">LIMIT</span>}
        <span className={`dev-attack-pose ${n === 0 ? 'bad' : ''}`} title="Pose que dispara la carta en combate (canon cardBattlePose)">
          ▶ {pose}{poseFx ? ` → ${poseFx}` : ''}
          <em>{n > 0 ? `${n} frames` : 'sin frames en manifest'}</em>
        </span>
        {beamChain.length > 0 && (
          <span className="dev-attack-beamchain" title="Cadena visual del beam (V9: charge→fire→ray→tip)">
            {beamChain.map(b => {
              const bn = poseFrames(b);
              const resolved = resolveCombatPose(b, p => (manifest?.[p]?.frames?.length ?? 0) > 0);
              const firstFile = resolved && manifest?.[resolved]?.frames
                ? (manifest[resolved]?.frames as unknown[])[0]
                : null;
              const thumb = resolved && firstFile && typeof firstFile === 'object' && firstFile && 'file' in firstFile
                ? spriteFrameUrl(formId, String((firstFile as { file: string }).file))
                : undefined;
              return (
                <span key={b} className={`dev-attack-beamlink ${bn === 0 ? 'no-frame' : ''}`} title={`${b} — ${bn} frames`}>
                  {thumb ? <img src={thumb} alt={b} draggable={false} /> : <span className="dev-attack-beamdot">•</span>}
                  <em>{b.replace('beam_', '')}</em>
                </span>
              );
            })}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="dev-attacks">
      <div className="dev-attacks-summary">
        <span className="dev-tag ok">{limitCards.length} LIMIT</span>
        <span className="dev-tag">{usableIds.size} cartas usables</span>
        <span className="dev-tag">{deckCards.length} en mazo</span>
      </div>
      {limitCards.length > 0 && (
        <div className="dev-attack-group">
          <div className="dev-attack-group-head">Ataques LIMIT (firma del personaje)</div>
          {limitCards.map(c => <CardRow key={c.id} card={c} isLimit />)}
        </div>
      )}
      {CARD_TYPE_ORDER.map(({ type, label }) => {
        const cards = deckCards.filter(c => c.type === type);
        if (cards.length === 0) return null;
        return (
          <div key={type} className="dev-attack-group">
            <div className="dev-attack-group-head">{label} <em>{cards.length}</em></div>
            {cards.map(c => <CardRow key={c.id} card={c} isLimit={false} />)}
          </div>
        );
      })}
      {deckCards.filter(c => !CARD_TYPE_ORDER.some(g => g.type === c.type)).length > 0 && (
        <div className="dev-attack-group">
          <div className="dev-attack-group-head">Otras</div>
          {deckCards.filter(c => !CARD_TYPE_ORDER.some(g => g.type === c.type)).map(c => <CardRow key={c.id} card={c} isLimit={false} />)}
        </div>
      )}
    </div>
  );
}

// ═══ FRAMES ATÓMICOS V9 ════════════════════════════════════════════════
interface AtomicFrameMeta { file: string; bucket: string; alias: string; x: number; y: number; w: number; h: number; }
interface AtomicSheetMeta {
  sheet: string; dir: string; columns: number; rows: number;
  cell_width: number; cell_height: number; frame_count: number;
  buckets: string[]; frames: AtomicFrameMeta[];
}

const BUCKET_LABELS: Record<string, string> = {
  overworld_actor_or_pose: 'Overworld (chibi)',
  battle_aura_tile: 'Aura tile (power)',
  battle_aura_actor_composite: 'Composite (power-up)',
  aura_support: 'Aura SUPPORT (azul)',
  aura: 'Aura (power+support)',
  character_plus_aura_or_burst: 'Power-up (personaje + aura)',
  character_plus_effect: 'Power-up (personaje + efecto)',
  idle_or_stance: 'Idle / stance',
  movement_or_attack_pose: 'Movement / attack',
  orbs_rings_bursts: 'Ciclo aura (orbs/burst)',
  projectiles_beams: 'Beams / proyectiles',
  projectile_orb_small: 'Orbes (small)',
  speedlines: 'Speedlines',
  nonbody_misc: 'FX misc',
  actor_downed_or_special_pose: 'Downed / special',
  downed_or_hurt: 'Downed / hurt',
  fixed_only: 'Fixed-only (bridge)',
};

const FAMILY_LABELS: Record<string, string> = {
  idle: 'Base', ready: 'Base', movement: 'Movement', defense: 'Defense',
  melee: 'Melee', beam: 'Beam', power: 'Power', reaction: 'Reaction',
  effect: 'Effects', projectile: 'Projectiles', overworld: 'Overworld',
};
const STATUS_TAG: Record<string, string> = {
  CANONICAL: 'ok', RUNTIME_VERIFIED: 'ok', ASSET_VERIFIED: '', UNCLASSIFIED: 'bad', INFERRED: '',
};

function AtomicFrames({ sheet }: { sheet: string }) {
  const [meta, setMeta] = useState<AtomicSheetMeta | null>(null);
  const [sheetImg, setSheetImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    setMeta(null);
    setSheetImg(null);
    const jsonUrl = `/assets/sheets/${sheet.replace('.png', '.json')}?t=${Date.now()}`;
    fetch(jsonUrl).then(r => r.ok ? r.json() : null).then((m: AtomicSheetMeta | null) => {
      if (!alive || !m) return;
      setMeta(m);
      const img = new Image();
      img.onload = () => { if (alive) setSheetImg(img); };
      img.src = `/assets/sheets/${sheet}?t=${Date.now()}`;
    }).catch(() => {});
    return () => { alive = false; };
  }, [sheet]);
  if (!meta) return null;

  const formDir = meta.dir;
  const canon = new Map<string, { family: string; role: string; variant: string; sequenceIndex: number; canonicalId: string; status: CanonStatus }>();
  for (const fr of SPRITE_CANON.forms.flatMap(x => x.frames)) {
    canon.set(fr.sourceId, { family: fr.family, role: fr.role, variant: fr.variant, sequenceIndex: fr.sequenceIndex, canonicalId: fr.canonicalId, status: fr.canonStatus });
  }
  const srcIdOf = (f: AtomicFrameMeta) => {
    const m = f.alias.match(/src_(\d+)/) ?? f.file.match(/src_(\d+)/);
    return m ? `${formDir}/${m[1]}.png` : null;
  };

  type RG = { role: string; status: CanonStatus; frames: AtomicFrameMeta[] };
  const famGroups = new Map<string, RG[]>();
  const unclassified: AtomicFrameMeta[] = [];
  for (const f of meta.frames) {
    const sid = srcIdOf(f);
    const c = sid ? canon.get(sid) : null;
    if (!c || c.family === 'unclassified') { unclassified.push(f); continue; }
    let roles = famGroups.get(c.family);
    if (!roles) { roles = []; famGroups.set(c.family, roles); }
    let rg = roles.find(r => r.role === c.role);
    if (!rg) { rg = { role: c.role, status: c.status, frames: [] }; roles.push(rg); }
    rg.frames.push(f);
  }

  return (
    <div className="dev-atomic-section">
      <h3>Frames atómicos V9 — canon semántico <span className="dev-atomic-count">({meta.frame_count} frames · {meta.sheet})</span></h3>
      {[...famGroups.entries()].map(([family, roles]) => (
        <div key={family} className="dev-atomic-bucket">
          <div className="dev-atomic-bucket-head">
            <span className="dev-atomic-bucket-name">{FAMILY_LABELS[family] ?? family}</span>
            <span className="dev-atomic-bucket-cat">{roles.reduce((n, r) => n + r.frames.length, 0)} frames</span>
          </div>
          {roles.map(rg => (
            <div key={rg.role} className="dev-atomic-role">
              <div className="dev-atomic-role-head">
                <span className="dev-atomic-role-name">{rg.role}</span>
                <span className={`dev-tag ${STATUS_TAG[rg.status] ?? ''}`}>{rg.status}</span>
                <span className="dev-atomic-bucket-cat">{rg.frames.length}</span>
              </div>
              <div className="dev-atomic-grid">
                {rg.frames.map(f => {
                  const sid = srcIdOf(f);
                  const c = sid ? canon.get(sid) : null;
                  const label = c ? `${c.variant}${String(c.sequenceIndex).padStart(2, '0')}` : f.file.replace('.png', '');
                  return (
                    <div key={f.file} className="dev-atomic-cell"
                      title={`${f.file} · ${f.alias}${c ? ` · ${c.canonicalId}` : ''}`}>
                      {sheetImg && <FrameCanvas img={sheetImg} f={f} />}
                      <span className="dev-atomic-file">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      {unclassified.length > 0 && (
        <div className="dev-atomic-bucket">
          <div className="dev-atomic-bucket-head">
            <span className="dev-atomic-bucket-name">Unclassified</span>
            <span className="dev-tag bad">UNKNOWN</span>
            <span className="dev-atomic-bucket-cat">{unclassified.length} frames sin evidencia</span>
          </div>
          <div className="dev-atomic-grid">
            {unclassified.map(f => (
              <div key={f.file} className="dev-atomic-cell" title={`${f.file} · ${f.alias}`}>
                {sheetImg && <FrameCanvas img={sheetImg} f={f} />}
                <span className="dev-atomic-file">{f.file.replace('.png', '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FrameCanvas({ img, f, zoom = 3 }: { img: HTMLImageElement; f: AtomicFrameMeta; zoom?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = f.w * zoom;
    c.height = f.h * zoom;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w * zoom, f.h * zoom);
  }, [img, f, zoom]);
  return <canvas ref={ref} className="dev-atomic-canvas" />;
}

// ═══ ASSETS ════════════════════════════════════════════════════════════
function AssetCell({ label, src, wide, small }: { label: string; src?: string; wide?: boolean; small?: boolean }) {
  return (
    <div className={`dev-asset-cell ${wide ? 'wide' : ''} ${small ? 'small' : ''}`}>
      <div className="dev-asset-frame">
        {src ? <img src={src} alt={label} loading="lazy" /> : <span className="dev-asset-missing">—</span>}
      </div>
      <div className="dev-asset-label">{label}</div>
    </div>
  );
}

function PoseCell({ formId, pose, small }: { formId: string; pose: string; small?: boolean }) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    spritePoseFrameUrl(formId, pose, 0).then(url => { if (!cancelled) setSrc(url); });
    return () => { cancelled = true; };
  }, [formId, pose]);
  return <AssetCell label={pose} src={src} small={small} />;
}

function PowerUpCell({ poseSrc, auraSrc }: { poseSrc?: string; auraSrc?: string }) {
  return (
    <div className="dev-asset-cell">
      <div className="dev-asset-frame dev-powerup-frame">
        {poseSrc ? (
          <>
            {auraSrc && <img src={auraSrc} alt="" className="dev-powerup-aura" loading="lazy" />}
            <img src={poseSrc} alt="Battle OW power up" className="dev-powerup-actor" loading="lazy" />
          </>
        ) : <span className="dev-asset-missing">—</span>}
      </div>
      <div className="dev-asset-label">Battle OW power</div>
    </div>
  );
}

// ═══ TODAS las poses del canon (COMBAT_POSE_ORDER) con fallback trazable ═══
// Resuelve cada pose contra el manifest con la MISMA fuente de fallbacks que
// el runtime (resolveCombatPose) — nunca una tabla local.
function AllPosesGrid({ formId }: { formId: string }) {
  const [poses, setPoses] = useState<CombatPoseAsset[] | null>(null);
  const [manifest, setManifest] = useState<Record<string, { frames?: unknown[] }> | null>(null);
  useEffect(() => {
    let alive = true;
    const bundle = getCharacterAssetBundle(getForm(formId)?.character ?? 'goku', formId);
    resolveBundlePoses(bundle).then(ps => { if (alive) setPoses(ps); });
    _spriteManifestInternals.loadManifestFor(formId).then(m => {
      if (alive) setManifest(m as Record<string, { frames?: unknown[] }> | null);
    });
    return () => { alive = false; };
  }, [formId]);

  if (!poses) return <div className="dev-hint">Resolviendo poses del canon…</div>;
  const resolved = poses.filter(p => p.url);
  const missing = poses.filter(p => !p.url);

  // M8.F0 — frames REALES de cada pose (secuencia completa del manifest),
  // no solo el frame 0. Cada frame se muestra con su nombre de archivo
  // canónico. El orden sigue COMBAT_POSE_ORDER (canon).
  const poseFrames = (pose: string): string[] => {
    const resolvedPose = resolveCombatPose(pose, p => (manifest?.[p]?.frames?.length ?? 0) > 0);
    if (!resolvedPose || !manifest?.[resolvedPose]?.frames) return [];
    return (manifest[resolvedPose].frames as unknown[]).map(f => {
      const file = (f as { file?: string }).file ?? '';
      return file;
    }).filter(Boolean);
  };
  const prefix = (pose: string): string => {
    const resolvedPose = resolveCombatPose(pose, p => (manifest?.[p]?.frames?.length ?? 0) > 0);
    return resolvedPose ?? pose;
  };

  return (
    <div className="dev-poses-section">
      <h3>Poses de combate — canon completo ({resolved.length}/{poses.length} con frame físico)</h3>
      <div className="dev-pose-grid dev-pose-grid-frames">
        {poses.map(p => {
          const frames = poseFrames(p.pose);
          const resolvedPose = prefix(p.pose);
          const canonForm = SPRITE_CANON.forms.find(f => f.form === (spriteDirFor(formId) ?? formId));
          // Clasificación canónica de la pose: usamos los frames del canon
          // cuyo runtimePoses incluye la pose (punch_right → frames melee
          // attack_forward; guard → frames defense; hurt → frames reaction).
          // El canon clasifica el FRAME FÍSICO con su family PRIMARIA (el
          // dedupe elige una por frame), así que agrupamos por family de
          // TODOS los frames que usan la pose y elegimos la predominante.
          const canonForPose = (canonForm?.frames ?? []).filter(f => f.runtimePoses.includes(p.pose));
          const famCount = new Map<string, number>();
          for (const f of canonForPose) famCount.set(f.family, (famCount.get(f.family) ?? 0) + 1);
          const primaryFam = [...famCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
          const primaryRole = canonForPose.find(f => f.family === primaryFam)?.role ?? null;
          // M8.F0 — variant correcto de la pose: los frames espejados
          // (move_front_00 ≡ move_back_01) comparten frame físico y el canon
          // solo puede asignar UN variant (move_back). Para la POSE, el
          // variant correcto es el que coincide con su nombre (move_front →
          // move_front); si ningún frame lo tiene (espejado), usamos el
          // nombre de la pose (semántica canónica) en vez del variant del
          // frame compartido.
          const variantMatchesPose = canonForPose.some(f => f.variant === p.pose);
          const primaryVar = variantMatchesPose
            ? (canonForPose.find(f => f.family === primaryFam && f.variant === p.pose)?.variant ?? p.pose)
            : p.pose;
          const canonLabel = primaryFam && primaryFam !== 'unclassified'
            ? `${primaryFam}/${primaryRole ?? '?'}/${primaryVar}`
            : 'unclassified';
          return (
            <div key={p.pose} className={`dev-pose-card ${p.url ? '' : 'no-frame'}`}
              title={`${p.pose}${p.fallback.length > 0 ? ` → ${p.fallback.join(' → ')}` : ''} · ${p.group}`}>
              <div className="dev-pose-card-head">
                <span className="dev-pose-card-name">{p.pose}</span>
                <span className={`dev-tag ${primaryFam && primaryFam !== 'unclassified' ? 'ok' : 'bad'}`}>{canonLabel}</span>
                <span className="dev-pose-card-count">{frames.length} frames</span>
              </div>
              <div className="dev-pose-card-frames">
                {frames.length > 0 ? frames.map((f, i) => (
                  <div key={f} className="dev-pose-card-frame" title={`${f} · frame ${i} de ${resolvedPose}`}>
                    <img src={spriteFrameUrl(formId, f)} alt={`${p.pose}_${i}`} loading="lazy" />
                    <span className="dev-pose-card-frame-name">{f.replace(/^.*?_/, '').replace('.png', '')}</span>
                  </div>
                )) : (
                  <span className="dev-asset-missing">— sin frames físicos —</span>
                )}
              </div>
              {p.fallback.length > 0 && (
                <div className="dev-pose-fallback-row">fallback: {p.fallback.join(' → ')} → <b>{p.resolvedPose}</b></div>
              )}
            </div>
          );
        })}
      </div>
      <div className="dev-semantic-pose-row">{COMBAT_POSE_ORDER.join(' · ')}</div>
      <div className="dev-pose-legend">
        <span className="dev-pose-legend-title">Qué dispara cada pose (canon cartas):</span>
        <span><b>beam_charge / beam_fire</b> ← cartas beam (Kamehameha, Masenko…)</span>
        <span><b>attack_fwd / punch / kick</b> ← cartas damage y command</span>
        <span><b>guard / evade / beam_guard</b> ← cartas defense</span>
        <span><b>gather_power / power_up / aura_*</b> ← soporte y GATHER (aura overlay)</span>
        <span className="dev-pose-fx-note"><b>beam_ray / beam_ray_tip</b> ← referencias de sheet del proyectil (FX), no poses de personaje — por eso no tienen frame físico propio</span>
        <span><b>move_front / move_back</b> ← comando MOVE</span>
        <span><b>hurt / knockback</b> ← recibir daño (defensor)</span>
      </div>
      {missing.length > 0 && (
        <p className="dev-hint">Sin frame físico (el runtime usa fallback o no existe en esta forma): {missing.map(m => m.pose).join(', ')}</p>
      )}
    </div>
  );
}

// ═══ Retratos de story del personaje (todas las variantes canónicas) ═══
function StoryPortraitsGrid({ charId, formId }: { charId: string; formId: string }) {
  // El retrato de story se indexa por el character del ROSTER (goku,
  // trunks_future...) — el mismo mapeo que storyPortraitUrl.
  const entry = STORY_PORTRAITS[charId];
  const urls = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ src: string; label: string }> = [];
    const push = (url: string | undefined, label: string) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      out.push({ src: url, label });
    };
    if (entry) {
      push(entry.base, 'story base');
      for (const [k, v] of Object.entries(entry.emotions ?? {})) push(v, `story ${k}`);
      for (const [k, v] of Object.entries(entry.forms ?? {})) push(v, `story ${k}`);
    }
    // la resolución del juego para ESTA forma (storyPortraitUrl)
    push(storyPortraitUrl(charId, formId), 'story forma actual');
    return out;
  }, [entry, charId, formId]);

  if (urls.length === 0) return <span className="dev-hint">Sin retratos de story mapeados para {charId}</span>;
  return (
    <div className="dev-story-portraits">
      {urls.map((u: { src: string; label: string }) => <AssetCell key={u.label} label={u.label} src={u.src} small />)}
    </div>
  );
}

export { characterName };
