// ═══════════════════════════════════════════════════════════
// DBZ LSW — Registro cinematográfico declarativo de las 125 cartas
// Fuente: docs/DBZ_LSW_INFORME_CINEMATICAS_125_CARTAS_V2.md (sección 10).
// Cada carta se construye SOBRE PLANTILLAS (T01–T12), nunca como máquina
// de estados independiente. Los datos son editables (contrato V2 §16).
// Generado 2026-08-17 — regenerar con el script de export si cambia la tabla.
// ═══════════════════════════════════════════════════════════

export type CardTemplate =
  | 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06'
  | 'T07' | 'T08' | 'T09' | 'T10' | 'T11' | 'T12';

export type CardAssetClass =
  | 'CORE_REUSE' | 'GENERIC_VARIANT' | 'GENERIC_UI' | 'UNIQUE_POSE'
  | 'UNIQUE_VFX' | 'UNIQUE_ATTACH' | 'UNIQUE_CINEMATIC' | 'UNIQUE_DUAL'
  | 'UNIQUE_UNKNOWN'
  | 'SUPPORT_SUMMON' | 'SUPPORT_COUNTER' | 'SUPPORT_GUARD'
  | 'ITEM_UI' | 'ITEM_TARGET' | 'ITEM_EQUIP' | 'ITEM_COUNTER' | 'ITEM_DUAL';

export interface CardCinematicSpec {
  /** Número de carta ROM 001–125. */
  id: number;
  name: string;
  mechanics: string;
  /** Plantilla(s) cinematográfica(s) T01–T12 (puede ser compuesta: T10+T05). */
  template: string;
  /** Clase de reutilización de assets. */
  asset: CardAssetClass;
  /** Directiva de animación (contrato del agente). */
  directive: string;
}

export const CARD_CINEMATICS: CardCinematicSpec[] = [
  { id: 1, name: '3 Stage Attack', mechanics: 'Command / Stage', template: 'T04', asset: 'CORE_REUSE', directive: "QTE global de 3 entradas; pose neutral durante inputs; al completar, rush + 3 contactos + remate/retorno. Fallo -> rama counterattack A/B." },
  { id: 2, name: '4 Stage Attack', mechanics: 'Command / Stage', template: 'T04', asset: 'CORE_REUSE', directive: "Igual a 001 con 4 entradas/contactos lógicos y ganancia de 4 CC." },
  { id: 3, name: '5 Stage Attack', mechanics: 'Command / Stage', template: 'T04', asset: 'CORE_REUSE', directive: "QTE global de 5 entradas; no reiniciar reloj por input; completar antes de iniciar la cadena física." },
  { id: 4, name: '6 Stage Attack', mechanics: 'Command / Stage', template: 'T04', asset: 'CORE_REUSE', directive: "QTE global de 6 entradas; variante máxima de la misma máquina de estados." },
  { id: 5, name: 'Cont. Punch', mechanics: 'Melee', template: 'T04', asset: 'CORE_REUSE', directive: "Combo universal de puñetazos: ready -> approach -> golpes repetidos -> contacto final -> reacción -> recover -> retorno." },
  { id: 6, name: 'Cont. Kick', mechanics: 'Melee', template: 'T04', asset: 'CORE_REUSE', directive: "Combo universal de patadas; mismo esqueleto que Cont. Punch, con clips de kick y contactos propios." },
  { id: 7, name: 'Energy Wave', mechanics: 'Beam', template: 'T05', asset: 'CORE_REUSE', directive: "Ataque energético universal: pose genérica -> carga breve -> release -> haz/onda -> resultado -> recover." },
  { id: 8, name: 'Energy Bomb', mechanics: 'Beam / Projectile', template: 'T06', asset: 'CORE_REUSE', directive: "Bola de energía universal: charge -> spawn en attachPoint de mano -> vuelo -> HIT/MISS/BLOCK/AVOID -> recover." },
  { id: 9, name: 'Special Card', mechanics: 'Special / Collection', template: 'T11', asset: 'UNIQUE_UNKNOWN', directive: "No forzar una cinemática de combate. Mostrar carta/UI y resolver solo si el efecto real está validado; actualmente tratar como PENDING-ROM." },
  { id: 10, name: 'Masenko', mechanics: 'Beam', template: 'T05', asset: 'GENERIC_VARIANT', directive: "Pose específica Masenko -> carga -> emisión -> viaje/haz -> impacto. Nunca sustituir por pose Kamehameha si existe sprite propio." },
  { id: 11, name: 'Dunk Shot', mechanics: 'Melee', template: 'T04', asset: 'UNIQUE_POSE', directive: "Rush físico exclusivo -> golpe/encadenado vertical -> slam/knockdown -> reacción -> retorno. Orden exacto de frames PENDING-ROM." },
  { id: 12, name: 'Kamehameha', mechanics: 'Beam', template: 'T05', asset: 'GENERIC_VARIANT', directive: "Pose Kamehameha -> carga -> beam_start -> HIT/MISS/BLOCK/AVOID -> recover." },
  { id: 13, name: 'S. Kamehameha', mechanics: 'Beam', template: 'T05', asset: 'GENERIC_VARIANT', directive: "Misma familia que Kamehameha con carga/efecto de mayor escala; conservar pose y VFX propios de la forma." },
  { id: 14, name: 'F. Kamehameha', mechanics: 'Team Beam', template: 'T10+T05', asset: 'UNIQUE_CINEMATIC', directive: "Acción de equipo Gohan/Goku: entrada de segundo actor -> preparación sincronizada -> emisión conjunta -> resultado -> retirada/retorno." },
  { id: 15, name: 'Sonic Kick', mechanics: 'Melee', template: 'T03', asset: 'GENERIC_VARIANT', directive: "Entrada rápida -> kick de alta velocidad -> contact -> hurt/knockback -> recover." },
  { id: 16, name: 'Resurrection', mechanics: 'Support / Heal', template: 'T08', asset: 'GENERIC_VARIANT', directive: "ACTION_SOLO: pose de recuperación -> aura/heal VFX -> resolve HP -> disipación -> retorno. En defensa el efecto mecánico puede ser menor." },
  { id: 17, name: 'S. Beam Cannon', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_POSE', directive: "Pose de dos dedos -> carga concentrada -> haz perforante -> resultado. Punto de emisión anclado a dedos." },
  { id: 18, name: 'F. Lightbomb', mechanics: 'Beam / Projectile', template: 'T06', asset: 'UNIQUE_POSE', directive: "Preparación propia -> esfera/masa de Ki -> lanzamiento -> viaje -> impacto. Forma visual exacta PENDING-ROM." },
  { id: 19, name: 'Taiyoken', mechanics: 'Defense / Avoid Melee', template: 'T12', asset: 'UNIQUE_POSE', directive: "Trigger defensivo -> pose Solar Flare -> flash de pantalla -> avoid_commit -> atacante falla -> retorno; no reproducir hurt." },
  { id: 20, name: 'Misty KiWave', mechanics: 'Beam', template: 'T05', asset: 'GENERIC_VARIANT', directive: "Cast -> onda/haz de Ki -> viaje -> resultado -> recover." },
  { id: 21, name: 'Destruc-Disk', mechanics: 'Beam / Disc', template: 'T07', asset: 'UNIQUE_VFX', directive: "Crear disco separado -> giro/estela -> vuelo -> corte o salida -> resultado; no pegar disco al cuerpo." },
  { id: 22, name: 'S. Destruc-D.', mechanics: 'Beam / Disc', template: 'T07', asset: 'UNIQUE_VFX', directive: "Variante reforzada de Destructo Disk: mismo pipeline con disco/estela/impacto de mayor intensidad." },
  { id: 23, name: 'Kaio Ken', mechanics: 'Support / Buff', template: 'T08', asset: 'UNIQUE_POSE', directive: "ACTION_SOLO: activación -> aura roja/pulsos -> resolve buff -> estado persistente. No tratar como ataque." },
  { id: 24, name: 'Spirit Bomb', mechanics: 'Beam / Projectile', template: 'T06', asset: 'UNIQUE_CINEMATIC', directive: "Carga especial prolongada -> esfera sobre actor -> release -> viaje -> impacto/explosión -> recover; mantener esfera como entidad independiente." },
  { id: 25, name: 'Solid Shot', mechanics: 'Melee', template: 'T04', asset: 'UNIQUE_POSE', directive: "Combo exclusivo de puñetazo/patada -> varios contactos -> remate -> reacción -> retorno." },
  { id: 26, name: 'Teleport', mechanics: 'Defense / Avoid Beam', template: 'T12', asset: 'UNIQUE_VFX', directive: "Trigger -> desaparición/afterimage -> avoid_commit -> proyectil continúa/sale -> reaparición -> retorno." },
  { id: 27, name: 'Sup. Saiyan-2', mechanics: 'Support / Ki Up', template: 'T08', asset: 'GENERIC_VARIANT', directive: "Buff de Ki: pose de power-up/aura -> resolve Ki Up -> estado. No cambiar automáticamente de forma del personaje." },
  { id: 28, name: 'Sup. Saiyan-3', mechanics: 'Support / Strength Up', template: 'T08', asset: 'GENERIC_VARIANT', directive: "Buff de Strength: pose de power-up/aura -> resolve -> estado. No confundir con transformación jugable." },
  { id: 29, name: 'Tail', mechanics: 'Melee / Special', template: 'T08+T03', asset: 'UNIQUE_CINEMATIC', directive: "Cinemática exclusiva de Kid Gohan con Ōzaru: transformación/entrada especial -> ataque físico -> resolve -> salida/restauración. No reutilizar combo humano." },
  { id: 30, name: 'Galick-Ho', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_POSE', directive: "Pose Galick Gun -> carga -> haz -> resultado -> recover." },
  { id: 31, name: 'Big Bang Atk', mechanics: 'Beam / Projectile', template: 'T06', asset: 'UNIQUE_POSE', directive: "Pose de una mano -> esfera/descarga -> lanzamiento -> vuelo -> impacto." },
  { id: 32, name: 'Final Flash', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_POSE', directive: "Preparación a dos manos -> carga -> haz de gran escala -> impacto -> recover." },
  { id: 33, name: 'Suicide', mechanics: 'Beam / Self Explosion', template: 'T08+T06', asset: 'UNIQUE_CINEMATIC', directive: "Carga corporal -> explosión radial -> resultado enemigo -> resolve propio dejando al usuario a 1 HP -> cleanup. Resolver HP propio después del evento ofensivo." },
  { id: 34, name: 'Rising Kick', mechanics: 'Melee', template: 'T03', asset: 'UNIQUE_POSE', directive: "Aproximación/ascenso -> patada vertical -> launch reaction -> aterrizaje/recover." },
  { id: 35, name: 'Burning Atk.', mechanics: 'Beam / Projectile', template: 'T06', asset: 'UNIQUE_POSE', directive: "Precast con gestos propios -> carga -> projectile_spawn -> vuelo -> impacto." },
  { id: 36, name: 'Final Atk', mechanics: 'Beam / Projectile', template: 'T06', asset: 'UNIQUE_POSE', directive: "Perfil Finish Buster/Final Attack: pose propia de SS Trunks -> esfera/descarga -> resultado. Nombre visual según edición; no renombrar assets por intuición." },
  { id: 37, name: 'Flash Punch', mechanics: 'Melee', template: 'T03', asset: 'GENERIC_VARIANT', directive: "Rush corto -> puñetazo rápido -> contact -> reacción -> recover." },
  { id: 38, name: 'Kamekameha', mechanics: 'Beam', template: 'T05', asset: 'GENERIC_VARIANT', directive: "Variante de Goten: pose/cast propio -> haz -> resultado; conservar nombre de carta aunque la familia sea Kamehameha." },
  { id: 39, name: 'Galactica D.', mechanics: 'Beam / Bind', template: 'T09', asset: 'UNIQUE_VFX', directive: "Crear anillo/donut de energía -> vuelo -> bind visual sobre objetivo -> resolve daño/estado -> release/cleanup." },
  { id: 40, name: 'S. G. K. Atk', mechanics: 'Beam / Summoned Projectile', template: 'T10+T06', asset: 'UNIQUE_CINEMATIC', directive: "Super Ghost Kamikaze: spawn de fantasma(s) -> vuelo autónomo -> contacto -> explosión -> resultado -> cleanup." },
  { id: 41, name: 'BuuBall Slam', mechanics: 'Team / Special Defeat', template: 'T10+T04', asset: 'UNIQUE_CINEMATIC', directive: "Solo team: entrada/participación del compañero -> secuencia de lanzamiento/voleibol -> slam -> resultado -> ambos retornan." },
  { id: 42, name: 'Kiai', mechanics: 'Support / Guard Down', template: 'T09', asset: 'UNIQUE_VFX', directive: "Grito/onda radial -> efecto sobre objetivo -> resolve Guard Down -> disipación." },
  { id: 43, name: 'Atomic Break', mechanics: 'Melee', template: 'T04', asset: 'UNIQUE_POSE', directive: "Combo físico propio de Vegito -> contactos -> remate -> reacción -> retorno." },
  { id: 44, name: 'Flash Sword', mechanics: 'Beam / Energy Blade', template: 'T07', asset: 'UNIQUE_POSE', directive: "Generación de espada/filo de Ki -> thrust/corte -> contacto -> reacción -> disipación." },
  { id: 45, name: 'Barrier', mechanics: 'Defense / Avoid Beam', template: 'T12', asset: 'UNIQUE_VFX', directive: "Trigger -> barrera de Ki alrededor/delante -> guard_contact -> beam cancel/deflect -> resolve -> fade." },
  { id: 46, name: 'N. Slasher', mechanics: 'Melee / Grapple', template: 'T03', asset: 'UNIQUE_POSE', directive: "Entrada cuerpo a cuerpo -> agarre/estrangulamiento -> golpe/throw -> reacción -> retorno." },
  { id: 47, name: 'KiBlast Bomb', mechanics: 'Beam / Projectile', template: 'T06', asset: 'GENERIC_VARIANT', directive: "Ki en palma -> spawn -> lanzamiento -> vuelo -> impacto." },
  { id: 48, name: 'Lightning C.', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_POSE', directive: "Carga propia de Nappa -> emisión de energía -> viaje/impacto -> recover." },
  { id: 49, name: 'Telekinesis', mechanics: 'Beam / Psychic', template: 'T09', asset: 'UNIQUE_VFX', directive: "Gesto psíquico -> target lock -> desplazamiento/impacto telequinético -> resolve -> release." },
  { id: 50, name: 'M. Soundwave', mechanics: 'Beam / Wave', template: 'T05', asset: 'UNIQUE_VFX', directive: "Pose/voz -> onda sónica visible -> contacto -> resultado -> disipación." },
  { id: 51, name: 'Paralysis', mechanics: 'Support / Speed Down', template: 'T09', asset: 'UNIQUE_VFX', directive: "Gesto psíquico -> efecto de inmovilización -> resolve Speed Down -> estado temporal." },
  { id: 52, name: 'Time Freeze', mechanics: 'Defense / Command Fail', template: 'T12', asset: 'UNIQUE_CINEMATIC', directive: "Trigger ante command/stage -> freeze visual -> cancel command -> resolve -> unfreeze -> retorno." },
  { id: 53, name: 'Breath', mechanics: 'Defense / Avoid Beam', template: 'T12', asset: 'UNIQUE_POSE', directive: "Trigger -> soplido/onda de aire -> interceptar beam -> cancel/deflect -> retorno; falla contra Special Defeat según reglas." },
  { id: 54, name: 'Eraser Can.', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_POSE', directive: "Pose -> carga -> emisión desde boca -> haz -> resultado; attachPoint mouth obligatorio." },
  { id: 55, name: 'R. F. B. Atk.', mechanics: 'Melee', template: 'T04', asset: 'UNIQUE_POSE', directive: "Recoome Fighting Bomber: pose/entrada propia -> cadena física -> remate -> reacción -> retorno." },
  { id: 56, name: 'Crasher Ball', mechanics: 'Beam / Projectile', template: 'T06', asset: 'UNIQUE_POSE', directive: "Generar esfera -> gesto tipo golpe/voleibol -> projectile_spawn -> vuelo -> impacto." },
  { id: 57, name: 'Purple Comet', mechanics: 'Team Beam', template: 'T10+T05', asset: 'UNIQUE_CINEMATIC', directive: "Jeice + Burter: entrada conjunta -> sincronización -> ataque energético combinado -> impacto -> retirada." },
  { id: 58, name: 'P Comet Z', mechanics: 'Team / Special Defeat', template: 'T10+T04', asset: 'UNIQUE_CINEMATIC', directive: "Jeice + Burter: rush conjunto con aura púrpura -> contactos/remate -> Special Defeat resolution -> retorno." },
  { id: 59, name: 'Speed Up', mechanics: 'Support / Speed Up', template: 'T08', asset: 'GENERIC_VARIANT', directive: "Self buff -> líneas de velocidad/afterimage -> resolve Speed Up -> estado." },
  { id: 60, name: 'Mach Attack', mechanics: 'Melee', template: 'T03', asset: 'UNIQUE_POSE', directive: "Rush de alta velocidad -> contact -> knockback -> recover." },
  { id: 61, name: 'Dynami. Punch', mechanics: 'Melee', template: 'T03', asset: 'GENERIC_VARIANT', directive: "Anticipation -> puñetazo pesado -> hit-stop -> hurt -> recover." },
  { id: 62, name: 'Body Change', mechanics: 'Beam / Special', template: 'T05', asset: 'UNIQUE_CINEMATIC', directive: "Pose Ginyu -> beam de Body Change -> impacto -> daño proporcional -> retorno. En LSW no intercambia personajes: no ejecutar swap de actor." },
  { id: 63, name: 'Finger Beam', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_ATTACH', directive: "Pose -> charge breve -> rayo desde fingertip -> impacto -> recover." },
  { id: 64, name: 'Super E-Ball', mechanics: 'Beam / Projectile', template: 'T06', asset: 'GENERIC_VARIANT', directive: "Carga de gran esfera -> lanzamiento -> vuelo -> explosión -> recover." },
  { id: 65, name: 'Grand Wave', mechanics: 'Beam / Ground Wave', template: 'T07', asset: 'UNIQUE_VFX', directive: "Cast -> onda energética rasante -> efecto de corte/rotura de suelo -> contacto -> resolve." },
  { id: 66, name: 'S. Dash Elbow', mechanics: 'Melee', template: 'T03', asset: 'UNIQUE_POSE', directive: "Dash -> elbow contact -> hit-stop -> knockback -> recover." },
  { id: 67, name: 'Eye Beam', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_ATTACH', directive: "Pose/mirada -> beam_start desde ojos -> contacto -> recover." },
  { id: 68, name: 'Lock On', mechanics: 'Support / Accuracy Up', template: 'T11', asset: 'GENERIC_UI', directive: "Activación -> retícula/target marker -> resolve Sure-Hit -> persistir hasta próximo ataque -> cleanup al consumir." },
  { id: 69, name: 'Rocket Punch', mechanics: 'Special Defeat / Projectile', template: 'T06', asset: 'UNIQUE_CINEMATIC', directive: "Separar puño como proyectil -> vuelo -> HIT/AVOID -> retorno/reconexión o cleanup. Shockwave no debe tratarlo como melee normal." },
  { id: 70, name: 'Hell Flash', mechanics: 'Beam', template: 'T05', asset: 'UNIQUE_CINEMATIC', directive: "Abrir/activar dispositivo de brazos -> carga -> beam_start -> impacto -> cierre/recover." },
  { id: 71, name: 'Crazy Rush', mechanics: 'Melee', template: 'T04', asset: 'UNIQUE_POSE', directive: "Rush -> múltiples golpes -> remate -> reacción -> retorno." },
  { id: 72, name: 'Energy Slash', mechanics: 'Beam / Slash', template: 'T07', asset: 'UNIQUE_VFX', directive: "Generar filo/onda desde palma -> vuelo/corte -> contacto -> resolve." },
  { id: 73, name: 'Energy Slice', mechanics: 'Beam / Slash', template: 'T07', asset: 'UNIQUE_VFX', directive: "Corte luminoso de energía -> viaje -> resultado -> disipación." },
  { id: 74, name: '18\'s Attack', mechanics: 'Melee / Grapple', template: 'T04', asset: 'UNIQUE_POSE', directive: "Agarre/estrangulamiento -> punch -> reacción -> release -> retorno." },
  { id: 75, name: 'Life Absorb', mechanics: 'Melee / Drain', template: 'T03', asset: 'UNIQUE_CINEMATIC', directive: "Aproximación -> contacto palma -> drain loop -> transferir HP en resolve -> separación/recover." },
  { id: 76, name: 'Ene. Absorb', mechanics: 'Defense / Beam Absorb', template: 'T12', asset: 'UNIQUE_CINEMATIC', directive: "Trigger beam -> palma absorbente -> absorber projectile/beam -> resolve heal/negación -> fade; falla contra Special Defeat." },
  { id: 77, name: 'Cell Combo', mechanics: 'Melee', template: 'T04', asset: 'UNIQUE_POSE', directive: "Punch/kick repetidos -> remate -> reacción -> retorno." },
  { id: 78, name: 'Step Up Atk', mechanics: 'Melee', template: 'T03', asset: 'UNIQUE_POSE', directive: "Entrada de Cell Jr. -> ataque físico propio -> contact -> reacción -> retorno." },
  { id: 79, name: 'Flesh Guard', mechanics: 'Support / Guard Up', template: 'T08', asset: 'UNIQUE_POSE', directive: "Body brace/flex -> aura/defense cue -> resolve Guard Up -> estado." },
  { id: 80, name: 'Potbelly Atk', mechanics: 'Special Defeat / Melee', template: 'T03', asset: 'UNIQUE_CINEMATIC', directive: "Ataque corporal exclusivo de Fat Buu -> contacto con vientre/masa -> Special Defeat resolution -> recover. Coreografía exacta PENDING-ROM." },
  { id: 81, name: 'Crasher Buu', mechanics: 'Melee', template: 'T04', asset: 'UNIQUE_POSE', directive: "Combo rápido/pesado -> varios contactos -> remate -> reacción." },
  { id: 82, name: 'Sweet Beam', mechanics: 'Beam / Transform Hit', template: 'T05', asset: 'UNIQUE_CINEMATIC', directive: "Beam desde antena/cabeza -> contacto -> efecto visual de conversión en dulce/snack -> resolve -> restauración/cleanup según juego." },
  { id: 83, name: 'Bulma', mechanics: 'Support / Debuff', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Mostrar soporte/retrato/entrada -> gesto/efecto de stare down -> resolve debuff -> retirada. No sustituir por sprite del fighter." },
  { id: 84, name: 'Chiaotzu', mechanics: 'Support / Speed Down', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Entrada/portrait -> efecto psíquico -> resolve Speed Down -> salida." },
  { id: 85, name: 'Tien', mechanics: 'Defense Support / Knock Down', template: 'T10+T12', asset: 'SUPPORT_COUNTER', directive: "Trigger durante guard -> entrada Tien -> Ki Cannon/impacto al atacante -> knockdown resolve -> retirada." },
  { id: 86, name: 'Yajirobe', mechanics: 'Defense Support / Knock Down', template: 'T10+T12', asset: 'SUPPORT_COUNTER', directive: "Trigger -> entrada rápida -> sword slash -> knockdown resolve -> retirada." },
  { id: 87, name: 'Kaio', mechanics: 'Support / Ki Down', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Entrada/portrait -> gag/onda de desmoralización -> resolve Ki Down -> salida." },
  { id: 88, name: 'Dende', mechanics: 'Support / Heal', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Entrada/portrait -> healing VFX sobre aliado -> resolve HP -> retirada." },
  { id: 89, name: 'Guru', mechanics: 'Support / Attack Up', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Entrada/portrait -> unlock-power effect -> resolve Attack Up -> salida." },
  { id: 90, name: 'Hercule', mechanics: 'Defense Support / Knock Down', template: 'T10+T12', asset: 'SUPPORT_COUNTER', directive: "Trigger guard -> entrada Hercule -> golpe/acción de interrupción -> knockdown -> retirada." },
  { id: 91, name: 'Supreme Kai', mechanics: 'Support / Speed Down', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Entrada/portrait -> restricción/telequinesis -> resolve Speed Down -> salida." },
  { id: 92, name: 'Kibito', mechanics: 'Defense Support / Beam Fail', template: 'T10+T12', asset: 'SUPPORT_GUARD', directive: "Trigger beam -> soporte/protección mágica -> cancel beam -> resolve -> retirada." },
  { id: 93, name: 'Babidi', mechanics: 'Support / Parameter Cancel', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Entrada/portrait -> magic/status VFX -> cancelar parámetros/estados definidos -> resolve -> salida." },
  { id: 94, name: 'Dabura', mechanics: 'Support / Dual Phase', template: 'T10+T09', asset: 'UNIQUE_DUAL', directive: "Attack Phase: spit projectile -> petrify VFX -> resolve. Defense Phase: variante protect/cancel del ataque. Mantener dos timelines bajo la misma carta." },
  { id: 95, name: 'Yakon', mechanics: 'Support / Power Fail', template: 'T10', asset: 'SUPPORT_SUMMON', directive: "Entrada/portrait -> absorber luz/energía -> cancelar Power/Gather effect objetivo -> resolve -> retirada." },
  { id: 96, name: 'Scouter', mechanics: 'Item / Guard Down', template: 'T11', asset: 'ITEM_UI', directive: "HUD scouter/scan -> marcar punto débil -> resolve Guard Down -> cerrar overlay." },
  { id: 97, name: 'Caps. Fridge', mechanics: 'Item / CC Recovery', template: 'T11', asset: 'ITEM_UI', directive: "Mostrar item/icono -> activación/consumo -> resolve +CC -> cleanup; sin ACTION_DUEL." },
  { id: 98, name: 'Stop Device', mechanics: 'Item / Android Stop', template: 'T11+T09', asset: 'ITEM_TARGET', directive: "Dispositivo -> pulso de corto alcance sobre Android válido -> stop/stun resolve -> cleanup." },
  { id: 99, name: 'Life Preser', mechanics: 'Item / Heal', template: 'T11', asset: 'ITEM_UI', directive: "Activar dispositivo -> healing meter/VFX -> resolve HP -> cleanup." },
  { id: 100, name: 'Medical Mac.', mechanics: 'Item / Cleanse', template: 'T11', asset: 'ITEM_UI', directive: "Activar máquina/medical VFX -> cancelar Parameter Down/estado negativo según reglas -> cleanup." },
  { id: 101, name: 'Gravity Dev.', mechanics: 'Item / Speed Down', template: 'T11+T09', asset: 'ITEM_TARGET', directive: "Activar dispositivo -> campo/pulso de gravedad sobre objetivo -> resolve Speed Down -> cleanup." },
  { id: 102, name: 'Ene. Absorber', mechanics: 'Item / Life Absorb', template: 'T11+T12', asset: 'ITEM_DUAL', directive: "Uso activo: absorber energía/vida según regla. En Guard: interceptar y absorber. Resolver transferencia y destruir/ocultar efecto entrante." },
  { id: 103, name: 'Sealed Ball', mechanics: 'Item / Attack Down', template: 'T11+T09', asset: 'ITEM_TARGET', directive: "Mostrar esfera sellada -> efecto de sellado sobre objetivo -> resolve Attack Power Down -> cleanup." },
  { id: 104, name: 'Trunks Sword', mechanics: 'Item / Strength Up', template: 'T11', asset: 'ITEM_EQUIP', directive: "Presentar/equipar espada -> resolve Strength Up -> icono/estado persistente; no ejecutar corte ofensivo." },
  { id: 105, name: 'Dabura Spear', mechanics: 'Item / Strength Up', template: 'T11', asset: 'ITEM_EQUIP', directive: "Presentar/equipar lanza -> resolve Strength Up -> estado persistente." },
  { id: 106, name: 'Light Vest', mechanics: 'Item / Speed Up', template: 'T11', asset: 'ITEM_EQUIP', directive: "Equip cue -> resolve Speed Up -> estado." },
  { id: 107, name: 'Btl. Jacket', mechanics: 'Item / Guard Up', template: 'T11', asset: 'ITEM_EQUIP', directive: "Equip armor cue -> resolve Guard Power Up -> estado." },
  { id: 108, name: 'New B-Jacket', mechanics: 'Item / Guard Up', template: 'T11', asset: 'ITEM_EQUIP', directive: "Misma familia de armadura con variante visual propia -> resolve Guard Up." },
  { id: 109, name: 'Sunglasses', mechanics: 'Item / Taiyoken Immunity', template: 'T11', asset: 'ITEM_EQUIP', directive: "Equipar gafas -> estado anti-Taiyoken -> cuando se dispare flash, bloquear su efecto sin falso hurt." },
  { id: 110, name: 'Gamebomb', mechanics: 'Defense Item / Damage', template: 'T11+T12', asset: 'ITEM_COUNTER', directive: "Trigger en Guard -> activar bomba -> explosión sobre atacante -> resolve daño -> cleanup." },
  { id: 111, name: 'Champ. Belt', mechanics: 'Support / Damage Fail', template: 'T11', asset: 'ITEM_EQUIP', directive: "Activar/equip cue -> estado que invalida daño físico aplicable -> consumir/expirar según reglas." },
  { id: 112, name: 'Spcl. Candy', mechanics: 'Defense Item / Damage', template: 'T11+T12', asset: 'ITEM_COUNTER', directive: "Trigger guard -> lanzar/activar candy tóxico -> impacto -> resolve damage 30 -> cleanup." },
  { id: 113, name: 'Heart Virus', mechanics: 'Support / Attack Down', template: 'T11+T09', asset: 'ITEM_TARGET', directive: "Aplicar virus/status icon -> resolve Attack Power Down -> mantener estado hasta cancelación/fin." },
  { id: 114, name: 'Heart Medi.', mechanics: 'Item / Cleanse', template: 'T11', asset: 'ITEM_UI', directive: "Consumir medicina -> eliminar Parameter Down/estado aplicable -> recovery cue -> cleanup." },
  { id: 115, name: 'Hourglass', mechanics: 'Item / Cancel Support Effect', template: 'T11', asset: 'ITEM_UI', directive: "Activar reloj de arena -> cancel_support_effect -> retirar VFX/estado objetivo -> cleanup." },
  { id: 116, name: 'Roshi\'s Book', mechanics: 'Item / Unknown', template: 'T11', asset: 'UNIQUE_UNKNOWN', directive: "Mostrar carta/item, pero no inventar efecto ni cinemática mecánica. Marcar PENDING-ROM hasta validar qué hace realmente." },
  { id: 117, name: 'Full Spirit', mechanics: 'Support / Ki Up', template: 'T08', asset: 'GENERIC_VARIANT', directive: "Pose de enfado/power-up -> aura -> resolve Ki Up -> estado." },
  { id: 118, name: 'Afterimage', mechanics: 'Support / Avoid Up', template: 'T08+T12', asset: 'GENERIC_VARIANT', directive: "Al usar: aplicar buff de evasión. Al activarse después: afterimage/vanish -> avoid_commit -> reaparición -> consumir estado." },
  { id: 119, name: 'Reading Ki', mechanics: 'Support / Accuracy Up', template: 'T08', asset: 'GENERIC_VARIANT', directive: "Pose de concentración/sense -> resolve Accuracy Up -> persistir al siguiente ataque -> cleanup al consumir." },
  { id: 120, name: 'Feint', mechanics: 'Support / Accuracy Up', template: 'T08', asset: 'GENERIC_VARIANT', directive: "Pose/engaño breve -> resolve Accuracy Up -> estado hasta próximo ataque." },
  { id: 121, name: 'Endurance', mechanics: 'Defense / Guard', template: 'T12', asset: 'CORE_REUSE', directive: "Trigger -> action_guard_start/hold -> guard_contact -> reducción -> action_guard_end. Usar cuerpo del fighter, no summon." },
  { id: 122, name: 'Telepathy', mechanics: 'Defense / Command Fail', template: 'T10+T12', asset: 'SUPPORT_GUARD', directive: "Trigger command/stage -> efecto telepático/Supreme Kai -> command cancel -> resolve -> retorno." },
  { id: 123, name: 'Foresight', mechanics: 'Defense / Command Fail', template: 'T12', asset: 'GENERIC_VARIANT', directive: "Focus/anticipation -> command cancel -> resolve -> volver a guard/field." },
  { id: 124, name: 'Shockwave', mechanics: 'Defense / Avoid Damage', template: 'T12', asset: 'CORE_REUSE', directive: "Trigger melee/damage -> radial shockwave -> cancelar contacto/repeler -> avoid_commit -> retorno." },
  { id: 125, name: 'Avoiding', mechanics: 'Defense / Avoid Beam', template: 'T12', asset: 'CORE_REUSE', directive: "Trigger beam/Special Defeat compatible -> jump/evade -> projectile continúa -> avoid_commit -> aterrizar/recover." },
];

const byId = new Map<number, CardCinematicSpec>();
for (const c of CARD_CINEMATICS) byId.set(c.id, c);

/** Perfil cinematográfico declarativo por número de carta ROM. */
export function cardCinematic(id: number): CardCinematicSpec | undefined {
  return byId.get(id);
}

/** Plantillas T01–T12 usadas por el catálogo (para auditorías). */
export const CARD_TEMPLATES = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10', 'T11', 'T12'] as const;

