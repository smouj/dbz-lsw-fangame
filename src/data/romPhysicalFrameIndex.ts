// ═══════════════════════════════════════════════════════════════════════
// romPhysicalFrameIndex.ts — profile-specific deterministic join to the
// ROM physical corpus (`rom-p...` physicalId).
//
// The physical corpus is content-addressed: a frame is uniquely identified
// by (profileKey, graphicsBank, resourceId, visualFrameId). `sequence` and
// `frameIndex` are occurrences, not content identity. This module provides
// the SINGLE shared join that maps ROM coordinates to a `rom-p...` id, so no
// consumer fabricates its own string key.
//
// Authority: ROM_PHYSICAL_CORPUS_SUMMARY (generated) + ROM_FIGHTER_FORM_IDENTITY.
// ═══════════════════════════════════════════════════════════════════════

import { ROM_PHYSICAL_CORPUS_SUMMARY } from './generated/romPhysicalCorpus.generated';
import { ROM_FIGHTER_FORM_IDENTITY } from './generated/romFighterFormIdentity.generated';
import {
  physicalContentKey,
  type RomPhysicalContentKey,
  contentKeyForCatalog,
} from '../battle/romNativeIdentity';

export interface PhysicalCorpusFrameRef {
  physicalId: string;
  file: string;
  resourceId: number;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
}

export interface FormProfileRef {
  formId: string;
  actorVisualProfileKey: number;
  graphicsBank: number;
}

// ── Form profile authority (formId → profileKey + graphicsBank) ───────

const FORM_PROFILE: Map<string, FormProfileRef> = new Map(
  ROM_FIGHTER_FORM_IDENTITY.map(row => [
    row.formId,
    {
      formId: row.formId,
      actorVisualProfileKey: row.actorVisualProfileKey,
      graphicsBank: row.graphicsBank,
    },
  ]),
);

// ── Content index (profileKey:bank:resource:visualFrameId → rom-p id) ──

type CorpusFrame = {
  physicalId: string;
  file: string;
  resourceId: number;
  visualFrameId: number;
  actorVisualProfileKey: number;
  graphicsBank: number;
};

const CONTENT_INDEX: Map<string, PhysicalCorpusFrameRef> = new Map();
const CONTENT_COLLISIONS: Array<{ key: string; a: string; b: string }> = [];

for (const form of ROM_PHYSICAL_CORPUS_SUMMARY.forms as ReadonlyArray<{
  formId: string;
  physicalFrameIndex?: ReadonlyArray<CorpusFrame>;
}>) {
  const index = form.physicalFrameIndex ?? [];
  for (const frame of index) {
    const contentKey = physicalContentKey(contentKeyForCatalog(
      frame.actorVisualProfileKey,
      frame.graphicsBank,
      frame.resourceId,
      frame.visualFrameId,
    ));
    const existing = CONTENT_INDEX.get(contentKey);
    if (existing && existing.physicalId !== frame.physicalId) {
      CONTENT_COLLISIONS.push({ key: contentKey, a: existing.physicalId, b: frame.physicalId });
      continue;
    }
    CONTENT_INDEX.set(contentKey, {
      physicalId: frame.physicalId,
      file: frame.file,
      resourceId: frame.resourceId,
      visualFrameId: frame.visualFrameId,
      actorVisualProfileKey: frame.actorVisualProfileKey,
      graphicsBank: frame.graphicsBank,
    });
  }
}

// ── Public API ─────────────────────────────────────────────────────────

/** Form → profile/bank for a project formId. Null if the form has no ROM identity. */
export function profileForForm(formId: string): FormProfileRef | null {
  return FORM_PROFILE.get(formId) ?? null;
}

/** Join a content identity to a `rom-p...` physicalId (deterministic). */
export function physicalIdForContent(content: RomPhysicalContentKey): string | null {
  return CONTENT_INDEX.get(physicalContentKey(content))?.physicalId ?? null;
}

/** Join a form + resource + visualFrameId to a `rom-p...` physicalId. */
export function physicalIdForFormFrame(
  formId: string,
  resourceId: number,
  visualFrameId: number,
): string | null {
  const profile = FORM_PROFILE.get(formId);
  if (!profile) return null;
  return physicalIdForContent(contentKeyForCatalog(
    profile.actorVisualProfileKey,
    profile.graphicsBank,
    resourceId,
    visualFrameId,
  ));
}

/** Resolve a `rom-p...` physicalId from a structured logical frame key. */
export function physicalIdForFrameKey(frame: {
  profileKey: number;
  graphicsBank: number;
  resourceId: number;
  visualFrameId: number;
}): string | null {
  return physicalIdForContent(contentKeyForCatalog(
    frame.profileKey,
    frame.graphicsBank,
    frame.resourceId,
    frame.visualFrameId,
  ));
}

/** Full corpus frame ref for a content identity. */
export function corpusFrameForContent(content: RomPhysicalContentKey): PhysicalCorpusFrameRef | null {
  return CONTENT_INDEX.get(physicalContentKey(content)) ?? null;
}

/** All `rom-p...` physicalIds promoted for a given form. */
export function physicalIdsForForm(formId: string): string[] {
  const profile = FORM_PROFILE.get(formId);
  if (!profile) return [];
  const out: string[] = [];
  for (const frame of CONTENT_INDEX.values()) {
    if (frame.actorVisualProfileKey === profile.actorVisualProfileKey && frame.graphicsBank === profile.graphicsBank) {
      out.push(frame.physicalId);
    }
  }
  return out;
}

/** All `rom-p...` physicalIds promoted for a form+resource (for COMPOSITE source listing). */
export function physicalIdsForFormResource(formId: string, resourceId: number): string[] {
  const profile = FORM_PROFILE.get(formId);
  if (!profile) return [];
  const out: string[] = [];
  for (const frame of CONTENT_INDEX.values()) {
    if (
      frame.actorVisualProfileKey === profile.actorVisualProfileKey &&
      frame.graphicsBank === profile.graphicsBank &&
      frame.resourceId === resourceId
    ) {
      out.push(frame.physicalId);
    }
  }
  return out;
}

/** Content-index collisions (same ROM coordinates → different physicalId). Should be empty. */
export function physicalIndexCollisions(): Array<{ key: string; a: string; b: string }> {
  return CONTENT_COLLISIONS;
}

export function physicalIndexSize(): number {
  return CONTENT_INDEX.size;
}
