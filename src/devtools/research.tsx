// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Research / ROM Ground Truth
// Vocabulario de evidencia F0 (único):
//   FRAME_VERIFIED · VIDEO_VERIFIED · ROM_ASSET_VERIFIED ·
//   MANUAL_VERIFIED · INFERRED
// Nada funcional se etiqueta como canon GBC sin evidencia trazable.
// ═══════════════════════════════════════════════════════════
import { FORMS, CHARACTERS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { spriteDirFor } from '../data/spriteManifest';
import { GBC_CINEMATIC_CANON } from '../battle/cinematic/GbcCinematicCanon';
import { getDevProjectSnapshot } from './devSnapshot';

/** Niveles de evidencia F0 (schema único — isGbcCanon solo acepta
 *  FRAME_VERIFIED / VIDEO_VERIFIED). */
export type F0Fidelity =
  | 'FRAME_VERIFIED' | 'VIDEO_VERIFIED'
  | 'ROM_ASSET_VERIFIED' | 'ROM_CONFIRMED' | 'MANUAL_VERIFIED' | 'INFERRED';

interface Finding {
  topic: string;
  status: F0Fidelity;
  note: string;
}

const ROM_RESEARCH_PACKAGES = [
  {
    id: 'V3',
    title: 'ActionObject + actor graphics pipeline',
    status: 'ROM_STATIC_VERIFIED',
    path: 'docs/rom/research-v3/LEDGER.md',
    facts: [
      'ActionObject layout cerrado estáticamente: 19 bytes, flags ACTIVE/LOOP/HOLD/LATCH y frame físico [visualFrameId,duration,offsetY,offsetX].',
      '411/411 visualFrames: metasprite.pieceCount == graphicsBlockCount y tileDelta == 2×pieceIndex.',
      'actorVisualProfileKey controla sequence, banco gráfico ($31+key) y palette Bank30:$6E00+key×8.',
      'Tail seq1 y V-ball seq1/2/3 quedan ROM_HANDLER_VERIFIED; Lightning C. seq1 sigue UNOBSERVED_STATIC.',
      'Defense carga AnimationSlot8; Taiyoken/Barrier/Breath/Energy Absorb tienen starts físicos demostrados.',
    ],
  },
  {
    id: 'V4 FX',
    title: 'Physical FX, Beam y scroll cinematográfico',
    status: 'ROM_FX_IMPORTED',
    path: 'docs/rom/research-v4-fx/README.md',
    facts: [
      'ZIP externo verificado e importado: SHA-256 03cb152a… · 254 archivos · 152 PNG · 15 tablas data.',
      'FXResource loader: fxBank=$65+floor(id/$1E), fxLocal=id%$1E, palette=card.byte8.',
      '28 FXResource ofensivos únicos materializados en P0.1A: 38 bundles FX/paleta, SIDE1/SIDE2 y 152 renders; $01/$04/$06 quedan fuera como category-specific.',
      'Beam FX es BG_TILEMAP en VRAM bank1/$8800 + BG palette slot4, no sprite OBJ ni ProjectileSprite canon.',
      'opcode $0C copia una ventana 8×32 a BG $9800 row4; prefix normal rows1-8, handler $07 rows3-10, result rows11-18.',
    ],
  },
  {
    id: 'V5 Support/Defense',
    title: 'Support + Defense Visual Grammar',
    status: 'ROM_STATIC_VERIFIED',
    path: 'docs/rom/research-v5-support-defense/README.md',
    facts: [
      'Support/Defense no usan opcode Beam $0C; Support carga visuales por card ID via Bank00:$2C30 / banks $6B+.',
      'Support común $00/$02 usa BG $19 como un gráfico 48×56 con palette slot5 y HOLD120, no siete frames.',
      'Palette $FF es path-scoped: common Support la consume como índice físico 255, no como NONE universal.',
      'Defense selection solo precarga AnimationSlot8; el ataque entrante decide si slot8 arranca.',
      'Move persiste posición táctica, pero las macros $29/$2A tienen movimiento local net0; CA53=2 incluye Endurance/partial.',
    ],
  },
];

const NEXT_RESEARCH_FRONT = {
  id: 'V7 CLOSED → PLAYABLE ALPHA',
  title: 'Del reverse engineering al juego real',
  path: 'docs/rom/research-v7-support-defense-consumption/AGENT_HANDOFF_PLAYABLE_ALPHA.md',
  facts: [
    'V7 CLOSED: V7.1 display consumption (HDMA→VRAM bank1 $8800, composición $9800), V7.2-V7.4 profiles/compiler/QA, V7.5 cutover $0B/$0D/$0F (22/22, 0 legacy), V7.6 Defense (11/11, slot8 consumption), V7.7 romCA53 consolidación, V7.8 RomDisplayPresenter + ROM Display Lab (0 no-ops silenciosos, 306+18 cues verificados).',
    'RomDisplayPresenter: capa propia que convierte cada cue ROM en consecuencia gráfica observable; sin bancos/WRAM/direcciones; PENDING explícito donde falta evidencia.',
    'ROM Display Lab (#dev/romdisplay): comparación ROM_INSPECTION_RENDER ↔ RUNTIME COMPOSITE con selector Support 1/48 y checks GRAPHICS/LAYOUT/PALETTE/ORIENTATION/VISIBLE AREA/LAYERING (dev-only, imágenes desde docs/).',
    'Backlog (no V8): $0B07 records finos, $C3CE/$C3CF/$C3D0, $9800 vs shadow, semántica de macros, anchors (PENDING_ROM_TRACE).',
    'Siguiente: PLAYABLE ALPHA — primer gate Battle Loop completo (ATTACK/DEFENSE/ROUND hasta KO), luego 125 cartas jugables (PLAYABLE 125/125 antes que COMPLETE), luego HUD/menús finales.',
  ],
};

export function ResearchModule() {
  const snap = getDevProjectSnapshot();
  const forms = Object.values(FORMS);
  const withDir = forms.filter(f => spriteDirFor(f.id)).length;

  const findings: Finding[] = [
    { topic: 'Tabla de cartas ROM', status: 'ROM_ASSET_VERIFIED', note: `${CARDS.length} cartas de la tabla RO11:$4320 (125×16 bytes).` },
    { topic: 'Roster', status: 'ROM_ASSET_VERIFIED', note: `${forms.length} formas / ${CHARACTERS.length} personajes de stats_full.json.` },
    { topic: 'Mazos de jefes', status: 'MANUAL_VERIFIED', note: `${Object.keys(STORY_ENEMY_DECKS).length} mazos del spreadsheet oficial (legendarysuperwarriors.wordpress.com).` },
    { topic: 'Stage Attack windows', status: 'ROM_CONFIRMED', note: 'BACK_BACK 50t (0.837s) · BACK_FRONT 80t (1.339s) · FRONT_BACK 120t (2.009s) · FRONT_FRONT 150t (2.511s) — Bank01:$66E4.' },
    { topic: 'Contraataque A/B', status: 'INFERRED', note: 'A≈0.4s (bancar CC) / B≈0.15s (reparar). Pendiente de captura forense ROM.' },
    { topic: 'Iniciativa por SPD (reorden por turno)', status: 'MANUAL_VERIFIED', note: 'SPD decide quién ataca primero; el orden se recalcula cada turno (si la Speed cambia, el siguiente turno invierte). Empate → persiste la iniciativa actual (determinista en el Engine).' },
    { topic: 'Modificadores tácticos', status: 'INFERRED', note: 'FRONT=+atk/−def, BACK=−atk/+def; valores exactos sin medir.' },
    { topic: 'Sprites de combate (manifest runtime)', status: 'ROM_ASSET_VERIFIED', note: `${withDir}/${forms.length} formas con manifest.json — ${snap.sprites.poseOrder} poses en COMBAT_POSE_ORDER.` },
    { topic: 'Combates 2v2', status: 'MANUAL_VERIFIED', note: `Caps ${Object.keys(TEAM_BATTLES).join(', ')} (walkthrough).` },
    { topic: 'Crecimiento de stats', status: 'ROM_ASSET_VERIFIED', note: 'Curvas por cuartos 25/50/75/100 extraídas de la ROM.' },
    { topic: 'Secuencias cinematográficas GBC (F0)', status: snap.cinematics.gbcVerified > 0 ? 'FRAME_VERIFIED' : 'INFERRED', note: `${snap.cinematics.gbcFamilies} familias declaradas · ${snap.cinematics.gbcVerified} con evidencia verificada · ${snap.cinematics.gbcInferred} INFERRED. Hasta F0, una secuencia funcional NO se llama canon GBC.` },
  ];

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Research / ROM Ground Truth</h1>
        <p className="dev-sub">
          F0 sigue siendo el vocabulario de evidencia visual, pero el panel ya incluye los paquetes ROM V3/V4/V5
          importados. Vocabulario: <code>FRAME_VERIFIED</code> · <code>VIDEO_VERIFIED</code> ·{' '}
          <code>ROM_ASSET_VERIFIED</code> · <code>ROM_CONFIRMED</code> · <code>MANUAL_VERIFIED</code> · <code>INFERRED</code>.
          Nada funcional se etiqueta como canon GBC sin evidencia trazable.
        </p>
      </header>

      <div className="dev-sources">
        <h2>Fuentes</h2>
        <ul className="dev-alerts">
          <li className="dev-alert info"><strong>INFO</strong> ROM canónica España — CRC32 <code>9DAD6E23</code> (tabla cartas, stats, mazos, curvas; misma data que USA <code>025AA88A</code>).</li>
          <li className="dev-alert info"><strong>INFO</strong> Manual USA §9-§10 — Stage Attack, posiciones, movimiento.</li>
          <li className="dev-alert info"><strong>INFO</strong> Spreadsheet oficial — mazos de jefes + AI boosts (wordpress).</li>
          <li className="dev-alert info"><strong>INFO</strong> Walkthrough / foros (RPGClassics) — vulnerabilidades Air/Ground, 2v2.</li>
          <li className="dev-alert info"><strong>INFO</strong> ROM Research V3 — ActionObject, graphics blocks, palettes, double buffer, slot8 Defense.</li>
          <li className="dev-alert info"><strong>INFO</strong> ROM Research V4 FX — FXResource, BG tilemaps, opcode $0C, scroll SCX/SCY y 152 renders físicos.</li>
          <li className="dev-alert info"><strong>INFO</strong> ROM Research V5 — Support/Defense Visual Grammar, Move, CA83/CA53, slot8 preload/start boundary.</li>
          <li className="dev-alert info"><strong>INFO</strong> Showcases de vídeo — material para F0 (VIDEO_VERIFIED pendiente de catalogar por clip).</li>
          <li className="dev-alert warn"><strong>WARN</strong> Captura forense de ROM pendiente para timing de contraataque y desempates de SPD.</li>
        </ul>
      </div>

      <div className="dev-section">
        <h2>Paquetes ROM sincronizados</h2>
        <div className="dev-checks">
          {ROM_RESEARCH_PACKAGES.map(pkg => (
            <div key={pkg.id} className="dev-finding dev-finding-rom_asset_verified">
              <span className="dev-finding-badge">{pkg.status}</span>
              <div className="dev-finding-body">
                <div className="dev-finding-topic">{pkg.id} · {pkg.title}</div>
                <div className="dev-finding-note"><code>{pkg.path}</code></div>
                <ul className="dev-alerts" style={{ marginTop: 8 }}>
                  {pkg.facts.map(fact => (
                    <li key={fact} className="dev-alert info"><strong>INFO</strong> {fact}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p className="dev-muted" style={{ marginTop: 6 }}>
          Límites conservados: semantic slot binding, absolute anchors, multi-actor binding,
          Lightning C. seq1, renders Support físicos, macros Support y la auditoría global final de slot8 siguen en investigación.
        </p>
      </div>

      <div className="dev-section">
        <h2>Siguiente frente</h2>
        <div className="dev-finding dev-finding-inferred">
          <span className="dev-finding-badge">{NEXT_RESEARCH_FRONT.id}</span>
          <div className="dev-finding-body">
            <div className="dev-finding-topic">{NEXT_RESEARCH_FRONT.title}</div>
            <div className="dev-finding-note"><code>{NEXT_RESEARCH_FRONT.path}</code></div>
            <ul className="dev-alerts" style={{ marginTop: 8 }}>
              {NEXT_RESEARCH_FRONT.facts.map(fact => (
                <li key={fact} className="dev-alert info"><strong>INFO</strong> {fact}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="dev-checks">
        {findings.map(f => (
          <div key={f.topic} className={`dev-finding dev-finding-${f.status.toLowerCase()}`}>
            <span className="dev-finding-badge">{f.status}</span>
            <div className="dev-finding-body">
              <div className="dev-finding-topic">{f.topic}</div>
              <div className="dev-finding-note">{f.note}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dev-section">
        <h2>Corpus de evidencia F0 (GBC_CINEMATIC_CANON)</h2>
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead><tr><th>#</th><th>Familia</th><th>Fidelity</th><th>Fuente</th><th>Beats</th></tr></thead>
            <tbody>
              {GBC_CINEMATIC_CANON.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td><code>{s.id}</code></td>
                  <td><span className={`dev-tag ${s.evidence.fidelity === 'INFERRED' ? '' : 'ok'}`}>{s.evidence.fidelity}</span></td>
                  <td className="dev-cell-muted">{s.evidence.source.slice(0, 60)}</td>
                  <td>{s.beats.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {snap.cinematics.gbcVerified === 0 && (
          <p className="dev-muted" style={{ marginTop: 6 }}>
            GBC_CINEMATIC_CANON con 0 entradas verificadas es válido: las 20 familias declaradas son el
            armazón INFERRED hasta observar el GBC en vídeo (F0).
          </p>
        )}
      </div>
    </div>
  );
}
