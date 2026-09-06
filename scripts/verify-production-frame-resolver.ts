import { CARDS, getCard } from '../src/data/cards';
import { SCENARIOS } from '../src/data/scenarios';
import { actionDescriptorForCard } from '../src/battle/engine/commands/buildActionDescriptor';
import { buildPresentationTimeline } from '../src/battle/engine/presentation';
import { romActionExecutionDescriptorForCard } from '../src/battle/romActionExecutionDescriptors';
import { romPresentationProfileForCard } from '../src/battle/romPresentationProfiles';
import { resolveProductionFrame, physicalFormStatuses, productionFrameResolverSummary } from '../src/battle/productionFrameResolver';
import { physicalIdForContent, physicalIndexCollisions } from '../src/data/romPhysicalFrameIndex';
import { resolveRomSequenceSelector } from '../src/battle/romSequenceSelectors';
import { physicalContentKey } from '../src/battle/romNativeIdentity';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BEAM_BASE_ROM_HANDLER, beamBaseProfileForAction } from '../src/battle/beamBaseRomCutover';
import { ProductionRomPresentationAdapter } from '../src/renderer/pixi/presentation/ProductionRomPresentationAdapter';
import type { BattlePresentation, BattleScene } from '../src/renderer/pixi/presentation/BattlePresentation';
import type { BattleEventEnvelope } from '../src/battle/engine/events';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) {
    failures++;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

class ProbePresentation implements BattlePresentation {
  frameOffsets = 0;
  setScene(_scene: BattleScene): void {}
  setFighterVisibility(): void {}
  setFighterPosition(): void {}
  setActionObjectPosition(): void {}
  moveActionObject(): void {}
  setActorPose(_pose: string): void {}
  setTargetPose(_pose: string): void {}
  moveActor(): void {}
  spawnProjectile(): void {}
  setProjectileProgress(): void {}
  impact(): void {}
  camera(): void {}
  returnToField(): void {}
  applyFrameOffset(): void { this.frameOffsets++; }
  setRomSequenceForSlot(): void {}
  moveActorByRomMotion(): void {}
  moveTargetByRomMotion(): void {}
  applyScreenMotion(): void {}
  applyScreenRestore(): void {}
  applyScreenPath(): void {}
  sync(): void {}
}

const statuses = physicalFormStatuses();
check('48 forms have explicit physical status', statuses.length === 48, String(statuses.length));
check('no generic MISSING status exists', statuses.every(status => status.status !== 'ERROR' || status.reason.length > 0));
check('0 forms classified as PALETTE_UNRESOLVED', statuses.filter(status => status.status === 'PALETTE_UNRESOLVED').length === 0, statuses.filter(status => status.status === 'PALETTE_UNRESOLVED').map(status => status.formId).join(', '));
check('48 forms classified as RENDERED', statuses.filter(status => status.status === 'RENDERED').length === 48, String(statuses.filter(status => status.status === 'RENDERED').length));
check('every non-rendered form has concrete cause', statuses.filter(status => status.status !== 'RENDERED').every(status =>
  status.status === 'PALETTE_UNRESOLVED' ||
  status.status === 'GRAPHICS_BANK_UNRESOLVED' ||
  status.status === 'METASPRITE_UNRESOLVED' ||
  status.status === 'GRAPHICS_BLOCK_UNRESOLVED' ||
  status.status === 'CORPUS_BINDING_UNRESOLVED' ||
  status.status === 'NO_REACHABLE_RESOURCE' ||
  status.status === 'ERROR'
));

const gokuR03F0 = resolveProductionFrame({
  formId: 'goku_base',
  animationResource: 0x03,
  sequenceSelector: 0,
  frameIndex: 0,
});
check('resolver: goku_base r03 seq0 frame0 -> ROM_PHYSICAL', gokuR03F0.source === 'ROM_PHYSICAL', JSON.stringify(gokuR03F0));
check('resolver: preserves duration + signed/raw offsets', gokuR03F0.durationTicks != null && gokuR03F0.rawOffsetX != null && gokuR03F0.offsetX != null && gokuR03F0.evidence.includes('offsetEncoding=s8'));
check('resolver: strong physical file id', gokuR03F0.file === `physical/${gokuR03F0.physicalId}.png` && /^rom-p[0-9a-f]{2}-g[0-9a-f]{2}-r03-vf[0-9a-f]{2}-ms[0-9a-f]{8}-gfx[0-9a-f]{8}$/.test(gokuR03F0.physicalId ?? ''), gokuR03F0.file ?? '');

const sourceA = { profileKey: 5, graphicsBank: 0x36, animationBank: 0x61, resourceBase: 0x4970, resourceId: null, visualFrameId: 7 };
const sourceB = { profileKey: 5, graphicsBank: 0x36, animationBank: 0x62, resourceBase: 0x406c, resourceId: 0, visualFrameId: 7 };
check('identity: bank $61 and catalog resource/VFID do not share physical content key', physicalContentKey(sourceA) !== physicalContentKey(sourceB), `${physicalContentKey(sourceA)} vs ${physicalContentKey(sourceB)}`);
check('identity: bank $61 content lookup accepts resourceId null', physicalIdForContent(sourceA) === null || typeof physicalIdForContent(sourceA) === 'string');
check('identity: physical index content collisions = 0', physicalIndexCollisions().length === 0, String(physicalIndexCollisions().length));

const resolverSource = readFileSync(join(process.cwd(), 'src/battle/productionFrameResolver.ts'), 'utf8');
check('resolver source: no local physicalFrameFor weak lookup', !resolverSource.includes('function physicalFrameFor('));
check('resolver source: no resourceId+visualFrameId authority predicate', !/frame\.resourceId\s*={2,3}[^&]+&&\s*frame\.visualFrameId\s*={2,3}/s.test(resolverSource));

const unsupportedResource = resolveProductionFrame({
  formId: 'android_16',
  animationResource: 0x03,
  sequenceSelector: 0,
  frameIndex: 0,
});
check('resolver: unsupported form/resource stays UNRESOLVED without silent fallback', unsupportedResource.source === 'UNRESOLVED' && !!unsupportedResource.fallbackReason?.includes('not rendered for android_16'), unsupportedResource.fallbackReason ?? '');

const fallback = resolveProductionFrame({
  formId: 'android_16',
  animationResource: 0x03,
  sequenceSelector: 0,
  frameIndex: 0,
  fallbackPose: 'beam_charge',
  fallbackIndex: 0,
});
check('resolver: fallback is explicit MANIFEST_FALLBACK', fallback.source === 'MANIFEST_FALLBACK' && fallback.evidence.includes('EXPLICIT_REMAKE_FALLBACK'), JSON.stringify(fallback));

const beamHandlerCards = CARDS.filter(card => romActionExecutionDescriptorForCard(card).execution.handler === BEAM_BASE_ROM_HANDLER);
const supportHandlerCards = beamHandlerCards.filter(card => card.type === 'support');
check('handler $02 total remains 38', beamHandlerCards.length === 38, String(beamHandlerCards.length));
check('SUPPORT + handler $02 never enters BEAM_BASE', supportHandlerCards.length === 22 && supportHandlerCards.every(card => !beamBaseProfileForAction(actionDescriptorForCard(card))), supportHandlerCards.map(card => card.name).join(', '));
check('SUPPORT + BEAM_BASE presentation fails closed', supportHandlerCards.every(card => romPresentationProfileForCard(card).kind !== 'BEAM_BASE'));

const kame = getCard(12);
if (!kame) throw new Error('Kamehameha card missing');
const kameSelector = resolveRomSequenceSelector({ cardId: kame.id, formId: 'goku_base', animationResource: 0x03 });
check('selector: Kamehameha + goku_base uses ROM table, not seq0 fallback', kameSelector.sequence === 2 && kameSelector.evidence === 'BEAM_ACTOR_SELECTOR_TABLE_V4', JSON.stringify(kameSelector));
const piccoloKameSelector = resolveRomSequenceSelector({ cardId: kame.id, formId: 'piccolo_base', animationResource: 0x03 });
check('selector: unresolved card/form pair fails closed', piccoloKameSelector.sequence === null && piccoloKameSelector.evidence === 'UNRESOLVED', JSON.stringify(piccoloKameSelector));
const action = actionDescriptorForCard(kame);
const context = {
  playerFormId: 'goku_base',
  enemyFormId: 'piccolo_base',
  overviewBackground: SCENARIOS[0].overviewBackground,
  actionBackground: SCENARIOS[0].actionBackground,
  specialActionBackground: SCENARIOS[0].actionBackground,
};
const events: BattleEventEnvelope[] = [
  { sequence: 0, tick: 10, event: { type: 'ACTION_STARTED', side: 'player', action } },
  { sequence: 1, tick: 10, event: { type: 'ATTACK_HIT', source: 'player', target: 'enemy', outcome: 'hit' } },
  { sequence: 2, tick: 10, event: { type: 'ACTION_RESOLVED', side: 'player', action } },
];
const timeline = buildPresentationTimeline({ events, context });
const physicalCues = timeline.entries.map(entry => entry.cue).filter(cue => cue.type === 'ROM_PHYSICAL_FRAME');
check('timeline emits ROM_PHYSICAL_FRAME cues for ROM-backed beam', physicalCues.length > 0, String(physicalCues.length));
check('timeline physical cues are all ROM_PHYSICAL for rendered golden form', physicalCues.every(cue => cue.type === 'ROM_PHYSICAL_FRAME' && cue.source === 'ROM_PHYSICAL'));
check('timeline physical cues preserve GBC durations/offsets', physicalCues.every(cue => cue.type === 'ROM_PHYSICAL_FRAME' && cue.durationTicks != null && cue.offsetX != null && cue.offsetY != null));
check('timeline physical cues use selected ROM sequence', physicalCues.every(cue => cue.type === 'ROM_PHYSICAL_FRAME' && cue.sequence === kameSelector.sequence), physicalCues.map(cue => cue.type === 'ROM_PHYSICAL_FRAME' ? cue.sequence : '?').join(','));

const probe = new ProbePresentation();
const adapter = new ProductionRomPresentationAdapter(probe);
adapter.reset('ROM');
for (const entry of timeline.entries) adapter.consume(entry.cue);
const snap = adapter.snapshot;
check('adapter records rendered physical provenance', snap.physicalFrames === physicalCues.length && snap.lastPhysicalFrame?.source === 'ROM_PHYSICAL', `${snap.physicalFrames}/${physicalCues.length}`);
check('adapter has no mixed physical sources for golden beam', Object.keys(snap.physicalFrameSources).length === 1 && snap.physicalFrameSources.ROM_PHYSICAL === physicalCues.length, JSON.stringify(snap.physicalFrameSources));
check('adapter applies ROM-native frame offsets', probe.frameOffsets === physicalCues.length, `${probe.frameOffsets}/${physicalCues.length}`);

const summary = productionFrameResolverSummary();
check('summary: ROM physical production counts BEAM_BASE + Stage Bank $61', summary.cards.romPresentationProduction === 20 && summary.cards.legacy === 105, `${summary.cards.romPresentationProduction}/${summary.cards.legacy}`);
check('summary: MIXED invariant zero', summary.cards.mixed === 0, String(summary.cards.mixed));
check('summary: no unresolved rendered', summary.productionConsumption.unresolvedRendered === 0, String(summary.productionConsumption.unresolvedRendered));

if (failures > 0) {
  console.log(`\n❌ verify:production-frame-resolver FAIL (${failures})`);
  process.exit(1);
}
console.log('\n✅ verify:production-frame-resolver PASS');
