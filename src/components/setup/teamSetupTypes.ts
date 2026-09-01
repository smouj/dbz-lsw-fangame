// ═══════════════════════════════════════════════════════════════════════
// TEAM SETUP — tipos del estado de preparación de combate
// ═══════════════════════════════════════════════════════════════════════
// Capa de CONFIGURACIÓN (nunca BattleState). Produce BattleConfig en el
// confirm. El Engine decide disponibilidad/CC/power window/resolución.
// ═══════════════════════════════════════════════════════════════════════

export interface TeamMember {
  characterId: string;
  formId: string;
  /** Limits equipados (ids de carta), normalizados a la capacidad real del
   *  personaje; 0 = slot vacío VÁLIDO. NUNCA 5 slots (ver limitLoadout). */
  limits: number[];
  /** Joint Deck: exactamente DECK_SIZE (20) ids de carta. LOS LIMITS NO
   *  ENTRAN AQUÍ — sistema separado (corpus §47). */
  jointDeck: number[];
  /** Preset guardado asignado; solo identifica la selección, no edita la biblioteca. */
  deckId?: string;
}

export interface TeamSetupState {
  members: TeamMember[];
  activeMember: number;
  /** Personaje bajo el cursor del Character Roll (por miembro activo). */
  selectedCharacter: string;
}

export interface TeamSetupResult {
  /** Miembro activo que abre el combate. */
  member: TeamMember;
  /** Equipo completo configurado (2 slots — battle 2v2, máx 2 personajes). */
  team: TeamMember[];
}
