// ═══════════════════════════════════════════════════════════
// DBZ LSW — Dev Studio: FACING (orientación de sprites)
// Herramienta MANUAL para decidir la orientación nativa de cada
// chibi de overworld (panel_sprites/*_ow.png).
//
// Cómo funciona:
//  · Cada celda muestra el chibi actual a ×10 (pixelado).
//  · CLICK en el preview = voltear/espejar SOLO en pantalla (no guarda).
//  · "💾 Guardar" persiste el flip actual del preview al disco
//    (POST /__dev/write, el mismo middleware que usa Pixel Art).
//  · "💾 Guardar pendientes" guarda todos los volteados de una vez.
//  · Tras guardar, el preview se recarga con cache-bust.
//
// Regla de facing del juego: TODOS los sprites nativos miran a la
// DERECHA. Si un chibi mira a la izquierda nativamente, se ve mal
// como jugador (lado izquierdo). Voltea y guarda los que estén mal.
// ═══════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OVERWORLD_FILES } from '../data/overworld';

const OW_BASE = '/assets/overworld/panel_sprites';

// Sugerencias de orientación: SOLO donde el análisis objetivo fue
// consistente (voto multi-corte de silueta + sanity check completo) y el
// chibi NO está ya normalizado (los 9 de personajes con combate espejado
// ya miran a la derecha desde 6c06ffa).
// 'left' = probablemente mira a la izquierda (verificar y voltear).
// 2026-08-17: todos los chibis normalizados (check-overworld-facing.py
// aplicó los 9 pendientes: android_19, burter, buu, cell_imperfect,
// cell_jr, cell_semi_perfect, ginyu, guldo, trunks_base).
const SUGGEST_LEFT: Record<string, boolean> = {};

// ─── helpers de imagen ───
// El flip se hace en el SERVIDOR (POST /__dev/flip, PNG píxel a píxel,
// conserva RGB de píxeles transparentes). El canvas del navegador
// destruiría esos bytes (premultiplicación), así que NO se usa aquí.
async function flipAssetOnServer(rel: string): Promise<void> {
  const res = await fetch('/__dev/flip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rel }),
  });
  if (!res.ok) throw new Error(`flip failed: ${res.status} ${await res.text()}`);
}

// ─── componente ───
export function FacingModule() {
  const files = useMemo(() => Array.from(new Set(Object.values(OVERWORLD_FILES))).sort(), []);

  // flip local (solo preview) por archivo
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  // marca de "guardado en disco" (para cache-bust + indicador)
  const [savedAt, setSavedAt] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [status, setStatus] = useState<string>('');

  const pendingCount = files.filter(f => flipped[f]).length;
  const dirty = pendingCount > 0;

  const toggleFlip = useCallback((file: string) => {
    setFlipped(prev => ({ ...prev, [file]: !prev[file] }));
  }, []);

  const saveOne = useCallback(async (file: string) => {
    setBusy(prev => ({ ...prev, [file]: true }));
    try {
      await flipAssetOnServer(`overworld/panel_sprites/${file}`);
      setFlipped(prev => ({ ...prev, [file]: false }));
      setSavedAt(prev => ({ ...prev, [file]: Date.now() }));
      setStatus(`${file} volteado y guardado (OK)`);
    } catch (e) {
      setStatus(`Error: ${file}: ${String(e)}`);
    } finally {
      setBusy(prev => ({ ...prev, [file]: false }));
    }
  }, []);

  const saveAll = useCallback(async () => {
    const toSave = files.filter(f => flipped[f]);
    if (toSave.length === 0) return;
    setSavingAll(true);
    for (const file of toSave) {
      await saveOne(file);
    }
    setSavingAll(false);
    setStatus(`Guardados ${toSave.length} chibis volteados (OK)`);
  }, [files, flipped, saveOne]);

  // tecla G = guardar todos, tecla R = reset visual
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') { saveAll(); }
      if (e.key === 'r' || e.key === 'R') { setFlipped({}); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveAll]);

  return (
    <div className="dev-facing">
      <div className="dev-facing-head">
        <h1>Facing — orientación de chibis overworld</h1>
        <div className="dev-facing-canon-badge" title="Canon V9: los 9 chibis pendientes se normalizaron a la derecha (check-overworld-facing.py, 2026-08-17). El runtime ya no espeja por defecto.">
          <strong>CANON V9</strong> · {files.length} chibis · todos miran a la DERECHA ✓
        </div>
        <p className="dev-facing-help">
          Todos los sprites deben mirar a la <strong>DERECHA</strong> por defecto.
          Click en un chibi = voltear en pantalla. Luego <strong>Guardar</strong> lo
          persiste al disco. Atajos: <kbd>G</kbd> guardar todos · <kbd>R</kbd> reset visual.
          Los marcados <span className="dev-facing-suggest">↔</span> probablemente miran a la izquierda (análisis consistente).
        </p>
        <div className="dev-facing-actions">
          <button className="dev-btn" onClick={saveAll} disabled={!dirty || savingAll}>
            {savingAll ? 'Guardando…' : `Guardar pendientes (${pendingCount})`}
          </button>
          <button className="dev-btn dev-btn-ghost" onClick={() => setFlipped({})} disabled={!dirty}>
            ↺ Reset visual
          </button>
          {status && <span className="dev-facing-status">{status}</span>}
        </div>
      </div>

      <div className="dev-facing-grid">
        {files.map(file => {
          const isFlipped = !!flipped[file];
          const isBusy = !!busy[file];
          const suggest = SUGGEST_LEFT[file];
          const ts = savedAt[file] ?? 0;
          return (
            <div key={file} className={`dev-facing-cell ${isFlipped ? 'flipped' : ''} ${suggest ? 'suggest' : ''}`}>
              <button
                className="dev-facing-preview"
                onClick={() => toggleFlip(file)}
                title="Click: voltear en pantalla (no guarda)"
              >
                <img
                  src={`${OW_BASE}/${file}?t=${ts}`}
                  alt={file}
                  width={16}
                  height={16}
                  style={{ transform: isFlipped ? 'scaleX(-1)' : undefined }}
                />
                {suggest && <span className="dev-facing-suggest-badge" title="Análisis: probablemente mira a la izquierda">↔</span>}
                {isFlipped && <span className="dev-facing-flip-badge">VOLTEADO</span>}
              </button>
              <div className="dev-facing-name" title={file}>{file.replace('_ow.png', '')}</div>
              <div className="dev-facing-btns">
                <button
                  className="dev-btn dev-btn-sm"
                  disabled={isBusy || !isFlipped}
                  onClick={() => saveOne(file)}
                >
                  {isBusy ? '…' : 'Guardar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
