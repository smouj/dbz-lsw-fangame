# DBZ LSW Dev Hub

`DBZ LSW Dev Hub` es el flavor Tauri interno para desarrollo. Se instala como aplicación separada del juego y abre directamente `#dev/system-hub`.

## Objetivo

Centralizar en una sola aplicación:

- repo Windows y workspace WSL;
- estado Git/HEAD/origin;
- Dev Server `localhost:5178`;
- acceso a GitHub, VS Code, terminal y carpetas de trabajo;
- ROM Research, trace fixtures, docs y builds;
- Development Studio;
- gates de TypeScript, tests, build, Presentation, Full Battle, Physical Corpus, Beam Trace y `verify:ci`.

## Seguridad / separación del juego

Las acciones nativas se compilan únicamente con la feature Cargo `devhub`.

La build normal del juego no registra `devhub_probe` ni `devhub_action`.

La UI tampoco expone un shell arbitrario: `devhub_action` acepta exclusivamente IDs predefinidos y cada tarea ejecuta un comando fijo del proyecto.

El entrypoint web mantiene además dos superficies separadas:

- **Juego público**: `/` sin marcadores Dev. No importa el layout privado ni
  renderiza módulos del Studio.
- **Dev Studio**: solo se activa con `#dev`, `#dev/<módulo>` o `?dev=1` en
  builds de desarrollo/preview. El módulo se carga de forma diferida y su CSS
  vive dentro de `src/devtools/`, junto a la herramienta.

En una build `--mode release`, `DevStudio` se sustituye por un stub nulo y el
guard de ruta queda desactivado. La frontera se comprueba con:

```powershell
npm run verify:dev-production-boundary
npm run verify:release-content
```

El primer gate evita imports Dev accidentales desde el juego y valida el
namespace de URL. El segundo inspecciona el artefacto final para confirmar que
no expone módulos, endpoints ni datos de desarrollo.

La navegación interna se organiza en seis áreas de trabajo: `Overview`,
`Combat`, `Visuals`, `Game Data`, `Content` y `QA & ROM`. Cada área muestra
solo sus módulos contextuales, pero conserva las 24 rutas canónicas y sus
deep links. `DEV_MODULES` sigue siendo la fuente de módulos; `DEV_AREAS` solo
define su organización visual.

La estructura se valida con:

```powershell
npm run verify:dev-studio-navigation
```

Dentro de `Visuals → ROM Display Lab` existe también **ROM Sprite Atlas**. Es
una proyección del corpus `ROM_PHYSICAL_FIGHTERS`, no un editor de PNGs: ofrece
`Physical Atlas` (identidades físicas únicas) y `Animation Map` (resource →
sequence → timeline), con inspector de `physicalId`, `visualFrameId`, hashes de
metasprite/gráficos, geometría, origen/ancla, paleta y usos en producción. Las
previsualizaciones permiten alternar la paleta ROM canónica, la materialización
RAW 2BPP y una vista de escala de grises únicamente para inspección; ninguna de
esas vistas altera la identidad física ni el runtime.
imágenes se cargan únicamente como materialización del frame ROM y un fallo de
materialización se muestra como `GENERATED_ASSET_MISSING`; nunca se sustituye
por un sprite externo o parecido. La vista exporta un `atlas.json`
determinista para la forma seleccionada y queda protegida por:

```powershell
npm run verify:rom-sprite-atlas
```

Para materializar las hojas de contacto y los frames por forma (salida
regenerable e ignorada por Git) se usa:

```powershell
npm run build:rom-sprite-atlas
```

El catálogo conserva la frontera Dev/Juego: no añade una ruta pública ni
modifica los datos de combate.

### Frontera de distribución

El build `--mode release` aplica una poda determinista al directorio `dist/`:
conserva las texturas, manifests y datos que consume el juego, y excluye
`physical-debug/`, `provenance.json`, capturas, fixtures y páginas de auditoría
del Dev Hub. El límite se verifica con:

```powershell
npm run verify:release-content
```

Ese gate imprime el tamaño real de JS/CSS y de los assets de juego, y falla si
aparece cualquier material Dev, ROM/save o archivo de investigación dentro de
la distribución. El Dev Studio ya se carga de forma diferida y se sustituye
por un stub vacío en el modo `release`.

El estado y las métricas de este frente están documentados en
[`PERFORMANCE_P0.md`](architecture/PERFORMANCE_P0.md). Las optimizaciones que
afecten al reloj GBC, Pixi o memoria quedan condicionadas a una medición real
de `BattleScreen`; no se aplican cambios especulativos al gameplay.

El área `Combat` incluye `Performance`, un profiler interno bajo demanda. Al
abrirlo inicia una captura con `requestAnimationFrame` y observa únicamente
las APIs reales del navegador: FPS, frame time, tareas largas, recursos,
bytes transferidos y heap JS cuando está disponible. Las marcas `MAIN_MENU`,
`BATTLE_READY`, `ACTION_START`, `IMPACT` y `CLEANUP` permiten comparar un
recorrido de combate entre sesiones. Texturas GPU, draw calls y memoria de
vídeo se muestran como no disponibles hasta que el backend las exponga de
forma estable; no se fabrican cifras. La captura continúa al navegar al juego
para medir `BattleScreen` y se detiene explícitamente desde el panel.

## Ejecutar en desarrollo

Desde PowerShell, en el repo:

```powershell
.\scripts\devhub.ps1 dev
```

Equivale a:

```powershell
npx tauri dev --features devhub --config src-tauri/tauri.devhub.conf.json
```

## Construir instalador

```powershell
.\scripts\devhub.ps1 build
```

El bundle NSIS se genera en:

```text
src-tauri/target/release/bundle/nsis
```

## Construir y abrir el instalador

```powershell
.\scripts\install-devhub.ps1
```

El script compila el flavor `DBZ LSW Dev Hub`, busca el NSIS más reciente y lo abre.

## Repo local

El Hub intenta detectar el repo en este orden:

1. ruta guardada por System Hub;
2. `DBZLSW_REPO`;
3. directorio actual / ancestros;
4. ubicaciones comunes como `D:\CodexProjects\dbz-lsw-fangame`;
5. `CodexProjects`, `workspace` o `Documents` bajo el perfil del usuario.

La ruta puede cambiarse desde la propia aplicación. Solo se acepta un directorio con `.git` y `package.json` cuyo package name sea `dbz-lsw-fangame`.

## Flavor Tauri

Configuración adicional:

```text
src-tauri/tauri.devhub.conf.json
```

Tauri aplica este archivo como JSON Merge Patch sobre `tauri.conf.json`, por lo que el juego y el Dev Hub comparten infraestructura base pero tienen producto e identifier separados.

- Juego: `DBZ LSW Fangame` / `com.dbzlsw.fangame`
- Dev Hub: `DBZ LSW Dev Hub` / `com.dbzlsw.devhub`

## Desarrollo futuro

El System Hub es el lugar correcto para añadir nuevas acciones de desarrollo. Cualquier acción nueva debe:

1. tener un ID cerrado en `systemHub.tsx`;
2. tener un `match` explícito en `src-tauri/src/devhub.rs`;
3. no aceptar comandos shell arbitrarios desde frontend;
4. ser segura ante una ruta de repo incorrecta;
5. mantener el juego público sin feature `devhub`.
