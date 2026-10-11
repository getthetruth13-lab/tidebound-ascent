// Writes art/v2/ui/tiles.json: every themed tile/emblem art slot (stable id, expected path, size, description).
// Re-run any time after dropping art into art/v2/ui/tiles/: it flips "ready" to true for every slot whose file exists,
// so real art appears in the game with no code change. Usage: node tools/make-tiles-manifest.cjs
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),out=path.join(root,'art/v2/ui/tiles.json');
const S=384,T=[];const add=(id,size,desc)=>T.push({id,size,desc});
const sq=(id,d)=>add(id,[512,384],d); // Task 30: tiles are full-bleed scene plates, 4:3 (512x384, same as events); the game crops with object-fit:cover. Focal point upper-middle, bottom 40% is covered by the name plate
// generic event / choice option icons (picked from the option's emoji)
[['leave','a worn stair step leading on, lantern light behind'],['blood','a bleeding hand over a still pool'],['gold','a heap of salt-green coins'],['gamble','two bone dice on wet stone'],
 ['upgrade','an anvil with a glowing seam'],['transform','a card half turning into a sea-glass shard'],['card','a single face-down painted card'],['fight','crossed rusted blades in kelp'],
 ['heal','a cupped hand with a warm light'],['gift','a knotted bundle on a driftwood altar'],['relic','a glowing relic on a velvet cloth'],['potion','a stoppered vial with a swirl'],
 ['curse','a black thorned shell'],['remove','a card being cut by shears'],['other','a question mark carved in coral'],['back','a hand closing a book']].forEach(([k,d])=>sq('opt-'+k,'Option icon: '+d));
// camp
[['mend','a small campfire with a warm bedroll'],['temper','a hammer and anvil by the fire'],['cook','a pot over the flames'],['scour','a pumice stone scrubbing a card'],['trawl','a grapnel hook hauling up a net'],['annotate','an open logbook with ink']].forEach(([k,d])=>sq('camp-'+k,'Camp action: '+d));
// rewards and chests
sq('reward-gold','Reward tile: a pile of gold coins and salt crystals');sq('reward-cards','Reward tile: three fanned cards');sq('reward-relic','Reward tile fallback: a relic on a cloth');sq('reward-potion','Reward tile fallback: a potion on a shelf');
sq('chest-closed','Closed sunken chest, barnacled, dark teal');sq('chest-open','Open chest with light spilling out');
// combat choices
[['tide-low','a dark new moon over still water (Tide 3)'],['tide-mid','a half moon on a calm sea (Tide 5)'],['tide-high','a full moon over a towering wave (Tide 7)'],['tide-set','a moon and a dial on the sea'],['surge','a wave rising'],['recede','a wave pulling back'],['moonpull','a moon drawing the tide up'],['keep','a Waypoint flag standing safe'],['destroy','a Waypoint flag shattering']].forEach(([k,d])=>sq('choice-'+k,'Combat choice: '+d));
// events: scene art, 4:3
const EVENTS=[['tidalwheel','Tidal Wheel'],['anvil','Barnacle Anvil'],['spring','Cleansing Spring'],['changeling','Changeling Pool'],['offering','Offering Tide'],['wishing','Wishing Undertow'],['tidepool','Tidepool Shrine'],['cartomancer','Wandering Cartomancer'],['sunkenchest','Sunken Chest'],['stranger','Campfire Stranger'],['crabmarket','Crab Market'],['gullnest','Gull Nest'],['inkgrotto','Ink Grotto'],['sailor','Shipwrecked Sailor'],['mirror','Tideglass Mirror'],['loom',"Saltwife's Loom"]];
for(const [id,n] of EVENTS)add('event-'+id,[512,384],'Event scene (4:3 painting): '+n);
add('event-generic',[512,384],'Fallback event scene: a lantern-lit shoreline');
// lamplight
add('lamp-lantern-lit',[128,192],'A lit brass lantern, warm glow (level pip)');add('lamp-lantern-dark',[128,192],'The same lantern, cold and unlit');
for(const k of ['card','relic','potion','mixed','all'])add('lamp-track-'+k,[128,128],'Lamp track reward marker: '+k);
for(const k of ['card','relic','potion'])add('lamp-lock-'+k,[S,S],'Locked '+k+' silhouette, dark and chained, no readable detail');
add('lamp-cardback',[500,700],'Card back for locked cards: dark lantern glyph on teal-black');
add('lamp-task-lit',[512,384],'Lantern Task tile (done): one brass lantern blazing on a stone ledge, warm light, no sigil (the class sigil is stamped in code)');add('lamp-task-dark',[512,384],'Lantern Task tile (not done): the same lantern, cold and unlit on the same ledge, no sigil');add('lamp-class-any',[128,128],'Task sigil for any-class tasks: a small compass rose, engraved, single colour')
for(const k of ['tide','echo','carto','duel'])add('lamp-class-'+k,[128,128],'Class sigil / Lamp emblem: '+k+' (also stamped on Lantern Task tiles)');
add('lamp-climb',[128,128],'Stair Climb emblem: the Pale Lighthouse');
add('lamp-banner-win',[832,160],'End screen banner, the lamp room blazing (win)');add('lamp-banner-lose',[832,160],'End screen banner, a single lantern burning on in the dark (loss)');
// lore (design/lore/LORE-BIBLE.md §17): the Ferryman, the Ledger pages, and the layered main menu (src/data/lore.js MENU_LAYERS)
add('shop-wren',[400,600],'Wren, Quartermaster of the Driftwood Bazaar, full figure on mid-grey (cutout), shown at the right of the shop');
add('lore-ferryman',[128,128],'Ferryman portrait, small, shown at the crossing: a hooded oarsman who never looks up, lantern at the bow');
add('lore-page-sealed',[128,128],'Sealed Ledger page icon: a folded page tied with wet cord');
add('lore-torn-page',[256,256],'Torn Ledger Page icon: a page with a visible cut stub along the top edge');
add('lore-page-frame',[512,384],'Logbook page frame: parchment with a cut stub, iron corner rivets');
add('menu-sky',[832,384],'Menu layer: the last hour before dawn over a black Pale Sea; left two-thirds kept clear for buttons');
add('menu-sea',[832,384],'Menu layer: black water, plain (stages 0-5)');
add('menu-lighthouse',[300,900],'Menu layer: the Pale Lighthouse, right third, eight windows spiralling up (windows are lit in code over this art)');
add('menu-ring',[600,120],'Menu layer: a faint green ring on the water around the lighthouse base (stage 6+, after the twist). Never a body, eye or limb.');
add('menu-line',[60,900],'Menu layer: a thin pale line from the lamp down into the sea (stage 7+, after the twist)');
add('menu-steps',[832,120],'Menu layer: the Foot final steps in the foreground, dark stone, wet');
add('menu-ghost',[64,96],'Menu layer: one ghost lantern on a step (the game places one per lifetime death, capped at 40)');
add('menu-dawn-light',[832,160],'Menu ending layer, Light It: a gold dawn rim on the horizon');
add('menu-shape',[832,160],'Menu ending layer, Light It: a dark shape faintly moving under the water');
add('menu-stars',[832,260],'Menu ending layer, Break the Lens: a starfield, first stars in two hundred years');
add('menu-dawn-cut',[832,384],'Menu ending layer, Cut the Line: a true dawn, no green ring, no line, lanterns lifting off the steps');
// Task 30 slots: shared tile pieces + character-select stair
add('tile-ledge',[384,200],'Painted stone ledge / tide-pool shelf strip that relic and potion art stands on in reward tiles (cutout bottom third of a tile)');
add('select-stair',[1664,768],'Character select background: the Foot of the Stair at dusk, four landings climbing left to right, empty (heroes and lanterns are drawn over it)');
add('select-lantern',[128,192],'One unlit brass hanging lantern, cutout on transparent, glass dark (the game adds the coloured glow in code)');
let old={};try{old=JSON.parse(fs.readFileSync(out,'utf8')).tiles||{}}catch(e){}
const tiles={};for(const t of T){const p='art/v2/ui/tiles/'+t.id+'.webp';tiles[t.id]={path:p,size:t.size,desc:t.desc,ready:fs.existsSync(path.join(root,p))}}
fs.writeFileSync(out,JSON.stringify({note:'Tile / emblem art slots. Drop a webp at "path", run `node tools/make-tiles-manifest.cjs` (sets ready:true), done. Until then the game draws a themed placeholder emblem with the right name.',tiles},null,1));
console.log(Object.keys(tiles).length+' slots,',Object.values(tiles).filter(t=>t.ready).length+' ready');
