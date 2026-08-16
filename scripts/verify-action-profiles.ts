import { compileActionProfile, resolveActionProfile, ACTION_PROFILE_REGISTRY, actionSemanticsForCard, listActionProfiles, slugifyCardName } from '../src/battle/actionProfiles';
import { STAGE_SEQUENCE_POOL, nextStageSequence, resetStageRotation, hasDirections } from '../src/battle/stageSequences';
import { profileFor } from '../src/battle/profiles';
import { BattleTimeline, buildProfile, track } from '../src/battle/timeline';
import { CARDS } from '../src/data/cards';
import { resolveProjectileVisualMode } from '../src/renderer/pixi/presentation/projectileVisual';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// 1) Todos los perfiles firma compilan y son válidos
const seenIds = new Set<string>();
const seenSlugs = new Set<string>();
for (const spec of ACTION_PROFILE_REGISTRY) {
  check(`registry:${spec.id}:uniqueId`, !seenIds.has(spec.id));
  seenIds.add(spec.id);
  for (const slug of spec.match) {
    check(`registry:${spec.id}:${slug}:uniqueSlug`, !seenSlugs.has(slug));
    seenSlugs.add(slug);
  }

  const p = compileActionProfile(spec);
  check(`compile:${spec.id}:totalTicks>0`, p.totalTicks > 0, `total=${p.totalTicks}`);
  check(`compile:${spec.id}:presentation`, p.presentation === spec.entry.destination);
  check(`compile:${spec.id}:id`, p.id === spec.id);
  const ticks = p.tracks.map(t => t.tick);
  const sorted = [...ticks].sort((a, b) => a - b);
  check(`compile:${spec.id}:sorted`, JSON.stringify(ticks) === JSON.stringify(sorted));
  const shot0 = p.tracks.some(t => t.tick === 0 && t.event.type === 'SHOT');
  check(`compile:${spec.id}:shot0`, shot0);
  if (spec.projectile) {
    const spawnShot = p.tracks.some(t =>
      t.tick === spec.projectile?.spawnFrame &&
      t.event.type === 'SHOT' &&
      (t.event.payload as { shot?: string })?.shot === 'PROJECTILE');
    check(`compile:${spec.id}:projectileShotAtSpawn`, spawnShot);
    check(`compile:${spec.id}:startsSolo`, p.presentation === 'ACTION_SOLO', p.presentation);
  }
  if (spec.rush) {
    const duelShot = p.tracks.some(t =>
      t.tick === spec.rush?.startFrame &&
      t.event.type === 'SHOT' &&
      (t.event.payload as { shot?: string })?.shot === 'ACTION_DUEL');
    const rushTrack = p.tracks.some(t =>
      t.tick === spec.rush?.startFrame &&
      t.event.type === 'RUSH');
    check(`compile:${spec.id}:duelShotAtRush`, duelShot);
    check(`compile:${spec.id}:rushTrackAtRush`, rushTrack);
    check(`compile:${spec.id}:startsSolo`, p.presentation === 'ACTION_SOLO', p.presentation);
  }
  const projectileRush = p.tracks.some(t =>
    t.event.type === 'PROJECTILE' &&
    (t.event.payload as { action?: string })?.action === 'rush');
  check(`compile:${spec.id}:noProjectileRush`, !projectileRush);
  const fr = p.tracks.find(t => t.event.type === 'FIELD_RETURN');
  check(`compile:${spec.id}:fieldReturn`, !!fr && fr.tick === spec.returnToField);
  const maxTick = Math.max(...ticks);
  check(`compile:${spec.id}:maxTick===return`, maxTick === spec.returnToField, `max=${maxTick}`);
  // determinismo
  const p2 = compileActionProfile(spec);
  check(`compile:${spec.id}:deterministic`, JSON.stringify(p.tracks) === JSON.stringify(p2.tracks));
  const actorPoses = p.tracks
    .filter(t => t.event.type === 'ACTOR_POSE')
    .map(t => (t.event.payload as { pose?: string }).pose)
    .filter(Boolean);
  if (spec.kind === 'beam') {
    // Beam: preparación de energía real (gather → charge → fire).
    check(`compile:${spec.id}:commonPrep`, actorPoses.includes('gather_power'), actorPoses.join('>'));
  }
  if (spec.kind === 'damage' || spec.kind === 'command') {
    // Melee/stage: windup de golpe (attack_fwd), NUNCA gather_power
    // (esa pose es de carga de energía; un puñetazo no grita con brazos arriba).
    check(`compile:${spec.id}:noGatherPower`, !actorPoses.includes('gather_power'), actorPoses.join('>'));
    check(`compile:${spec.id}:windupAttackFwd`, actorPoses.includes('attack_fwd'), actorPoses.join('>'));
  }
  if (spec.kind === 'damage') {
    const firstNonIdle = actorPoses.find(pose => pose !== 'idle');
    check(`compile:${spec.id}:meleePrepNotBeamCharge`, firstNonIdle !== 'beam_charge', actorPoses.join('>'));
    // El impacto debe usar la pose de knockback específica del spec
    // (knockback_back/up/down), no hurt genérico pisándola.
    const impactPose = p.tracks
      .filter(t => t.event.type === 'TARGET_POSE')
      .map(t => (t.event.payload as { pose?: string }).pose)
      .filter(Boolean)
      .at(-1);
    check(`compile:${spec.id}:impactTargetPose`, spec.impact?.targetPose != null && impactPose === spec.impact.targetPose, `${impactPose} vs ${spec.impact?.targetPose}`);
  }
}

// 2) Resolver mapea los nombres de carta correctamente
const cases: Array<[string, string]> = [
  ['Kamehameha', 'kamehameha'],
  ['S.Kamehameha', 'kamehameha'],
  ['F.Kamehameha', 'kamehameha'],
  ['Masenko', 'masenko'],
  ['S.Beam Can.', 'special_beam_cannon'],
  ['Spirit Bomb', 'spirit_bomb'],
  ['Final Flash', 'final_flash'],
  ['Energy Wave', 'energy_wave'],
  ['Misty KiWave', 'finger_beam'],
  ['Galick-Ho', 'final_flash'],
  ['Big Bang Atk', 'big_bang_attack'],
  ['Destruct-Disk', 'energy_disk'],
  ['Flash.Sword', 'flash_sword'],
  ['Cont.Punch', 'cont_punch'],
  ['Cont.Kick', 'cont_kick'],
  ['Rising Kick', 'rising_kick'],
  ['Sonic Kick', 'sonic_kick'],
  ['Dunk Shot', 'dunk_shot'],
  ['Crazy Rush', 'crazy_rush'],
  ['Kaio Ken', 'kaio_ken'],
];
for (const [name, id] of cases) {
  const r = resolveActionProfile(name);
  check(`resolve:${name}→${id}`, r?.id === id, r?.id);
}

// 3) Cartas no ofensivas/sin cinematica firma devuelven null
for (const name of ['Taiyoken', 'Barrier']) {
  check(`resolve:${name}→null`, resolveActionProfile(name) === null);
}

// 4) slugify normaliza
check('slugify', slugifyCardName('Cont.Punch') === 'contpunch');
check('slugify2', slugifyCardName('S.Beam Can.') === 'sbeamcan');

// 5) profileFor delega: Kamehameha y Misty KiWave → perfiles firma
const kam = profileFor('beam', 'Kamehameha');
const misty = profileFor('beam', 'Misty KiWave');
check('profileFor:kamehameha:id', kam.id === 'kamehameha', kam.id);
check('profileFor:misty:id', misty.id === 'finger_beam', misty.id);
// Ambos empiezan en ACTION_SOLO: actor prepara solo y el timeline transiciona
// a PROJECTILE al spawn. Los timings siguen compatibles hasta medicion fina.
check('profileFor:samePresentation', kam.presentation === misty.presentation && kam.presentation === 'ACTION_SOLO');
check('profileFor:sameTotal', kam.totalTicks === misty.totalTicks, `${kam.totalTicks} vs ${misty.totalTicks}`);

// 6) Melee firma vs fallback damage (todas las cartas reales tienen perfil;
// el fallback genérico queda para cartas futuras/inventadas)
const punch = profileFor('damage', 'Cont.Punch');
const generic = profileFor('damage', 'Unknown Future Card');
check('profileFor:punch:id', punch.id === 'cont_punch');
check('profileFor:generic:id', generic.id === 'damage:Unknown Future Card');
check('profileFor:meleePresentation', punch.presentation === 'ACTION_SOLO' && generic.presentation === 'ACTION_SOLO');
for (const p of [punch, generic]) {
  check(`profileFor:${p.id}:rushEvent`, p.tracks.some(t => t.event.type === 'RUSH'));
  check(`profileFor:${p.id}:noProjectileRush`, !p.tracks.some(t =>
    t.event.type === 'PROJECTILE' &&
    (t.event.payload as { action?: string })?.action === 'rush'));
}

// 7) Todas las cartas BEAM reales tienen perfil firma y visual explicito.
for (const card of CARDS.filter(c => c.type === 'beam')) {
  const spec = resolveActionProfile(card.name);
  const sem = actionSemanticsForCard(card);
  check(`beam:${card.name}:profile`, !!spec);
  check(`beam:${card.name}:kind`, spec?.kind === 'beam', spec?.kind);
  check(`beam:${card.name}:visual`, sem.visual !== 'rush' && sem.visual !== 'power', String(sem.visual));
}

// 8) Pixi resuelve tanto el alias histórico como las nuevas familias visuales.
for (const [kind, expected] of [
  ['beam', 'ray'], ['ray', 'ray'], ['wave', 'ray'],
  ['ball', 'ball'], ['disk', 'disk'], ['sword', 'sword'], ['unknown', 'special'],
] as const) {
  check(`pixiProjectile:${kind}→${expected}`, resolveProjectileVisualMode(kind) === expected);
}

// 9) BattleTimeline.seek() reconstruye el estado al retroceder.
{
  const events: string[] = [];
  const ticks: number[] = [];
  let resets = 0;
  const p = buildProfile('seek-test', 'PROJECTILE', [
    track(0, 'SHOT', { shot: 'PROJECTILE' }),
    track(3, 'ACTOR_POSE', { pose: 'beam_charge' }),
    track(5, 'PROJECTILE', { action: 'spawn', kind: 'ray', spawnFrame: 5, contactFrame: 9 }),
    track(9, 'PROJECTILE', { action: 'impact' }),
  ]);
  const tl = new BattleTimeline(p, {
    onEvent: e => events.push(`${e.tick}:${e.type}`),
    onTick: tick => ticks.push(tick),
    onReset: () => { resets++; events.push('RESET'); },
    onComplete: () => {},
  });
  tl.seek(9);
  tl.seek(4);
  const afterReset = events.slice(events.lastIndexOf('RESET') + 1);
  check('timelineSeek:resetOnce', resets === 1, String(resets));
  check('timelineSeek:replaysPastOnly', JSON.stringify(afterReset) === JSON.stringify(['0:SHOT', '3:ACTOR_POSE']), afterReset.join(','));
  check('timelineSeek:onTickTarget', ticks.at(-1) === 4, String(ticks.at(-1)));
}

// 7) Toda carta de combate debe tener perfil firma (regresión: nada de
// animación genérica para cartas reales).
const combatCards = CARDS.filter(c => ['command', 'damage', 'beam'].includes(c.type));
const missingProfiles = combatCards.filter(c => !resolveActionProfile(c.name));
for (const card of missingProfiles) {
  check(`cardProfile:${card.name}`, false, 'sin perfil firma');
}
check('cardProfile:allCovered', missingProfiles.length === 0, missingProfiles.map(c => c.name).join(', '));

// 8) Secuencias canónicas de Stage Attack (pool fijo, rotación determinista).
for (const level of [3, 4, 5, 6] as const) {
  const pool = STAGE_SEQUENCE_POOL[level];
  check(`stagePool:${level}:count`, pool.length >= 6, String(pool.length));
  check(`stagePool:${level}:length`, pool.every(s => s.length === level), pool.map(s => s.length).join(','));
  // Cada SLOT es un solo eje (un input nunca es diagonal). El pool solo
  // usa claves individuales UP/DOWN/LEFT/RIGHT, así que esto es garantía
  // estructural; el check verifica que no hay slots compuestos.
  check(`stagePool:${level}:singleAxisPerSlot`, pool.every(s => s.every(k => k === 'A' || k === 'B' || k === 'UP' || k === 'DOWN' || k === 'LEFT' || k === 'RIGHT')));
  // 3 Stage: solo A/B; 4+: 3 golpes + (n-3) direcciones
  check(`stagePool:${level}:grammar`, pool.every(s => {
    const dirs = s.filter(k => k === 'UP' || k === 'DOWN' || k === 'LEFT' || k === 'RIGHT');
    const ab = s.filter(k => k === 'A' || k === 'B');
    return ab.length === 3 && dirs.length === level - 3;
  }));
  check(`stagePool:${level}:noAdjacentDirRepetition`, pool.every(s => {
    const dirSeq = s.filter(k => k === 'UP' || k === 'DOWN' || k === 'LEFT' || k === 'RIGHT');
    return dirSeq.every((d, i) => i === 0 || d !== dirSeq[i - 1]);
  }));
}
// Rotación round-robin: 6 llamadas seguidas al mismo nivel no repiten
// secuencia; la 7ª vuelve a la primera (determinismo).
for (const level of [3, 4, 5, 6] as const) {
  resetStageRotation(level);
  const seen = new Set<string>();
  const poolSize = STAGE_SEQUENCE_POOL[level].length;
  for (let i = 0; i < poolSize; i++) seen.add(nextStageSequence(level).join(''));
  check(`stageRotation:${level}:noRepeatWithinPool`, seen.size === poolSize, `${seen.size}/${poolSize}`);
  const first = nextStageSequence(level).join('');
  check(`stageRotation:${level}:wrapsDeterministic`, first === STAGE_SEQUENCE_POOL[level][0].join(''), first);
}
resetStageRotation();
check('stagePool:hasDirections', hasDirections(['A', 'UP']) && !hasDirections(['A', 'B']));

console.log(`\n${listActionProfiles().length} perfiles firma registrados.`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
