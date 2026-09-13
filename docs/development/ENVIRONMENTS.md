# Entornos — fuente única de verdad (SSOT)

Fecha: 2026-09-13 · Verificado contra el repositorio y el entorno real.

Este documento existe porque el proyecto vive en **varios entornos a la vez**
(Windows, WSL, GitHub Actions, mGBA, Vite, Tauri) y "en mi PC funciona" ya ha
costado tiempo.

---

## Autoridades por entorno

| Entorno | Responsabilidad |
| --- | --- |
| **Windows** | Desktop/Tauri real, build NSIS, QA de producto |
| **WSL (Linux)** | desarrollo, scripts, análisis ROM, tooling, verificación |
| **GitHub Actions** | integración y release reproducibles |
| **mGBA / libmgba** | evidencia ROM y traces |
| **Vite dev server (`:5178`)** | desarrollo de frontend **únicamente** |
| **Tauri release build** | comportamiento real del producto |

---

## Reglas de frontera

```text
Browser dev        ≠  Desktop release
ROM trace          ≠  Embedded ROM Mode
GitHub main        ≠  working tree local si existe WIP
```

Consecuencias prácticas:

- Que algo se vea bien en el navegador **no** prueba que se vea bien en el
  instalador. El juicio de producto es el build de Tauri.
- `tools/rom-trace` produce **evidencia**; la app **no** ejecuta una ROM
  (ver `ROM_EXECUTION_MODES.md`).
- Un `verify:*` verde en local sobre un árbol con cambios sin commitear **no**
  equivale a main verde.

---

## Versiones y fijado

| Herramienta | Valor real observado | Fijado |
| --- | --- | --- |
| Node — WSL local | `v24.20.0` | `.nvmrc` |
| npm — WSL local | `11.19.0` | `packageManager` en `package.json` |
| Node — **release CI** | **22** (`release-desktop.yml`) | workflow |
| Rust — release CI | `stable` (`dtolnay/rust-toolchain@stable`) | ⚠️ ver abajo |
| Tauri CLI | `@tauri-apps/cli ^2.11.4` | `package-lock.json` |
| Tauri (Rust) | `tauri = "2"` | `src-tauri/Cargo.lock` ⚠️ |

### ⚠️ Divergencias conocidas (no resueltas, no ocultadas)

1. **Node: 22 en la CI de release vs 24 en WSL.**
   El artefacto que se envía (NSIS) se construye con **Node 22**; el desarrollo
   local corre con **24**. Ambos pasan `verify:ci` hoy, pero es una divergencia
   real: el entorno que **produce el release** es la autoridad.
   *Recomendación*: alinear el desarrollo local a 22, o subir la CI a 24 — pero
   con una sola versión, decidida explícitamente.

2. **`src-tauri/Cargo.lock` no está presente.**
   Un proyecto Tauri debería commitear su `Cargo.lock` para builds reproducibles
   (fija las versiones transitivas de Rust). **No se puede generar desde WSL
   porque `cargo` no está instalado aquí** — hay que generarlo en un entorno con
   Rust (Windows o la CI) y commitearlo. **No se ha inventado un lockfile.**

3. **`rust-toolchain.toml` no existe.**
   La CI usa `stable`. Fijar el canal/versión de Rust es una decisión que debe
   tomarse en el entorno que compila (no se puede verificar desde WSL).

---

## Comandos por entorno

```text
WSL (desarrollo y verificación)
  npm run dev                → Vite en :5178 (solo desarrollo)
  npm run verify:ci          → suite completa
  npm run verify:desktop-offline → contrato desktop/offline

Windows (producto)
  npm run desktop:dev        → tauri dev
  npm run desktop:build      → verify:release-content && tauri build --bundles nsis

GitHub Actions
  verify.yml                 → integración
  release-desktop.yml        → tag v* → NSIS + draft release (Node 22, Rust stable)
```
