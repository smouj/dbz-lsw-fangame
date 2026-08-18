# Mapa técnico del audio

La ROM replica el núcleo del driver en varios bancos. La extracción V1 usa el banco SE 0x79 y ejecuta el driver original con un emulador LR35902 mínimo instrumentado para registrar escrituras al APU.

## Tabla SE

En 0x79:5000 aparece el encabezado `53 45 A4 00` (`SE`). El dato determinante para el número de entradas es el primer puntero de la tabla, `0x00AE`, no el valor `0x00A4` del encabezado. Como la tabla empieza en offset relativo 4 y cada puntero ocupa dos bytes, `(0xAE - 4) / 2 = 85`. Los 85 punteros son estrictamente crecientes hasta el comienzo de los datos de secuencia.

## Camino de reproducción observado

1. El juego inicializa el driver en 0x75.
2. Para un efecto, el ID pendiente se coloca en C878.
3. La actualización de audio por frame entra por la envoltura en ROM0:0319.
4. La envoltura selecciona el banco de driver y ejecuta 41B0.
5. El driver selecciona 0x79 para SE; si C878 != FF, llama a 0x79:4120.
6. 4120 consume el ID, consulta 0x79:5004 + ID*2, posiciona el cursor de secuencia y limpia C878 a FF.
7. Las secuencias generan escrituras en los registros Game Boy APU.

La clasificación semántica (golpe, beam, confirmación de menú, explosión, etc.) NO se inventa en V1: requiere correlacionar cada ID con su call-site/gameplay o verificar auditivamente en contexto.
