// ═══════════════════════════════════════════════════════════════════════
// EXPORT Assets_DBZ v2 — organiza TODOS los assets por personaje en
// [local-user]\Desktop\Assets_DBZ\ (o destino indicado por --out)
//
// Estructura por personaje (orden del roster):
//   NN_Nombre/
//     frames/<form_id>/      → sprites del manifest (PNGs + manifest.json)
//     retratos/battle/       → retrato de combate por forma
//     retratos/mini/         → mini retrato (si existe)
//     retratos/menu/         → retrato de menú (si existe)
//     retratos/story/        → retratos de diálogo por saga (si existen)
//     overworld/panel/       → chibi *_ow.png por forma
//     overworld/battle/      → battle overworld (actor/effects) por forma
//     sheets/                → sprite sheet ROM (+ json) por forma
//
// Adicional: Sheets/ (global) → todos los sheets de todos los personajes
// y formas, bien nombrados (form_id) y correctos.
//
// Uso:  npx esbuild --bundle --format=esm --platform=node
//       scripts/export-assets-dbz.ts --outfile=.export.mjs && node .export.mjs
// ═══════════════════════════════════════════════════════════════════════
import { copyFileSync, mkdirSync, existsSync, readdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS, FORMS } from '../src/data/roster';
import { OVERWORLD_FILES } from '../src/data/overworld';
import { BATTLE_PORTRAITS } from '../src/data/battlePortraits';
import { MINI_PORTRAITS, MENU_PORTRAITS } from '../src/data/icons';
import { STORY_PORTRAITS, storyPortraitUrl } from '../src/data/storyPortraits';

// ═══ Mapping battle overworld (canónico — copia de battleOverworld.ts) ═══
// formIdToCharFormSync no se puede importar en Node (usa import de Vite).
const BATTLE_OW_MAP: Record<string, [string, string]> = {
  'goku_base': ['goku', 'base'], 'goku_ssj': ['goku', 'super_saiyan'], 'goku_ssj3': ['goku', 'super_saiyan_3'],
  'vegeta_base': ['vegeta', 'base'], 'vegeta_ssj': ['vegeta', 'super_saiyan'], 'vegeta_majin': ['vegeta', 'super_saiyan'],
  'piccolo_base': ['piccolo', 'base'], 'krillin_base': ['krillin', 'base'], 'frieza_final': ['frieza', 'base'],
  'cell_jr': ['cell_jr', 'base'], 'android_16': ['android_16', 'base'], 'android_17': ['android_17', 'base'],
  'android_18': ['android_18', 'base'], 'android_19': ['android_19', 'base'], 'android_20': ['android_20', 'base'],
  'ginyu': ['captain_ginyu', 'base'], 'recoome': ['recoome', 'base'], 'guldo': ['guldo', 'base'],
  'jeice': ['jeice_burter', 'jeice'], 'burter': ['jeice_burter', 'burter'],
  'buu_base': ['majin_buu', 'fat_buu'], 'buu_super': ['majin_buu', 'super_buu'], 'buu_kid': ['majin_buu', 'kid_buu'],
  'gotenks_ssj': ['gotenks', 'super_saiyan'], 'vegito_ssj': ['vegito', 'base'],
  'buu_gohan': ['majin_buu', 'gohan_absorbed'], 'buu_gotenks': ['majin_buu', 'gotenks_absorbed'],
  'cell_imperfect': ['cell', 'imperfect'], 'cell_perfect': ['cell', 'perfect'], 'cell_semi': ['cell', 'semi_perfect'],
  'trunks_future': ['future_trunks', 'base'], 'trunks_ssj': ['future_trunks', 'super_saiyan'],
  'ginyu_goku': ['ginyu', 'gokus_body'], 'gohan_adult_ssj': ['gohan_adult', 'super_saiyan'],
  'gohan_adult_ssj2': ['gohan_adult', 'super_saiyan'], 'gohan_adult_ultimate': ['gohan_adult', 'ultimate'],
  'goku_ssj2': ['goku', 'super_saiyan_2'], 'goten_base': ['goten', 'base'], 'goten_ssj': ['goten', 'super_saiyan'],
  'gotenks_ssj3': ['gotenks', 'super_saiyan_3'], 'trunks_kid_ssj': ['kid_trunks', 'super_saiyan'],
  'nappa': ['nappa', 'base'], 'trunks_kid': ['trunks_kid', 'base'], 'gohan_young': ['young_gohan', 'base'],
  'gohan_young_ssj': ['young_gohan', 'super_saiyan'], 'gohan_young_ssj2': ['young_gohan', 'super_saiyan_2'],
};
function battleOwPair(formId: string): { char: string; form: string } | null {
  const p = BATTLE_OW_MAP[formId];
  return p ? { char: p[0], form: p[1] } : null;
}

// ─── Resolución de rutas de proyecto ───────────────────────────────────
const ROOT = process.cwd();
const PUB = join(ROOT, 'public', 'assets');

// ─── Destino ───────────────────────────────────────────────────────────
const OUT = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : '/mnt/c/Users/local-user/Desktop/Assets_DBZ';

// Alias de personajes para mini/menu portraits (el roster usa gohan_kid/
// gohan_adult/trunks_kid/trunks_future pero los mapas de iconos usan
// gohan/trunks). Mismo alias que storyPortraitUrl.
const ICON_ALIAS: Record<string, string> = {
  gohan_kid: 'gohan', gohan_adult: 'gohan',
  trunks_kid: 'trunks', trunks_future: 'trunks',
};

// Claves extra de story portraits para personajes compuestos
const EXTRA_STORY_KEYS: Record<string, string[]> = {
  buu: ['majin_buu', 'fat_buu', 'kid_buu'],
};

function cp(src: string, dest: string, log: string[]): boolean {
  if (!existsSync(src)) return false;
  mkdirSync(dirname(dest), { recursive: true });
  try {
    copyFileSync(src, dest);
    log.push(dest.replace(OUT + '/', ''));
    return true;
  } catch {
    return false;
  }
}

function copyDir(srcDir: string, destDir: string, log: string[]): number {
  if (!existsSync(srcDir)) return 0;
  let n = 0;
  for (const f of readdirSync(srcDir)) {
    const s = join(srcDir, f);
    const st = statSync(s);
    if (st.isDirectory()) {
      n += copyDir(s, join(destDir, f), log);
    } else {
      if (cp(s, join(destDir, f), log)) n++;
    }
  }
  return n;
}

const report: string[] = [];
let totalFiles = 0;

// ═══ Limpieza previa (re-export limpio) ═════════════════════════════════
if (existsSync(OUT)) {
  rmSync(OUT, { recursive: true, force: true });
  report.push(`(limpiado ${OUT})`);
}
mkdirSync(OUT, { recursive: true });

// ═══ Export por personaje ──────────────────────────────────────────────
const SHEETS_GLOBAL = join(OUT, 'Sheets');
mkdirSync(SHEETS_GLOBAL, { recursive: true });
const seenSheets = new Set<string>(); // para no duplicar en Sheets/ global

CHARACTERS.forEach((c, ci) => {
  const idx = String(ci + 1).padStart(2, '0');
  const base = join(OUT, `${idx}_${c.name.replace(/[^\w]+/g, '_')}`);
  mkdirSync(base, { recursive: true });
  let files = 0;

  const storyKey = ICON_ALIAS[c.id] ?? c.id;
  const storyKeys = [storyKey, ...(EXTRA_STORY_KEYS[c.id] ?? [])];

  // Carpeta global de sheets por personaje
  const sheetsGlobalChar = join(SHEETS_GLOBAL, `${idx}_${c.name.replace(/[^\w]+/g, '_')}`);
  mkdirSync(sheetsGlobalChar, { recursive: true });

  for (const formId of c.forms) {
    const f = FORMS[formId];
    if (!f) continue;

    // ── frames/<form_id>/ (todo el dir de sprites) ──
    const spriteDir = join(PUB, 'sprites', formId);
    if (existsSync(spriteDir)) {
      files += copyDir(spriteDir, join(base, 'frames', formId), report);
    }

    // ── retratos/battle/<form_id>.png ──
    const battlePortrait = BATTLE_PORTRAITS[formId];
    if (battlePortrait) {
      const src = join(PUB, battlePortrait.replace('/assets/', ''));
      if (cp(src, join(base, 'retratos', 'battle', `${formId}.png`), report)) files++;
    }

    // ── overworld/panel/<file> ──
    const owFile = OVERWORLD_FILES[formId];
    if (owFile) {
      const src = join(PUB, 'overworld', 'panel_sprites', owFile);
      if (cp(src, join(base, 'overworld', 'panel', owFile), report)) files++;
    }

    // ── overworld/battle/<char>/<form>/battle_overworld (mapping REAL) ──
    const bw = battleOwPair(formId);
    if (bw) {
      const full = join(PUB, 'overworld', 'battle', bw.char, bw.form, 'battle_overworld');
      if (existsSync(full)) {
        files += copyDir(full, join(base, 'overworld', 'battle', formId), report);
      }
    }

    // ── sheets/<form_id>.png + .json (nombre canónico form_id) ──
    if (f.sheet) {
      const sheetBase = f.sheet.replace('.png', '');
      const sheetSrc = join(PUB, 'sheets', f.sheet);
      const jsonSrc = join(PUB, 'sheets', `${sheetBase}.json`);
      const destSheet = join(base, 'sheets', `${formId}.png`);
      const destJson = join(base, 'sheets', `${formId}.json`);
      if (cp(sheetSrc, destSheet, report)) files++;
      if (cp(jsonSrc, destJson, report)) files++;
      // Sheets/ global — una copia por sheet único (evita duplicados)
      if (!seenSheets.has(f.sheet)) {
        seenSheets.add(f.sheet);
        cp(sheetSrc, join(sheetsGlobalChar, f.sheet), report);
        cp(jsonSrc, join(sheetsGlobalChar, `${sheetBase}.json`), report);
        // + copia nombrada por form_id para localizar fácil
        cp(sheetSrc, join(sheetsGlobalChar, `${formId}.png`), report);
        cp(jsonSrc, join(sheetsGlobalChar, `${formId}.json`), report);
      }
    }

    // ── retratos/story (por forma: resolución real del juego) ──
    const stUrl = storyPortraitUrl(c.id, formId);
    if (stUrl) {
      const src = join(ROOT, 'public', stUrl.replace(/^\//, ''));
      if (cp(src, join(base, 'retratos', 'story', formId, basename(src)), report)) files++;
    }
  }

  // ── retratos/mini + menu (a nivel personaje, con alias) ──
  const iconKey = ICON_ALIAS[c.id] ?? c.id;
  const mini = MINI_PORTRAITS[iconKey];
  if (mini) {
    const src = join(ROOT, 'public', mini.replace(/^\//, ''));
    if (cp(src, join(base, 'retratos', 'mini', basename(src)), report)) files++;
  }
  const menu = MENU_PORTRAITS[iconKey];
  if (menu) {
    const src = join(ROOT, 'public', menu.replace(/^\//, ''));
    if (cp(src, join(base, 'retratos', 'menu', basename(src)), report)) files++;
  }

  // ── retratos/story: TODAS las variantes mapeadas del personaje ──
  const seen = new Set<string>();
  for (const key of storyKeys) {
    const entry = STORY_PORTRAITS[key];
    if (!entry) continue;
    const push = (u?: string) => {
      if (!u || seen.has(u)) return;
      seen.add(u);
      const src = join(ROOT, 'public', u.replace(/^\//, ''));
      if (cp(src, join(base, 'retratos', 'story', 'variantes', basename(src)), report)) files++;
    };
    push(entry.base);
    for (const v of Object.values(entry.emotions ?? {})) push(v);
    for (const v of Object.values(entry.forms ?? {})) push(v);
  }

  // README de personaje
  const formList = c.forms.join(', ');
  writeFileSync(join(base, '_README.txt'),
    `${c.name} (id: ${c.id}) — ${c.forms.length} forma(s): ${formList}\n` +
    `Saga: ${c.saga} · Tier: ${c.tier}/5\n` +
    `Subcarpetas: frames/ retratos/ overworld/ sheets/\n`);
  report.push(`── ${idx}_${c.name}: ${files} archivos`);
  totalFiles += files;
});

// ─── README global ─────────────────────────────────────────────────────
const README = `ASSETS_DBZ — Export completo de assets por personaje (DBZ LSW)
================================================================
Generado desde dbz-lsw-fangame (manifest V9, sprites reorganizados, v2).

Estructura por personaje (NN_Nombre = orden del roster):
  frames/<form_id>/    → TODOS los frames del manifest de esa forma
  retratos/battle/     → retrato de combate por forma
  retratos/mini/       → mini retrato de combate (personajes con celda)
  retratos/menu/       → retrato de menú (personajes con celda)
  retratos/story/      → retratos de diálogo del GBC por saga
  overworld/panel/     → sprite chibi de overworld por forma (*_ow.png)
  overworld/battle/    → battle overworld (actor/effects) por forma
  sheets/              → sheet de la forma nombrado como <form_id>.png/.json

Sheets/ (global)       → TODOS los sheets de todos los personajes y formas,
                         organizados por personaje, con nombre ROM original
                         Y copia nombrada por form_id para localización fácil.

NOTA canon: goku_ssj2 usa los sprites de goku_ssj y ginyu_goku los de
goku_base (el ROM no tiene sprites propios de esas formas — mismo patrón
que gohan_adult_ssj2/vegeta_majin/piccolo_kami/evil).

Total de formas: ${Object.keys(FORMS).length} · Personajes: ${CHARACTERS.length}
`;

writeFileSync(join(OUT, 'README.txt'), README);
report.push(''); report.push(`TOTAL: ${totalFiles} archivos en ${CHARACTERS.length} personajes → ${OUT}`);
console.log(report.join('\n'));
