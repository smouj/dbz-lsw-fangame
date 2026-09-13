// GENERADO — no editar a mano. `npm run gen:production-visual-matrix`.
// Proyección importable de docs/audits/PRODUCTION_VISUAL_MATRIX.md (mismas filas).
// Autocontenido: define su propio tipo de fila para no importar desde scripts/.

export type MatrixFidelity = 'VERIFIED' | 'PENDING' | 'DEFERRED_TO_TRACE';

export interface VisualMatrixRow {
  family: string;
  cardId: number | null;
  handler: string;
  entryTick: number | null;
  binding: 'OFFENSE' | 'DEFENSE_REACTION' | null;
  slots: string;
  firstPhysicalId: number | null;
  visibility: string;
  drawOrder: string;
  bg: string;
  palette: string;
  fx: string;
  camera: string;
  impactTick: number | null;
  exitTick: number | null;
  residual: number;
  fidelity: MatrixFidelity;
  note: string;
}

export const PRODUCTION_VISUAL_MATRIX_GENERATED_AT = "2026-09-13T10:21:23.231Z";

export const PRODUCTION_VISUAL_MATRIX_ROWS: VisualMatrixRow[] = [
  {"family":"STANDARD_DAMAGE hit","cardId":5,"handler":"$0A STANDARD_DAMAGE","entryTick":0,"binding":"OFFENSE","slots":"0:ATTACKER/PLAYER · 1:DEFENDER/ENEMY","firstPhysicalId":44,"visibility":"player:on → enemy:off → enemy:on","drawOrder":"—","bg":"none","palette":"programa + ticks","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"VERIFIED","note":"slot0=ATTACKER ligado al atacante real"},
  {"family":"STANDARD_DAMAGE miss/avoid","cardId":5,"handler":"$0A STANDARD_DAMAGE","entryTick":0,"binding":"OFFENSE","slots":"0:ATTACKER/PLAYER · 1:DEFENDER/ENEMY","firstPhysicalId":44,"visibility":"player:on → enemy:off → enemy:on","drawOrder":"—","bg":"none","palette":"programa + ticks","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"VERIFIED","note":"seed alterno → rama MISS/AVOID"},
  {"family":"Beam $02","cardId":7,"handler":"$02 BEAM","entryTick":0,"binding":"OFFENSE","slots":"0:ATTACKER/PLAYER · 1:DEFENDER/ENEMY","firstPhysicalId":0,"visibility":"player:on → enemy:off → enemy:on","drawOrder":"SLOT_0_THEN_1","bg":"none","palette":"programa + ticks","fx":"1 FX_LOAD","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"VERIFIED","note":"film de beam con binding OFFENSE"},
  {"family":"Defense reaction","cardId":45,"handler":"$CA83 DEFENSE_RULE","entryTick":0,"binding":"DEFENSE_REACTION","slots":"0:DEFENDER/PLAYER · 1:ATTACKER/ENEMY","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"none","palette":"—","fx":"DEFENSE_FX 1","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"VERIFIED","note":"DEFENSE_REACTION: slot0=DEFENDER, slot1=ATTACKER"},
  {"family":"Stage success","cardId":1,"handler":"$STAGE PREP","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"VERIFIED","note":"romFamily=NONE · control=PLAYER_ATTACK_CHOICE"},
  {"family":"Support $00/$02","cardId":16,"handler":"$00/$02 SUPPORT","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"VERIFIED","note":"romFamily=SUPPORT_OR_FIELD_EFFECT · control=PLAYER_ATTACK_CHOICE"},
  {"family":"Gather $1A","cardId":null,"handler":"$1A GATHER","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"PENDING","note":"romFamily=NONE · control=PLAYER_ATTACK_CHOICE"},
  {"family":"Energy Bomb $05","cardId":null,"handler":"$05 BEAM_BOMB","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"DEFERRED_TO_TRACE","note":"sin carta/driver golden con handler $05; requiere traza dinámica"},
  {"family":"Stage failure / counterattack","cardId":null,"handler":"$STAGE COUNTER","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"DEFERRED_TO_TRACE","note":"la rama de contraataque no tiene driver determinista aún"},
  {"family":"Beam nullify","cardId":null,"handler":"$CA53 NULLIFY","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"DEFERRED_TO_TRACE","note":"requiere traza dinámica del nullify"},
  {"family":"Energy Absorb","cardId":null,"handler":"$CA53 ABSORB","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"DEFERRED_TO_TRACE","note":"requiere traza dinámica del absorb"},
  {"family":"Endurance","cardId":null,"handler":"$0F ENDURANCE","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"DEFERRED_TO_TRACE","note":"sin driver ROM confirmado"},
  {"family":"CHARA $1A","cardId":null,"handler":"$1A CHARA","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"DEFERRED_TO_TRACE","note":"requiere traza dinámica CHARA"},
  {"family":"Special multi-actor","cardId":null,"handler":"$SPECIAL","entryTick":null,"binding":null,"slots":"—","firstPhysicalId":null,"visibility":"—","drawOrder":"—","bg":"—","palette":"—","fx":"—","camera":"—","impactTick":null,"exitTick":null,"residual":0,"fidelity":"DEFERRED_TO_TRACE","note":"speciales multi-actor pendientes de traza (ACTOR_HOME/TARGET_HOME/CONTACT_POINT)"},
];

export const PRODUCTION_VISUAL_MATRIX_FAMILIES = [
  "STANDARD_DAMAGE hit",
  "STANDARD_DAMAGE miss/avoid",
  "Beam $02",
  "Energy Bomb $05",
  "Stage success",
  "Stage failure / counterattack",
  "Defense reaction",
  "Beam nullify",
  "Energy Absorb",
  "Endurance",
  "Support $00/$02",
  "Gather $1A",
  "CHARA $1A",
  "Special multi-actor",
] as const;

export const PRODUCTION_VISUAL_MATRIX_COUNTS = {
  verified: 6,
  pending: 1,
  deferred: 7,
  familiesTotal: 14,
  familiesCovered: 14,
} as const;
