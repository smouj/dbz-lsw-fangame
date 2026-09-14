/** Browser regression gate. Start `npm run dev` first. Screenshots stay local. */
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url=process.env.UI_BASE_URL || 'http://127.0.0.1:5178/';
const output='.tmp/ui-audit/verified';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({
  headless:true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : process.platform==='win32' ? {channel:'msedge'} : {}),
});
const context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];
const results=[];
page.on('pageerror',error=>{ errors.push(error.message); console.error(error.stack); });
const screens=['story','versus','deck','characters','cards','settings'];
const sizes=[[320,180],[640,360],[1280,720],[1920,1080],[2560,1440],[844,390],[390,844]];
async function shot(name) {
  await page.mouse.move(1,1);
  await page.screenshot({path:`${output}/${name}.png`});
}
async function layout(label) {
  await page.waitForFunction(() => {
    const surface=document.querySelector('.shell-surface')?.getBoundingClientRect();
    const viewport=document.querySelector('.game-viewport')?.getBoundingClientRect();
    return !surface || (viewport && Math.abs(surface.width-viewport.width)<1 && Math.abs(surface.height-viewport.height)<1);
  },{},{timeout:5000});
  const result=await page.evaluate(()=>{
    const viewport=document.querySelector('.game-viewport');
    const bounds=viewport?.getBoundingClientRect();
    const surface=document.querySelector('.shell-surface')?.getBoundingClientRect();
    const main=document.querySelector('.shell-menu');
    const panels=main ? [...main.querySelectorAll('.shell-panel')].map(el=>({screen:el.dataset.screen,...el.getBoundingClientRect().toJSON()})) : [];
    const overlap=panels.some((a,i)=>panels.slice(i+1).some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
    const outside=panels.filter(p=>p.left<bounds.left-1 || p.right>bounds.right+1 || p.top<bounds.top-1 || p.bottom>bounds.bottom+1);
    const titles=[...document.querySelectorAll('.shell-panel-copy strong,.page-title')].map(el=>{
      const range=document.createRange(); range.selectNodeContents(el);
      const text=range.getBoundingClientRect(); const panel=(el.closest('.shell-panel') || el.closest('.page-header')).getBoundingClientRect();
      return {text:el.textContent,clipped:text.left<panel.left-1 || text.right>panel.right+1 || text.top<panel.top-1 || text.bottom>panel.bottom+1};
    });
    return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,viewport:bounds?.toJSON(),surface:surface?.toJSON(),overlap,outside,titles};
  });
  results.push({label,...result});
  assert.ok(result.scrollWidth<=result.width+1,`${label}: window overflow`);
  if(result.surface) {
    assert.ok(Math.abs(result.surface.width-result.viewport.width)<1,`${label}: shell scale`);
    assert.ok(Math.abs(result.surface.height-result.viewport.height)<1,`${label}: shell height`);
  }
  assert.equal(result.overlap,false,`${label}: overlapping menu panels`);
  assert.equal(result.outside.length,0,`${label}: panels outside viewport`);
  assert.equal(result.titles.filter(t=>t.clipped).length,0,`${label}: clipped titles ${JSON.stringify(result.titles)}`);
}
async function back() { await page.locator('.btn-back').click(); await page.locator('.shell-menu').waitFor(); }
try {
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('.starter-deck-card').first().waitFor();
  await layout('starter'); await shot('starter');
  await page.locator('.starter-deck-card').first().click();
  await page.locator('.shell-menu').waitFor();
  assert.equal(await page.locator('.shell-panel').count(),6,'six unique menu actions');
  for(const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(100);
    await layout(`main-${width}x${height}`);
    await shot(`main-${width}x${height}`);
    for(const screen of screens) {
      await page.locator(`[data-screen="${screen}"]`).click();
      await page.locator('.page-header').waitFor();
      await layout(`${screen}-${width}x${height}`);
      if(width===1280) await shot(screen);
      if(screen==='characters' || screen==='versus') {
        const action=page.locator(screen==='characters'?'.char-detail > .btn-primary':'.setup-ready-btn');
        const box=await action.boundingBox(); const viewport=await page.locator('.game-viewport').boundingBox();
        assert.ok(box.y>=viewport.y && box.y+box.height<=viewport.y+viewport.height, `${screen} action fully visible`);
      }
      if(width===1280 && screen==='deck') {
        const overflowingCards=await page.locator('.deck-screen .card-collection-grid .card').evaluateAll(cards=>
          cards.filter(card=>card.scrollHeight>card.clientHeight+1).length
        );
        assert.equal(overflowingCards,0,'Deck editor cards fit their frames without clipped content');
      }
      if(width===1280 && screen==='cards') {
        const rows=await page.locator('.cards-screen .card-collection-grid').evaluate(grid=>{
          const bounds=grid.getBoundingClientRect();
          const visible=[...grid.children].map(card=>card.getBoundingClientRect())
            .filter(card=>card.bottom>bounds.top && card.top<bounds.bottom);
          return {
            full:visible.filter(card=>card.top>=bounds.top && card.bottom<=bounds.bottom).length,
            partial:visible.filter(card=>card.top<bounds.top || card.bottom>bounds.bottom).length,
          };
        });
        assert.deepEqual(rows,{full:12,partial:0},'Card Collection opens on two complete six-card rows');
        const collection=page.locator('.cards-screen .card-collection-grid');
        await collection.evaluate(grid=>{ grid.scrollTop=grid.scrollHeight; });
        await page.locator('.cards-screen .filter-chip').nth(2).click();
        assert.equal(await page.locator('.cards-screen .card-collection-grid').evaluate(grid=>grid.scrollTop),0,
          'Card Collection resets to its first row when the filter changes');
      }
      await back();
    }
    console.log(`PASS: shell pages at ${width}×${height}`);
  }
  await page.setViewportSize({width:1280,height:720});
  // Enter must activate the focused panel, including Continue/Story.
  for(const screen of screens) {
    await page.locator(`[data-screen="${screen}"]`).focus();
    await page.keyboard.press('Enter');
    await page.locator(`.${screen==='versus'?'versus':screen}-screen`).waitFor();
    await page.locator('.btn-back').focus(); await page.keyboard.press('Escape');
    await page.locator('.shell-menu').waitFor();
  }
  await page.locator('[data-screen="story"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator(':focus').getAttribute('data-screen'),'versus');
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator(':focus').getAttribute('data-screen'),'deck');
  // Every supported language fits the menu and its shared page chrome.
  for(let i=0;i<10;i++) {
    await page.locator('[data-screen="settings"]').click();
    await page.locator('.lang-chip').nth(i).click();
    await layout(`settings-language-${i}`); await back(); await layout(`menu-language-${i}`);
  }
  await page.locator('[data-screen="settings"]').click();
  await page.locator('.lang-chip').first().click();
  assert.equal(await page.locator('input[type="range"]').inputValue(),'70','fresh volume defaults to 70');
  await page.locator('.setting-options').first().locator('button').nth(1).click();
  await back();
  await page.locator('[data-screen="versus"]').click();
  const limitPanel=page.locator('.setup-limits');
  const limitMetrics=()=>limitPanel.evaluate(el=>({clientHeight:el.clientHeight,scrollHeight:el.scrollHeight}));
  const closedLimits=await limitMetrics();
  assert.ok(closedLimits.scrollHeight<=closedLimits.clientHeight+1,`closed Limit Loadout must fit without a panel scrollbar: ${JSON.stringify(closedLimits)}`);
  await page.locator('[data-testid="limit-slot-0"]').click();
  const openLimits=await limitMetrics();
  assert.ok(openLimits.scrollHeight<=openLimits.clientHeight+1,`open Limit picker must not grow the panel: ${JSON.stringify(openLimits)}`);
  const pickerContainment=await page.locator('.setup-limits-picker').evaluate(el=>{
    const picker=el.getBoundingClientRect(); const panel=el.parentElement.getBoundingClientRect();
    return picker.left>=panel.left && picker.right<=panel.right && picker.top>=panel.top && picker.bottom<=panel.bottom;
  });
  assert.equal(pickerContainment,true,'Limit picker remains contained inside the Limit Loadout panel');
  await page.getByRole('button',{name:'CLOSE'}).click();
  const playerSlot=page.locator('[data-testid="team-slots"] .setup-team-slot').first();
  const rivalSlot=page.locator('[data-testid="rival-team-slots"] .setup-team-slot-btn').first();
  const beforePlayer=await playerSlot.locator('.setup-team-slot-name').textContent();
  await rivalSlot.click();
  const beforeRival=await page.locator('.setup-roll-item-center').getAttribute('aria-label');
  await page.locator('.setup-roll').focus();
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.locator('.setup-roll-item-center').getAttribute('aria-label'),beforeRival,'focused rival carousel responds to arrow keys');
  assert.equal(await playerSlot.locator('.setup-team-slot-name').textContent(),beforePlayer,'rival selection does not change the player character');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('.setup-roll-item-center').getAttribute('aria-label'),beforeRival,'rival carousel restores the deterministic baseline opponent');
  await playerSlot.locator('.setup-team-slot-btn').click();
  const beforeCharacter=await page.locator('.setup-roll-item-center').getAttribute('aria-label');
  await page.locator('.setup-roll').focus();
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.locator('.setup-roll-item-center').getAttribute('aria-label'),beforeCharacter,'focused carousel responds to arrow keys');
  await page.keyboard.press('ArrowLeft');
  await page.locator('.setup-workshop').evaluate(el=>el.scrollTop=el.scrollHeight);
  await page.locator('.setup-ready-btn').click();
  await page.locator('.battle-screen').waitFor();
  // El banner ATTACK y el robo son fronteras secuenciales. Durante los 28
  // ticks del vuelo solo puede verse la carta GBC compacta: ningún botón,
  // texto auxiliar ni chip debe quedar debajo.
  const drawFx=page.locator('.draw-fx');
  await drawFx.waitFor({state:'visible',timeout:10000});
  const drawVisual=await page.locator('.battle-controls').evaluate(controls=>{
    const visible=[...controls.children].filter(el=>{
      const style=getComputedStyle(el); const rect=el.getBoundingClientRect();
      return style.display!=='none' && style.visibility!=='hidden' && rect.width>0 && rect.height>0;
    });
    const card=controls.querySelector('.draw-fx .card');
    const art=controls.querySelector('.draw-fx .card-art-img');
    return {
      drawing:controls.closest('.battle-screen')?.classList.contains('is-drawing'),
      visibleClasses:visible.map(el=>el.className),
      frame:card?getComputedStyle(card,'::after').backgroundImage:'none',
      artLoaded:art instanceof HTMLImageElement && art.complete && art.naturalWidth>0,
    };
  });
  assert.equal(drawVisual.drawing,true,'draw flight owns an explicit visual boundary');
  assert.deepEqual(drawVisual.visibleClasses,['draw-fx hand-cards'],'draw flight is not composed over controls or text');
  assert.match(drawVisual.frame,/card_frames\//,'draw flight uses a GBC card frame');
  assert.equal(drawVisual.artLoaded,true,'draw flight uses loaded ROM card art');
  await drawFx.waitFor({state:'hidden',timeout:5000});
  for(const [width,height] of [[1280,720],[640,360],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'battle does not overflow the window');
    const missing=await page.locator('img').evaluateAll(imgs=>imgs.filter(img=>img.complete && !img.naturalWidth && getComputedStyle(img).display!=='none').map(img=>img.src));
    assert.deepEqual(missing,[],'battle images loaded');
    await shot(`battle-${width}`);
  }
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.setViewportSize({width:1280,height:720});
  await page.locator('[data-screen="settings"]').click();
  assert.ok((await page.locator('.setting-options').first().locator('button').nth(1).getAttribute('class')).includes('active'),'text speed persists');
  await back();
  // Story reaches its actual intro screen; no URL route is invented.
  await page.locator('[data-screen="story"]').click();
  await page.locator('.cdp-start').click();
  await page.locator('.story-scene-screen').waitFor();
  await shot('story-scene');
  console.log('PASS: mouse, keyboard, languages and settings persistence');
  // Inspect each registered Dev module in desktop and compact layouts.
  const source=await readFile('src/devtools/DevStudio.tsx','utf8');
  const moduleBody=source.match(/export const DEV_MODULES[\s\S]*?= \[([\s\S]*?)\];/)[1];
  const modules=[...moduleBody.matchAll(/id: '([a-z-]+)'/g)].map(m=>m[1]);
  // DEV_MODULES es la fuente única. Mantener este valor alineado con el
  // registro evita que un módulo nuevo quede fuera de la sonda visual.
  // The registry currently contains 24 internal modules, including the
  // Performance and System Hub workspaces. Keep this count explicit so a
  // module cannot silently disappear from the browser sweep.
  assert.equal(modules.length,24,`expected 24 Dev modules, found ${modules.length}`);
  assert.equal(new Set(modules).size,modules.length,'DEV_MODULES contains duplicate ids');
  await page.goto(new URL('#dev/dashboard',url).href,{waitUntil:'domcontentloaded'});
  await page.locator('.devstudio').waitFor({timeout:60000});
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:width===390?844:720});
    for(const [i,module] of modules.entries()) {
      // Cada módulo puede vivir en un área distinta. Recorrer los botones por
      // índice solo funciona mientras el registro y el submenú coinciden; en
      // cuanto un módulo cambia de área se termina abriendo otro panel. Los
      // hashes son la API canónica del Dev Studio, así que prueban el mismo
      // enlace que usan los deep links y el workspace.
      await page.goto(new URL(`#dev/${module}`,url).href,{waitUntil:'domcontentloaded'});
      await page.locator(`.dev-module[data-module="${module}"]`).waitFor({timeout:60000});
      if(width===390) {
        await page.locator('.dev-mobile-bar button').first().click();
        const activeNav = page.locator('.dev-nav-item[aria-current="page"]');
        assert.equal(await activeNav.count(),1,`${module}: mobile navigation exposes one active module`);
        assert.ok(await activeNav.locator('.dev-nav-label').isVisible(),'mobile navigation labels visible');
        if(i===0) await shot('dev-mobile-navigation');
        await page.locator('.dev-mobile-bar button').first().click();
      }
      await page.waitForTimeout(600);
      assert.deepEqual([...new Set(errors)],[],`${module}: no JavaScript exceptions after loading resources`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${module}: no window overflow`);
      if(width===390) assert.equal(await page.locator('.dev-mobile-bar button').first().getAttribute('aria-expanded'),'false');
      await shot(`dev-${module}-${width}`);
    }
    console.log(`PASS: ${modules.length} Dev modules at ${width}px`);
  }
  await page.goto(new URL('?dev=1',url).href,{waitUntil:'domcontentloaded'});
  await page.locator('.devstudio').waitFor();
  await page.locator('.dev-mobile-bar button').last().click();
  await page.locator('.shell-menu').waitFor();
  assert.ok(!page.url().includes('dev'),'leaving query-based Dev mode clears the URL');
  assert.deepEqual([...new Set(errors)],[],'no JavaScript exceptions');
  const devChecks = modules.length * 2;
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,screenChecks:results.length,devChecks,errors,results},null,2));
  console.log(`PASS: ${results.length} shell layout checks, ${devChecks} Dev checks, no JavaScript exceptions.`);
} catch(error) {
  await shot('failure').catch(()=>{});
  await writeFile(`${output}/report.json`,JSON.stringify({passed:false,error:String(error),errors,results},null,2));
  throw error;
} finally { await browser.close(); }
