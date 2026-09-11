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
