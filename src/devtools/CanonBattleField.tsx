// ═══════════════════════════════════════════════════════════════════════
// DEV STUDIO — CanonBattleField
// El battle-screen CANÓNICO (mismo markup que HUD Studio — la referencia
// visual de producción). Lo consumen el Engine Playground (Timeline en
// vivo) y el Battle Lab para que el engine se vea EXACTAMENTE como el
// juego: hud-top (portraits + HP + fase ATTACK/DEFEND + VS ROUND),
// battlefield con fondo real, fighters anclados con anchorFor (la misma
// fuente que Position Lab) y sprites overworld/action reales.
//
// Props: estado del runtime (hp/posiciones/fase) + cues del presenter
// (fondo/modo/pose) + sprites. Render puro — sin lógica de combate.
// ═══════════════════════════════════════════════════════════════════════
import { anchorFor, actionAnchorFor } from '../data/positions';
import { BattlePosition } from '../data/positions';
import { overworldUrl } from '../data/overworld';
import { resolvePoseSrc } from '../battle/runtime';
import { useEffect, useState } from 'react';
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
  portrait?: string;
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
  className?: string;
  /** anclas dev visibles (marcadores P/E + zonas ANIM) */
  devAids?: boolean;
}

function HpBar({ current, max, side }: { current: number; max: number; side: 'left' | 'right' }) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return (
    <div className={`hp-bar ${side}`}>
      <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CanonBattleField({ player, enemy, round = 1, background, mode = 'OVERVIEW', actor = 'player', pose, qte, className, devAids = false }: CanonBattleFieldProps) {
  const [owSrcs, setOwSrcs] = useState<Partial<Record<BattleSide, string>>>({});
  const [idleSrcs, setIdleSrcs] = useState<Partial<Record<BattleSide, string>>>({});
  const [actionSrcs, setActionSrcs] = useState<Partial<Record<BattleSide, string>>>({});

  // Overworld + idle del manifest (misma resolución que el HUD Studio)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const pOw = overworldUrl(player.formId);
      const eOw = overworldUrl(enemy.formId);
      if (alive) setOwSrcs({ player: pOw ?? undefined, enemy: eOw ?? undefined });
      const [pIdle, eIdle] = await Promise.all([
        resolvePoseSrc(player.formId, pose?.player ?? 'idle'),
        resolvePoseSrc(enemy.formId, pose?.enemy ?? 'idle'),
      ]);
      if (alive) setIdleSrcs({ player: pIdle ?? undefined, enemy: eIdle ?? undefined });
    };
    load();
    return () => { alive = false; };
  }, [player.formId, enemy.formId, pose?.player, pose?.enemy]);

  // Sprites de acción (sheet grande) para el plano ACTION
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [pAct, eAct] = await Promise.all([
        resolvePoseSrc(player.formId, pose?.player ?? 'idle'),
        resolvePoseSrc(enemy.formId, pose?.enemy ?? 'idle'),
      ]);
      if (alive) setActionSrcs({ player: pAct ?? undefined, enemy: eAct ?? undefined });
    };
    load();
    return () => { alive = false; };
  }, [player.formId, enemy.formId, pose?.player, pose?.enemy]);

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
              {player.portrait ? <img src={player.portrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
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
              {enemy.portrait ? <img src={enemy.portrait} alt="" /> : <span className="dev-hud-mock-ph">?</span>}
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

          {/* Player: OVERVIEW → chibi · ACTION → sprite grande (si es actor) */}
          {(!isAction ? owSrcs.player : (actor === 'player' ? actionSrcs.player : undefined)) && (
            <img
              src={!isAction ? owSrcs.player : actionSrcs.player}
              alt=""
              className={`dev-hud-ow dev-hud-fighter-sprite dev-hud-anchored player ${isAction ? 'action-mode' : ''} ${isAction && special ? 'special-actor' : ''}`}
              style={isAction ? (() => { const aa = actionAnchorFor(actor, special); return { left: `${aa.x}%`, top: `${aa.y}%` }; })() : { left: `${pa.x}%`, top: `${pa.y}%` }}
            />
          )}
          {/* Enemy */}
          {(!isAction ? owSrcs.enemy : (actor === 'enemy' ? actionSrcs.enemy : undefined)) && (
            <img
              src={!isAction ? owSrcs.enemy : actionSrcs.enemy}
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
        </div>
      </div>
    </div>
  );
}
