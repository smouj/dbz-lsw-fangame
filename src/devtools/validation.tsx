// ═══════════════════════════════════════════════════════════
// DEV STUDIO — Validation
// Chequeos de integridad de datos: cobertura, ids rotos, referencias.
// ═══════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { FORMS, CHARACTERS } from '../data/roster';
import { CARDS } from '../data/cards';
import { STORY_ENEMY_DECKS, TEAM_BATTLES } from '../data/enemy_decks';
import { spriteDirFor } from '../data/spriteManifest';

interface Check { name: string; ok: boolean; detail: string; }

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
      detail: `${withDir}/${forms.length} formas con dir V5`,
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
    }
    out.push({
      name: 'Compatibilidad de cartas → personajes',
      ok: badCompat.length === 0,
      detail: badCompat.length === 0 ? 'todas válidas' : `rotas: ${badCompat.slice(0, 5).join(', ')}`,
    });

    return out;
  }, []);

  const okCount = checks.filter(c => c.ok).length;

  return (
    <div className="dev-panel">
      <header className="dev-header">
        <h1>Validation</h1>
        <p className="dev-sub">{okCount}/{checks.length} chequeos OK — integridad de datos del juego.</p>
      </header>
      <div className="dev-checks">
        {checks.map(c => (
          <div key={c.name} className={`dev-check-row ${c.ok ? 'ok' : 'bad'}`}>
            <span className="dev-check-icon">{c.ok ? '✓' : '✗'}</span>
            <div>
              <div className="dev-check-name">{c.name}</div>
              <div className="dev-check-detail">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
