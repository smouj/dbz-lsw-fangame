# Desktop-first / Offline-first — arquitectura del producto

Estado: **VIGENTE** · baseline de arquitectura A–F: `d1e2db18` (2026-09-13). El baseline histórico previo `43ec99bc` queda supersedido como referencia de cierre.
Verificado contra el repositorio, no asumido.

---

## 1. Contrato del producto

```text
DBZ LSW Fangame es desktop-first y offline-first.

El juego base DEBE poder jugarse sin:
- Internet
- API externa
- servidor dedicado
- localhost
- herramientas de desarrollo
- Node.js instalado por el jugador
- mGBA instalado por el jugador
```

> La indisponibilidad de servicios online futuros nunca debe impedir iniciar y jugar al juego base.

---

## 2. Qué es el producto y qué es desarrollo

```text
PRODUCTO
DBZ LSW Fangame
  → Tauri v2 (src-tauri/)
  → aplicación de escritorio
  → frontend estático empaquetado (dist/)
  → bundle NSIS (instalador Windows)
  → sin backend obligatorio
  → sin localhost en release
  → sin conexión externa obligatoria

DESARROLLO
Vite / localhost:5178
  → únicamente tauri dev / desarrollo con recarga en caliente
```

Evidencia verificada en el repo:

| Hecho | Valor real |
|---|---|
| Empaquetado | Tauri v2 (`@tauri-apps/cli ^2.11.4`) |
| `src-tauri/` | `Cargo.toml`, `build.rs`, `tauri.conf.json`, `capabilities/`, `icons/`, `src/` |
| `productName` | `DBZ LSW Fangame` |
| `identifier` | `com.dbzlsw.fangame` |
| Ventana | 1280 × 720 |
| `build.frontendDist` | `../dist` |
| `build.devUrl` | `http://localhost:5178` (**solo desarrollo**) |
| `bundle.targets` | `["nsis"]` |
| Script dev | `desktop:dev` → `tauri dev` |
| Script release | `desktop:build` → `verify:release-content && tauri build --bundles nsis` |
| Paquete base | `dbz-lsw-fangame` v0.10.0 (crate `dbz_lsw_fangame_lib`, edition 2021) |

---

## 3. Qué necesita servidor y qué no

| Sistema | Servidor |
|---|---:|
| Main Menu | No |
| Battle | No |
| Story | No |
| Characters | No |
| Cards / Deck | No |
| IA | No |
| Saves locales | No |
| Settings | No |
| Dev Studio empaquetado | No |
| ROM Mode embebido (planificado) | No |
| Emulación GBC embebida (planificada) | No |
| Multiplayer online | Sí |
| Matchmaking | Sí |
| Rankings globales | Sí |
| Cloud saves | Sí |
| Cuentas | Sí |

Regla:

> La indisponibilidad de servicios online futuros nunca debe impedir iniciar y jugar al juego base.

---

## 4. Red en runtime

`src/` no debe hacer peticiones de red externas para el juego base. Los recursos del producto deben resolverse desde el bundle/same-origin.

```text
/assets/…        (sprites, manifests, duraciones, audio)
/__dev/flip      (endpoint de desarrollo en devtools/)
```

Un `fetch` a un origen externo dentro de `src/` rompería el contrato offline. `verify:desktop-offline` vigila tanto esta frontera como que el tooling ROM no se filtre al bundle del frontend.

---

## 5. Frontera ROM que no hay que confundir

```text
Herramienta de investigación ROM  ≠  La aplicación ejecuta una ROM
```

Estado vigente:

- `tools/rom-trace/`: existe y produce evidencia; queda fuera del producto.
- remake runtime (`BattleEngine` / `BattleRuntime`): es el producto actual.
- core GBC embebido en Tauri: **pendiente**; forma parte del milestone futuro G–J.

Detalle autoritativo en `docs/architecture/ROM_EXECUTION_MODES.md`.

---

## 6. Enforcement

El contrato no depende solo de documentación. `verify:desktop-offline` corre dentro de `verify:ci` y, en el cierre A–F, pasó **16/16** comprobaciones.

El gate ya encontró una violación real de frontera (`src/devtools/timeline.tsx` importando desde `tools/rom-trace/`). Los contratos compartidos se movieron a `src/battle/romTrace/`, dejando la dirección permitida como `tools → src`.

Por tanto, cualquier cambio futuro que vuelva a introducir una dependencia de producto hacia tooling debe considerarse regresión de arquitectura.
