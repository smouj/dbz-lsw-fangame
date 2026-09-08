// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — CanonBattleField
// El battle-screen CANÓNICO — MISMO markup que HUD Studio (la referencia
// visual de producción). Lo consumen el Engine Playground (Timeline en
// vivo) y el Battle Lab para que el engine se vea EXACTAMENTE como el
// juego: hud-top (portraits + HP + fase ATTACK/DEFEND + VS ROUND),
// battlefield con fondo real, fighters anclados con anchorFor (la misma
// fuente que Position Lab) y sprites overworld/action reales.
//
// Fuentes compartidas (cero duplicación):
//   · BATTLE_PORTRAITS (portraits de combate)
//   · battleOverworldActorUrl (chibi overworld — mismo lookup que el HUD)
//   · resolveCharacterVisualSequence (frames de acción reconciliados con ROM)
//   · anchorFor / actionAnchorFor (Position Lab)
//
// Props: estado del runtime (hp/posiciones/fase) + cues del presenter
// (fondo/modo/pose) + sprites. Render puro — sin lógica de combate.
// ═══════════════════════════════════════════════════════════════════════
import { anchorFor, actionAnchorFor } from '../data/positions';
import { BattlePosition } from '../data/positions';
import { battleOverworldActorUrl } from '../data/battleOverworld';
import { BATTLE_PORTRAITS } from '../data/battlePortraits';
import { resolveCharacterVisualSequence } from '../battle/characterFrameMap';
import { romPhysicalPreviewSequence } from './romPhysicalPreview';
import { useMemo } from 'react';
import type { BattleSide } from '../battle/engine/state/BattleState';

export interface CanonFighter {
  formId: string;
  name: string;
  form: string;
  hp: number;
  maxHp: number;
  cc: number;
  pos: BattlePosition;
  phase?: 'ATTACK' | 'DEFEND';
  buff?: string;
  debuff?: string;
}

export interface CanonBattleFieldProps {
  player: CanonFighter;
  enemy: CanonFighter;
  round?: number;
  background: string;
  mode?: 'OVERVIEW' | 'ACTION' | 'SPECIAL_ACTION';
  /** actor de la acción actual (ACTION): quién ejecuta */
  actor?: BattleSide;
  /** pose actual por lado (ACTION) — si no se pasa, usa idle del manifest */
  pose?: Partial<Record<BattleSide, string>>;
  qte?: { label: string; seq: string[]; warn?: boolean } | null;
  runtimeFx?: {
    kind: 'beam' | 'impact';
    side: BattleSide;
    visual?: 'ray' | 'wave' | 'ball' | 'disk' | 'sword' | 'special';
    outcome?: 'hit' | 'miss' | 'special_defense';
  } | null;
  className?: string;
  /** anclas dev visibles (marcadores P/E) — OFF por defecto: preview limpio como el juego */
  devAids?: boolean;
}

/** HP bar canónico — MISMO markup que el HUD Studio / el juego
 *  (hp-bar-track > recent + current; estados critical/low/mid). */
function HpBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return (
    <div className={`hp-bar ${side} ${pct < 12 ? 'critical' : pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}`}>
      <div className="hp-bar-track">
        <div className="hp-bar-recent" style={{ width: `${Math.min(100, pct + 8)}%` }} />
        <div className="hp-bar-current" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Resolución de sprites IDÉNTICA al HUD Studio:
 *  OVERVIEW → actor overworld canónico
 *  ACTION   → frame de combate resuelto desde el mapa físico-ROM.
 *  No compone nombres de archivos ni completa poses sin evidencia. */
function useFighterSprites(playerFormId: string, enemyFormId: string, pose?: Partial<Record<BattleSide, string>>) {
  return useMemo(() => {
    const resolve = (formId: string, side: BattleSide) => {
      const ow = battleOverworldActorUrl(formId, 'idle');
      const p = pose?.[side] ?? 'idle';
      const actionSequence = resolveCharacterVisualSequence({ formId, semanticRole: p });
      const idleSequence = resolveCharacterVisualSequence({ formId, semanticRole: 'idle' });
      const action = romPhysicalPreviewSequence(actionSequence)[0]?.url;
      const idle = romPhysicalPreviewSequence(idleSequence)[0]?.url;
      return { ow: ow ?? idle, action };
    };
    return { player: resolve(playerFormId, 'player'), enemy: resolve(enemyFormId, 'enemy') };
  }, [playerFormId, enemyFormId, pose?.player, pose?.enemy]);
}

export function CanonBattleField({ player, enemy, round = 1, background, mode = 'OVERVIEW', actor = 'player', pose, qte, runtimeFx = null, className, devAids = false }: CanonBattleFieldProps) {
  const sprites = useFighterSprites(player.formId, enemy.formId, pose);
  const pa = anchorFor(player.pos, 'LEFT');
  const ea = anchorFor(enemy.pos, 'RIGHT');
  const isAction = mode !== 'OVERVIEW';
  const special = mode === 'SPECIAL_ACTION';

  return (
    <div className={`battle-screen view-overview dev-hud-real-preview ${className ?? ''}`}>
      {/* ── HUD SUPERIOR (canon) ── */}
      <div className="hud-top">
        <div className="fighter-hud left">
          <div className="hud-name">
            <span className="hud-portrait">
              {BATTLE_PORTRAITS[player.formId] ? <img src={BATTLE_PORTRAITS[player.formId]} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
            </span>
            <strong>{player.name.toUpperCase()}</strong>
            <span className="hud-form">{player.form}</span>
            <span className="hud-level">LV50</span>
          </div>
          <HpBar current={player.hp} max={player.maxHp} side="left" />
          <div className="hud-info-row">
            <div className="hud-status">
              {player.buff && <span className="status-chip buff">{player.buff}</span>}
            </div>
            <span className={`hud-phase ${player.phase === 'DEFEND' ? 'phase-def' : 'phase-atk'}`}>
              {player.phase ?? 'ATTACK'}
            </span>
          </div>
        </div>

        <div className="fighter-hud right">
          <div className="hud-name">
            <span className="hud-portrait">
              {BATTLE_PORTRAITS[enemy.formId] ? <img src={BATTLE_PORTRAITS[enemy.formId]} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
            </span>
            <strong>{enemy.name.toUpperCase()}</strong>
            <span className="hud-form">{enemy.form}</span>
            <span className="hud-level">LV50</span>
          </div>
          <HpBar current={enemy.hp} max={enemy.maxHp} side="right" />
          <div className="hud-info-row">
            <div className="hud-status right">
              {enemy.debuff && <span className="status-chip debuff">{enemy.debuff}</span>}
            </div>
            <span className={`hud-phase ${enemy.phase === 'DEFEND' ? 'phase-def' : 'phase-atk'}`}>
              {enemy.phase ?? 'DEFEND'}
            </span>
          </div>
        </div>

        <div className="hud-center-badge">
          <span className="hud-center-vs">VS</span>
          <span className="hud-center-round">ROUND {round}</span>
        </div>
      </div>

      {/* ── BATTLEFIELD (fondo + fighters anclados) ── */}
      <div className="battlefield">
        <div className={`battle-bg authentic ${special ? 'special' : ''}`} style={{ backgroundImage: `url(${background})` }} />
        <div className="battlefield-fighters">
          {devAids && (
            <>
              <div className="dev-fighter-anchor player" style={{ left: `${pa.x}%`, top: `${pa.y}%` }}>
                <span className="dev-anchor-cross" />
                <span className="dev-anchor-label">P · {pa.x},{pa.y}</span>
              </div>
              <div className="dev-fighter-anchor enemy" style={{ left: `${ea.x}%`, top: `${ea.y}%` }}>
                <span className="dev-anchor-cross" />
                <span className="dev-anchor-label">E · {ea.x},{ea.y}</span>
              </div>
            </>
          )}

          {/* Player: OVERVIEW → chibi · ACTION → sprite grande (solo actor) */}
          {(!isAction ? sprites.player.ow : (actor === 'player' ? sprites.player.action : undefined)) && (
            <img
              src={!isAction ? sprites.player.ow : sprites.player.action}
              alt=""
              className={`dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored player ${isAction ? 'action-mode' : ''} ${isAction && special ? 'special-actor' : ''}`}
              style={isAction ? (() => { const aa = actionAnchorFor(actor, special); return { left: `${aa.x}%`, top: `${aa.y}%` }; })() : { left: `${pa.x}%`, top: `${pa.y}%` }}
            />
          )}
          {/* Enemy */}
          {(!isAction ? sprites.enemy.ow : (actor === 'enemy' ? sprites.enemy.action : undefined)) && (
            <img
              src={!isAction ? sprites.enemy.ow : sprites.enemy.action}
              alt=""
              className={`dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored enemy ${isAction ? 'action-mode' : ''} ${isAction && special ? 'special-actor' : ''}`}
              style={isAction ? (() => { const aa = actionAnchorFor(actor, special); return { left: `${aa.x}%`, top: `${aa.y}%` }; })() : { left: `${ea.x}%`, top: `${ea.y}%` }}
            />
          )}

          {qte && (
            <div className={`dev-rt-qte ${qte.warn ? 'warn' : ''}`}>
              QTE {qte.seq.join(' · ')} <b>{qte.label}</b>
            </div>
          )}
          {runtimeFx && (
            <div className={`dev-rt-romfx ${runtimeFx.kind} ${runtimeFx.side} ${runtimeFx.visual ?? 'ray'} ${runtimeFx.outcome ?? ''}`}>
              {runtimeFx.kind === 'beam' && <span className="dev-rt-romfx-beam" />}
              {runtimeFx.kind === 'impact' && <span className="dev-rt-romfx-impact" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
