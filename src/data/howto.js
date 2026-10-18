// data/howto.js: the How to Play guide (data only). Every number here was checked against src/data + src/engine (see
// /workspace/studio/qc/how-to-play-notes.md and tests/how-to-play.cjs, which re-checks the example turns against the live engine).
// Voice: plain, second person, no lore (lore lives in the title Learn pages). Card ids must exist in the Act 1 pool; the test enforces it.
// General page = {id,tab,title,epi,blocks:[{h,html,cards?:[ids],intents?:[keys],art?:'diagram id'}]}
// Hero page    = {id,tab,meter,flow,example,pairs,mistakes,win,start}
import {DATA} from './generated/data-v2.js';
const C=DATA.v21.sim.core,T=C.tide,E=C.echo,K=C.carto,D=C.duel;
const RD=K.rank_dmg.slice(1).map(n=>'+'+n).join(' / ');
export const GENERAL=[
 {id:'climb',tab:'The Climb',title:'The Climb',epi:'Fifteen floors, one boss at the top',blocks:[
  {h:'The goal',html:'Climb the map one floor at a time. Act 1 has 15 floors and ends with a boss. Your HP carries from fight to fight and does not refill on its own (a win heals a little, camps heal more), so every hit you take matters later. If your HP reaches 0 the run ends. Later acts are open as previews: keep climbing after the Act 1 boss.'},
  {h:'Choosing a path',html:'The map shows rooms you can reach next. You pick one each floor. Lines show which rooms connect, so look a few floors ahead before you commit. Open the map any time from the top bar.',art:'map'},
  {h:'Room types',html:'<ul class="hw-list"><li><b>⚔️ Fight</b>: a normal battle. Gold, a card choice, sometimes a potion.</li><li><b>💀 Elite</b>: a tougher battle that also drops a relic.</li><li><b>❓ ? Event</b>: a story choice. It can help, cost HP, or open a fight.</li><li><b>🔥 Camp</b>: heal or upgrade a card.</li><li><b>💰 Merchant</b>: spend gold on cards, relics, potions and card removal.</li><li><b>💎 Treasure</b>: a chest with a relic and gold.</li><li><b>🔔 Boss</b>: the last floor of the act.</li></ul>'}]},
 {id:'turn',tab:'Your Turn',title:'Your Turn',epi:'Energy, cards and the end-turn seal',blocks:[
  {h:'Energy',html:'You get <b>3 Energy</b> at the start of every turn. The number in the glowing orb on a card is its cost. Unspent Energy is lost when the turn ends, so spend it.'},
  {h:'Drawing',html:'You draw <b>5 cards</b> each turn (the Cartographer draws 4). Your hand holds at most 10; extra cards go to the discard pile. When the draw pile runs out, the discard pile is shuffled to make a new one.'},
  {h:'Playing a card',html:'<b>Tap</b> a card to lift it. <b>Drag</b> an Attack onto an enemy. Drag a Skill onto yourself or up into the battlefield. Release back over your hand to cancel. <b>Hold</b> a card to enlarge it and read it. While you drag, a ghost preview shows what the card will do before you let go.'},
  {h:'Ending your turn',html:'Tap <b>END</b> when you are done. Cards left in your hand go to the discard pile (unless they say <b>Moor</b>). Then every enemy acts, one at a time.'},
  {h:'Card types',html:'<ul class="hw-list"><li><b>Attack</b> deals damage.</li><li><b>Skill</b> does something once: Guard, draw, a meter push.</li><li><b>Vigil</b> stays in play for the rest of the fight and works on its own.</li><li><b>Waypoint</b> (Cartographer) sits in a slot and acts every turn.</li></ul>',cards:['splash','brace','turningpoint','signal']}]},
 {id:'guard',tab:'Guard & Intents',title:'Guard and Intents',epi:'Read the enemy, then decide',blocks:[
  {h:'Intents',html:'The icon above each enemy shows what it will do <b>next turn</b>, and a number if it is an attack. Tap or hold it for the full text. Enemies telegraph, so you can always plan your defence.',intents:[['attack','Attacks you. The number is the damage.'],['guard','Gains Guard.'],['buff','Gains Might (hits harder).'],['debuff','Puts a weakening effect on you.'],['heal','Heals.'],['summon','Calls helpers.'],['status','Adds junk cards to your deck.'],['steal','Steals gold, then flees. Kill it first.'],['drain','You lose Energy next turn.'],['potion','Steals a potion.'],['unknown','A warning about a later move.']]},
  {h:'Guard',html:'<b>Guard</b> soaks damage first. Anything left over takes your HP. Guard <b>disappears at the start of your next turn</b>, so it only protects you from the enemy turn that follows. Enemies gain Guard too; damage must break it before HP drops.'},
  {h:'How much to block',html:'Add up the attack numbers over the enemies, subtract what you can kill this turn, and block the rest if it is cheap. If an enemy is not attacking, Guard is wasted: attack instead.'}]},
 {id:'status',tab:'Status Effects',title:'Status Effects',epi:'Lasting effects on you and on enemies',blocks:[
  {h:'Hurting effects (on enemies)',html:'<ul class="hw-list"><li><b>Exposed</b>: takes 50% more damage. Drops 1 each turn.</li><li><b>Soaked</b>: deals 25% less attack damage. Drops 1 each turn.</li><li><b>Bleed X</b>: loses X HP each time your Attack hits it, ignoring Guard. Then it drops by 1.</li><li><b>Drenched X</b>: loses X HP when the Tide turns, Crests or Undertows. Drops 1 each turn.</li><li><b>Resonating X</b>: your Echoed Attacks deal X more to it. Drops 1 each turn.</li></ul>'},
  {h:'Boosts',html:'<ul class="hw-list"><li><b>Might</b>: your Attacks deal +1 damage per point.</li><li><b>Poise</b>: your cards give +1 Guard per point.</li><li><b>Brittle</b> (a debuff on you): 25% less Guard from cards.</li></ul>'},
  {h:'Enemy defences',html:'<ul class="hw-list"><li><b>Shell X</b>: it gains X Guard at the end of its turn.</li><li><b>Barbs X</b>: attacking it hurts you for X.</li><li><b>Rebuff X</b>: blocks your next X debuffs.</li><li><b>Mending X</b>: it heals X HP at the end of its turn.</li></ul>'},
  {h:'Where to see them',html:'Small badges sit under each combatant. Tap or hold a badge to read exactly what it does and how long it lasts.'}]},
 {id:'piles',tab:'Cards in Play',title:'Draw, Discard and Sink',epi:'Where your cards go',blocks:[
  {h:'Three piles',html:'<b>Draw pile</b>: cards you will draw. <b>Discard pile</b>: cards you used. <b>Sink pile</b>: cards removed for this fight only. Tap a pile button beside your hero to see its contents. They come back next fight; nothing is lost from your deck.'},
  {h:'Sink and Fleeting',html:'<b>Sink</b> removes a card for the rest of the fight. A <b>Fleeting</b> card is Sunk if it is still in your hand when the turn ends. <b>Moor</b> keeps a card in your hand at end of turn. <b>Opening</b> puts a card in your first hand of each fight.'},
  {h:'Vigils',html:'A <b>Vigil</b> is played once and then stays for the whole fight, like a lamp left burning. It never returns to your hand. A second copy of the same Vigil only does extra when its text says it stacks.',cards:['turningpoint','risingwater','choir']},
  {h:'Flotsam, Burdens and other junk',html:'<b>Flotsam</b> is junk that enemies add to your deck during a fight; it clogs your hand. A <b>Burden</b> is a curse that stays in your deck. Some cards Sink junk for a bonus. <b>Faint</b> cards cannot be Marked or Echoed (Echo Mage). <b>Full Flame</b> cards spend all your Energy; X is the amount spent.'},
  {h:'Hold-card preview',html:'Pressing and holding any card enlarges it. Underlined words inside it can be tapped to read a short rule. Use this whenever a card text is unclear.'}]},
 {id:'items',tab:'Relics & Potions',title:'Relics, Potions and Rewards',epi:'What you collect on the climb',blocks:[
  {h:'Relics',html:'Relics are permanent. They sit in the top bar and work automatically every fight. Each hero starts with one that supports their style. Elites, chests, merchants and some events give more. Tap or hold a relic to read it.'},
  {h:'Potions',html:'You carry up to <b>3 potions</b> (a Cork Bandolier adds a slot). Tap a potion in the top bar to read it, then press <b>Drink</b> (some ask you to pick a target). Drinking is free: no Energy, and the potion is used up. Most only work in a fight; a few, like Kelp Broth, work anywhere. Second Tide works by itself when you would die. Save strong ones for elites and the boss.'},
  {h:'After a fight',html:'You get gold and a choice of <b>three cards</b> to add to your deck. <b>Skipping is allowed</b>: a lean deck draws its best cards more often. Elites also drop a relic, and sometimes a potion drops. You heal a little after each win.'},
  {h:'Upgrades',html:'At a Camp you can <b>Temper</b> a card to upgrade it. Upgraded cards show a + after the name and are stronger. Upgrading your best card is usually better than upgrading a weak one.'}]},
 {id:'places',tab:'Camps & Shops',title:'Camps, Merchants and Events',epi:'The quiet rooms between the fights',blocks:[
  {h:'Camp',html:'Choose <b>one</b>: <b>Mend</b> heals 30% of your Max HP, or <b>Temper</b> upgrades a card. Some relics add a third option (cook, scour, trawl, annotate). Mend when low; Temper when healthy.'},
  {h:'Merchant',html:'Spend gold on cards, relics and potions. A common card costs about 45 to 55, an uncommon about 70 to 80 and a rare about 140 to 160. The merchant will also <b>remove a card</b> from your deck; the price rises each time you do it. Removing starter cards makes your deck sharper.'},
  {h:'? Events',html:'A short story with choices. Each choice shows its cost and reward. Some need HP or gold and are greyed out if you cannot pay. There is no wrong answer you cannot see coming: read the buttons.'},
  {h:'Treasure and the boss',html:'A chest holds a relic and gold. The boss is a bigger fight at the top of the act; beat it to finish the climb. Lamplight earned on every run unlocks new cards, relics and potions for the next climber (see the Ledger).'}]}
];
// ---- Hero pages ----
export const HEROES_GUIDE={
 tide:{id:'tide',tab:'Tidecaller',
  meter:{h:'The Tide meter',html:`A gauge from <b>0 to 10</b>. It starts every fight at <b>5</b>. <b>Surge</b> pushes it up, <b>Recede</b> pushes it down. The arrow beside it shows the direction of its last move. <b>High Tide</b> is ${T.high} or more, <b>Low Tide</b> is ${T.low} or less; many cards get a bonus at one of them.`,art:'tide'},
  flow:[
   `<b>Reach 10 = a Crest.</b> ${T.crest_dmg} damage to <b>every</b> enemy, then the Tide resets to 5.`,
   `<b>Reach 0 = an Undertow.</b> ${T.undertow_blk} Guard and draw ${T.undertow_draw} card, then it resets to 5. Junk in your hand Sinks.`,
   `<b>After a break the arrow flips:</b> down after a Crest, up after an Undertow.`,
   `<b>Drift.</b> From your second turn, after you draw, the Tide moves ${T.drift} further the way the arrow points. At 9 pointing up, the drift itself <b>Crests for free</b>.`,
   `<b>Rolling Break.</b> A Crest or Undertow is a "break". The second break in one turn is <b>x1.5</b>.`,
   `<b>Tideturn.</b> Moving against the arrow is a Tideturn. Many cards and effects count Tideturns (Crosscurrent, Turning Point, Drenched).`],
  example:{h:'Example turn: a Crest',cards:['splash','riptide','whitecap'],steps:['Tide starts at 5. <b>Splash</b> deals 8 and Surges 1: Tide 6.','<b>Riptide</b> deals 7 and Surges 2: Tide 8.','<b>Whitecap</b> deals 8 and Surges 2: Tide 10, a <b>Crest</b>. 16 more to every enemy, and Whitecap draws 2 cards because it caused the Crest.'],result:'3 Energy, 39 damage to a lone enemy, and the Tide is back at 5.'},
  pairs:[
   [['whitecap','splash'],'Whitecap draws 2 when it causes a Crest. Raise the Tide with cheap Surges first.'],
   [['riptide','brace'],'Riptide also gives Guard at Low Tide, so Recede first with Brace, then Riptide. Brace is also how you walk down to an Undertow.'],
   [['hammer','drawtide'],'Hightide Hammer and Draw the Tide want a high Tide: build it first.'],
   [['seesaw','crosscur'],'Seesaw makes a Tideturn. Crosscurrent deals more for each Tideturn this turn.'],
   [['turningpoint','salttears'],'Turning Point deals damage on every Tideturn. Salt Tears makes one while it softens everything.']],
  mistakes:['Ignoring the arrow. The Tide moves on its own each turn, so a plan that ends at 7 starts the next turn at 8.','Overshooting on purpose. A Crest happens at 10 whatever the extra, so wasted Surge is wasted.','Spending your Crest on one weak enemy. Crest hits <b>all</b> enemies, so it shines with 2 or 3 foes.','Playing Recede cards when you wanted to Crest. Check each card before you drop it.','Forgetting Undertow is also good: 12 Guard and a card is a full defensive turn.'],
  win:['Count your push. Add up the Surge on your hand before you play; hitting exactly 10 is the goal.','Use the drift. End a turn at 9 (arrow up) or 1 (arrow down) and the next turn begins with a free break.','Two breaks in one turn make the second x1.5. Save a big Surge for after a Crest.','Against one big enemy, use Crest for the damage and Undertow for the defence.']},
 echo:{id:'echo',tab:'Echo Mage',
  meter:{h:'Marks and Echoes',html:`Each turn your <b>first Attack</b> and <b>first Skill</b> are <b>Marked</b> automatically. At the end of your turn, every Marked card <b>Echoes</b>: it plays again <b>for free</b>. If you played a card after it, the Echo is <b>+${E.bonus_cap}</b> stronger. At most ${E.cap} Echoes a turn.`,art:'echo'},
  flow:[
   'The bell in your panel shows which card is Marked. Tap the <b>bell</b> and then a card in your hand to <b>move</b> a Mark onto it (a card of the same type).',
   `<b>Resound</b> lines on a card only happen when that card Echoes. Playing it normally never triggers them.`,
   `If nothing is Marked, your last card still Echoes at a quarter of its strength.`,
   '<b>Faint</b> cards and Vigils cannot be Marked.',
   '<b>Resonating X</b> on an enemy makes your Echoed Attacks deal X more to it.'],
  example:{h:'Example turn: Mark and Resound',cards:['reverb','arc','shimmer'],steps:['<b>Reverb</b> is your first Attack, so it is Marked. It deals 6 now.','Play <b>Arc Bolt</b> (6) and <b>Shimmer Ward</b> (5 Guard). Shimmer Ward is your first Skill, so it is Marked too.','End turn. Reverb <b>Echoes</b> for free with its Resound line: 10 damage, +1 because cards followed it, so 11. Shimmer Ward Echoes too and adds its Guard.'],result:'The Reverb alone did 6 + 11 = 17 damage across the turn for 1 Energy.'},
  pairs:[
   [['reverb','hollowecho'],'Resound cards. Hollow Echo hits ALL enemies when it Echoes.'],
   [['tuningstrike','beatfreq'],'Tuning Strike applies Resonating; Beat Frequency cashes it in.'],
   [['standing','overtone'],'Standing Wave and Overtone make your Echoes happen more than once.'],
   [['gracenote','massedvoices'],'Grace Note adds Notes to your hand; Massed Voices spends them for damage.'],
   [['infinitehum','glissando'],'Gathering Chord raises the bonus for cards played after the Mark; Glissando rewards a long turn.']],
  mistakes:['Playing your best card last. The automatic Mark goes on your <b>first</b> Attack and Skill, so lead with the one you want repeated, or move the Mark with the bell.','Expecting Resound to fire when you play the card. It only fires on the Echo.','Expecting a Faint card to carry the Mark. Faint cards are skipped: the Mark goes to the next Attack or Skill that is not Faint.','Playing nothing after the Marked card. The +1 only comes if another card follows.','Forgetting the Echo is free: it does not use Energy, so spend your Energy on other cards.'],
  win:['Plan the turn backwards: pick the card you want to Echo, make sure it is Marked, then play something after it.','Use Resound cards for your Marks. The Echo is a second, bigger, free play.','Resonating plus Echoed Attacks is the main damage engine. Apply it early.','A strong Skill Echo (Guard) is as good as an Attack Echo. You get both each turn.']},
 carto:{id:'carto',tab:'Cartographer',
  meter:{h:'Waypoints and slots',html:`Your meter is a row of <b>3 Waypoint slots</b>. A <b>Waypoint</b> is a card you play from your hand that does <b>not</b> go to the discard pile. It sits in a slot and works <b>by itself at the start of every one of your turns</b>. You also begin every fight with one free, temporary Waypoint already in slot 1.`,art:'carto'},
  flow:[
   '<b>Place.</b> Play a Waypoint card (most cost 1). It fills a slot. It first acts at the start of your <b>next</b> turn, not when you place it. If all slots are full you choose one to replace; the replaced Waypoint <b>leaves</b> and its Decamp effect fires.',
   `<b>Advance (free, once a turn).</b> Tap a Waypoint to give it +1 <b>Rank</b> (max 3). Rank adds ${RD} damage to a damage Waypoint's turn-start hit, each trigger, and Guard Waypoints gain +2 Guard per Rank. Rank also <b>grows the Decamp</b>: Rank 1 is x1.33, Rank 2 is x1.67, and Rank 3 is a <b>Landmark</b> that <b>doubles it</b> and counts as 2 for Expedition cards. Some Waypoints get a special bonus: Lookout Post draws 2 at Rank 3 and Charts more on Decamp, Cairn draws one more on a Rank 3 Decamp, and Mill Wheel gives Energy every turn at Rank 3.`,
   '<b>Decamp (free, once a turn).</b> Tap the tent on a Waypoint. It <b>leaves</b> its slot, its Decamp line fires once, and its Rank is lost. The card goes to your discard pile so you can draw and place it again (the free starting Waypoint just disappears).',
   `<b>Your draw pile is face up.</b> The Chart panel shows your next cards. You draw 4 per turn, one fewer than other heroes, and Waypoints make up for it with draws and Chart.`,
   '<b>Chart X</b> lets you look at the top X cards of your draw pile and reorder them (and send one to the bottom). <b>Bearing</b> cards give a bonus if the top card is the type they name.'],
  example:{h:'Example: build the road, then burn it',cards:['signal','cstrike'],steps:['<b>Turn 1.</b> Play <b>Signal Fire</b> (1 Energy). Nothing happens yet. Attack with the rest of your Energy.','<b>Turn 2 starts.</b> Signal Fire acts by itself: 3 damage to a random enemy. Tap it to <b>Advance</b> to Rank 1. Next turn it hits for 5, then 7 at Rank 2, then 8 at Rank 3 (a Landmark).','<b>Cash out.</b> Tap its tent to <b>Decamp</b>: Signal Fire leaves and deals 6 to a random enemy (12 if it is a Landmark). The card goes to the discard pile, ready to be played again.'],result:'Signal Fire at Rank 3 hits for 8 every turn for 1 Energy, then finishes with a 12 damage burst.'},
  pairs:[
   [['signal','stake'],'Damage Waypoints. They get stronger with every Advance. Survey Stake hits ALL enemies each turn.'],
   [['burn','avalanche'],'Planned Collapse draws and hits when a Waypoint leaves. Avalanche scales with how many have left. Decamp often.'],
   [['charge','scorched'],'Blasting Charge does nothing until it Decamps for 18 to ALL (36 as a Landmark). Burnt Bridges Decamps all at once.'],
   [['patientroad','waystation'],'The "build" side: Patient Road adds Rank each turn when nothing left a slot; Waystation Advances the Waypoint you choose each turn.'],
   [['atlas','lookout'],'Master Atlas makes every Waypoint trigger twice at turn start. Lookout Post then draws 2. It costs 3 (2 upgraded), the whole Energy cap, so plan the turn around it. A second copy does not add a third trigger.'],
   [['scorchmap','rekindle'],'Scorch the Map gives Energy when Waypoints leave. Rekindled Camp refills the slot with a free temporary Waypoint.']],
  mistakes:['Never using Advance. It is free every turn; an unused Advance is lost forever.','Advancing a Waypoint and then Decamping it the same turn. The Rank is lost when it leaves. Do it only for a Landmark burst.','Skipping Advance on a Waypoint that has no damage. Every Waypoint gains from Rank now: damage ones hit harder, Guard ones add Guard, and every Decamp grows toward its Landmark double.','Replacing a Waypoint by accident. When slots are full, playing another asks which one to replace, and the replaced one Decamps.','Ignoring the face-up draw pile. Waymarker, Bearing cards and Foreknowledge depend on the top card. Chart first.'],
  win:['Turn 1: place a Waypoint. Turn 2 onward: Advance every turn, play the next Waypoint, attack with what is left.','Pick a plan. <b>Build</b> (keep Waypoints, Advance them, Atlas and Patient Road) or <b>Burn</b> (Decamp for bursts, with Planned Collapse, Avalanche and Scorch the Map).','Decamp the free starting Waypoint when you need its Decamp line: it costs you no card.','Use Chart before your big turn so your Waypoints and attacks are on top of the pile.']},
 duel:{id:'duel',tab:'Duelist',
  meter:{h:'Momentum',html:`Every Attack you play builds <b>Momentum</b>, up to <b>${D.mom_max}</b>. You start each fight with ${D.start_mom}. It drops by ${D.decay} at the end of every turn and when an enemy hurts your HP. At <b>${D.flourish_min}+ Momentum</b> you can <b>Flourish</b>: spend all of it for a much bigger Attack.`,art:'duel'},
  flow:[
   `<b>Flourish.</b> Tap the blade, then play an Attack. Its damage is multiplied: x2 at 2 Momentum, x2.5 at 3, x3 at 4, x3.5 at 5. Momentum drops to 0 afterwards.`,
   '<b>Parry X.</b> A Parry card <b>calls</b> an enemy. Its first hit next turn is reduced by X and half of X is reflected to it. If the Parry stops the whole hit it is a <b>Clean Answer</b>, and you gain 1 Momentum.',
   '<b>Duel Focus.</b> Your Attacks deal +1 damage to the enemy with the most HP.',
   '<b>Bleed X.</b> When your Attack hits a Bleeding enemy it loses X HP, ignoring Guard, and Bleed drops by 1. Many Duelist cards apply it.',
   'Momentum is an investment: Light Feet, Fleche and Sidestep add extra; Disengage keeps your Momentum through the turn end.'],
  example:{h:'Example turn: a Flourish',cards:['thrust','lunge'],steps:['You begin with 1 Momentum. Play <b>Thrust</b>: 6 damage (5 plus Duel Focus). Momentum is now 2.','Tap the blade. Play <b>Lunge</b> as a <b>Flourish</b>: it is x2, so 20 damage, and it applies 2 Exposed.'],result:'3 Energy, 26 damage. Played plainly, Lunge would have dealt only 10.'},
  pairs:[
   [['nick','rend'],'Nick applies Bleed cheaply; Rend deals more for each Bleed on the target.'],
   [['parry','retort'],'Parry an attacker, then Retort deals extra if your Parry triggered.'],
   [['bitteranswer','riposte'],'Bitter Answer and Riposte pay you for Clean Answers and big Momentum.'],
   [['lightfeet','fleche'],'Cheap Momentum. Reach 3 to 5 Momentum before a big Flourish.'],
   [['crimsonfl','duelsend'],'Flourish finishers: Crimson Flourish turns damage into Bleed; Duel\'s End adds the target\'s Bleed.']],
  mistakes:['Flourishing at 2 Momentum with a weak Attack. Save it for a heavy hit like Lunge, or build to 4 or 5 first.','Parrying an enemy that is not attacking. Check its intent: the Parry is wasted if it only defends.','Taking hits and losing Momentum. Block or Parry the attackers before you plan a big Flourish.','Playing your big Attack first and Flourishing a small one later. Play the cheap Attacks first to build Momentum, then Flourish the big one.','Spending all Momentum on a target that is nearly dead.'],
  win:['Build to 3 or more, Flourish your biggest Attack, repeat. Cheap Attacks build, heavy ones cash in.','Parry the biggest attacker. A Clean Answer gives Momentum and often wins the exchange.','Apply Bleed early; Flourish damage then stacks with Bleed ticks that ignore Guard.','Your relic, the Dueling Glove, gives 2 Momentum the first time a Parry triggers each fight.']}
};
export const HOWTO_PAGES=[...GENERAL.map(g=>({kind:'gen',id:g.id,tab:g.tab})),...['tide','echo','carto','duel'].map(k=>({kind:'hero',id:k,tab:HEROES_GUIDE[k].tab}))];
