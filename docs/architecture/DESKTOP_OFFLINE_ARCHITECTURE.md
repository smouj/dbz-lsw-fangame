# Desktop-first / Offline-first — arquitectura del producto

Estado: **VIGENTE** · baseline de referencia `43ec99bc` (`DESKTOP_OFFLINE_BASELINE_V1`)
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

> La indisponibilidad de servicios online futuros **nunca** debe impedir iniciar
> y jugar al juego base.

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
  → únicamente `tauri dev` / desarrollo con recarga en caliente
```

Evidencia verificada en el repo:

| Hecho | Valor real |
| --- | --- |
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
| --- | ---: |
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

> La indisponibilidad de servicios online futuros nunca debe impedir iniciar y
> jugar al juego base.

---

## 4. Red en runtime

`src/` **no hace ninguna petición de red externa**. Todas las llamadas son
**same-origin** sobre los assets empaquetados:

```text
/assets/…        (sprites, manifests, duraciones, audio)
/__dev/flip      (endpoint de desarrollo en devtools/)
```

Riesgo a vigilar (no un problema actual): un `fetch` a un origen externo dentro
de `src/` rompería el contrato offline. **Es lo que vigila `verify:desktop-offline`.**

---

## 5. Frontera que NO hay que confundir

```text
Herramienta de investigación ROM  ≠  La aplicación ejecuta una ROM
```

Detalle en `docs/architecture/ROM_EXECUTION_MODES.md`.
