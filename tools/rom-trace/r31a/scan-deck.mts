import { readFileSync } from 'fs';
const B = JSON.parse(readFileSync('r31a/snapshot-B-in-battle.json', 'utf8')).bytes as number[];
const A = JSON.parse(readFileSync('r31a/snapshot-A-pre-battle.json', 'utf8')).bytes as number[];
const BASE = 0xC000;
const inCard = (v: number) => v >= 1 && v <= 125;
// 1) ventanas con deck 20 bytes ≥17 en rango, sin >4 copias
const hits: Array<{ off: number; deckOk: number; deck: number[] }> = [];
for (let off = 0; off + 45 <= B.length; off++) {
  const deck = B.slice(off + 18, off + 38);
  const ok = deck.filter(inCard).length;
  if (ok >= 17) {
    const counts = new Map<number, number>();
    for (const v of deck) counts.set(v, (counts.get(v) ?? 0) + 1);
    const maxCopy = Math.max(...counts.values());
    if (maxCopy <= 4) hits.push({ off, deckOk: ok, deck });
  }
}
console.log('hits deck>=17 con maxCopy<=4:', hits.length);
for (const h of hits.slice(0, 25)) {
  console.log(`0x${(BASE + h.off).toString(16)} deckOk=${h.deckOk} deck=[${h.deck.map(v => v.toString(16).padStart(2, '0')).join(' ')}]`);
}
