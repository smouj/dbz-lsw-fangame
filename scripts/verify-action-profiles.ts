import { compileActionProfile, resolveActionProfile, ACTION_PROFILE_REGISTRY, listActionProfiles, slugifyCardName } from '../src/battle/actionProfiles';
import { profileFor } from '../src/battle/profiles';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// 1) Todos los perfiles firma compilan y son válidos
for (const spec of ACTION_PROFILE_REGISTRY) {
  const p = compileActionProfile(spec);
  check(`compile:${spec.id}:totalTicks>0`, p.totalTicks > 0, `total=${p.totalTicks}`);
  check(`compile:${spec.id}:presentation`, p.presentation === spec.entry.destination);
  check(`compile:${spec.id}:id`, p.id === spec.id);
  const ticks = p.tracks.map(t => t.tick);
  const sorted = [...ticks].sort((a, b) => a - b);
  check(`compile:${spec.id}:sorted`, JSON.stringify(ticks) === JSON.stringify(sorted));
  const shot0 = p.tracks.some(t => t.tick === 0 && t.event.type === 'SHOT');
  check(`compile:${spec.id}:shot0`, shot0);
  const fr = p.tracks.find(t => t.event.type === 'FIELD_RETURN');
  check(`compile:${spec.id}:fieldReturn`, !!fr && fr.tick === spec.returnToField);
  const maxTick = Math.max(...ticks);
  check(`compile:${spec.id}:maxTick===return`, maxTick === spec.returnToField, `max=${maxTick}`);
  // determinismo
  const p2 = compileActionProfile(spec);
  check(`compile:${spec.id}:deterministic`, JSON.stringify(p.tracks) === JSON.stringify(p2.tracks));
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

// 3) Cards sin perfil firma devuelven null
for (const name of ['Misty KiWave', 'Energy Wave', 'Galick-Ho', 'Taiyoken', 'Barrier']) {
  check(`resolve:${name}→null`, resolveActionProfile(name) === null);
}

// 4) slugify normaliza
check('slugify', slugifyCardName('Cont.Punch') === 'contpunch');
check('slugify2', slugifyCardName('S.Beam Can.') === 'sbeamcan');

// 5) profileFor delega: Kamehameha → perfil firma; Misty KiWave → fallback genérico
const kam = profileFor('beam', 'Kamehameha');
const misty = profileFor('beam', 'Misty KiWave');
check('profileFor:kamehameha:id', kam.id === 'kamehameha', kam.id);
check('profileFor:misty:id', misty.id === 'beam:Misty KiWave', misty.id);
// Ambos deben ser PROJECTILE y con los mismos totalTicks (mismo template de kind)
check('profileFor:samePresentation', kam.presentation === misty.presentation && kam.presentation === 'PROJECTILE');
check('profileFor:sameTotal', kam.totalTicks === misty.totalTicks, `${kam.totalTicks} vs ${misty.totalTicks}`);

// 6) Melee firma vs fallback damage
const punch = profileFor('damage', 'Cont.Punch');
const generic = profileFor('damage', 'Atomic Break');
check('profileFor:punch:id', punch.id === 'cont_punch');
check('profileFor:generic:id', generic.id === 'damage:Atomic Break');
check('profileFor:meleePresentation', punch.presentation === 'ACTION_DUEL' && generic.presentation === 'ACTION_DUEL');

console.log(`\n${listActionProfiles().length} perfiles firma registrados.`);
console.log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECKS FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
