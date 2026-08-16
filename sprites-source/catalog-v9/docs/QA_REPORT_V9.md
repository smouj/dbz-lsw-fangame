# QA REPORT V9

## Controles ejecutados
1. Copia de cada PNG desde la fuente canónica V7/V8.
2. Normalización de transparencia: cualquier píxel con alpha=0 se reescribe a `(0,0,0,0)`.
3. Exportación dual:
   - frame atómico numerado
   - alias semántico por bucket
4. Generación de spritesheets transparentes:
   - `atomic_sheet.png`
   - `by_bucket/<bucket>.png`
5. Copia de `contact_sheet` fuente cuando existe para revisión visual.
6. Auditoría final de transparencia por forma runtime.
7. Política de orientación: **solo exportación canónica hacia la derecha**; no se generan espejos.

## Resultado global
- formas runtime: 42
- frames: 1952
- hidden RGB pixels after export: 0
- transparencia: OK

## Limitación honesta
La verificación de orientación se aplica como **política de exportación**: se preserva la orientación de la fuente canónica y no se crean variantes mirroring. El paquete incluye `source_contact_sheet.png` por forma para revisión visual rápida.
