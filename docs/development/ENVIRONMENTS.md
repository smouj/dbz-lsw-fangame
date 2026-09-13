# Entornos — fuente única de verdad (SSOT)

Fecha: 2026-09-13 · Verificado contra el repositorio y el entorno real.

Este documento existe porque el proyecto vive en varios entornos a la vez (Windows, WSL, GitHub Actions, mGBA, Vite y Tauri) y una validación en un entorno no prueba automáticamente los demás.

---

## Autoridades por entorno

| Entorno | Responsabilidad |
|---|---|
| **Windows** | Desktop/Tauri real, build NSIS, QA de producto |
| **WSL (Linux)** | desarrollo, scripts, análisis ROM, tooling, verificación |
| **GitHub Actions** | integración y release reproducibles |
| **mGBA / libmgba** | evidencia ROM y traces |
| **Vite dev server (`:5178`)** | desarrollo de frontend únicamente |
| **Tauri release build** | comportamiento real del producto |

---

## Reglas de frontera

```text
Browser dev        ≠  Desktop release
ROM trace          ≠  Embedded ROM Mode
GitHub main        ≠  working tree local si existe WIP
```

Consecuencias prácticas:

- Que algo se vea bien en el navegador no prueba que se vea bien en el instalador. El juicio de producto es el build de Tauri.
- `tools/rom-trace` produce evidencia; la app no ejecuta una ROM hoy (ver `ROM_EXECUTION_MODES.md`).
- Un `verify:*` verde en local sobre un árbol con cambios sin commitear no equivale a `main` verde.

---

## Versiones y fijado

| Herramienta | Estado real | Autoridad/fijado |
|---|---|---|
| Node — repositorio/release | **22** | `.nvmrc` + `release-desktop.yml` |
| Node — WSL observado | `v24.20.0` | ⚠️ deriva local respecto a `.nvmrc` |
| npm — WSL observado | `11.19.0` | no fijado de forma independiente |
| `packageManager` | **ausente deliberadamente** | ver decisión abajo |
| Rust — release CI | `stable` (`dtolnay/rust-toolchain@stable`) | workflow; no existe aún `rust-toolchain.toml` |
| Tauri CLI | `@tauri-apps/cli ^2.11.4` | `package-lock.json` |
| Tauri (Rust) | `tauri = "2"` | ⚠️ `src-tauri/Cargo.lock` ausente |

### Divergencias conocidas

1. **Node 22 es la autoridad; WSL se observó en Node 24.**
   `.nvmrc` contiene `22` y el workflow que produce el release de Windows usa Node 22. El WSL que estaba ejecutando Node 24 pasa la CI local, pero eso es una divergencia del entorno de desarrollo, no la versión fijada del proyecto. La acción correcta es usar `nvm use` antes de validar un cambio destinado a release.

2. **`packageManager` está deliberadamente sin definir.**
   El WSL observado usa npm 11 con Node 24, mientras que Node 22 trae la línea npm 10.x. Fijar `npm@11` de forma aislada introduciría una incompatibilidad con la autoridad de release/Corepack. La versión de npm debe decidirse junto con la política de Node, no por separado.

3. **`src-tauri/Cargo.lock` no está presente.**
   Un proyecto Tauri/aplicación debería commitear su `Cargo.lock` para fijar dependencias transitivas de Rust y hacer el build más reproducible. No se ha generado artificialmente desde WSL porque ese entorno no dispone de Cargo. Debe generarse en un entorno Rust real (Windows o CI), revisarse y commitearse.

4. **`rust-toolchain.toml` no existe.**
   La CI usa `stable`. Fijar una versión/canal concreto de Rust es una decisión de reproducibilidad pendiente y debe validarse en el entorno que construye Tauri.

---

## Comandos por entorno

```text
WSL / desarrollo y verificación
  nvm use
  npm ci
  npm run dev
  npm run verify:ci
  npm run verify:desktop-offline

Windows / producto
  nvm use
  npm ci
  npm run desktop:dev
  npm run desktop:build

GitHub Actions
  verify.yml                 → integración
  release-desktop.yml        → tag v* → NSIS + draft release (Node 22, Rust stable)
```

---

## Criterio de autoridad

Para JavaScript/TypeScript y builds de release, **Node 22 es la referencia mientras `.nvmrc` y `release-desktop.yml` digan 22**. Un entorno local distinto puede servir para investigación, pero no debe usarse para redefinir el baseline del proyecto sin cambiar primero la configuración versionada y validar la CI correspondiente.
