// ═══════════════════════════════════════════════════════════════════════
// ROM R3.1A — locate-battle-block.ts
//
// Localiza los battle card blocks de 45 bytes por EVIDENCIA DINÁMICA:
//   +00..02 roster · +03..17 Limits (5×3) · +18..37 Joint Deck (20)
//   +38 drawIndex · +39..44 hand (6)
//
// Entrada: snapshot-A (WRAM pre-batalla) + snapshot-B (WRAM en batalla).
// Criterios simultáneos (el candidato debe cumplirlos TODOS):
//   deck20  : ≥17/20 bytes en rango de carta (1..125)
//   hand6   : ≥4/6  bytes en rango de carta
//   limits15: ≥10/15 bytes en rango de carta
//   roster3 : 3 bytes en rango de personaje (0..31)
//   nuevo   : el bloque no existía en snapshot-A (init en batalla)
//
// NO promueve direcciones: solo produce candidatos ordenados. La prueba
// definitiva (patch de un slot de mano + verificación en UI) es aparte.
//
//   npx tsx locate-battle-block.ts <snapshotA.json> <snapshotB.json> [--all]
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'fs';

const [, , aPath, bPath, allFlag] = process.argv;
const A = readFileSync(aPath, 'utf8');
const B = readFileSync(bPath, 'utf8');
const snapA = JSON.parse(A).bytes as number[];
const snapB = JSON.parse(B).bytes as number[];
const BASE = JSON.parse(B).base as number ?? 0xC000;

const CARD_MIN = 1, CARD_MAX = 125;
const CHAR_MIN = 0, CHAR_MAX = 31;

function inCard(v: number) { return v >= CARD_MIN && v <= CARD_MAX; }
function inChar(v: number) { return v >= CHAR_MIN && v <= CHAR_MAX; }
function scoreWindow(b: number[]): { total: number; deck: number; hand: number; limits: number; roster: number } | null {
  const deck = b.slice(18, 38);
  const hand = b.slice(39, 45);
  const limits = b.slice(3, 18);
  const roster = b.slice(0, 3);
  const deckOk = deck.filter(inCard).length;
  const handOk = hand.filter(inCard).length;
  const limitsOk = limits.filter(inCard).length;
  const rosterOk = roster.filter(inChar).length;
  if (deckOk < 17 || handOk < 4 || limitsOk < 10 || rosterOk < 3) return null;
  // Reglas de deck real: máx 3 copias por carta, drawIndex ≤ 20
  const deckCounts = new Map<number, number>();
  for (const v of deck) deckCounts.set(v, (deckCounts.get(v) ?? 0) + 1);
  for (const [v, c] of deckCounts) if (c > 4) return null;
  const handCounts = new Map<number, number>();
  for (const v of hand) handCounts.set(v, (handCounts.get(v) ?? 0) + 1);
  for (const [v, c] of handCounts) if (c > 3) return null;
  if (b[38] > 20) return null;
  // Variedad: al menos 6 valores de carta distintos entre deck+hand
  const distinct = new Set([...deck, ...hand]).size;
  if (distinct < 6) return null;
  // Rechazar bloques repetitivos (todo FF / todo 0)
  const uniq = new Set(b).size;
  if (uniq < 10) return null;
  return { total: deckOk + handOk + limitsOk + rosterOk, deck: deckOk, hand: handOk, limits: limitsOk, roster: rosterOk };
}

interface Cand { offset: number; addr: number; score: number; deck: number[]; hand: number[]; limits: number[]; roster: number[]; drawIndex: number; newlyInB: boolean; }

const cands: Cand[] = [];
for (let off = 0; off + 45 <= snapB.length; off++) {
  const win = snapB.slice(off, off + 45);
  const sc = scoreWindow(win);
  if (!sc) continue;
  const aWin = snapA.slice(off, off + 45);
  const newlyInB = aWin.length === 45 && win.some((v, i) => v !== aWin[i]) && aWin.filter((v) => v !== 0x00 && v !== 0xFF).length < 6;
  cands.push({
    offset: off, addr: BASE + off, score: sc.total,
    roster: win.slice(0, 3), limits: win.slice(3, 18), deck: win.slice(18, 38),
    drawIndex: win[38], hand: win.slice(39, 45), newlyInB,
  });
}
cands.sort((x, y) => y.score - x.score || Number(y.newlyInB) - Number(x.newlyInB));

const top = allFlag === '--all' ? cands : cands.slice(0, 12);
console.log(`candidatos: ${cands.length} (window 45B, deck≥17 hand≥4 limits≥10 roster=3)`);
for (const c of top) {
  console.log(`\naddr=0x${c.addr.toString(16).toUpperCase()} score=${c.score} newInB=${c.newlyInB}`);
  console.log(`  roster   [${c.roster.map(v => v.toString(16).padStart(2, '0')).join(' ')}]`);
  console.log(`  limits   [${c.limits.map(v => v.toString(16).padStart(2, '0')).join(' ')}]`);
  console.log(`  deck     [${c.deck.map(v => v.toString(16).padStart(2, '0')).join(' ')}]`);
  console.log(`  drawIdx  ${c.drawIndex.toString(16)}  hand [${c.hand.map(v => v.toString(16).padStart(2, '0')).join(' ')}]`);
}
