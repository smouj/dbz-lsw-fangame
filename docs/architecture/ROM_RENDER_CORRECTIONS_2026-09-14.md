# Correcciones de render ROM — 2026-09-14

## Origen de frames físicos

El manifiesto físico exporta `originInTrimX/Y`, verificado contra el ensamblaje
del metasprite. `AtlasLoader` conserva ese origen por physicalId y archivo.
`FighterActor` lo convierte al anchor de la textura actual: el origen del objeto
ROM permanece fijo aunque cambie el tamaño o la asimetría del recorte. El espejo
del lado transforma conjuntamente la geometría y el offset. Las poses de
compatibilidad recuperan su anchor histórico al recibir `setPose`.

Los tests cambian entre dos recortes asimétricos y comprueban la posición del
origen para ambos lados, incluida la vuelta a una pose semántica.

## Fondos y FX físicos

Durante una partida de navegador, Full Spirit generaba un aviso de caché para
`/assets/rom-bg/bg19-p30.png`. Pixi 8 no carga un archivo mediante
`Texture.from(url)`: requiere una textura previamente cargada.

La inicialización de presentación espera ahora la precarga de las URLs de los
catálogos generados de BG y FX. La capa consulta la caché antes de asignarlas;
si falta una textura, queda vacía sin inventar un sustituto. Las imágenes usan
nearest-neighbour, compartiendo la caché de texturas existente.

Los bordes verdes, anotaciones de estado y oscurecimiento de diagnóstico de
`RomDisplayLayer` quedan desactivados por defecto. Un consumidor de inspección
puede solicitar diagnósticos explícitos con el tercer argumento del constructor.
DISPLAY_CLEAR oculta también la composición física BG.

Estas correcciones no constituyen una certificación visual de todas las cartas.
Los pendientes de traza ROM conservan su estado y procedencia.
