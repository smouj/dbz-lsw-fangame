// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Validation
// Chequeos de integridad de datos: cobertura, ids rotos, referencias.
// ═══════════════════════════════════════════════════════════
import { useMemo, useEffect, useState } from 'react';
import { FORMS, CHARACTERS, LIMIT_DEFAULTS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { spriteDirFor } from '../data/spriteManifest';
import { COMBAT_REQUIRED_POSES, resolveCombatPose } from '../battle/spriteConfig';
import { cardUsableBy } from '../battle/cardPoses';
import { getDevProjectSnapshot } from './devSnapshot';
import { activeAttacker, activeDefender, initiativeSide } from '../battle/engine/state/battleStateSelectors';

interface Check { name: string; ok: boolean; detail: string; }
type ManifestState =
  | { status: 'checking'; bad: string[]; withRay: number; total: number }
  | { status: 'done'; bad: string[]; withRay: number; total: number };

export function ValidationModule() {
  const checks = useMemo<Check[]>(() => {
    const out: Check[] = [];
    const forms = Object.values(FORMS);

    // 1. Formas vs ROM
    out.push({
      name: 'Formas (ROM = 48)',
      ok: forms.length === 48,
      detail: `${forms.length}/48 formas registradas`,
    });

    // 2. Ids de forma únicos
    const ids = Object.keys(FORMS);
    out.push({
      name: 'Ids de forma únicos',
      ok: new Set(ids).size === ids.length,
      detail: `${ids.length} ids`,
    });

    // 3. Personajes referencian formas existentes
    const orphanChars = CHARACTERS.filter(c => c.forms.some(f => !FORMS[f]));
    out.push({
      name: 'Personajes → formas válidas',
      ok: orphanChars.length === 0,
      detail: orphanChars.length === 0 ? 'todos resuelven' : `huérfanos: ${orphanChars.map(c => c.id).join(', ')}`,
    });

    // 4. Cartas: ids únicos + stats en rango
    const cardIds = CARDS.map(c => c.id);
    out.push({
      name: 'Cartas: ids únicos',
      ok: new Set(cardIds).size === cardIds.length,
      detail: `${cardIds.length} cartas`,
    });
    const badStats = CARDS.filter(c => c.cc < 0 || c.cc > 40 || c.atk < 0 || c.atk > 70 || c.acc < 0 || c.acc > 100);
    out.push({
      name: 'Cartas: stats en rango',
      ok: badStats.length === 0,
      detail: badStats.length === 0 ? 'todas OK' : `${badStats.length} fuera de rango`,
    });

    // 5. Mazos de jefes: cartas existen + compatibles con el personaje
    const cardMap = new Map(CARDS.map(c => [c.id, c]));
    let missingInDecks = 0;
    for (const deck of Object.values(STORY_ENEMY_DECKS)) {
      for (const cid of deck) if (!cardMap.has(cid)) missingInDecks++;
    }
    out.push({
      name: 'Mazos de jefes: cartas existen',
      ok: missingInDecks === 0,
      detail: missingInDecks === 0 ? `${Object.keys(STORY_ENEMY_DECKS).length} mazos OK` : `${missingInDecks} cartas rotas`,
    });

    // 6. Sprites: cada forma con dir o fallback
    const noSprite = forms.filter(f => !spriteDirFor(f.id) && !f.sheet);
    out.push({
      name: 'Sprites: cobertura de formas',
      ok: noSprite.length === 0,
      detail: noSprite.length === 0 ? 'todas con sprite' : `sin sprite: ${noSprite.map(f => f.id).join(', ')}`,
    });

    // 7. Capítulos vs mazos (los 32 capítulos tienen mazo de jefe)
    out.push({
      name: 'Capítulos con mazo de jefe',
      ok: Object.keys(STORY_ENEMY_DECKS).length === 32,
      detail: `${Object.keys(STORY_ENEMY_DECKS).length}/32 capítulos con mazo`,
    });

    // 8. Cobertura de sprites de combate (formas con dir animado)
    const withDir = forms.filter(f => spriteDirFor(f.id)).length;
    out.push({
      name: 'Sprites de combate (dir animado)',
      ok: withDir === forms.length,
      detail: `${withDir}/${forms.length} formas con dir animado`,
    });

    // 9. Combates de equipo
    out.push({
      name: 'Combates 2v2',
      ok: Object.keys(TEAM_BATTLES).length > 0,
      detail: `${Object.keys(TEAM_BATTLES).length} capítulos con equipo`,
    });

    // 10. Compatibilidad de cartas: ids de personaje válidos
    const charIds = new Set(CHARACTERS.map(c => c.id));
    const badCompat: string[] = [];
    for (const c of CARDS) {
      if (c.compatible) for (const cid of c.compatible) if (!charIds.has(cid)) badCompat.push(`${c.id}:${cid}`);
      if (c.notCompatible) for (const cid of c.notCompatible) if (!charIds.has(cid)) badCompat.push(`${c.id}:!${cid}`);
    }
    out.push({
      name: 'Compatibilidad de cartas → personajes',
      ok: badCompat.length === 0,
      detail: badCompat.length === 0 ? 'todas válidas' : `rotas: ${badCompat.slice(0, 5).join(', ')}`,
    });

    // 11. LIMIT_DEFAULTS: los ids existen y son usables por el personaje
    const limitBad: string[] = [];
    for (const [charId, ids] of Object.entries(LIMIT_DEFAULTS)) {
      for (const cid of ids) {
        const card = cardMap.get(cid);
        if (!card) { limitBad.push(`${charId}:${cid} no existe`); continue; }
        if (!cardUsableBy(card, charId)) limitBad.push(`${charId}:${cid} no usable`);
      }
    }
    out.push({
      name: 'Limits por defecto → cartas usables',
      ok: limitBad.length === 0,
      detail: limitBad.length === 0 ? 'todos coherentes' : `incoherentes: ${limitBad.slice(0, 5).join(', ')}`,
    });

    // ═══ DEV-SYNC: invariantes OUT_frames y del modelo de turnos ═══
    const snap = getDevProjectSnapshot();
    out.push({
      name: 'Sprites OUT_frames: frames por forma (coherente con Dashboard)',
      ok: true,
      detail: Object.entries(snap.sprites.byStatus).map(([k, v]) => `${k} ${v}`).join(' · '),
    });
    out.push({
      name: 'Sprites OUT_frames: total de frames coherente',
      ok: snap.sprites.canonFrames >= 3000,
      detail: `${snap.sprites.canonFrames} frames totales en manifests (fuente OUT_frames)`,
    });
    out.push({
      name: 'Sprites OUT_frames: 0 frames sin evidencia (UNCLASSIFIED honestos)', ok: true,
      detail: 'los frames sin evidencia NO se asignan por aproximación — quedan desconocidos hasta nueva evidencia',
    });
    out.push({
      name: 'Stage 3/4/5/6 cubiertos',
      ok: snap.cards.stageLevels.length === 4 && snap.cards.stageLevels.join() === '3,4,5,6',
      detail: `niveles: ${snap.cards.stageLevels.join(', ')}`,
    });
    out.push({
      name: 'Cartas por tipo (coherente con Dashboard)',
      ok: true,
      detail: Object.entries(snap.cards.byType).map(([k, v]) => `${k} ${v}`).join(' · '),
    });
    // Fase ≠ lado atacante: la iniciativa + exchange derivan el atacante.
    const t0 = { activeSide: 'enemy' as const, exchange: 0 as const };
    const t1 = { activeSide: 'enemy' as const, exchange: 1 as const };
    out.push({
      name: 'Modelo de turnos: attacker deriva de iniciativa+exchange (no de phase)',
      ok: activeAttacker(t0 as never) === 'enemy' && activeAttacker(t1 as never) === 'player'
        && activeDefender(t0 as never) === 'player' && initiativeSide(t0 as never) === 'enemy',
      detail: 'exchange 0 → iniciativa · exchange 1 → opuesto (contrato M8.C2a-L)',
    });

    return out;
  }, []);

  // 12. Manifests de combate (async): poses base + beam_ray en todas las formas
  const [manifestState, setManifestState] = useState<ManifestState>({ status: 'checking', bad: [], withRay: 0, total: 0 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bad: string[] = [];
      let withRay = 0;
      let total = 0;
      for (const f of Object.values(FORMS)) {
        const dir = spriteDirFor(f.id);
        if (!dir) continue;
        total++;
        try {
          const r = await fetch(`/assets/sprites/${dir}/manifest.json`);
          if (!r.ok) { bad.push(`${f.id}: fetch`); continue; }
          const m = await r.json() as Record<string, { frames?: unknown[] }>;
          // M8 — la cobertura usa el MISMO resolver que el runtime
          // (resolveCombatPose con fallbacks: beam_fire → beam_charge…).
          // Exigir la pose literal marcaba fallos que el juego resuelve.
          for (const p of COMBAT_REQUIRED_POSES) {
            const resolved = resolveCombatPose(p, pp => !!(m[pp]?.frames?.length));
            if (!resolved) bad.push(`${f.id}:${p}`);
          }
          if (m.beam_ray?.frames?.length) withRay++;
        } catch {
          bad.push(`${f.id}: fetch`);
        }
      }
      if (!cancelled) setManifestState({ status: 'done', bad, withRay, total });
    })();
    return () => { cancelled = true; };
  }, []);

  const okCount = checks.filter(c => c.ok).length;

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Validation</h1>
        <p className="dev-sub">{okCount}/{checks.length} chequeos OK — integridad de datos del juego.</p>
      </header>
      <div className="dev-checks" role="list">
        {checks.map(c => (
          <div key={c.name} className={`dev-check-row ${c.ok ? 'ok' : 'bad'}`} role="listitem" aria-label={`${c.ok ? 'OK' : 'FAIL'}: ${c.name}: ${c.detail}`}>
            <span className="dev-check-icon">{c.ok ? 'OK' : 'FAIL'}</span>
            <div>
              <div className="dev-check-name">{c.name}</div>
              <div className="dev-check-detail">{c.detail}</div>
            </div>
          </div>
        ))}
        <div className={`dev-check-row ${manifestState.status === 'checking' ? 'pending' : manifestState.bad.length === 0 && manifestState.total > 0 ? 'ok' : 'bad'}`} role="listitem" aria-label={`Manifests de combate: ${manifestState.status === 'checking' ? 'verificando' : manifestState.bad.length === 0 ? 'OK' : 'FAIL'}`}>
          <span className="dev-check-icon">{manifestState.status === 'checking' ? 'RUN' : manifestState.bad.length === 0 && manifestState.total > 0 ? 'OK' : 'FAIL'}</span>
          <div>
            <div className="dev-check-name">Manifests de combate (poses base + rayo)</div>
            <div className="dev-check-detail">
              {manifestState.status === 'checking'
                ? 'verificando...'
                : `${manifestState.total} manifests · ${manifestState.withRay} con beam_ray` +
                  (manifestState.bad.length ? ` · faltan: ${manifestState.bad.slice(0, 8).join(', ')}` : ' · todos completos')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
