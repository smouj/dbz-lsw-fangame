# DBZ LSW — Beta 0.1

Beta 0.1 congela el núcleo jugable alrededor de fallos observables. La
arqueología ROM que no cambia la jugabilidad, el ritmo perceptible, la
identidad visual ni la estabilidad pasa a un backlog posterior y no abre
nuevas investigaciones por iniciativa propia.

## Contrato de aceptación

La preparación de Beta se comprueba con:

```powershell
npm run verify:beta-readiness
```

El gate reúne cuatro condiciones:

1. **Partida completa:** 1v1 y 2v2 llegan a KO, resultados y reservas correctas.
2. **Familias de combate:** Damage, Beam, Stage, Support, Defense, Limit,
   Chara y especiales representativos están cubiertos por los verificadores de
   producción existentes.
3. **Visual:** no hay fallos de frame físico, clipping o ruta visual marcada
   como `FAIL`. Un bloqueo de fidelidad ROM explícito no se disfraza de éxito.
4. **Estabilidad:** una sesión llega a KO, el rematch crea un runtime nuevo y
   no aparece softlock, estado corrupto o residuo de la partida anterior.

La comprobación no sustituye la revisión manual final en navegador para una
build de distribución; sí evita que una deuda de investigación interna se
confunda con un fallo de Beta.

## Política después del corte

No se abre una nueva investigación ROM salvo que jugando se observe al menos
una de estas condiciones:

- una acción se rompe o queda bloqueada;
- el timing perceptible es incorrecto;
- aparece el personaje, frame, FX o plano equivocado;
- hay clipping visual grave;
- se produce un softlock, crash o estado incorrecto.

Los demás casos permanecen en el inventario generado de [rom-pending-cues.md](rom/audit/rom-pending-cues.md)
como `POST-BETA ROM FIDELITY BACKLOG`. Nunca se cierran mediante `sequence 0`,
poses semánticas, PNGs externos, similitud visual ni condiciones por nombre de
carta.

## Evidencia actual

- `verify:full-battle-e2e`: 88 comprobaciones, 0 fallos.
- `verify:battle-session-lifecycle`: KO y rematch reproducibles, 0 softlocks.
- `verify:visual-production-gate`: 44 PASS, 0 FAIL; los bloqueos ROM quedan
  explicitados por el gate existente.
- `verify:rom-sprite-atlas`: 2.057 identidades físicas, 1.913 frames únicos,
  16.525 usos, 0 frames rotos o sin resolver.

La fidelidad ROM pendiente sigue siendo visible y trazable; no bloquea la Beta
mientras no provoque un fallo observable cubierto por este contrato.
