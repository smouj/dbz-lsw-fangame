DBZ LSW SPRITES RECUT V6 CANONICAL
==================================

Esta versión sustituye la lógica “atómica” de V5 por una reconstrucción trazable
contra las hojas fuente.

ESTRUCTURA
- source_gif/                         GIF originales incluidos en el paquete recibido.
- source_sheets_png_transparent/      Conversión transparente validada.
- characters/<personaje>/<forma>/
  - frames/NNN.png                    Assets atómicos finales.
  - index.csv                         Coordenadas, tamaños y trazabilidad.
  - review/contact_sheet.png          Hoja visual para revisión rápida.
- manifest.csv / manifest.json        Índice canónico global.
- corrections_v6.csv                  Todo asset corregido/reasignado/recuperado.
- restored_v5_false_noise_drops.csv   6 sprites que V5 eliminó incorrectamente.
- AUDIT_REPORT_V6.txt                  Auditoría y validaciones.

IMPORTANTE
Los archivos NNN.png son assets atómicos ordenados por posición real en la hoja fuente.
No se fuerzan etiquetas como movement/beam/power cuando no se pueden demostrar de forma
fiable, evitando repetir errores de clasificación de versiones anteriores.

TOTAL FINAL: 1952 assets.
