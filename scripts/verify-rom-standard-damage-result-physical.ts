import { ROM_STANDARD_DAMAGE_RESULT_PHYSICAL } from '../src/battle/romStandardDamageResultPhysical';

let checks = 0;
function ok(condition: unknown, message: string): void {
  checks++;
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const hit = ROM_STANDARD_DAMAGE_RESULT_PHYSICAL.HIT;
ok(hit.macroId === 0x2f && hit.macroAddress === 0x6129, '$2F HIT macro identity');
ok(hit.actor.descriptorSlot === 6 && hit.actor.sequence === 1 && hit.actor.waitFrame === 2, 'HIT actor slot6 seq1 WAIT_FRAME2');
ok(hit.target.length === 2, 'HIT has two fixed target phases');
ok(hit.target[0].descriptorSlot === 0 && hit.target[0].resourceBase === 0x4030 && hit.target[0].sequence === 0x0d, 'HIT target phase1 resource0 seq0D');
ok(hit.target[0].frameCount === 15 && hit.target[0].totalTicks === 23, 'HIT target seq0D = 15f/23t');
ok(hit.target[1].descriptorSlot === 0 && hit.target[1].resourceBase === 0x4030 && hit.target[1].sequence === 0x19, 'HIT target phase2 resource0 seq19');
ok(hit.target[1].frameCount === 12 && hit.target[1].totalTicks === 23, 'HIT target seq19 = 12f/23t');

const miss = ROM_STANDARD_DAMAGE_RESULT_PHYSICAL.MISS;
ok(miss.macroId === 0x30 && miss.macroAddress === 0x616b, '$30 MISS macro identity');
ok(miss.actor.descriptorSlot === 6 && miss.actor.sequence === 1 && miss.actor.waitFrame === 2, 'MISS actor slot6 seq1 WAIT_FRAME2');
ok(miss.target.length === 1, 'MISS has one fixed target phase');
ok(miss.target[0].descriptorSlot === 7 && miss.target[0].resourceBase === 0x5e20 && miss.target[0].sequence === 0x13, 'MISS target descriptor7 seq13');
ok(miss.target[0].frameCount === 13 && miss.target[0].totalTicks === 79, 'MISS target seq13 = 13f/79t');

const special = ROM_STANDARD_DAMAGE_RESULT_PHYSICAL.SPECIAL_DEFENSE;
ok(special.macroId === 0x31 && special.macroAddress === 0x6199, '$31 SPECIAL_DEFENSE macro identity');
ok(special.actor.descriptorSlot === 6 && special.actor.sequence === 1 && special.actor.waitFrame === 2, 'SPECIAL_DEFENSE actor slot6 seq1 WAIT_FRAME2');
ok(special.target.length === 1, 'SPECIAL_DEFENSE has one fixed target phase');
ok(special.target[0].descriptorSlot === 7 && special.target[0].resourceBase === 0x5e20 && special.target[0].sequence === 0x14, 'SPECIAL_DEFENSE target descriptor7 seq14');
ok(special.target[0].frameCount === 11 && special.target[0].totalTicks === 27, 'SPECIAL_DEFENSE target seq14 = 11f/27t');

console.log(`ROM STANDARD_DAMAGE result physical: ${checks}/${checks} checks OK · HIT $4030:$0D→$19 · MISS $5E20:$13 · SPECIAL $5E20:$14`);
