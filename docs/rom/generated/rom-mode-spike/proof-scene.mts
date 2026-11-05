import { decodeRomFeedSequence } from '../../src/battle/romMode/decodeRomFeed';
import { feedSequenceToScenes } from '../../src/battle/romMode/feedToScene';
import { readFileSync, writeFileSync } from 'node:fs';
const raw = JSON.parse(readFileSync('.tmp/feed/feed.json', 'utf8'));
const feeds = decodeRomFeedSequence(raw.frames);
// stub: id de forma -> nuestro fichero local (en la app seria battleOverworldActorUrl)
const files: Record<string,string> = { cell: 'cell_imperfect_form_ow.png', piccolo: 'piccolo_base_ow.png' };
const resolveSprite = (f: string) => files[f] ? `/assets/overworld/panel_sprites/${files[f]}` : undefined;
const scenes = feedSequenceToScenes(feeds, { ally: 'cell', enemy: 'piccolo' }, resolveSprite);
const s = scenes[10];
console.log(`tick=${s.tick} CA03=${s.actionPhase} C0A0=${s.menuState}`);
for (const f of s.fighters) {
  console.log(`  ${f.role.padEnd(5)} centro=(${f.screenX},${f.screenY}) caja ${f.box.width}x${f.box.height}@(${f.box.x},${f.box.y}) mira=${f.facing} cgbPal=${f.cgbPalette} n=${f.spriteCount} → ${f.spriteUrl}`);
}
writeFileSync('.tmp/feed/scenes.json', JSON.stringify(scenes, null, 1));
const uniq = new Set(scenes.map(x => JSON.stringify(x.fighters.map(f=>[f.screenX,f.screenY,f.facing]))));
console.log(`escenas distintas en ${scenes.length} frames: ${uniq.size}`);
