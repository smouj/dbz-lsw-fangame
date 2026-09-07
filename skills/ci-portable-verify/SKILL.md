---
name: "ci-portable-verify"
description: "GitHub CI red while verify:ci passes locally (generated/ignored asset missing) — mirror sibling verifier guard, validate in clean worktree."
---

# CI roja en GitHub pero verify:ci verde local (gate portable sobre assets no commiteados)

## Cuándo
- Un push a main deja la GitHub Action `verify` roja en el step "Portable verification suite (verify:ci)" mientras los gates pasan en local con los assets generados presentes.
- Causa típica: un commit añadió a la cadena `verify:ci` (package.json) un verifier que exige archivos generados que `.gitignore` excluye del repo (p.ej. PNGs físicos bajo `public/assets/sprites/*/physical/` y su `rom-physical.manifest.json`). CI solo tiene datos commiteados (metadata como `provenance.json`), así que el gate no puede pasar nunca: rojo crónico en cada push.
- `verify:ci` es la suite portable: debe pasar solo con datos commiteados. Los verifiers que necesitan el .gbc/decomp viven en `verify:rom-local` y no corren en el runner.

## Pasos
1. Confirma el run rojo y el step: `gh run list --limit 10` y `gh run view <run-id>` → job `checks` con el step "Portable verification suite (verify:ci)" en rojo = clase portable. Criterio: sabes qué job/step falla y en qué commit.
2. Localiza qué gate falla y desde cuándo: en el log del step busca el primer `FAIL (n)` o `✖` con contexto (marcador + nº de fallos, p.ej. `FAIL (1193) ... PNG missing`). Para el commit que rompió la cadena: `git log -S '<gate>' --oneline -- package.json` y compáralo con la última run verde (`gh run list --limit 25`). Criterio: mensaje exacto del gate y commit introductor.
3. Extrae el error real: `gh run view <run-id> --log-failed` puede devolver vacío en este entorno; entonces usa `gh api repos/<owner>/<repo>/actions/jobs/<job-id>/logs > ci.log` y mira las líneas alrededor del fallo. Criterio: log local con el error.
4. Distingue asset-gate de regresión: corre el gate local (`npm run <verify:*>` o `npx tsx scripts/<verifier>.ts`). Si local PASS (mismo nº de checks de siempre, p.ej. 74,456) y CI FAIL con "missing/ignored" → clase "verifier portable sobre exports no commiteados". Criterio: local PASS + CI FAIL en el mismo gate.
5. Verifica qué está commiteado: `git ls-files <ruta> | wc -l` y `git check-ignore <archivo-que-falta>` + revisa `.gitignore`. Si los archivos que faltan están ignorados por diseño y solo la metadata está commiteada → los exports no se commitean a propósito. Criterio: sabes exactamente qué hay y qué no hay en el repo.
6. Replica el guard del verifier gemelo: busca en `scripts/` el patrón canónico ya existente (flag `process.env.REQUIRE_ROM_PHYSICAL_EXPORTS === '1'`, probe `existsSync()` de un marcador ignorado, mensaje `SKIP ... set <VAR>=1 ... for the strict local gate`). Añade al verifier que falla: mismo flag, mismo probe (`strict = probe || flag`), SKIP log cuando `!strict`, y envuelve con `if (!strict) continue;` SOLO el bloque dependiente de los exports (existencia/píxeles/hashes de PNG). Los checks sobre datos commiteados (schema, resumen, rutas de consumers) se quedan siempre activos. Criterio: diff mínimo con el mismo estilo que el gemelo.
7. Valida la ruta estricta local: corre el gate → mismo resultado PASS y mismo nº de checks que antes del cambio. Criterio: gate local intacto.
8. Valida la ruta CI sin tocar GitHub: commitea el fix; `git worktree add <dir-hermano> HEAD` (el checkout nuevo no tiene los assets ignorados = estado CI), `ln -s <repo>/node_modules <worktree>/node_modules`, corre el gate desde el worktree → mensaje SKIP + PASS con solo los checks commiteados. Limpia con `git worktree remove --force <dir>`. Criterio: SKIP + exit 0 en worktree limpio.
9. Push y cierra el loop: `git push origin main`; toma el run nuevo de `gh run list --limit 1` y espera `gh run view <run-id>` con `✓ checks` (~3 min). Si otro gate de la cadena falla por la misma clase de asset, repite desde el paso 4: un fix por clase. Criterio: run de GitHub verde.
10. Si la resolución no es obvia (guard vs commitear assets vs quitar el gate de la cadena), pregunta al owner con `ask_user` (opción recomendada primero: guard como el gemelo) antes de cambiar semántica de gates. Criterio: decisión tomada por el owner.

## Pitfalls
- No arregles commiteando los assets generados ni quitando su entrada de `.gitignore` sin decisión del owner: se regeneran a menudo y crearían ruido de diff perpetuo.
- No debilites el gate local: el guard solo actúa cuando los exports no existen en disco (CI); con exports presentes la ruta estricta sigue corriendo entera.
- `gh run view --log-failed` vacío no significa que no haya logs: usa `gh api repos/<owner>/<repo>/actions/jobs/<job-id>/logs`.
- No intentes correr en CI los verifiers dependientes de ROM; esa parte vive en `verify:rom-local`, fuera del runner portable.
