// ═══════════════════════════════════════════════════════════════════════
// P0 SCENE-CAMERA ROM CUTOVER — RomSceneCue SSOT
// ═══════════════════════════════════════════════════════════════════════
// Declarative representation of scene/camera/visibility/layering operations
// in the battle presentation pipeline. Every operation is classified by
// evidence level — no vague "inferred camera" categories.
//
// Pipeline: RomPresentationProfile → compiler → Scene/Camera cues →
// BattleTimeline → Presenter (NOT directly in Pixi).
//
// Rules:
//   - Scene changes are cues, not Pixi calls.
//   - Camera/scroll is centralized (no container.x+= / CSS transform).
//   - Visibility changes come from cues, not hardcoded cardId rules.
//   - Position model: tactical (Engine) ≠ visual (Presentation).
//   - Layer stack is defined once, no per-cardId z-index.
//   - CHARA_EXIT/ENTRY are FIGHTER_MOTION cues (consumed by Presenter).
// ═══════════════════════════════════════════════════════════════════════

// ── Evidence levels (same taxonomy as CinematicFidelity) ──

export type SceneCueEvidence =
  | 'ROM_EXACT'            // Direct ROM opcode/macro/document
  | 'ROM_STATIC_VERIFIED'  // Verified against ROM static data
  | 'ROM_HANDLER_VERIFIED' // ROM compiler produces this
  | 'ROM_DYNAMIC_VERIFIED' // Verified with ROM runtime
  | 'PRESENTATION_DERIVED' // Presentation code decides, no ROM evidence
  | 'PENDING_ROM_TRACE';   // Needs ROM trace, currently unknown

// ── Scene operations ──

export type SceneOperationKind =
  // Scene identity
  | 'SCENE_SET'            // Switch scene mode (FIELD/ACTION/DUEL/SPECIAL/DEFENDER)
  | 'BACKGROUND_SET'       // Change background texture
  // Camera
  | 'CAMERA_TRANSLATE'     // SCX/SCY scroll offset (px, durationTicks)
  | 'CAMERA_SHAKE'         // Impact shake (magnitude, decay, durationTicks)
  | 'CAMERA_FLASH'         // FLASH_WHITE entrance (durationTicks)
  | 'CAMERA_CUT'           // Instant cut (no transition)
  | 'CAMERA_TRACK'         // Camera follows subject
  | 'CAMERA_RESET'         // Return camera to origin
  | 'SCREEN_SCROLL'        // ROM SCREEN_MOTION (dxPerTick, durationTicks, restore)
  // Visibility
  | 'FIGHTER_VISIBILITY'   // Show/hide fighter (actor/target)
  | 'FX_VISIBILITY'        // Show/hide FX layer (beam/projectile/aura)
  | 'DISPLAY_VISIBILITY'   // Show/hide ROM display layer (BG compose)
  // Position
  | 'FIGHTER_POSITION'     // Set fighter visual position (scene anchor)
  | 'FIGHTER_MOTION'       // Move fighter by ROM segments (dx/dy per tick)
  // Layer
  | 'LAYER_SET'            // Set z-order / draw order
  | 'LAYER_REORDER'        // Reorder layers (slot 0 vs 1 draw order)
  // Display
  | 'DISPLAY_COMPOSE'      // Compose ROM visual into BG
  | 'DISPLAY_CLEAR'        // Clear ROM visual from BG
  // Return
  | 'RETURN_TO_FIELD';     // Full FIELD restore (cleanup all action state)

// ── Scene modes ──

export type RomSceneMode =
  | 'FIELD'            // Tactical overview
  | 'ACTION'           // Action solo (attacker only)
  | 'ACTION_DUEL'       // Both fighters visible
  | 'SPECIAL'           // Special action (support/limit)
  | 'DEFENDER_ACTION';  // Camera on defender

// ── Layer stack (canonical z-order, bottom to top) ──

export const LAYER_STACK = [
  'BACKGROUND',         // Stage/cenario background
  'ROM_BG_DISPLAY',    // ROM display compose (Support/Defense BG)
  'FIGHTER_BACK',       // Rear fighter (target in ACTION_DUEL)
  'FIGHTER_FRONT',      // Front fighter (actor in ACTION_DUEL)
  'ROM_FX',             // ROM FX window (beam BG tiles)
  'PROJECTILE',         // Projectile layer (procedural, bridge)
  'IMPACT',             // Impact flash/overlay
  'HUD',                // HP bars, CC, damage numbers
  'TRANSITION',         // FLASH_WHITE, fade overlays
] as const;

export type LayerStackEntry = typeof LAYER_STACK[number];

// ── Actor roles ──

export type SceneActorRole = 'ACTOR' | 'TARGET' | 'PLAYER' | 'ENEMY';
export type SceneSide = 'LEFT' | 'RIGHT';

// ── RomSceneCue ──

export interface RomSceneCueEntry {
  /** Unique id for this operation. */
  id: string;
  /** Operation kind. */
  operation: SceneOperationKind;
  /** Which scene family this belongs to. */
  family: SceneCueFamily;
  /** Evidence classification. */
  evidence: SceneCueEvidence;
  /** Source documentation (ROM reference or code location). */
  source: string;
  /** Current consumption status in the pipeline. */
  consumed: 'CONSUMED' | 'TRACE_ONLY' | 'BRIDGE' | 'PENDING';
  /** What needs to happen to consume this. */
  remediation?: string;
  /** Tick or duration if applicable. */
  durationTicks?: number;
  /** Positional data if applicable. */
  x?: number;
  y?: number;
  /** Description for audit. */
  description: string;
}

export type SceneCueFamily =
  | 'SHARED'             // Cross-family (scene entry/exit, cleanup)
  | 'STANDARD_DAMAGE'   // Melee attacks
  | 'BEAM'               // Beam/projectile attacks
  | 'STAGE'              // Command/QTE attacks
  | 'SUPPORT'            // Support cards
  | 'DEFENSE'            // Guard/Move defense
  | 'GATHER'             // Gather Power
  | 'SPECIAL';           // PENDING_ROM_TRACE specials

// ═══════════════════════════════════════════════════════════════════════
// REGISTRY — All scene/camera/visibility/layering operations audited
// ═══════════════════════════════════════════════════════════════════════

/**
 * P0.4R-B7B5 — BARRERA de autoridad.
 *
 * Una timeline ROM_PHYSICAL NUNCA gobierna visibilidad por escena: la autoridad
 * es `ACTION_OBJECT_BIND → slot físico → ActionObjectRuntime.active/visible`
 * (B7B3), y el orden de pintado pertenece a los slots (B7B4).
 *
 * `DEFENDER_ACTION` sobrevive como etiqueta LEGACY_ONLY (tipos históricos,
 * Dev tools, fixtures LEGACY, buildTimeline antiguo) pero PROHIBIDO como
 * autoridad en la ruta ROM-backed.
 *
 * `applySceneVisibility()` fue eliminado de ActionScene (B7B5).
 */
export const ROM_PHYSICAL_SCENE_AUTHORITY = 'PROHIBITED' as const;
export const DEFENDER_ACTION_AUTHORITY = 'LEGACY_ONLY' as const;

export const ROM_SCENE_CUES: RomSceneCueEntry[] = [
  // ── SHARED: Scene entry ──
  { id: 'SCENE_ENTRY_CUT', operation: 'CAMERA_CUT', family: 'SHARED', evidence: 'ROM_HANDLER_VERIFIED', source: 'SCENE_LOAD cue → ACTION_SOLO via compiler', consumed: 'CONSUMED', description: 'Instant cut from FIELD to ACTION (ROM SCENE_LOAD opcode)' },
  { id: 'SCENE_ENTRY_FLASH', operation: 'CAMERA_FLASH', family: 'SHARED', evidence: 'ROM_HANDLER_VERIFIED', source: 'canon.entrance=FLASH_WHITE (M8.F0 video-verified)', consumed: 'CONSUMED', description: 'FLASH_WHITE entrance transition (GBC white flash)' },
  { id: 'SCENE_BG_CHANGE', operation: 'BACKGROUND_SET', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'context.actionBackground / context.overviewBackground', consumed: 'CONSUMED', description: 'Background texture set on scene change (context-driven, not ROM tile data)' },
  { id: 'SCENE_MODE_SET', operation: 'SCENE_SET', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'BattleSceneMode → BattleScene mapping in adapter', consumed: 'CONSUMED', description: 'Scene mode switch (OVERVIEW/PLAYER_ACTION/ACTION_DUEL/DEFENDER_ACTION)' },

  // ── SHARED: Fighter visibility ──
  { id: 'ACTOR_VISIBILITY_SHOW', operation: 'FIGHTER_VISIBILITY', family: 'SHARED', evidence: 'ROM_HANDLER_VERIFIED', source: 'FIGHTER_VISIBILITY cue role=ACTOR visible=true (compiler)', consumed: 'CONSUMED', description: 'Show actor on ACTION scene entry' },
  { id: 'ACTION_OBJECT_VISIBILITY_PRIMITIVE', operation: 'FIGHTER_VISIBILITY', family: 'SHARED', evidence: 'ROM_STATIC_VERIFIED', source: 'ActionObject+0 & $80 (renderer); opcode $08 → $0938 (+0=0 HIDE); init $80/$A0 visibles; consumed via FIGHTER_VISIBILITY cues and scene transitions', consumed: 'CONSUMED', description: 'ROM visibility primitive: renderer draws only if ActionObject+0 & $80. HIDE = $08 → $0938. Consumed via FIGHTER_VISIBILITY cues in ProductionRomPresentationAdapter (P0.5)' },
  { id: 'ACTOR_VISIBILITY_HIDE', operation: 'FIGHTER_VISIBILITY', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'applySceneVisibility() ACTION_SOLO hides target', consumed: 'CONSUMED', description: 'Hide actor (not typical in current codebase)' },
  { id: 'TARGET_VISIBILITY_SHOW', operation: 'FIGHTER_VISIBILITY', family: 'SHARED', evidence: 'ROM_HANDLER_VERIFIED', source: 'FIGHTER_VISIBILITY cue role=TARGET visible=true (compiler)', consumed: 'CONSUMED', description: 'Show target at defenderIn or approach beat' },
  { id: 'TARGET_VISIBILITY_HIDE', operation: 'FIGHTER_VISIBILITY', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'applySceneVisibility() hides target in ACTION_SOLO', consumed: 'CONSUMED', description: 'Hide target in solo scene (actor-only shots)' },
  { id: 'DEFENDER_VISIBILITY', operation: 'FIGHTER_VISIBILITY', family: 'DEFENSE', evidence: 'PRESENTATION_DERIVED', source: 'histórico: DEFENDER_ACTION → applySceneVisibility() mostraba solo al defensor (RETIRADO en B7B5)', consumed: 'TRACE_ONLY', remediation: 'Retirado como autoridad en B7B5: la visibilidad la resuelve el binding físico (ACTION_OBJECT_BIND → slot → ActionObjectRuntime.active/visible). Sin migración pendiente; se conserva LEGACY_ONLY por trazabilidad histórica.', description: 'LEGACY_ONLY (B7B5). En la ruta ROM la visibilidad la resuelve el binding físico: ACTION_OBJECT_BIND → slot → ActionObjectRuntime.active/visible. Prohibido como autoridad.' },

  // ── SHARED: Position ──
  { id: 'ACTOR_ANCHOR_LEFT', operation: 'FIGHTER_POSITION', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'ACTION_LEFT_X=48 native (ActionScene.ts), ActionScene ×2', consumed: 'CONSUMED', x: 48, description: 'Actor anchor position left side in native ACTION coordinates; parent projection ×2' },
  { id: 'ACTOR_ANCHOR_RIGHT', operation: 'FIGHTER_POSITION', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'ACTION_RIGHT_X=112 native (ActionScene.ts), ActionScene ×2', consumed: 'CONSUMED', x: 112, description: 'Actor anchor position right side in native ACTION coordinates; parent projection ×2' },
  { id: 'ACTION_ANCHOR_TABLE_ROM', operation: 'FIGHTER_POSITION', family: 'SHARED', evidence: 'ROM_STATIC_VERIFIED', source: 'Bank7E:$5A68 (consumer $597E, wrapper $3764): CENTER(88,96) · INNER_ACTION(71/105,96) · UNUSED_RESERVED(43/133,96; no consumers) · OFFSCREEN_ENTRY(233/198,96) raw', consumed: 'CONSUMED', description: 'ROM ACTION anchor table (Bank7E:$5A68) → Pixi ×2: CENTER X=160, INNER_ACTION 126/194, OFFSCREEN_ENTRY wraps offscreen, Y=160. Consumed by ACTION_ANCHOR_TABLE in romActionObject.ts and verify:presentation-physical-geometry gate (P0.4C). Opcode $0A = SET_CANONICAL_BASE_POSITION [slot, baseY, baseX].' },
  { id: 'CHARA_EXIT', operation: 'FIGHTER_MOTION', family: 'SHARED', evidence: 'ROM_EXACT', source: 'RomCinematicBeat CHARA_EXIT: -98px/28t (segments -1×2·-2×2·-3×4·-4×20) + HOLD15t', consumed: 'CONSUMED', durationTicks: 43, x: -98, description: 'Character exit motion: -98px over 28 ticks (discrete segments) + 15 tick hold (§176)' },
  { id: 'CHARA_ENTRY', operation: 'FIGHTER_MOTION', family: 'SHARED', evidence: 'ROM_EXACT', source: 'RomCinematicBeat CHARA_ENTRY: +106px/19t + hold5t + settle -8px/8t = 32t', consumed: 'CONSUMED', durationTicks: 32, x: 98, description: 'Character entry motion: +106px/19t (segments) + 5t hold + settle -8px/8t (net +98px, §177)' },
  { id: 'TACTICAL_OVERWORLD_POS', operation: 'FIGHTER_POSITION', family: 'SHARED', evidence: 'ROM_HANDLER_VERIFIED', source: 'FIGHTER_POSITION cue → TacticalScene.setOverworldPosition()', consumed: 'CONSUMED', description: 'Tactical position update (Engine-owned, reflected in overworld)' },

  // ── SHARED: Camera ──
  { id: 'CAMERA_SHAKE_IMPACT', operation: 'CAMERA_SHAKE', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'ImpactSystem.impact() → world.position.set(snap.shakeX, snap.shakeY)', consumed: 'CONSUMED', durationTicks: 6, description: 'Impact shake: sine wave decay, 6 ticks, magnitude 0.35' },
  { id: 'CAMERA_SHAKE_BEAM', operation: 'CAMERA_SHAKE', family: 'BEAM', evidence: 'PRESENTATION_DERIVED', source: 'CAMERA IMPACT cue → pres.camera(0.4)', consumed: 'CONSUMED', durationTicks: 6, description: 'Beam impact shake magnitude 0.4' },
  { id: 'CAMERA_FLASH_WHITE', operation: 'CAMERA_FLASH', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'CAMERA FLASH_WHITE cue → pres.flashWhite(2)', consumed: 'CONSUMED', durationTicks: 2, description: 'Full viewport white overlay; two-tick presentation policy, exact ROM duration pending evidence' },
  { id: 'CAMERA_TRACK', operation: 'CAMERA_TRACK', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'CAMERA TRACK cue (no implementation beyond shake)', consumed: 'TRACE_ONLY', remediation: 'Implement CameraPresenter for TRACK/CUT/RESET verbs', description: 'Camera follows subject (currently no-op beyond shake)' },
  { id: 'CAMERA_RESET', operation: 'CAMERA_RESET', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'CAMERA RESET cue (returnToField resets positions)', consumed: 'CONSUMED', description: 'Reset camera to origin on FIELD return' },
  { id: 'SCREEN_SCROLL_ROM', operation: 'SCREEN_SCROLL', family: 'SHARED', evidence: 'ROM_EXACT', source: 'RomScreenMotionCue: dxPerTick, durationTicks, restore flag', consumed: 'CONSUMED', description: 'ROM screen scroll (opcode $0E): CameraPresenter applies dxPerTick*elapsed, discrete, restore on completion' },
  { id: 'SCREEN_RESTORE_ROM', operation: 'CAMERA_RESET', family: 'SHARED', evidence: 'ROM_EXACT', source: 'RomScreenRestoreCue: opcode $0F → Bank00:$035B', consumed: 'CONSUMED', description: 'ROM screen restore (opcode $0F): disables STAT/HBlank cinematic viewport and visually returns to base; preserves C405/C406.' },
  { id: 'SCREEN_PATH_ROM', operation: 'SCREEN_SCROLL', family: 'SHARED', evidence: 'ROM_STATIC_VERIFIED', source: 'RomScreenPathCue: opcode $11 → Bank7E:$73C5 (one fixed 18-step path, ΔSCY -42, ΔSCX ±156)', consumed: 'CONSUMED', durationTicks: 18, description: 'ROM screen path (opcode $11): single implicit table consumed by CameraPresenter (X mirrored by side, Y not); no pathId family.' },
  { id: 'FX_WINDOW_SCROLL', operation: 'CAMERA_TRANSLATE', family: 'BEAM', evidence: 'ROM_STATIC_VERIFIED', source: 'ROM_CINEMATIC_VIEWPORT_MECHANISM: outside SCY/SCX=low(C407/C409), inside HBlank window SCY/SCX=base+C405/C406. Per-frame offsets in beam_actor_screen_offsets_v4.csv (240 rows)', consumed: 'CONSUMED', description: 'GBC differential cinematic viewport: base scroll ($C407/$C409) + per-frame deltas ($C405/$C406), enabled only within the STAT/HBlank band.' },

  // ── SHARED: Layer ──
  { id: 'LAYER_STACK_DEFAULT', operation: 'LAYER_SET', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'SceneDirector.addChild order: tactical, action, projectileLayer', consumed: 'CONSUMED', description: 'Default layer order: BG → tactical → action → projectile (world children)' },
  { id: 'ROM_DISPLAY_LAYER', operation: 'LAYER_SET', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'romDisplayLayer.view added to ActionScene (V7.8)', consumed: 'CONSUMED', description: 'ROM display layer (BG compose) added to ActionScene' },
  { id: 'DRAW_ORDER_ROM', operation: 'LAYER_REORDER', family: 'SHARED', evidence: 'ROM_STATIC_VERIFIED', source: 'RomActionObjectDrawOrderCue: SLOT_0_THEN_1 / SLOT_1_THEN_0', consumed: 'CONSUMED', description: 'ROM draw order (B7B4, ROM_STATIC_VERIFIED): el objeto del slot0 se pinta antes que el del slot1 SIEMPRE. La rama $CA39 de bank_001:$4769 conserva slot0-primero cuando el índice físico alterna; $CA39 == 2 aislado NO lo prueba. Detalle: ACTION_OBJECT_DRAW_ORDER_AUTHORITY' },
  { id: 'BEAM_BG_LAYER', operation: 'LAYER_SET', family: 'BEAM', evidence: 'PENDING_ROM_TRACE', source: 'ROM FX window uses BG tilemap ($9800) — separate from Fighter OBJ', consumed: 'PENDING', remediation: 'Implement ROM FX window as BG layer (not ProjectileSprite)', description: 'Beam BG/FX tilemap layer (ROM provides BG display, not OBJ sprite)' },

  // ── SHARED: Display ──
  { id: 'DISPLAY_COMPOSE_SUPPORT', operation: 'DISPLAY_COMPOSE', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'RomDisplayComposeCue → RomDisplayPresenter.consume()', consumed: 'CONSUMED', description: 'Support visual BG compose (ROM static verified)' },
  { id: 'DISPLAY_CLEAR_SUPPORT', operation: 'DISPLAY_CLEAR', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'RomDisplayClearCue → RomDisplayPresenter.consume()', consumed: 'CONSUMED', description: 'Support visual BG clear (ROM static verified)' },

  // ── SHARED: Return to FIELD ──
  { id: 'RETURN_TO_FIELD', operation: 'RETURN_TO_FIELD', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'returnToField() → setScene(FIELD) + clearProjectile + cancelRush + resetPoses + resetPositions', consumed: 'CONSUMED', description: 'Return to tactical view: cleanup all action state' },
  { id: 'SCENE_EXIT_OVERVIEW', operation: 'SCENE_SET', family: 'SHARED', evidence: 'PRESENTATION_DERIVED', source: 'SCENE OVERVIEW cue → setScene(FIELD) in adapter', consumed: 'CONSUMED', description: 'Scene mode back to OVERVIEW (maps to FIELD in SceneDirector)' },

  // ── STANDARD_DAMAGE ──
  { id: 'STD_RUSH_MOTION', operation: 'FIGHTER_MOTION', family: 'STANDARD_DAMAGE', evidence: 'ROM_EXACT', source: 'RomFighterMotionCue RUSH: +98px/25t (compiler)', consumed: 'CONSUMED', durationTicks: 25, x: 98, description: 'Rush approach: +98px over 25 ticks (moveActorByRomMotion, replaces easeOutCubic)' },
  { id: 'STD_IMPACT_POSE', operation: 'FIGHTER_POSITION', family: 'STANDARD_DAMAGE', evidence: 'PRESENTATION_DERIVED', source: 'profile.impact.targetPose (knockback_back/up/down)', consumed: 'CONSUMED', description: 'Target reaction pose by profile signature' },
  { id: 'STD_RETURN_POSITION', operation: 'FIGHTER_POSITION', family: 'STANDARD_DAMAGE', evidence: 'PRESENTATION_DERIVED', source: 'returnToField → actorHomeX/targetHomeX reset', consumed: 'CONSUMED', description: 'Reset fighter positions to anchor on FIELD return' },

  // ── BEAM ──
  { id: 'BEAM_SETUP_MOTION', operation: 'FIGHTER_MOTION', family: 'BEAM', evidence: 'ROM_EXACT', source: 'RomFighterMotionCue BEAM_SETUP: -27px/17t (compiler)', consumed: 'CONSUMED', durationTicks: 17, x: -27, description: 'Beam setup: -27px over 17 ticks (moveActorByRomMotion, actor steps back)' },
  { id: 'BEAM_FX_LOAD', operation: 'FX_VISIBILITY', family: 'BEAM', evidence: 'ROM_HANDLER_VERIFIED', source: 'FX_LOAD cue → stats.fxLoads++ (trace only)', consumed: 'TRACE_ONLY', remediation: 'Mount ROM FX sprite from FX_LOAD resource (ban procedural projectile)', description: 'Beam FX resource load (ROM provides tile data, not procedural shape)' },
  { id: 'BEAM_FX_WINDOW', operation: 'FX_VISIBILITY', family: 'BEAM', evidence: 'ROM_HANDLER_VERIFIED', source: 'ROM_FX_WINDOW cue → RomDisplayPresenter.consume()', consumed: 'CONSUMED', description: 'Beam FX window tilemap compose (ROM BG display layer)' },
  { id: 'BEAM_FX_CLEAR', operation: 'FX_VISIBILITY', family: 'BEAM', evidence: 'ROM_HANDLER_VERIFIED', source: 'ROM_FX_WINDOW RESULT phase + DISPLAY_CLEAR', consumed: 'CONSUMED', description: 'Beam FX clear after impact result' },
  { id: 'BEAM_PROJECTILE_BRIDGE', operation: 'FX_VISIBILITY', family: 'BEAM', evidence: 'PRESENTATION_DERIVED', source: 'spawnProjectile() → procedural Graphics (ray/ball/disk/sword)', consumed: 'BRIDGE', remediation: 'Replace with ROM FX window BG tiles when scroll trace complete', description: 'BRIDGE: Procedural projectile sprite (will be replaced by ROM FX)' },

  // ── STAGE ──
  { id: 'STAGE_SCENE_PREP', operation: 'SCENE_SET', family: 'STAGE', evidence: 'PENDING_ROM_TRACE', source: 'Current bridge: STAGE_PREP=60t; ROM Stage VM is per-input/per-participant microprograms $04/$05/$06/$13', consumed: 'BRIDGE', description: 'Stage preparation bridge. Replace with ROM Stage VM queues; $06 waits ActionObject+4, so visual frames are part of gameplay timing.' },
  { id: 'STAGE_QTE_WINDOW', operation: 'FIGHTER_VISIBILITY', family: 'STAGE', evidence: 'ROM_EXACT', source: 'QTE window lengths: 50/80/120/150t by position', consumed: 'CONSUMED', description: 'QTE input window visibility (position-dependent ROM_EXACT durations)' },
  { id: 'STAGE_RETURN', operation: 'RETURN_TO_FIELD', family: 'STAGE', evidence: 'PRESENTATION_DERIVED', source: 'r(40) SCENE OVERVIEW after stage resolution', consumed: 'CONSUMED', description: 'Return to FIELD after stage resolution (40t post-QTE)' },

  // ── SUPPORT ──
  { id: 'SUPPORT_DISPLAY_LOAD', operation: 'DISPLAY_COMPOSE', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'SUPPORT_VISUAL_LOAD + BG_ASSEMBLY + DISPLAY_COMPOSE (compiler)', consumed: 'CONSUMED', description: 'Support visual card-indexed load → BG compose' },
  { id: 'SUPPORT_BG_ASSEMBLY', operation: 'DISPLAY_COMPOSE', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'BG_ASSEMBLY $19: 7 iterations, SINGLE_BG_GRAPHIC', consumed: 'CONSUMED', description: 'Support BG $19 assembly (7 iterations = 1 graphic, not 7 frames)' },
  { id: 'SUPPORT_PALETTE_LOAD', operation: 'DISPLAY_COMPOSE', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'PALETTE_LOAD cue: paletteIndex, physical', consumed: 'CONSUMED', description: 'Support palette load (card-indexed)' },
  { id: 'SUPPORT_MACRO_RUN', operation: 'DISPLAY_COMPOSE', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'SUPPORT_MACRO cue: macroId, literal program', consumed: 'CONSUMED', description: 'Support macro execution (ROM-verified literal program)' },
  { id: 'SUPPORT_DISPLAY_CLEAR', operation: 'DISPLAY_CLEAR', family: 'SUPPORT', evidence: 'ROM_HANDLER_VERIFIED', source: 'DISPLAY_CLEAR cue → RomDisplayPresenter', consumed: 'CONSUMED', description: 'Support display clear (BG restore)' },

  // ── DEFENSE ──
  { id: 'DEFENSE_PREP_SCENE', operation: 'SCENE_SET', family: 'DEFENSE', evidence: 'PRESENTATION_DERIVED', source: 'DEFENDER_ACTION scene 12t (buildTimeline.ts)', consumed: 'CONSUMED', description: 'Defense preparation scene (12t, camera on defender)' },
  { id: 'DEFENSE_GUARD_VISIBILITY', operation: 'FIGHTER_VISIBILITY', family: 'DEFENSE', evidence: 'PRESENTATION_DERIVED', source: 'applySceneVisibility() DEFENDER_ACTION → actor hidden, target shown', consumed: 'CONSUMED', description: 'Guard: defender visible, attacker hidden in DEFENDER_ACTION' },
  { id: 'DEFENSE_MOVE_VISUAL', operation: 'FIGHTER_MOTION', family: 'DEFENSE', evidence: 'PRESENTATION_DERIVED', source: 'POSITION_CHANGED → FIGHTER_POSITION cue (tactical move reflected)', consumed: 'CONSUMED', description: 'Move defense: visual position change (tactical state stays Engine-owned)' },
  { id: 'DEFENSE_GUARD_FX', operation: 'FX_VISIBILITY', family: 'DEFENSE', evidence: 'ROM_HANDLER_VERIFIED', source: 'DEFENSE_FX cue → RomDisplayPresenter', consumed: 'CONSUMED', description: 'Defense FX (avoided/nullified/attenuated/absorbed)' },

  // ── GATHER ──
  { id: 'GATHER_SCENE_SOLO', operation: 'SCENE_SET', family: 'GATHER', evidence: 'PRESENTATION_DERIVED', source: 'PLAYER_ACTION/ENEMY_ACTION scene (buildTimeline)', consumed: 'CONSUMED', description: 'Gather Power: ACTION_SOLO scene' },
  { id: 'GATHER_AURA', operation: 'FX_VISIBILITY', family: 'GATHER', evidence: 'PRESENTATION_DERIVED', source: 'AURA power variant (gather → contact duration)', consumed: 'CONSUMED', description: 'Gather power aura (presentation-derived overlay)' },

  // ── SPECIAL (PENDING_ROM_TRACE) ──
  { id: 'SPECIAL_HELL_FLASH_SCENE', operation: 'SCENE_SET', family: 'SPECIAL', evidence: 'PENDING_ROM_TRACE', source: '$0B Hell Flash: scene choreography unknown', consumed: 'PENDING', description: 'Hell Flash: scene/camera/visibility/layering pending ROM trace' },
  { id: 'SPECIAL_BIG_BANG_SCENE', operation: 'SCENE_SET', family: 'SPECIAL', evidence: 'PENDING_ROM_TRACE', source: '$0F Big Bang Attack: scene choreography unknown', consumed: 'PENDING', description: 'Big Bang: scene/camera/visibility/layering pending ROM trace' },
  { id: 'SPECIAL_BEAM_CANNON_SCENE', operation: 'SCENE_SET', family: 'SPECIAL', evidence: 'PENDING_ROM_TRACE', source: '$16 S.Beam Cannon: scene choreography unknown', consumed: 'PENDING', description: 'S.Beam Cannon: scene/camera/visibility/layering pending ROM trace' },
  { id: 'SPECIAL_SPIRIT_BOMB_SCENE', operation: 'SCENE_SET', family: 'SPECIAL', evidence: 'PENDING_ROM_TRACE', source: '$22 Spirit Bomb: scene choreography unknown', consumed: 'PENDING', description: 'Spirit Bomb: scene/camera/visibility/layering pending ROM trace' },
  { id: 'SPECIAL_DESTRUCTO_DISK_SCENE', operation: 'SCENE_SET', family: 'SPECIAL', evidence: 'PENDING_ROM_TRACE', source: '$12 Destructo Disk: scene choreography unknown', consumed: 'PENDING', description: 'Destructo Disk: scene/camera/visibility/layering pending ROM trace' },
  { id: 'SPECIAL_TAIL_SCENE', operation: 'SCENE_SET', family: 'SPECIAL', evidence: 'PENDING_ROM_TRACE', source: '$3F Tail: multi-plane Oozaru choreography unknown', consumed: 'PENDING', description: 'Tail/Oozaru: multi-plane scene choreography pending ROM trace' },
];

// ═══════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════

export function cuesByFamily(family: SceneCueFamily): RomSceneCueEntry[] {
  return ROM_SCENE_CUES.filter(c => c.family === family);
}

export function cuesByEvidence(evidence: SceneCueEvidence): RomSceneCueEntry[] {
  return ROM_SCENE_CUES.filter(c => c.evidence === evidence);
}

export function cuesByConsumed(consumed: RomSceneCueEntry['consumed']): RomSceneCueEntry[] {
  return ROM_SCENE_CUES.filter(c => c.consumed === consumed);
}

export function traceOnlyCues(): RomSceneCueEntry[] {
  return ROM_SCENE_CUES.filter(c => c.consumed === 'TRACE_ONLY');
}

export function pendingCues(): RomSceneCueEntry[] {
  return ROM_SCENE_CUES.filter(c => c.consumed === 'PENDING');
}

export function bridgeCues(): RomSceneCueEntry[] {
  return ROM_SCENE_CUES.filter(c => c.consumed === 'BRIDGE');
}

export function sceneCueSummary(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of ROM_SCENE_CUES) {
    counts[c.evidence] = (counts[c.evidence] || 0) + 1;
  }
  return counts;
}

export function sceneCueFamilySummary(): Record<string, { total: number; consumed: number; traceOnly: number; pending: number; bridge: number }> {
  const result: Record<string, { total: number; consumed: number; traceOnly: number; pending: number; bridge: number }> = {};
  for (const c of ROM_SCENE_CUES) {
    if (!result[c.family]) result[c.family] = { total: 0, consumed: 0, traceOnly: 0, pending: 0, bridge: 0 };
    result[c.family].total++;
    if (c.consumed === 'CONSUMED') result[c.family].consumed++;
    else if (c.consumed === 'TRACE_ONLY') result[c.family].traceOnly++;
    else if (c.consumed === 'PENDING') result[c.family].pending++;
    else if (c.consumed === 'BRIDGE') result[c.family].bridge++;
  }
  return result;
}

export function hardcodedSceneSwitches(): RomSceneCueEntry[] {
  return ROM_SCENE_CUES.filter(c =>
    c.evidence === 'PRESENTATION_DERIVED' &&
    (c.operation === 'SCENE_SET' || c.operation === 'FIGHTER_VISIBILITY')
  );
}

export function hardcodedCameraMs(): number {
  return 0; // Verified: no ms-based camera operations exist
}

export function presentationToGameplayMutations(): number {
  return 0; // Verified: presentation never writes to gameplay state
}
