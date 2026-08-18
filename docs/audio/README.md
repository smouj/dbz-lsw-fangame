# Dragon Ball Z: Legendary Super Warriors (GBC) — Audio Extraction V1

Fuente analizada: ROM aportada por el usuario. La ROM NO se incluye en este paquete.

## Resultado

- 85 IDs de efectos de sonido (`0x00`–`0x54`) extraídos de la tabla `SE` del banco ROM `0x79`.
- 85 secuencias binarias originales, 85 trazas de escrituras APU, 85 ficheros VGM y 85 WAV de escucha.
- 45 efectos usan el canal 2 de pulso y 40 usan el canal 4 de ruido en la reproducción aislada observada.
- ID 11 no alcanza el marcador de fin en 600 actualizaciones y se marca como candidato a sonido sostenido/loop; los otros 84 finalizan de forma natural dentro de la ventana probada.
- Los IDs 37 y 41 contienen secuencias binarias idénticas.

## Qué es exacto y qué es una renderización

`raw_sfx_sequences/` son bytes de secuencia tomados directamente de la ROM.

`apu_traces/` registra las escrituras que produce el driver original en FF10–FF3F al ejecutar cada ID mediante la propia rutina del juego.

`vgm_sfx/` traduce esas escrituras al formato VGM (comando Game Boy DMG), manteniendo el flujo de registros y el timing por actualización GBC. Es el formato recomendado para preservación/reproducción con un emulador APU compatible.

`wav_sfx_44100_mono/` es una renderización de conveniencia realizada con el renderizador incluido. Sirve para audición e integración rápida, pero NO se declara bit-perfect respecto al DAC analógico de una Game Boy Color.

## Driver localizado

- Código común de audio: bancos `0x75`–`0x79` (y utilidades asociadas en `0x7A`).
- Inicialización observada: banco `0x75`, rutinas `0x4015` / `0x4067`.
- Actualización por frame: dirección banked `0x41B0`, invocada por la envoltura de banco 0 en `0x0319`.
- Banco de efectos: `0x79`.
- Encabezado SE: CPU `0x5000`.
- Tabla de punteros: CPU `0x5004`.
- Primer puntero: `0x00AE`; esto fija estructuralmente 85 entradas (`(0xAE-4)/2`).
- Solicitud de SFX pendiente: RAM `0xC878`.
- Rutina que consume/inicia el ID: banco `0x79:0x4120`.

## Integración recomendada

Usar `runtime_sfx_manifest.json` y mantener de momento claves estables `gbc_sfx_000` ... `gbc_sfx_084`. No cambiar el ID por un nombre como `punch` o `beam` hasta verificarlo contra la acción real del juego. `AUDITION_INDEX.html` permite escuchar los 85 WAV tras descomprimir el paquete.

## Identidad de la ROM analizada

SHA-256: `8dab48cc81d14bcee7c73274df09cf5c4dd44c3b93d10a5a3175e04fead25dee`
MD5: `ac46bc779e1e844674de1d4c13d06f96`
Tamaño: 2,097,152 bytes
Cabecera: `I-DBZ-US`
