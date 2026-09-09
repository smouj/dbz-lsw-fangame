# P0.2A — AnimationSlot8 actor selectors

ROM canónica: Spain SHA-256 `bd1df5d6653be9e262f96db3bcdd7bb8ae0cad6186c16f8c1e8eba3f091c8804`.

## Cadena demostrada

La selección defensiva obtiene `AnimationResource` del byte `+6` de la carta y lo precarga en Slot8 (`01:$76CF-$76E8`). El consumo ocurre en `03:$60B2` para Taiyoken (`CA83 & $01`) y en `03:$59FD` para Barrier/Breath (`CA53=3`). Ambos llaman al start con objeto lógico 1, Slot8 y flags `$A0`.

Antes del start, `$3966` (cuerpo banked `7E:$72CE-$72F9`) multiplica el recurso por dos, toma su puntero en `Bank30:$6900`, obtiene `actorVisualProfileKey` mediante `$3B8C → $2B90 → $2B65`, recorre filas de cuatro bytes y escribe la secuencia de la primera coincidencia en `C3C7`. El start copia `C3C7` al opcode `$01`. Esta es evidencia `ROM_STATIC_VERIFIED`; no se usa similitud visual ni pose semántica.

## Resultado

- **Barrier #45 / resource $24: CLOSED.** Seis perfiles compatibles resuelven secuencias 0, 1 o 2 mediante filas ROM verificadas.
- **Breath #53 / resource $27: CLOSED.** Recoome usa secuencia 0; los cinco perfiles Buu usan secuencia 1.
- **Taiyoken #19 / resource $26: PENDING_ROM_TRACE.** Once perfiles compatibles tienen fila probada (secuencias 0/1/2), pero `ginyu` usa profile `$1B` y no existe esa clave desde el puntero de `$26` hasta el final físico de la tabla en `30:$6D28`. No se adopta la coincidencia accidental posterior en datos ajenos. Se necesita capturar `$2B65/$3966/$60B2` con Ginyu base para demostrar si esa combinación es inalcanzable o usa otra identidad.

`ROM_DEFENSE_SLOT8_SEQUENCE_SELECTORS` es la SSOT compartida por el binding, el selector runtime y `ProductionFrameResolver`. El gate `verify:animation-slot8-selectors` contrasta cada fila contra la ROM y exige un frame físico resoluble.

STOP permanece bajo `ActionObjectRuntime`: `$08 STOP_HIDE_OBJECT` implica `active=false` y `visible=false`; este slice no altera binding ni lifecycle.
