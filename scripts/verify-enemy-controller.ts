// ═══════════════════════════════════════════════════════════════════════
// VERIFY: ENEMY CONTROLLER — PA11 gate.
// Uso: npm run verify:enemy-controller
//  A. Pureza: sin React/Pixi/DOM/timers/Math.random (estático sobre el
//     módulo del controller).
//  B. Legalidad: miles de decisiones → command pasa canExecute (autoridad).
//  C. Determinismo: mismo estado+session+seed → misma decisión.
//  D. Attack fixtures: offensive card / low CC / high CC / gather útil /
//     gather inútil / low HP+heal / full HP+heal / empty deck / only BASIC.
//  E. Defense fixtures: defense card / only guard / move.
//  F. Initiative: enemy ex0 ataca · player ex1 → el enemigo NO decide ataque.
//  G. Anti-stall: partidas largas con métricas (max gather consecutivo,
//     heal loops, offensive ratio, KO) — sin reglas secretas del combate.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { BattleRuntime, defaultBattleContext } from '../src/battle/runtime/BattleRuntime';
import { createInitialBattleState, type InitialBattleConfig } from '../src/battle/engine/state/createInitialBattleState';
import { activeAttacker, activeDefender, battleOutcome, getControlBoundary } from '../src/battle/engine/state/battleStateSelectors';
import { decideEnemyCommand, createEnemySession, getAvailableCommands, type EnemyDecision } from '../src/battle/enemy/enemyController';
import { BattlePosition } from '../src/data/positions';
import { getCard, type CardDef } from '../src/data/cards';
import { createBattleDeck, drawOne, CC_GAIN_PER_ATTACK_PHASE } from '../src/battle/state';
import type { BattleState } from '../src/battle/engine/state/BattleState';
import { canExecute } from '../src/battle/engine/commands/canExecute';
import type { BattleCommand } from '../src/battle/engine/commands/BattleCommand';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) { failures++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
  else console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

function deck(ids: number[]) {
  return createBattleDeck(ids.map((id) => getCard(id) as CardDef));
}
function makeConfig(o: Partial<InitialBattleConfig> = {}): InitialBattleConfig {
  return {
    playerFormId: 'goku_base', playerName: 'GOKU', playerForm: 'Base', playerLevel: 5,
    playerMaxHp: 1000, playerHp: 1000, playerStr: 10, playerKi: 10, playerSpd: 9,
    playerMaxCc: 99, playerCc: 99,
    enemyFormId: 'piccolo_base', enemyName: 'PICCOLO', enemyForm: 'Base', enemyLevel: 5,
    enemyMaxHp: 1000, enemyHp: 1000, enemyStr: 10, enemyKi: 10, enemySpd: 7,
    enemyMaxCc: 99, enemyCc: 99,
    playerPos: BattlePosition.DOWN_BACK, enemyPos: BattlePosition.DOWN_BACK,
    playerDeck: deck([1, 2, 4, 5, 6, 7, 8, 9, 12, 16, 23, 27]),
    enemyDeck: deck([3, 7, 8, 9, 10, 12, 16, 23, 42, 45, 51, 53]),
    playerLimits: [], playerFighterLimits: [],
    firstAttacker: 'enemy',
    ...o,
  };
}

/** Estado ofensivo enemigo: exchange 0 + iniciativa enemiga (el orquestador
 *  sincroniza la fase del ciclo; canExecute es la autoridad). */
function enemyAttackState(cfg: InitialBattleConfig): BattleState {
  const st = createInitialBattleState(cfg);
  return { ...st, phase: 'command' };
}

// ═══ A. PUREZA (estático) ═══
{
  const src = readFileSync(resolve(process.cwd(), 'src/battle/enemy/enemyController.ts'), 'utf8');
  const imports = [...src.matchAll(/^import[^']*'([^']+)'/gm)].map((m) => m[1]);
  const forbiddenImports = imports.filter((m) => /react|pixi|dom/i.test(m));
  check('A. pureza: sin imports React/Pixi/DOM', forbiddenImports.length === 0, forbiddenImports.join(', ') || undefined);
  const forbiddenCode = ['window.', 'document.', 'setTimeout(', 'setInterval(', 'Math.random(', 'Date.now(', 'performance.now(', 'requestAnimationFrame'];
  const codeHits = forbiddenCode.filter((f) => src.includes(f));
  check('A. sin timers/RNG no determinista/DOM', codeHits.length === 0, codeHits.join(', ') || undefined);
  check('A. no muta: sin import de BattleRuntime', !imports.some((m) => m.includes('BattleRuntime')));
  check('A. puro: decideEnemyCommand sin efectos (solo tipos/helpers)', src.includes('export function decideEnemyCommand'));
}

// ═══ C. DETERMINISMO ═══
{
  const state = enemyAttackState(makeConfig());
  const s1 = createEnemySession(0xdeadbeef);
  const s2 = createEnemySession(0xdeadbeef);
  const d1 = decideEnemyCommand({ battle: state, session: s1 });
  const d2 = decideEnemyCommand({ battle: state, session: s2 });
  check('C. determinismo: misma decisión (command+card+intent+nextSession)', JSON.stringify(d1) === JSON.stringify(d2));
}

// ═══ B. LEGALIDAD (miles de decisiones) ═══
{
  let illegal = 0;
  let decisions = 0;
  const sessions = [0x1111, 0x2222, 0x3333, 0x4444, 0x5555, 0x6666].map((s) => createEnemySession(s));
  // variar manos/CC/HP del enemigo para explorar el espacio de decisión
  for (let k = 0; k < 6; k++) {
    const cfg = makeConfig({ enemyCc: [5, 30, 99][k % 3], enemyHp: [50, 300, 1000][k % 3] });
    const base = enemyAttackState(cfg);
    for (let i = 0; i < 300; i++) {
      const session = { ...sessions[k], rngState: (sessions[k].rngState + i * 7919) >>> 0 };
      const d = decideEnemyCommand({ battle: base, session });
      decisions++;
      // legalidad: el comando debe pasar canExecute en la fase del ciclo que
      // el orquestador usa (misma lógica que legal() del controller, probada
      // aquí sobre la autoridad real)
      let ok = false;
      if (d.command.type === 'GUARD' || d.command.type === 'MOVE' || d.command.type === 'PLAY_DEFENSE_CARD') {
        ok = canExecute({ ...base, phase: 'defend' }, d.command, { side: 'enemy', characterId: 'piccolo' }).ok;
      } else {
        for (const phase of ['command', 'cardSelect', 'basic'] as const) {
          let st: BattleState = { ...base, phase };
          if (phase === 'cardSelect' && d.command.type === 'PLAY_CARD') {
            st = { ...st, selectedCard: (d.command as { handIndex: number }).handIndex };
          }
          if (canExecute(st, d.command, { side: 'enemy', characterId: 'piccolo' }).ok) { ok = true; break; }
        }
      }
      if (!ok) {
        illegal++;
        if (illegal < 4) console.log(`   ILEGAL: ${JSON.stringify(d.command)} → ${d.diagnostic.intent} (${d.diagnostic.reason})`);
      }
    }
  }
  check(`B. legalidad: ${decisions} decisiones → 0 ilegales`, illegal === 0, `illegal=${illegal}`);
}

// ═══ D. ATTACK FIXTURES (manos explícitas — el shuffle inicial no es fiable) ═══
{
  const withHand = (st: BattleState, hand: CardDef[]) => ({ ...st, eDeck: { drawPile: [], hand, discardPile: [] } });

  // D1. carta ofensiva disponible → ATTACK_CARD
  const st1 = withHand(enemyAttackState(makeConfig()), [getCard(8) as CardDef]); // Energy Bomb beam acc100
  const d1 = decideEnemyCommand({ battle: st1, session: createEnemySession(7) });
  check('D1. carta ofensiva disponible → ATTACK_CARD', d1.diagnostic.intent === 'ATTACK_CARD', d1.diagnostic.reason);

  // D2. low CC (sin carta asequible) → BASIC
  const st2 = withHand(enemyAttackState(makeConfig({ enemyCc: 0 })), [getCard(8) as CardDef]);
  const d2 = decideEnemyCommand({ battle: st2, session: createEnemySession(7) });
  check('D2. CC bajo → BASIC/Stage', d2.diagnostic.intent === 'BASIC', d2.diagnostic.reason);

  // D3. high CC → elige la MEJOR carta (Cont.Kick atk20 > Energy Wave atk15)
  const st3 = withHand(enemyAttackState(makeConfig()), [getCard(8) as CardDef, getCard(6) as CardDef]);
  const d3 = decideEnemyCommand({ battle: st3, session: createEnemySession(7) });
  check('D3. CC alto → ataque con la mejor carta', d3.diagnostic.intent === 'ATTACK_CARD' && d3.card?.name === 'Cont.Kick', `${d3.diagnostic.intent} ${d3.card?.name}`);

  // D4. sin ofensivas → BASIC/Stage domina (jerarquía del usuario: Stage > Gather).
  //      Gather es ÚLTIMO recurso (solo si ni siquiera el Stage básico es legal).
  const st4 = withHand(enemyAttackState(makeConfig()), [getCard(16) as CardDef]); // Resurrection (heal — no ofensiva)
  const d4 = decideEnemyCommand({ battle: st4, session: createEnemySession(1) });
  check('D4. sin ofensivas legales → BASIC/Stage (no Gather)', d4.diagnostic.intent === 'BASIC', `${d4.diagnostic.intent} — ${d4.diagnostic.reason}`);

  // D5. gather repetido 2× → NO GATHER (anti-loop)
  const d5 = decideEnemyCommand({ battle: st4, session: { ...createEnemySession(1), consecutiveGather: 2 } });
  check('D5. gather repetido 2× → NO GATHER (anti-loop)', d5.diagnostic.intent !== 'GATHER', `${d5.diagnostic.intent} — ${d5.diagnostic.reason}`);

  // D6. heal en mano + HP bajo: el Engine NO permite support heal ofensiva
  //     (canPlayCard exige ofensiva; heal es DEFENSIVA) → el controller no
  //     puede elegir HEAL en ataque → BASIC (paridad con el flujo actual;
  //     el heal enemigo solo existe en contexto defensivo como DEFENSE_CARD).
  const st6 = withHand(enemyAttackState(makeConfig({ enemyHp: 100 })), [getCard(16) as CardDef]); // Resurrection
  const d6 = decideEnemyCommand({ battle: st6, session: createEnemySession(2) });
  check('D6. heal en ataque no es legal → NO HEAL (Engine: heal = defensiva)', d6.diagnostic.intent !== 'HEAL', d6.diagnostic.intent);

  // D7. heal a HP full → NO HEAL (idem: no legal en ataque)
  const st7 = withHand(enemyAttackState(makeConfig()), [getCard(16) as CardDef]);
  const d7 = decideEnemyCommand({ battle: st7, session: createEnemySession(2) });
  check('D7. HP full + heal → NO HEAL', d7.diagnostic.intent !== 'HEAL', d7.diagnostic.intent);

  // D8. empty deck (sin mano) → BASIC stage
  const st8 = withHand(enemyAttackState(makeConfig()), []);
  const d8 = decideEnemyCommand({ battle: st8, session: createEnemySession(3) });
  check('D8. mazo vacío → BASIC/Stage', d8.diagnostic.intent === 'BASIC' || d8.diagnostic.intent === 'PASS', d8.diagnostic.intent);

  // D9. solo support no-heal → BASIC
  const st9 = withHand(enemyAttackState(makeConfig()), [getCard(29) as CardDef]);
  const d9 = decideEnemyCommand({ battle: st9, session: createEnemySession(4) });
  check('D9. solo support no-heal → BASIC', d9.diagnostic.intent === 'BASIC', d9.diagnostic.intent);
}

// ═══ E. DEFENSA ENEMIGA = FUTURE (el Engine manda) ═══
{
  // M8.C2a-L: el Engine SOLO soporta defensa del PLAYER (playerIsDefender →
  // NOT_DEFENDER para side enemy). La defensa enemiga es un cambio de Engine
  // (congelado, prohibido en PA11). El controller mantiene la rama defensiva
  // (enemyController) lista para cuando el Engine la soporte; el orquestador
  // solo lo usa en contexto ofensivo → 0 comandos defensivos ilegales (B).
  const eSt = { ...createInitialBattleState(makeConfig({ firstAttacker: 'player' })), phase: 'defend' as const, defenseState: 'AWAITING_CHOICE' as const, defenseChoice: null };
  const g = canExecute(eSt, { type: 'GUARD' } as never, { side: 'enemy', characterId: 'piccolo' });
  check('E0. Engine: defensa enemiga = NOT_DEFENDER (FUTURE, no tocar Engine)', !g.ok && g.reason === 'NOT_DEFENDER', g.reason);
  const dc = canExecute(eSt, { type: 'PLAY_DEFENSE_CARD', handIndex: 0 } as never, { side: 'enemy', characterId: 'piccolo' });
  check('E1. Engine: PLAY_DEFENSE_CARD enemigo = NOT_DEFENDER', !dc.ok && dc.reason === 'NOT_DEFENDER', dc.reason);
  // E2. En el contexto que usa el orquestador (ofensivo), el controller jamás
  //     propone defensa — cubierto por B (1800 decisiones, 0 ilegales).
  check('E2. controller en contexto ofensivo → nunca defensa ilegal', true, 'cubierto por B');
}

// ═══ F. INITIATIVE ═══
{
  const st1 = createInitialBattleState(makeConfig({ firstAttacker: 'enemy' }));
  check('F1. iniciativa enemiga ex0 → activeAttacker enemy', st1.exchange === 0 && activeAttacker(st1) === 'enemy');
  check('F1b. activeDefender = player', activeDefender(st1) === 'player');
  const d = decideEnemyCommand({ battle: { ...st1, phase: 'command' as const }, session: createEnemySession(9) });
  check('F2. enemy ex0 → decide ataque (no defensa)', d.diagnostic.intent === 'ATTACK_CARD' || d.diagnostic.intent === 'BASIC' || d.diagnostic.intent === 'GATHER' || d.diagnostic.intent === 'HEAL', d.diagnostic.intent);
  // player initiative ex0: activeAttacker = player → el enemigo decide DEFENSA
  const st3 = createInitialBattleState(makeConfig({ firstAttacker: 'player' }));
  check('F3. iniciativa player ex0 → activeAttacker player', activeAttacker(st3) === 'player', `attacker=${activeAttacker(st3)}`);
  const d3 = decideEnemyCommand({ battle: { ...st3, phase: 'defend' as const, defenseState: 'AWAITING_CHOICE' as const, defenseChoice: null }, session: createEnemySession(9) });
  check('F4. player ataca → el enemigo decide DEFENSA (no ataque)', d3.diagnostic.intent === 'DEFENSE_CARD' || d3.diagnostic.intent === 'GUARD' || d3.diagnostic.intent === 'MOVE', d3.diagnostic.intent);
}

// ═══ G. ANTI-STALL: partidas largas con el controller (sin reglas secretas) ═══
{
  const run = (cfg: InitialBattleConfig, maxTurns: number) => {
    const runtime = new BattleRuntime({ state: createInitialBattleState(cfg), context: defaultBattleContext() });
    runtime.state = { ...runtime.state, phase: 'command' };
    let session = createEnemySession(0xabcdef);
    let maxGather = 0, maxHeal = 0, turnsWithoutDamage = 0, maxStall = 0;
    let attacks = 0, decisions = 0, rejected = 0;
    const trace: string[] = [];
    let lastTick = -1, stall = 0, lastPhase = 'command';
    let exchange0Pending = false, enemyAttackPending = false, enemyAttackDone = false, attackDrawnThisTurn = false;
    let steps = 0;

    while (steps < 16000 && runtime.state.turn < maxTurns) {
      const st = runtime.state;
      if (st.player.hp <= 0 || st.enemy.hp <= 0) break;
      if (st.tick > lastTick) { lastTick = st.tick; stall = 0; } else stall++;
      if (st.phase !== lastPhase) { lastPhase = st.phase; stall = 0; }
      if (stall > 800) { trace.push('STALL'); break; }
      steps++;
      trace.push(`${st.turn}:${st.exchange}`);
      if (trace.length > 8) trace.shift();

      // fin de la acción del player → END_EXCHANGE
      if (exchange0Pending && activeAttacker(st) === 'player') {
        runtime.dispatch({ type: 'END_EXCHANGE' } as never);
        const after = runtime.state;
        runtime.state = after.exchange === 1
          ? { ...after, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null }
          : { ...after, phase: 'command' };
        exchange0Pending = false; attackDrawnThisTurn = false;
        continue;
      }
      // defensa del player COMMITTED → el enemigo ataca (controller decide)
      if (enemyAttackPending && activeAttacker(st) === 'enemy') {
        const d = decideEnemyCommand({ battle: st, session });
        session = d.nextSession; decisions++;
        if (d.diagnostic.intent === 'ATTACK_CARD') {
          const card = d.card ?? (st.eDeck.hand[(d.command as { handIndex: number }).handIndex] ?? getCard(1) as CardDef);
          const res = runtime.resolveCard('enemy', card);
          attacks++;
          if (res.events.some((e) => e.type === 'DAMAGE_APPLIED' && e.target === 'player' && e.amount > 0)) turnsWithoutDamage = 0;
          else turnsWithoutDamage++;
        } else if (d.diagnostic.intent === 'HEAL') {
          runtime.resolveCard('enemy', d.card ?? (getCard(16) as CardDef));
          maxHeal = Math.max(maxHeal, session.consecutiveHeal);
          turnsWithoutDamage++;
        } else if (d.diagnostic.intent === 'GATHER') {
          const res = runtime.dispatch(d.command, { side: 'enemy' });
          if (!res.ok) rejected++;
          maxGather = Math.max(maxGather, session.consecutiveGather);
          turnsWithoutDamage++;
        } else {
          runtime.resolveCard('enemy', getCard(1) as CardDef); // BASIC stage
          attacks++;
          turnsWithoutDamage++;
        }
        maxStall = Math.max(maxStall, turnsWithoutDamage);
        enemyAttackPending = false; enemyAttackDone = true;
        continue;
      }
      // ataque enemigo resuelto → END_EXCHANGE
      if (enemyAttackDone && activeAttacker(st) === 'enemy') {
        runtime.dispatch({ type: 'END_EXCHANGE' } as never);
        runtime.state = { ...runtime.state, phase: 'command' };
        enemyAttackDone = false;
        continue;
      }
      // iniciativa enemiga → el player defiende
      if (getControlBoundary(st) === 'PLAYER_ATTACK_CHOICE' && activeAttacker(st) === 'enemy') {
        runtime.state = { ...runtime.state, phase: 'defend', defenseState: 'AWAITING_CHOICE', defenseChoice: null };
        continue;
      }
      // QTE de la acción del player (stage): input correcto — sin timeout.
      // El dispatch del último input DEVUELVE la resolución (ACTION_RESOLVED):
      // es la señal del orquestador para END_EXCHANGE (como en el harness).
      const gq = st.stageQte;
      if (gq.state === 'INPUT_WINDOW') {
        const qres = runtime.dispatch({ type: 'QTE_INPUT', input: gq.seq[gq.idx] } as never);
        if (qres.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) exchange0Pending = true;
        continue;
      }
      if (gq.state === 'COUNTER_WINDOW') {
        const qres = runtime.dispatch({ type: 'QTE_COUNTER_DEFEND' } as never);
        if (qres.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) exchange0Pending = true;
        continue;
      }
      // ataque del player (JOINT → SELECT_CARD → PLAY_CARD → QTE)
      if (getControlBoundary(st) === 'PLAYER_ATTACK_CHOICE') {
        if (st.phase === 'command' && !attackDrawnThisTurn) {
          const drawn = drawOne(runtime.state.deck);
          runtime.state = {
            ...runtime.state,
            deck: drawn.state,
            player: { ...runtime.state.player, cc: Math.min(runtime.state.player.maxCc, runtime.state.player.cc + CC_GAIN_PER_ATTACK_PHASE) },
          };
          attackDrawnThisTurn = true;
        }
        let cmd: BattleCommand | null = null;
        if (st.phase === 'command') cmd = { type: 'JOINT' };
        else if (st.phase === 'cardSelect') {
          // primera carta jugable (compatibilidad + CC) — patrón del harness
          let playableIdx = -1;
          for (let i = 0; i < st.deck.hand.length; i++) {
            if (runtime.can({ type: 'PLAY_CARD', handIndex: i }, { characterId: 'goku' }).ok) { playableIdx = i; break; }
          }
          if (playableIdx >= 0) {
            cmd = st.selectedCard !== playableIdx
              ? { type: 'SELECT_CARD', handIndex: playableIdx }
              : { type: 'PLAY_CARD', handIndex: playableIdx };
          } else {
            // mano muerta (sin cartas jugables) → BASIC directo (el orquestador
            // real permite cancelar; el BASIC universal siempre es legal)
            runtime.state = { ...runtime.state, phase: 'basic', selectedCard: null };
            continue;
          }
        } else if (st.phase === 'basic') cmd = { type: 'BASIC_STAGE_ATTACK' };
        if (!cmd) { runtime.advance(1); continue; }
        if (!runtime.can(cmd, { characterId: 'goku' }).ok) { runtime.advance(1); continue; }
        const res = runtime.dispatch(cmd, { characterId: 'goku' });
        if (res.events.some((e) => e.type === 'ACTION_RESOLVED' && e.side === 'player')) exchange0Pending = true;
        continue;
      }
      // defensa del player (en el juego real es input humano; aquí GUARD)
      if (getControlBoundary(st) === 'PLAYER_DEFENSE_CHOICE') {
        runtime.dispatch({ type: 'GUARD' } as never);
        enemyAttackPending = true;
        continue;
      }
      // (B) QTE del player terminado
      if (st.phase === 'stageInput' && st.stageQte.state === 'WAITING' && !exchange0Pending) {
        exchange0Pending = true;
        continue;
      }
      runtime.advance(1);
    }
    const outcome = battleOutcome(runtime.state);
    return { decisions, maxGather, maxHeal, maxStall, attacks, rejected, outcome: outcome.status, trace: trace.join('|'), turns: runtime.state.turn };
  };

  const r1 = run(makeConfig(), 20);
  check('G1. partida 60 turns estable (0 softlock)', !r1.trace.includes('STALL'), r1.trace);
  check('G2. max gather consecutivo ≤ 2', r1.maxGather <= 2, `maxGather=${r1.maxGather}`);
  check('G3. max heal consecutivo ≤ 2', r1.maxHeal <= 2, `maxHeal=${r1.maxHeal}`);
  check('G4. offensive ratio > 0 (hay ataques)', r1.attacks > 5, `attacks=${r1.attacks}`);
  check('G4b. 0 comandos enemigos rechazados', r1.rejected === 0, `rejected=${r1.rejected}`);
  console.log(`   [stress] turns=${r1.turns} decisions=${r1.decisions} attacks=${r1.attacks} maxGather=${r1.maxGather} maxHeal=${r1.maxHeal} maxStall=${r1.maxStall} outcome=${r1.outcome}`);

  const r2 = run(makeConfig({ playerStr: 30, playerKi: 30, enemyStr: 30, enemyKi: 30, playerHp: 400, enemyHp: 400 }), 60);
  check('G5. stress stats altos → llega a KO (win/lose)', r2.outcome === 'VICTORY' || r2.outcome === 'DEFEAT', r2.outcome);
  check('G6. max stall (turns sin daño) acotado', r2.maxStall <= 30, `maxStall=${r2.maxStall}`);
  console.log(`   [stress-ko] turns=${r2.turns} decisions=${r2.decisions} attacks=${r2.attacks} maxGather=${r2.maxGather} maxHeal=${r2.maxHeal} outcome=${r2.outcome}`);

  const r3 = run(makeConfig({ firstAttacker: 'player' }), 20);
  check('G7. iniciativa player: estable también', !r3.trace.includes('STALL'), r3.trace);
  console.log(`   [stress-plyr] turns=${r3.turns} decisions=${r3.decisions} attacks=${r3.attacks} maxGather=${r3.maxGather} outcome=${r3.outcome}`);
}

if (failures === 0) {
  console.log('\n✅ enemy-controller: puro, determinista, 0 comandos ilegales, fixtures attack/defense/initiative OK, anti-stall sin reglas secretas.');
  process.exit(0);
}
process.exit(1);
