# DBZ LSW Fangame

Remake web fiel de *Dragon Ball Z: Legendary Super Warriors* (GBC) — sistema de combate por cartas, sprites auténticos extraídos de la ROM USA (CRC32 `025AA88A`), estilo magazine GBC.

**Repo privado** · Proyecto de desarrollo en curso.

## 🚀 Cómo ejecutar

```bash
npm install
npm run dev        # dev server en http://localhost:5178
npm run build      # build de producción
npm run typecheck  # chequeo de tipos TypeScript
```

## 🧱 Stack

- **Vite 6 + React 19 + TypeScript**
- Sprites/retratos/iconos extraídos de la ROM (ver `dbz-lsw-decomp/`)
- Audio GBC sintetizado con Web Audio API (sin archivos externos)
- Persistencia local: mazos, progreso de historia e idioma

## 📁 Estructura

| Ruta | Contenido |
|---|---|
| `src/data/cards.ts` | 125 cartas reales de la ROM (nombres, stats, tipos verificados) |
| `src/data/roster.ts` | 23 personajes / 48 formas con sheets auténticos |
| `src/data/icons.ts` | Mapeo iconos de carta + retratos de menú/mini |
| `src/i18n/` | Traducciones (10 idiomas) + contexto de idioma |
| `src/audio/sfx.ts` | 18 SFX sintetizados estilo chip GBC |
| `public/assets/` | Sheets, retratos, iconos, fondos extraídos |
| `docs/` | Planes y estado del desarrollo |

## 🌍 Idiomas soportados (10)

English · Español · Français · Deutsch · Português · Italiano · 中文 · 日本語 · 한국어 · Русский

El idioma se cambia en **Settings → Language** y se guarda en `localStorage` (`dbzlsw_lang`).

## 🗺️ Estado del desarrollo

### ✅ Completado
- Menú principal (7 opciones), Story con 8 capítulos y progresión
- Battle Mode (Versus) con 23 personajes seleccionables
- Combate por turnos: posición (aire/tierra × frente/atrás), comandos LIMIT/J/B/C, CC
- 125 cartas reales de la ROM (nombres/stats verificados contra la ROM USA)
- Sheets de personajes byte-idénticos a la ROM (48/48 verificados)
- Iconos de carta, retratos de menú (131) y mini (19) de la Sprite Database
- Mazo persistente (20 cartas) con validación (FIGHT bloqueado si ≠ 20), colección de cartas
- EXP/niveles: subida de stats (+HP/STR/KI/SPD) al ganar, persistencia `dbzlsw_progress`
- Audio GBC sintetizado (18 SFX) + settings de volumen/SFX
- i18n completo en 10 idiomas con selector en Settings
- Repo GitHub privado creado

### ⏳ Pendiente
- ⚠️ Verificación visual del mapeo retratos/iconos (contact sheets: `public/assets/portraits/menu_contact.png`, `cards/contact_sheet.png`, `portraits/mini_contact.png`)
- Extraer overworld sprites (extractor listo: `scripts/extract_overworld.py`)
- Transformaciones animadas (aura + flash + palette swap)
- Transformaciones animadas (aura + flash + palette swap)
- BGM real (GBS 20 pistas → WAV/MP3)
- Más personajes con animación completa (solo goku/vegeta con `battleId`)
- Fondo de batalla/menú más profesional con temática Dragon Ball
- Verificación visual del estilo magazine por el usuario

## 🔑 localStorage keys

| Key | Uso |
|---|---|
| `dbzlsw_deck` | Mazo de 20 cartas |
| `dbzlsw_story_progress` | Capítulo desbloqueado más alto |
| `dbzlsw_lang` | Idioma seleccionado |

## ⚖️ Legal

Este proyecto es un **fan remake educativo sin ánimo de lucro**. Dragon Ball Z y sus personajes son © Bird Studio / Shueisha / Toei Animation. Los sprites provienen de ROMs propias y de archivos públicos de referencia (Sprite Database / Spriters Resource) para investigación. El código y las mecánicas son originales; no se distribuye la ROM.
